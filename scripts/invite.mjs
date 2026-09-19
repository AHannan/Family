#!/usr/bin/env node
/**
 * Let somebody in.
 *
 *   node scripts/invite.mjs +923001234567 "Nani Amma"
 *   node scripts/invite.mjs +923001234567 --password "chosen-password"
 *   node scripts/invite.mjs +923001234567 --reset
 *
 * This is the whole of "signup" for this app. There is no self-service sign-up
 * screen, no OTP and no SMS provider: somebody asks to be let in and gives their
 * number, this script creates their account with a password, and you send them
 * the link and the password yourself - WhatsApp, a text, or on paper.
 *
 * That is why nothing costs anything here per user. Supabase never sends the
 * person a message of any kind; the password reaches them through you.
 *
 * The account is created against Supabase's *email* provider, under an address
 * derived from the number (`923001234567@phone.invalid`), because the phone
 * provider cannot be enabled without paying for an SMS sender we would never
 * use. `email_confirm: true` means no mail is ever sent. The full reasoning is
 * in lib/accounts.ts above `authEmailFor` - that is the source of truth, and the
 * two must agree or nobody will be able to sign in.
 *
 * It needs the service role key, which bypasses row level security, so it is a
 * local script and its key must never reach the browser bundle. Put it in
 * `.env.local` as SUPABASE_SERVICE_ROLE_KEY, which is not prefixed
 * NEXT_PUBLIC_ and so is never shipped to the client.
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

/* ---- configuration ----------------------------------------------------- */

/** Read .env.local without a dependency. Only the keys we need. */
function readEnvFile(path = '.env.local') {
  try {
    const out = {};
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return out;
  } catch {
    return {};
  }
}

const env = { ...readEnvFile(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

if (!url || !serviceKey) {
  console.error(
    'Missing configuration. .env.local needs NEXT_PUBLIC_SUPABASE_URL and\n' +
      'SUPABASE_SERVICE_ROLE_KEY. See .env.local.example.',
  );
  process.exit(1);
}

/* ---- arguments --------------------------------------------------------- */

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const positional = args.filter((a) => !a.startsWith('--'));
const chosenAt = args.indexOf('--password');
const chosenPassword = chosenAt >= 0 ? args[chosenAt + 1] : null;

const rawPhone = positional[0];
const displayName = positional.filter((a) => a !== chosenPassword)[1] ?? '';

if (!rawPhone) {
  console.error('Usage: node scripts/invite.mjs +923001234567 ["Their name"]');
  process.exit(1);
}

/**
 * The number must be complete, with its country code.
 *
 * Nothing here guesses one. The app refuses to guess for the same reason - a
 * wrong guess aims somebody at a stranger's account - so a number typed without
 * +92 is rejected here rather than quietly turned into a different person.
 */
const phone = '+' + rawPhone.replace(/\D/g, '');
if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
  console.error(
    `"${rawPhone}" is not a full international number.\n` +
      'Include the country code, for example +923001234567.\n' +
      'A Pakistani number drops its leading 0: 0343 232 4575 -> +923432324575.',
  );
  process.exit(1);
}

/* Must match `authEmailFor` in lib/accounts.ts. Duplicated rather than imported
   because this script runs under plain node with no TypeScript build step; it is
   two lines, and lib/accounts.ts carries the explanation. */
const AUTH_EMAIL_DOMAIN = 'phone.invalid';
const authEmail = `${phone.replace(/\D/g, '')}@${AUTH_EMAIL_DOMAIN}`;

/**
 * A password that can be read down a phone line.
 *
 * No l/1/O/0 and no punctuation: this gets dictated to somebody who may be
 * elderly, and then typed on a phone keyboard. Three short groups are easier to
 * read back than one long string. Entropy is still ~46 bits, which is far more
 * than a hand-delivered password needs.
 */
function readablePassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const groups = [];
  for (let g = 0; g < 3; g++) {
    const bytes = randomBytes(4);
    let word = '';
    for (const b of bytes) word += alphabet[b % alphabet.length];
    groups.push(word);
  }
  return groups.join('-');
}

const password = chosenPassword || readablePassword();

/* ---- do it ------------------------------------------------------------- */

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Find an existing auth user for this number, if there is one. */
async function findUser() {
  // There is no "get user by email", so page through. A roster this size never
  // reaches more than a page or two.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === authEmail);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  const existing = await findUser();

  if (existing && !flags.has('--reset') && !chosenPassword) {
    console.error(
      `${phone} already has an account.\n` +
        'To send them a new password: node scripts/invite.mjs ' +
        `${phone} --reset`,
    );
    process.exit(1);
  }

  let userId;
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, { password });
    if (error) throw error;
    userId = existing.id;
    console.log(`Reset the password for ${phone}.`);
  } else {
    // `email_confirm` is what makes this work with nothing configured at all:
    // the address counts as confirmed because you confirmed the person, by
    // talking to them. No mail is sent, and the address cannot receive any.
    // The number goes into user_metadata too, so the dashboard's user list is
    // readable by a human rather than a column of digits@phone.invalid.
    const { data, error } = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: { phone, ...(displayName ? { display_name: displayName } : {}) },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Created an account for ${phone}.`);
  }

  // The roster row carries the name and the on/off switch. `upsert` so a reset
  // never clobbers a name or an is_active already set.
  const { error: rosterError } = await admin.from('family_accounts').upsert(
    {
      id: userId,
      phone,
      ...(displayName ? { display_name: displayName } : {}),
    },
    { onConflict: 'id' },
  );
  if (rosterError) throw rosterError;

  const link = `${siteUrl}/?n=${encodeURIComponent(phone)}`;

  console.log('\nSend them these two lines:\n');
  console.log(`  ${link}`);
  console.log(`  Password: ${password}\n`);
  console.log('The link fills their number in, so they only type the password.');
  if (!chosenPassword) {
    console.log('This password is not stored anywhere readable - copy it now.');
  }
}

main().catch((err) => {
  console.error('\nFailed:', err.message ?? err);
  process.exit(1);
});
