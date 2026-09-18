/** Pure helpers over a list of people. No React, no storage - just the rules
 *  about how relatives hang together, so they can be tested and reused. */

import { normalizePerson, type Person } from './types';

export type PersonIndex = Map<string, Person>;

export function indexPeople(people: Person[]): PersonIndex {
  return new Map(people.map((p) => [p.id, p]));
}

export function childrenOf(people: Person[], id: string): Person[] {
  return people.filter((p) => p.fatherId === id || p.motherId === id);
}

export function spousesOf(people: Person[], id: string): Person[] {
  const ix = indexPeople(people);
  const me = ix.get(id);
  if (!me) return [];
  return me.spouseIds.map((s) => ix.get(s)).filter((p): p is Person => !!p);
}

export function parentsOf(people: Person[], id: string): Person[] {
  const ix = indexPeople(people);
  const me = ix.get(id);
  if (!me) return [];
  return [me.fatherId, me.motherId]
    .map((pid) => (pid ? ix.get(pid) : undefined))
    .filter((p): p is Person => !!p);
}

export function siblingsOf(people: Person[], id: string): Person[] {
  const ix = indexPeople(people);
  const me = ix.get(id);
  if (!me || (!me.fatherId && !me.motherId)) return [];
  return people.filter(
    (q) =>
      q.id !== id &&
      ((!!me.fatherId && q.fatherId === me.fatherId) ||
        (!!me.motherId && q.motherId === me.motherId)),
  );
}

/** Ancestors nearest first, following the father then falling back to the mother. */
export function ancestorsOf(people: Person[], id: string): Person[] {
  const ix = indexPeople(people);
  const out: Person[] = [];
  const seen = new Set<string>([id]);
  let cur = ix.get(id);
  while (cur && (cur.fatherId || cur.motherId)) {
    const next = (cur.fatherId ? ix.get(cur.fatherId) : undefined) ??
      (cur.motherId ? ix.get(cur.motherId) : undefined);
    if (!next || seen.has(next.id)) break;
    seen.add(next.id);
    out.push(next);
    cur = next;
  }
  return out;
}

/** People with no recorded parent - the natural places for a chart to start. */
export function rootsOf(people: Person[]): Person[] {
  return people.filter((p) => !p.fatherId && !p.motherId);
}

/** Would making `parentId` the parent of `childId` create a loop? */
export function wouldCycle(people: Person[], childId: string, parentId: string): boolean {
  const ix = indexPeople(people);
  const seen = new Set<string>();
  let cur: string | null | undefined = parentId;
  let guard = 0;
  while (cur && guard++ < 1000) {
    if (cur === childId) return true;
    if (seen.has(cur)) return false;
    seen.add(cur);
    const p: Person | undefined = ix.get(cur);
    if (!p) return false;
    cur = p.fatherId || p.motherId;
  }
  return false;
}

/**
 * Make a list of people internally consistent. Imported files and hand-edited
 * backups are repaired rather than rejected: dangling links are dropped, every
 * marriage is made to point both ways, and nobody stays their own ancestor.
 */
export function repair(input: Person[]): Person[] {
  const people = input.map((p, i) =>
    normalizePerson({ ...p, id: p.id || `p${i}-${slugify(p.name || 'person')}` }),
  );

  // Ids must be unique or lookups silently pick the wrong person.
  const used = new Set<string>();
  for (const p of people) {
    let id = p.id;
    let n = 2;
    while (used.has(id)) id = `${p.id}-${n++}`;
    p.id = id;
    used.add(id);
  }

  const ix = indexPeople(people);
  for (const p of people) {
    if (p.fatherId && (!ix.has(p.fatherId) || p.fatherId === p.id)) p.fatherId = null;
    if (p.motherId && (!ix.has(p.motherId) || p.motherId === p.id)) p.motherId = null;
    p.spouseIds = p.spouseIds.filter(
      (sid, i, arr) => ix.has(sid) && sid !== p.id && arr.indexOf(sid) === i,
    );
  }
  for (const p of people) {
    for (const sid of p.spouseIds) {
      const other = ix.get(sid)!;
      if (!other.spouseIds.includes(p.id)) other.spouseIds.push(p.id);
    }
  }
  for (const p of people) {
    if (p.fatherId && wouldCycle(people, p.id, p.fatherId)) p.fatherId = null;
    if (p.motherId && wouldCycle(people, p.id, p.motherId)) p.motherId = null;
  }
  return people;
}

