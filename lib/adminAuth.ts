/** Server-only helpers for the admin panel.
 *
 *  **Nothing in this file may ever be imported from a client component.** It
 *  reads `SUPABASE_SERVICE_ROLE_KEY`, which bypasses row level security
 *  completely; if it reached the browser bundle, every family in the database
 *  would be readable and writable by anyone who opened dev tools. The key has no
 *  `NEXT_PUBLIC_` prefix, so Next.js refuses to inline it - but that is a
 *  backstop, not the rule. The rule is: only route handlers import this.
 *
 *  This is the first server-side code in the app. Everything else is still
 *  client-side and talks to Supabase directly under row level security; the
 *  admin panel cannot, because creating and resetting other people's accounts is
 *  exactly what RLS is there to prevent.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Whether the admin panel can work at all in this deployment. */
export function adminConfigured(): boolean {
  return !!(url && serviceKey);
}

/**
 * A client that bypasses row level security.
 *
 * Every call made with this is unguarded, so each route handler must have
 * established who is asking - via `requireAdmin` - before using it.
 */
export function adminClient(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error(
      'The admin panel needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface AdminCaller {
  userId: string;
  phone: string;
}

/**
 * Establish that the caller is a signed-in admin, or say why not.
 *
 * The token is verified against Supabase rather than merely decoded, and the
 * admin flag is read from the database with the service key. Nothing the browser
 * sends is trusted beyond the bearer token itself: a caller can claim to be
 * anybody, so `is_admin` is never taken from a request body, a cookie or a
 * header.
 *
 * Returns either the caller or a Response to return as-is.
 */
export async function requireAdmin(
  request: Request,
): Promise<{ caller: AdminCaller; error: null } | { caller: null; error: Response }> {
  const fail = (status: number, message: string) => ({
    caller: null as null,
    error: Response.json({ error: message }, { status }),
  });

  if (!adminConfigured()) {
    return fail(503, 'The admin panel is not configured on this deployment.');
  }

  const header = request.headers.get('authorization') ?? '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) return fail(401, 'Not signed in.');

  const admin = adminClient();

  // Verifies the signature and expiry with Supabase; a forged or stale token
  // fails here rather than being taken at face value.
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return fail(401, 'Not signed in.');

  const { data: row, error: rowError } = await admin
    .from('family_accounts')
    .select('phone, is_admin, is_active')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (rowError) return fail(500, 'Could not check your account.');
  if (!row) return fail(403, 'Not an administrator.');

  const account = row as { phone: string; is_admin: boolean; is_active: boolean };
  // A switched-off admin is switched off. Checked here as well as at sign-in,
  // because a session issued before the switch would otherwise outlive it.
  if (!account.is_active) return fail(403, 'This account has been turned off.');
  if (!account.is_admin) return fail(403, 'Not an administrator.');

  return { caller: { userId: userData.user.id, phone: account.phone }, error: null };
}

/* ---- the same rules the invite script uses ----------------------------- */

/** Reduce what was typed to just its digits, keeping a leading `+`. */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  return (trimmed.startsWith('+') ? '+' : '') + trimmed.replace(/\D/g, '');
}

export function isE164(normalized: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(normalized);
}

/** Must match `AUTH_EMAIL_DOMAIN` in lib/accounts.ts and scripts/invite.mjs. */
export const AUTH_EMAIL_DOMAIN = 'familytree.local';

export function authEmailFor(normalizedPhone: string): string {
  return `${normalizedPhone.replace(/\D/g, '')}@${AUTH_EMAIL_DOMAIN}`;
}

/**
 * A password that can be read down a phone line.
 *
 * No l/1/O/0 and no punctuation: this gets dictated to somebody who may be
 * elderly, then typed on a phone keyboard. Three short groups read back more
 * reliably than one long string. Still ~46 bits, far more than a password
 * delivered by hand needs.
 */
export function readablePassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return [chars.slice(0, 4).join(''), chars.slice(4, 8).join(''), chars.slice(8, 12).join('')].join(
    '-',
  );
}
