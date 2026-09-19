/** One account: change it, issue a new password, or delete it. */

import { adminClient, readablePassword, requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * Turn an account on or off, rename it, make it an admin - or all three.
 *
 * `POST ?action=password` is handled here too, because issuing a new password is
 * a change to the same account and does not deserve its own file.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { caller, error } = await requireAdmin(request);
  if (error) return error;
  const { id } = await params;

  let body: { isActive?: boolean; isAdmin?: boolean; displayName?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  // Locking yourself out, or removing your own admin rights, leaves nobody able
  // to undo it from the panel - so both are refused rather than confirmed.
  if (id === caller.userId && body.isActive === false) {
    return Response.json({ error: 'You cannot turn off your own account.' }, { status: 400 });
  }
  if (id === caller.userId && body.isAdmin === false) {
    return Response.json(
      { error: 'You cannot remove your own administrator access.' },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.isActive === 'boolean') patch.is_active = body.isActive;
  if (typeof body.isAdmin === 'boolean') patch.is_admin = body.isAdmin;
  if (typeof body.displayName === 'string') patch.display_name = body.displayName.trim() || null;

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: 'Nothing to change.' }, { status: 400 });
  }

  const admin = adminClient();
  const { error: updateError } = await admin
    .from('family_accounts')
    .update(patch)
    .eq('id', id);

  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });
  return Response.json({ ok: true });
}

/**
 * Issue a new password.
 *
 * Returned once and not recoverable afterwards. Any session the person already
 * has keeps working until it expires - this changes what they must type next
 * time, it is not a way to kick somebody off. Turning the account off does that.
 */
export async function POST(request: Request, { params }: Params) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  const { id } = await params;

  const action = new URL(request.url).searchParams.get('action');
  if (action !== 'password') {
    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  }

  const admin = adminClient();
  const password = readablePassword();

  const { error: resetError } = await admin.auth.admin.updateUserById(id, { password });
  if (resetError) return Response.json({ error: resetError.message }, { status: 500 });

  const { data: row } = await admin
    .from('family_accounts')
    .select('phone')
    .eq('id', id)
    .maybeSingle();

  return Response.json({ password, phone: (row as { phone: string } | null)?.phone ?? '' });
}

/**
 * Delete an account and everything in it.
 *
 * `family_trees.owner_id` and `family_accounts.id` both cascade from
 * `auth.users`, so removing the auth user takes the roster row and every family
 * with it. That is genuinely unrecoverable, which is why the panel asks twice
 * and says how many families are about to go.
 */
export async function DELETE(request: Request, { params }: Params) {
  const { caller, error } = await requireAdmin(request);
  if (error) return error;
  const { id } = await params;

  if (id === caller.userId) {
    return Response.json({ error: 'You cannot delete your own account.' }, { status: 400 });
  }

  const admin = adminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(id);
  if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 });

  return Response.json({ ok: true });
}
