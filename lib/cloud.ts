/** Moving trees between the device and Supabase.
 *
 *  The device is still where the app works from: localStorage holds the working
 *  copy and the undo stack, and every screen reads from React state. This file
 *  only keeps a durable copy in `family_trees` so a cleared browser or a new
 *  phone is no longer the end of somebody's family tree.
 *
 *  Deliberately React-free, like lib/family.ts and lib/layout.ts, so the merge
 *  rules can be reasoned about on their own.
 *
 *  One rule shapes all of it: **a sync never destroys a tree.** `mergeTrees`
 *  keeps anything either side has, exactly as `importFile` does, because the
 *  alternative - a stale device wiping the cloud, or a pull wiping work done
 *  offline - is unrecoverable for a user whose only other backup is a file they
 *  have probably never saved. A tree deleted on this device is deleted in the
 *  cloud too (see `deleteTreeRow`), but a tree that merely went missing is
 *  treated as a tree to restore, not a deletion to replay.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { repair } from './family';
import { normalizePerson, type Person, type Settings, type Tree } from './types';

/** The columns we read back. Spelled out so a schema change fails loudly. */
const TREE_COLUMNS =
  'uid, tree_id, name, name_ur, note, root_id, focus_id, is_sample, is_public, people, created_at, updated_at';

interface TreeRow {
  uid: string;
  tree_id: string;
  name: string;
  name_ur: string | null;
  note: string | null;
  root_id: string | null;
  focus_id: string | null;
  is_sample: boolean;
  is_public: boolean;
  people: unknown;
  created_at: string;
  updated_at: string;
}

/**
 * A stored row, made safe to render.
 *
 * Rows go through `repair()` for the same reason imported files do: the jsonb is
 * whatever some version of the app wrote, and a dangling parent id must not
 * reach the chart.
 */
export function rowToTree(row: TreeRow): Tree {
  const people = repair(
    (Array.isArray(row.people) ? row.people : []).map((p, i) =>
      normalizePerson({ ...(p as Person), id: (p as Person)?.id || `p${i}` }),
    ),
  );
  const ids = new Set(people.map((p) => p.id));
  return {
    id: row.tree_id,
    name: (row.name || '').trim() || 'Family',
    nameUr: row.name_ur || '',
    note: row.note || '',
    rootId: row.root_id && ids.has(row.root_id) ? row.root_id : (people[0]?.id ?? null),
    focusId: row.focus_id && ids.has(row.focus_id) ? row.focus_id : (people[0]?.id ?? null),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isSample: !!row.is_sample,
    isPublic: !!row.is_public,
    cloudUid: row.uid,
    people,
  };
}

function treeToRow(tree: Tree, ownerId: string) {
  return {
    owner_id: ownerId,
    tree_id: tree.id,
    name: tree.name,
    name_ur: tree.nameUr ?? '',
    note: tree.note ?? '',
    root_id: tree.rootId,
    focus_id: tree.focusId ?? null,
    is_sample: !!tree.isSample,
    is_public: !!tree.isPublic,
    people: tree.people,
    created_at: tree.createdAt,
    updated_at: tree.updatedAt,
  };
}

/**
 * Decide which copy of each tree to keep.
 *
 * `updatedAt` is written by whichever device last changed the tree's content, so
 * it - not the row's `synced_at` - is what settles a conflict. Ties go to the
 * local copy, because that is the one the user is looking at.
 *
 * Nothing is dropped: a tree only one side has is kept either way.
 */
export function mergeTrees(local: Tree[], remote: Tree[]): Tree[] {
  const out = local.map((t) => ({ ...t }));
  const byId = new Map(out.map((t, i) => [t.id, i]));

  for (const incoming of remote) {
    const at = byId.get(incoming.id);
    if (at === undefined) {
      out.push(incoming);
      continue;
    }
    const mine = out[at];
    if (incoming.updatedAt > mine.updatedAt) {
      // Their copy is newer, but the row id is worth keeping either way.
      out[at] = { ...incoming, cloudUid: incoming.cloudUid ?? mine.cloudUid ?? null };
    } else {
      // Ours stands. Learn the row id so the next push is an update rather than
      // an insert, and so a public link can be shown without another round trip.
      out[at] = { ...mine, cloudUid: mine.cloudUid ?? incoming.cloudUid ?? null };
    }
  }
  return out;
}

