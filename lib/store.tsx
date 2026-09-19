'use client';

/** The whole app's state: several family trees, the language and text-size
 *  settings, and an undo stack.
 *
 *  Everything lives on the device. A phone number is only a label - the pile of
 *  families filed under it here - so that a shared phone or tablet can hold
 *  more than one person's tree. Nothing is sent anywhere and nothing is
 *  verified, so the backup file in Settings is still the only thing standing
 *  between a user and a cleared browser. The UI says so on both screens.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  attach,
  reorderChildren as reorderChildrenIn,
  repair,
  uniqueId,
  type RelationKind,
} from './family';
import {
  claimLegacyData,
  clearLegacyData,
  dataKeyFor,
  isValidPhone,
  normalizePhone,
  readDataFor,
  readRegistry,
  sortAccounts,
  touchAccount,
  writeRegistry,
  type Account,
} from './accounts';
import { buildSampleTree, SAMPLE_TREE_ID } from './seed';
import { normalizePerson, type AppData, type Locale, type Person, type Settings, type Tree } from './types';

const UNDO_LIMIT = 40;

const DEFAULT_SETTINGS: Settings = { locale: 'en', textScale: 1 };

function emptyData(): AppData {
  return { version: 1, trees: [], settings: { ...DEFAULT_SETTINGS } };
}

function nowISO() {
  return new Date().toISOString();
}

function newTreeId() {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Keep the chart's starting point at the top of the family.
 *
 * Someone who adds their grandfather expects him to appear in "Whole tree",
 * but the chart only ever draws downwards from its root. Walking the root up
 * to the oldest recorded ancestor after each change means the tree grows
 * upwards by itself and nobody has to discover the "Start from" control.
 */
function liftRoot(tree: Tree) {
  const byId = new Map(tree.people.map((p) => [p.id, p]));
  let cur = tree.rootId ? byId.get(tree.rootId) : undefined;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    const up = (cur.fatherId && byId.get(cur.fatherId)) || (cur.motherId && byId.get(cur.motherId));
    if (!up) break;
    cur = up;
  }
  if (cur) tree.rootId = cur.id;
}

/** Accept anything file-shaped and make it safe to render. */
function coerce(raw: unknown): AppData {
  const data = raw as Partial<AppData> | null;
  if (!data || !Array.isArray(data.trees)) throw new Error('No family trees in that file.');
  const trees: Tree[] = data.trees.map((tRaw, i) => {
    const tt = tRaw as Partial<Tree>;
    const people = repair((Array.isArray(tt.people) ? tt.people : []).map((p, j) =>
      normalizePerson({ ...(p as Person), id: (p as Person)?.id || `p${j}` }),
    ));
    const ids = new Set(people.map((p) => p.id));
    return {
      id: tt.id || `t-import-${i}-${Date.now().toString(36)}`,
      name: (tt.name || '').trim() || 'Family',
      nameUr: tt.nameUr || '',
      note: tt.note || '',
      rootId: tt.rootId && ids.has(tt.rootId) ? tt.rootId : (people[0]?.id ?? null),
      focusId: tt.focusId && ids.has(tt.focusId) ? tt.focusId : (people[0]?.id ?? null),
      createdAt: tt.createdAt || nowISO(),
      updatedAt: tt.updatedAt || nowISO(),
      isSample: !!tt.isSample,
      people,
    };
  });
  const s = (data.settings ?? {}) as Partial<Settings>;
  return {
    version: 1,
    trees,
    settings: {
      locale: s.locale === 'ur' ? 'ur' : 'en',
      textScale: [1, 1.15, 1.3].includes(Number(s.textScale)) ? Number(s.textScale) : 1,
    },
  };
}

interface Ctx {
  ready: boolean;

  /** The number whose families are on screen, or null when signed out. */
  activeNumber: string | null;
  /** Every number used on this device, most recently used first. */
  accounts: Account[];
  /** Returns why a number was refused, or null when it worked. */
  signIn: (phone: string) => 'empty' | 'invalid' | null;
  signOut: () => void;
  /** Drop a number from the sign-in list. Its families are left alone. */
  forgetAccount: (phone: string) => void;

  data: AppData;
  settings: Settings;
  trees: Tree[];
  getTree: (id: string) => Tree | undefined;

  setLocale: (l: Locale) => void;
  setTextScale: (n: number) => void;