export function slugify(name: string): string {
  const s = (name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  return s || 'person';
}

export function uniqueId(people: Person[], name: string): string {
  const taken = new Set(people.map((p) => p.id));
  const base = slugify(name);
  let id = base;
  let n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

export function searchPeople(people: Person[], query: string, limit = 12): Person[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: Person[] = [];
  for (const p of people) {
    const hay = `${p.name} ${p.nameUr ?? ''} ${p.title ?? ''} ${(p.tags ?? []).join(' ')}`.toLowerCase();
    if (hay.includes(q)) out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

export function lifespan(p: Person): string {
  if (p.birth && p.death) return `${p.birth} – ${p.death}`;
  if (p.death) return `– ${p.death}`;
  if (p.birth) return `${p.birth} –`;
  return '';
}

/** How a new person should be attached to an existing one. */
export type RelationKind =
  | 'son'
  | 'daughter'
  | 'wife'
  | 'husband'
  | 'father'
  | 'mother'
  | 'brother'
  | 'sister';

export const RELATION_GENDER: Record<RelationKind, 'm' | 'f'> = {
  son: 'm',
  daughter: 'f',
  wife: 'f',
  husband: 'm',
  father: 'm',
  mother: 'f',
  brother: 'm',
  sister: 'f',
};

/**
 * Wire a newly added person to the one they were added from.
 * Mutates both, and is always followed by `repair`.
 */
export function attach(
  people: Person[],
  added: Person,
  kind: RelationKind,
  toId: string,
): void {
  const ix = indexPeople(people);
  const anchor = ix.get(toId);
  if (!anchor) return;

  switch (kind) {
    case 'son':
    case 'daughter': {
      if (anchor.gender === 'f') added.motherId = anchor.id;
      else added.fatherId = anchor.id;
      // With exactly one spouse on record, the other parent is not a guess.
      if (anchor.spouseIds.length === 1) {
        const sp = ix.get(anchor.spouseIds[0]);
        if (sp) {
          if (sp.gender === 'f' && !added.motherId) added.motherId = sp.id;
          else if (sp.gender !== 'f' && !added.fatherId) added.fatherId = sp.id;
        }
      }
      break;
    }
    case 'wife':
    case 'husband': {
      if (!added.spouseIds.includes(anchor.id)) added.spouseIds.push(anchor.id);
      if (!anchor.spouseIds.includes(added.id)) anchor.spouseIds.push(added.id);
      break;
    }
    case 'father': {
      anchor.fatherId = added.id;
      // A father added to someone whose mother is known is presumed her husband.
      if (anchor.motherId) {
        const m = ix.get(anchor.motherId);
        if (m && !m.spouseIds.includes(added.id)) {
          m.spouseIds.push(added.id);
          added.spouseIds.push(m.id);
        }
      }
      break;
    }
    case 'mother': {
      anchor.motherId = added.id;
      if (anchor.fatherId) {
        const f = ix.get(anchor.fatherId);
        if (f && !f.spouseIds.includes(added.id)) {
          f.spouseIds.push(added.id);
          added.spouseIds.push(f.id);
        }
      }
      break;
    }
    case 'brother':
    case 'sister': {
      added.fatherId = anchor.fatherId ?? null;
      added.motherId = anchor.motherId ?? null;
      break;
    }
  }
}
