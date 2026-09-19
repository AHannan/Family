/** The account roster: list, and create.
 *
 *  Both go through `requireAdmin` first. See lib/adminAuth.ts for why nothing
 *  the browser says about who it is gets believed.
 */

import {
  adminClient,
  authEmailFor,
  isE164,
  normalizePhone,
  readablePassword,
  requireAdmin,
} from '@/lib/adminAuth';

// The service key is a Node environment variable, and `crypto.getRandomValues`
// wants a real runtime. This route must never be edge-rendered or prerendered.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RosterRow {
  id: string;
  phone: string;
  display_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_seen_at: string | null;
}

export async function GET(request: Request) {
  const { caller, error } = await requireAdmin(request);
  if (error) return error;

  const admin = adminClient();

  const { data, error: listError } = await admin
    .from('family_accounts')
    .select('id, phone, display_name, is_active, is_admin, created_at, last_seen_at')
    .order('created_at', { ascending: true });

  if (listError) return Response.json({ error: listError.message }, { status: 500 });

  // How many families each person has, so the list says something useful about
  // who is actually using the app. One grouped query, not one per row.
  const { data: trees, error: treeError } = await admin
    .from('family_trees')
    .select('owner_id, tree_id');
  if (treeError) return Response.json({ error: treeError.message }, { status: 500 });

  const counts = new Map<string, number>();
  for (const t of (trees ?? []) as { owner_id: string }[]) {
    counts.set(t.owner_id, (counts.get(t.owner_id) ?? 0) + 1);
  }

  return Response.json({
    you: caller.userId,
    accounts: (data as RosterRow[]).map((r) => ({
      id: r.id,
      phone: r.phone,
      displayName: r.display_name ?? '',
      isActive: r.is_active,
      isAdmin: r.is_admin,
      createdAt: r.created_at,
      lastSeenAt: r.last_seen_at,
      trees: counts.get(r.id) ?? 0,
    })),
  });
}

/**
 * Create an account.
 *
 * This is the panel's version of `scripts/invite.mjs`, and it works the same
 * way: an auth user under an address derived from the number, confirmed on
 * creation so nothing is ever emailed, plus a roster row.
 *
 * The password is returned **once**, in this response, and is not stored
 * anywhere readable afterwards - the same bargain the script makes. If it is
 * lost, issue a new one rather than trying to recover it.
 */
export async function POST(request: Request) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  let body: { phone?: string; displayName?: string; isAdmin?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const phone = normalizePhone(String(body.phone ?? ''));
  if (!phone.replace(/\D/g, '')) {
    return Response.json({ error: 'Please give a phone number.' }, { status: 400 });
  }
  if (!isE164(phone)) {
    return Response.json(
      {
        error:
          'Include the country code, starting with +. A Pakistani number drops its leading 0: 0343 232 4575 becomes +923432324575.',
      },
      { status: 400 },
    );
  }

  const admin = adminClient();
  const displayName = String(body.displayName ?? '').trim();
  const password = readablePassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: authEmailFor(phone),
    password,
    email_confirm: true,
    user_metadata: { phone, ...(displayName ? { display_name: displayName } : {}) },
  });

  if (createError || !created.user) {
    const message = createError?.message ?? 'Could not create the account.';
    // Supabase says "already been registered"; say it in terms of the number,
    // since the derived address is an implementation detail.
    const taken = /already/i.test(message);
    return Response.json(
      { error: taken ? `${phone} already has an account.` : message },
      { status: taken ? 409 : 500 },
    );
  }

  const { error: rosterError } = await admin.from('family_accounts').upsert(
    {
      id: created.user.id,
      phone,
      display_name: displayName || null,
      is_admin: body.isAdmin === true,
    },
    { onConflict: 'id' },
  );

  if (rosterError) {
    // An auth user with no roster row would be a half-made account, so undo it
    // rather than leaving one behind.
    await admin.auth.admin.deleteUser(created.user.id);
    return Response.json({ error: rosterError.message }, { status: 500 });
  }

  return Response.json({ id: created.user.id, phone, password }, { status: 201 });
}