  createTree: (name: string, nameUr?: string) => Tree;
  addSampleTree: () => Tree;
  renameTree: (id: string, name: string, nameUr?: string) => void;
  deleteTree: (id: string) => void;
  setTreeField: (id: string, patch: Partial<Pick<Tree, 'rootId' | 'focusId'>>) => void;

  addPerson: (
    treeId: string,
    data: Partial<Person>,
    relation?: { kind: RelationKind; toId: string },
  ) => Person | null;
  updatePerson: (treeId: string, personId: string, patch: Partial<Person>) => void;
  reorderChildren: (treeId: string, parentId: string, orderedIds: string[]) => void;
  deletePerson: (treeId: string, personId: string) => void;
  linkSpouse: (treeId: string, aId: string, bId: string) => void;
  unlinkSpouse: (treeId: string, aId: string, bId: string) => void;

  canUndo: boolean;
  undo: () => boolean;

  exportBlob: () => Blob;
  importFile: (file: File) => Promise<number>;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeNumber, setActiveNumber] = useState<string | null>(null);
  /* The language and text size the *device* last used. The sign-in screen has
     no families to read them from, and someone who reads Urdu must not be
     handed an English screen just because they signed out. */
  const [deviceSettings, setDeviceSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const undoStack = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  /* ---- load once, on the client -------------------------------------
   * Reading device storage has to wait until after mount: the server render
   * cannot see localStorage, so doing it any earlier would mismatch during
   * hydration. This is the intended shape for pulling in external state.
   */
  /* eslint-disable react-hooks/set-state-in-effect -- see note above */
  useEffect(() => {
    const reg = readRegistry(DEFAULT_SETTINGS);
    setAccounts(sortAccounts(reg.accounts));
    setDeviceSettings(reg.settings);

    if (reg.activeNumber) {
      // Somebody was already signed in here; go straight back to their families
      // rather than asking for the number again on every visit.
      let loaded: AppData | null = null;
      try {
        const raw = readDataFor(reg.activeNumber);
        if (raw) loaded = coerce(raw);
      } catch {
        loaded = null; // corrupt storage - start fresh rather than crash
      }
      setData(loaded ?? { ...emptyData(), settings: { ...reg.settings } });
      setActiveNumber(reg.activeNumber);
    }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* ---- persist on every change --------------------------------------
   * Only ever under the number that is signed in. Writing while signed out
   * would file one person's edits under whoever signs in next.
   */
  useEffect(() => {
    if (!ready || !activeNumber) return;
    try {
      localStorage.setItem(dataKeyFor(activeNumber), JSON.stringify(data));
    } catch {
      // Private mode or a full quota. Nothing useful to do here; the backup
      // file in Settings is the documented way out.
    }
  }, [data, ready, activeNumber]);

  /* Which numbers have been used here, and who is on the device now. */
  useEffect(() => {
    if (!ready) return;
    writeRegistry({ version: 1, accounts, activeNumber, settings: deviceSettings });
  }, [ready, accounts, activeNumber, deviceSettings]);

  /* ---- signing in and out --------------------------------------------
   * No code, no password: the number is a label, not a credential. Anyone
   * holding the device can type any number, and the sign-in screen says so.
   */

  const signIn = useCallback(
    (raw: string) => {
      const phone = normalizePhone(raw);
      if (!phone.replace(/\D/g, '')) return 'empty' as const;
      if (!isValidPhone(phone)) return 'invalid' as const;

      let loaded: AppData | null = null;
      try {
        const stored = readDataFor(phone);
        if (stored) loaded = coerce(stored);
      } catch {
        loaded = null; // unreadable - better an empty list than a crash
      }

      // The first number ever used here inherits whatever the device held
      // before numbers existed, so nobody loses a tree by updating the app.
      if (!loaded && accounts.length === 0) {
        const legacy = claimLegacyData();
        if (legacy) {
          try {
            loaded = coerce(legacy);
            localStorage.setItem(dataKeyFor(phone), JSON.stringify(loaded));
            clearLegacyData();
          } catch {
            loaded = null; // old data unreadable - treat the number as new
          }
        }
      }

      // A number nobody has used here starts empty, but keeps the language and
      // text size chosen on the sign-in screen.
      setData(loaded ?? { ...emptyData(), settings: { ...deviceSettings } });
      if (loaded) setDeviceSettings(loaded.settings);
      setAccounts((prev) => sortAccounts(touchAccount(prev, phone)));
      undoStack.current = [];
      setCanUndo(false);
      setActiveNumber(phone);
      return null;
    },
    [accounts.length, deviceSettings],
  );

  const signOut = useCallback(() => {
    // Nothing is deleted: the families stay filed under the number.
    undoStack.current = [];
    setCanUndo(false);
    setActiveNumber(null);
    setData({ ...emptyData(), settings: { ...deviceSettings } });
  }, [deviceSettings]);

  const forgetAccount = useCallback((raw: string) => {
    const phone = normalizePhone(raw);
    setAccounts((prev) => prev.filter((a) => a.phone !== phone));
  }, []);

  /** Every mutation goes through here so undo is never forgotten. */
  const mutate = useCallback((fn: (draft: AppData) => void, recordUndo = true) => {
    setData((prev) => {
      if (recordUndo) {
        undoStack.current.push(JSON.stringify(prev));
        if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift();
        setCanUndo(true);
      }
      const next: AppData = JSON.parse(JSON.stringify(prev));
      fn(next);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    const snap = undoStack.current.pop();
    setCanUndo(undoStack.current.length > 0);
    if (!snap) return false;
    setData(JSON.parse(snap));
    return true;
  }, []);

  /* ---- trees --------------------------------------------------------- */

  const getTree = useCallback(
    (id: string) => data.trees.find((t) => t.id === id),
    [data.trees],
  );

  const createTree = useCallback(
    (name: string, nameUr?: string) => {
      const tree: Tree = {
        id: newTreeId(),
        name: name.trim() || 'Family',
        nameUr: nameUr?.trim() || '',
        note: '',
        rootId: null,
        focusId: null,
        createdAt: nowISO(),
        updatedAt: nowISO(),
        people: [],
      };
      mutate((d) => {
        d.trees.unshift(tree);
      });
      return tree;
    },
    [mutate],
  );

  const addSampleTree = useCallback(() => {
    const existing = data.trees.find((t) => t.id === SAMPLE_TREE_ID);
    if (existing) return existing;
    const tree = buildSampleTree();
    mutate((d) => {
      d.trees.push(tree);
    });
    return tree;
  }, [data.trees, mutate]);

  const renameTree = useCallback(
    (id: string, name: string, nameUr?: string) => {
      mutate((d) => {
        const t = d.trees.find((x) => x.id === id);
        if (!t) return;
        t.name = name.trim() || t.name;
        if (nameUr !== undefined) t.nameUr = nameUr.trim();
        t.updatedAt = nowISO();
      });
    },
    [mutate],
  );

  const deleteTree = useCallback(
    (id: string) => {
      mutate((d) => {
        d.trees = d.trees.filter((t) => t.id !== id);
      });
    },
    [mutate],
  );

  const setTreeField = useCallback(
    (id: string, patch: Partial<Pick<Tree, 'rootId' | 'focusId'>>) => {
      // Navigation state, not content - it must not land on the undo stack.
      mutate((d) => {
        const t = d.trees.find((x) => x.id === id);
        if (!t) return;
        Object.assign(t, patch);
      }, false);
    },
    [mutate],
  );

  /* ---- people -------------------------------------------------------- */

  const addPerson = useCallback(
    (treeId: string, input: Partial<Person>, relation?: { kind: RelationKind; toId: string }) => {
      let created: Person | null = null;
      mutate((d) => {
        const t = d.trees.find((x) => x.id === treeId);
        if (!t) return;
        const person = normalizePerson({
          ...input,
          id: uniqueId(t.people, input.name || 'person'),
        });
        t.people.push(person);
        if (relation) attach(t.people, person, relation.kind, relation.toId);
        t.people = repair(t.people);
        if (!t.rootId) t.rootId = person.id;
        if (!t.focusId) t.focusId = person.id;
        liftRoot(t);
        t.updatedAt = nowISO();
        created = t.people.find((p) => p.id === person.id) ?? person;
      });
      return created;
    },
    [mutate],
  );

  const updatePerson = useCallback(
    (treeId: string, personId: string, patch: Partial<Person>) => {
      mutate((d) => {
        const t = d.trees.find((x) => x.id === treeId);
        if (!t) return;
        const p = t.people.find((x) => x.id === personId);
        if (!p) return;
        Object.assign(p, normalizePerson({ ...p, ...patch, id: p.id }));
        t.people = repair(t.people);
        t.updatedAt = nowISO();
      });
    },
    [mutate],
  );

  /**
   * Put a person's children in a chosen order - eldest first, usually.
   *
   * Sibling order is content, not a view setting, so it does go on the undo
   * stack; the caller is expected to skip the call when nothing moved.
   */
  const reorderChildren = useCallback(
    (treeId: string, parentId: string, orderedIds: string[]) => {
      mutate((d) => {
        const t = d.trees.find((x) => x.id === treeId);
        if (!t) return;
        t.people = reorderChildrenIn(t.people, parentId, orderedIds);
        t.updatedAt = nowISO();
      });
    },
    [mutate],
  );

  const deletePerson = useCallback(
    (treeId: string, personId: string) => {
      mutate((d) => {
        const t = d.trees.find((x) => x.id === treeId);
        if (!t) return;
        t.people = repair(t.people.filter((p) => p.id !== personId));
        if (t.rootId === personId) t.rootId = t.people[0]?.id ?? null;
        if (t.focusId === personId) t.focusId = t.rootId;
        t.updatedAt = nowISO();
      });
    },
    [mutate],
  );

  const linkSpouse = useCallback(
    (treeId: string, aId: string, bId: string) => {
      if (aId === bId) return;
      mutate((d) => {
        const t = d.trees.find((x) => x.id === treeId);
        if (!t) return;
        const a = t.people.find((p) => p.id === aId);
        const b = t.people.find((p) => p.id === bId);
        if (!a || !b) return;
        if (!a.spouseIds.includes(bId)) a.spouseIds.push(bId);
        if (!b.spouseIds.includes(aId)) b.spouseIds.push(aId);
        t.people = repair(t.people);
        t.updatedAt = nowISO();
      });
    },
    [mutate],
  );

  const unlinkSpouse = useCallback(
    (treeId: string, aId: string, bId: string) => {
      mutate((d) => {
        const t = d.trees.find((x) => x.id === treeId);
        if (!t) return;
        for (const p of t.people) {
          if (p.id === aId) p.spouseIds = p.spouseIds.filter((s) => s !== bId);
          if (p.id === bId) p.spouseIds = p.spouseIds.filter((s) => s !== aId);
        }
        t.updatedAt = nowISO();
      });
    },
    [mutate],
  );

  /* ---- settings ------------------------------------------------------ */

  /* Both are mirrored onto the device as well as the signed-in number, so the
     sign-in screen - which has no families to read them from - opens the way
     the last person left it. */
  const setLocale = useCallback(
    (locale: Locale) => {
      setDeviceSettings((prev) => ({ ...prev, locale }));
      mutate((d) => { d.settings.locale = locale; }, false);
    },
    [mutate],
  );
  const setTextScale = useCallback(
    (textScale: number) => {
      setDeviceSettings((prev) => ({ ...prev, textScale }));
      mutate((d) => { d.settings.textScale = textScale; }, false);
    },
    [mutate],
  );

  /* ---- backup -------------------------------------------------------- */

  const exportBlob = useCallback(
    () => new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    [data],
  );

  const importFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      const incoming = coerce(JSON.parse(text));
      mutate((d) => {
        // Merge rather than replace: a backup should never silently wipe
        // trees the user built on this device since making it.
        for (const t of incoming.trees) {
          const clash = d.trees.findIndex((x) => x.id === t.id);
          if (clash >= 0) d.trees[clash] = t;
          else d.trees.push(t);
        }
        d.settings = incoming.settings;
      });
      return incoming.trees.length;
    },
    [mutate],
  );

  const value = useMemo<Ctx>(
    () => ({
      ready,
      activeNumber,
      accounts,
      signIn,
      signOut,
      forgetAccount,
      data,
      settings: activeNumber ? data.settings : deviceSettings,
      trees: data.trees,
      getTree,
      setLocale,
      setTextScale,
      createTree,
      addSampleTree,
      renameTree,
      deleteTree,
      setTreeField,
      addPerson,
      updatePerson,
      reorderChildren,
      deletePerson,
      linkSpouse,
      unlinkSpouse,
      canUndo,
      undo,
      exportBlob,
      importFile,
    }),
    [
      ready, activeNumber, accounts, signIn, signOut, forgetAccount, deviceSettings,
      data, getTree, setLocale, setTextScale, createTree, addSampleTree,
      renameTree, deleteTree, setTreeField, addPerson, updatePerson, reorderChildren,
      deletePerson,
      linkSpouse, unlinkSpouse, canUndo, undo, exportBlob, importFile,
    ],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