/** Which of our trees the cloud has not got, or has an older copy of. */
export function treesToPush(local: Tree[], remote: Tree[]): Tree[] {
  const theirs = new Map(remote.map((t) => [t.id, t]));
  return local.filter((t) => {
    const other = theirs.get(t.id);
    // The public flag is checked on its own because turning sharing on or off
    // is not a content edit and does not move `updatedAt`.
    return !other || t.updatedAt > other.updatedAt || !!t.isPublic !== !!other.isPublic;
  });
}

/* ---- the calls --------------------------------------------------------- */

export async function fetchTrees(client: SupabaseClient, ownerId: string): Promise<Tree[]> {
  const { data, error } = await client
    .from('family_trees')
    .select(TREE_COLUMNS)
    .eq('owner_id', ownerId);
  if (error) throw error;
  return (data as TreeRow[]).map(rowToTree);
}

/**
 * Write one tree, returning its row id.
 *
 * `(owner_id, tree_id)` is unique, which is what makes this an upsert the device
 * can repeat safely - a push that timed out can simply be sent again.
 */
export async function upsertTree(
  client: SupabaseClient,
  ownerId: string,
  tree: Tree,
): Promise<string | null> {
  const { data, error } = await client
    .from('family_trees')
    .upsert(treeToRow(tree, ownerId), { onConflict: 'owner_id,tree_id' })
    .select('uid')
    .single();
  if (error) throw error;
  return (data as { uid: string } | null)?.uid ?? null;
}

export async function deleteTreeRow(
  client: SupabaseClient,
  ownerId: string,
  treeId: string,
): Promise<void> {
  const { error } = await client
    .from('family_trees')
    .delete()
    .eq('owner_id', ownerId)
    .eq('tree_id', treeId);
  if (error) throw error;
}

/** One public tree, by the row id in its link. Works signed out. */
export async function fetchPublicTree(client: SupabaseClient, uid: string): Promise<Tree | null> {
  const { data, error } = await client
    .from('family_trees')
    .select(TREE_COLUMNS)
    .eq('uid', uid)
    .eq('is_public', true)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToTree(data as TreeRow) : null;
}

/* ---- the roster row ---------------------------------------------------- */

export interface AccountRow {
  phone: string;
  displayName: string;
  isActive: boolean;
  /** Whether to offer the admin panel. The panel itself re-checks server side;
   *  this only decides whether a link is drawn. */
  isAdmin: boolean;
  settings: Settings;
}

/**
 * The signed-in person's own row.
 *
 * Returns null when there is no row at all, which happens if a user was created
 * in the Supabase dashboard rather than by `scripts/invite.mjs`. That is treated
 * as "let them in, with defaults" rather than locking somebody out of data they
 * can reach through RLS regardless.
 */
export async function fetchAccount(
  client: SupabaseClient,
  userId: string,
): Promise<AccountRow | null> {
  const { data, error } = await client
    .from('family_accounts')
    .select('phone, display_name, is_active, is_admin, settings')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as {
    phone: string;
    display_name: string | null;
    is_active: boolean;
    is_admin: boolean;
    settings: unknown;
  };
  const s = (row.settings ?? {}) as Partial<Settings>;
  return {
    phone: row.phone,
    displayName: row.display_name || '',
    isActive: row.is_active,
    isAdmin: !!row.is_admin,
    settings: {
      locale: s.locale === 'ur' ? 'ur' : 'en',
      textScale: [1, 1.15, 1.3].includes(Number(s.textScale)) ? Number(s.textScale) : 1,
    },
  };
}

export async function saveAccountSettings(
  client: SupabaseClient,
  userId: string,
  settings: Settings,
): Promise<void> {
  const { error } = await client
    .from('family_accounts')
    .update({ settings, last_seen_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}
