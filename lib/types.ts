/** Core data shapes. Everything is plain JSON so a tree can be written to a
 *  backup file and read back on any other device. */

export type Gender = 'm' | 'f' | '';

export interface Person {
  id: string;
  /** Name in Latin script. Always present. */
  name: string;
  /** Name in Urdu / Arabic script. Optional. */
  nameUr?: string;
  /** Role or honorific, e.g. "Chief of Quraysh", "Nana Abu". */
  title?: string;
  titleUr?: string;
  gender: Gender;
  /** Free text on purpose - "1952", "c. 570 CE" and "11 AH / 632 CE" all work. */
  birth?: string;
  death?: string;
  fatherId?: string | null;
  motherId?: string | null;
  spouseIds: string[];
  notes?: string;
  tags?: string[];
}

export interface Tree {
  id: string;
  name: string;
  nameUr?: string;
  note?: string;
  /** Who the chart starts from. */
  rootId: string | null;
  /** Who the family view opens on. */
  focusId?: string | null;
  createdAt: string;
  updatedAt: string;
  people: Person[];
  /** Set on the bundled example so the app can label it and offer a reset. */
  isSample?: boolean;
  /** The owner has asked for this tree to be readable by anyone with the link. */
  isPublic?: boolean;
  /** The row id in family_trees, once this tree has reached the cloud. It is
   *  what a public link points at, so it is kept on the device rather than
   *  looked up again. Null until the first successful sync. */
  cloudUid?: string | null;
}

export type Locale = 'en' | 'ur';

export interface Settings {
  locale: Locale;
  /** 1 = normal, 1.15 = large, 1.3 = extra large. Drives an html font-size. */
  textScale: number;
}

export interface AppData {
  version: 1;
  trees: Tree[];
  settings: Settings;
}

/** A person with every optional field filled in, so views never have to guard. */
export function normalizePerson(p: Partial<Person> & { id: string }): Person {
  return {
    id: p.id,
    name: p.name?.trim() || 'Unnamed',
    nameUr: p.nameUr?.trim() || '',
    title: p.title?.trim() || '',
    titleUr: p.titleUr?.trim() || '',
    gender: p.gender === 'f' ? 'f' : p.gender === 'm' ? 'm' : '',
    birth: p.birth?.trim() || '',
    death: p.death?.trim() || '',
    fatherId: p.fatherId || null,
    motherId: p.motherId || null,
    spouseIds: Array.isArray(p.spouseIds) ? [...p.spouseIds] : [],
    notes: p.notes?.trim() || '',
    tags: Array.isArray(p.tags) ? [...p.tags] : [],
  };
}
