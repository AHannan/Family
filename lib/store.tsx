'use client';

/** The whole app's state: several family trees, the language and text-size
 *  settings, and an undo stack.
 *
 *  The device is still where the app works from. localStorage holds the working
 *  copy, keyed by the signed-in phone number, and every screen reads from React
 *  state - so the app keeps working on a bus with no signal, and the undo stack
 *  never has to wait for a round trip. Supabase holds the durable copy: a
 *  cleared browser or a new phone is no longer the end of somebody's tree.
 *
 *  A phone number is now a real credential, not a label. There is no signup in
 *  the app at all: somebody asks to be let in, the owner creates their account
 *  with `scripts/invite.mjs` and sends them a password, and they type it once.
 *  See components/SignIn.tsx for the wording that has to match.
 *
 *  Without Supabase keys configured, everything below falls back to the old
 *  local-only behaviour rather than refusing to start. That is deliberate: a
 *  missing key and a dead network should look the same to the user.
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
  authEmailFor,
  claimLegacyData,
  clearLegacyData,
  dataKeyFor,
  isE164,
  isValidPhone,
  normalizePhone,
  phoneFromAuthEmail,
  readDataFor,
  readRegistry,
  sortAccounts,
  touchAccount,
  writeRegistry,
  type Account,
} from './accounts';
import {
  deleteTreeRow,
  fetchAccount,
  fetchTrees,
  mergeTrees,
  saveAccountSettings,
  treesToPush,
  upsertTree,
} from './cloud';
import { cloudConfigured, supabase } from './supabase';
import { buildSampleTree, SAMPLE_TREE_ID } from './seed';
import { normalizePerson, type AppData, type Locale, type Person, type Settings, type Tree } from './types';

const UNDO_LIMIT = 40;

/** How long to wait after the last edit before writing to the cloud. Long
 *  enough that typing a name is one push, short enough that closing the tab
 *  straight after an edit still catches it. */
const PUSH_DELAY_MS = 1200;

const DEFAULT_SETTINGS: Settings = { locale: 'en', textScale: 1 };

/** Why a sign-in was refused. Each one has its own sentence on the screen. */
export type SignInError =
  | 'empty'
  | 'invalid'
  | 'needs-country-code'
  | 'no-password'
  | 'wrong'
  | 'inactive'
  | 'offline';

/** What the little sync line under the family list is allowed to say. */
export type SyncState = 'off' | 'idle' | 'syncing' | 'error';

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
      isPublic: !!tt.isPublic,
      cloudUid: tt.cloudUid ?? null,
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
  /** The Supabase user id, or null in local-only mode. */
  userId: string | null;
  /** Every number used on this device, most recently used first. */
  accounts: Account[];
  /** Whether there is a cloud to sync with at all. Wording depends on it. */
  cloudOn: boolean;
  syncState: SyncState;
  /** Returns why a number was refused, or null when it worked. */
  signIn: (phone: string, password: string) => Promise<SignInError | null>;
  signOut: () => Promise<void>;
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
  /** Let anyone with the link read this tree, or stop letting them. */
  setTreePublic: (id: string, isPublic: boolean) => void;

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
  const [userId, setUserId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(cloudConfigured() ? 'idle' : 'off');
  /* The language and text size the *device* last used. The sign-in screen has
     no families to read them from, and someone who reads Urdu must not be
     handed an English screen just because they signed out. */
  const [deviceSettings, setDeviceSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const undoStack = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  /* What we last saw in the cloud, per tree. The push effect compares against
     this instead of asking the server what it already has on every keystroke. */
  const cloudSeen = useRef<Map<string, { updatedAt: string; isPublic: boolean }>>(new Map());

  const rememberCloud = useCallback((trees: Tree[]) => {
    for (const t of trees) {
      cloudSeen.current.set(t.id, { updatedAt: t.updatedAt, isPublic: !!t.isPublic });
    }
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

  /**
   * Bring the cloud and the device into agreement, once, after signing in.
   *
   * The merge keeps whatever either side has - see `mergeTrees`. Anything the
   * cloud is missing or has an older copy of is then pushed, so a tree built
   * offline on this device reaches the cloud the moment there is a signal.
   */
  const firstSync = useCallback(
    async (uid: string, localTrees: Tree[]) => {
      const client = supabase();
      if (!client) return;
      setSyncState('syncing');
      try {
        const remote = await fetchTrees(client, uid);
        rememberCloud(remote);
        const merged = mergeTrees(localTrees, remote);
        setData((prev) => ({ ...prev, trees: merged }));

        for (const tree of treesToPush(merged, remote)) {
          const rowId = await upsertTree(client, uid, tree);
          cloudSeen.current.set(tree.id, { updatedAt: tree.updatedAt, isPublic: !!tree.isPublic });
          if (rowId) {
            setData((prev) => ({
              ...prev,
              trees: prev.trees.map((t) => (t.id === tree.id ? { ...t, cloudUid: rowId } : t)),
            }));
          }
        }
        setSyncState('idle');
      } catch {
        // Offline, or the row was refused. The device copy is untouched and the
        // push effect will try again on the next edit.
        setSyncState('error');
      }
    },
    [rememberCloud],
  );

  /* ---- load once, on the client -------------------------------------
   * Reading device storage has to wait until after mount: the server render
   * cannot see localStorage, so doing it any earlier would mismatch during
   * hydration. This is the intended shape for pulling in external state.
   */
  /* eslint-disable react-hooks/set-state-in-effect -- see note above */
  useEffect(() => {
    let cancelled = false;
    const reg = readRegistry(DEFAULT_SETTINGS);
    setAccounts(sortAccounts(reg.accounts));
    setDeviceSettings(reg.settings);

    /** Read whatever this number has on the device. */
    function localFor(phone: string): AppData | null {
      try {
        const raw = readDataFor(phone);
        return raw ? coerce(raw) : null;
      } catch {
        return null; // corrupt storage - start fresh rather than crash
      }
    }

    const client = supabase();
    if (!client) {
      // No cloud configured. Behave exactly as the app did before: the number
      // last used here opens straight back up.
      if (reg.activeNumber) {
        setData(localFor(reg.activeNumber) ?? { ...emptyData(), settings: { ...reg.settings } });
        setActiveNumber(reg.activeNumber);
      }
      setReady(true);
      return;
    }

    void client.auth
      .getSession()
      .then(async ({ data: sess }) => {
        if (cancelled) return;
        const user = sess.session?.user;
        if (!user) {
          // No session: AuthGate shows the sign-in screen. Any number left in
          // the registry is not enough to open somebody's families any more.
          setReady(true);
          return;
        }
        // The number lives in the derived auth address, which is the only place
        // it is guaranteed to be - a roster row is optional. A session whose
        // address is not one of ours is not something this app can place, so
        // treat it as signed out rather than guessing a number for it.
        const phone = phoneFromAuthEmail(user.email);
        if (!phone) {
          setReady(true);
          return;
        }
        const local = localFor(phone) ?? { ...emptyData(), settings: { ...reg.settings } };
        setData(local);
        setActiveNumber(phone);
        setUserId(user.id);
        setAccounts((prev) => sortAccounts(touchAccount(prev, phone)));
        setReady(true);
        await firstSync(user.id, local.trees);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [firstSync]);
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

  /* ---- and push it to the cloud, a moment later ----------------------
   * Debounced, because every keystroke in the name field is a state change and
   * none of them is worth its own request. Only trees that actually differ from
   * what the cloud last showed us are sent.
   */
  useEffect(() => {
    if (!ready || !userId) return;
    const client = supabase();
    if (!client) return;

    const pending = data.trees.filter((t) => {
      const seen = cloudSeen.current.get(t.id);
      return !seen || t.updatedAt > seen.updatedAt || !!t.isPublic !== seen.isPublic;
    });
    if (pending.length === 0) return;

    const timer = setTimeout(() => {
      void (async () => {
        setSyncState('syncing');
        try {
          for (const tree of pending) {
            const rowId = await upsertTree(client, userId, tree);
            cloudSeen.current.set(tree.id, {
              updatedAt: tree.updatedAt,
              isPublic: !!tree.isPublic,
            });
            // Learning the row id is not an edit, so it must not touch
            // `updatedAt` or the undo stack - otherwise syncing would look
            // like a change and push itself in a loop.
            if (rowId) {
              setData((prev) => ({
                ...prev,
                trees: prev.trees.map((t) => (t.id === tree.id ? { ...t, cloudUid: rowId } : t)),
              }));
            }
          }
          setSyncState('idle');
        } catch {
          setSyncState('error');
        }
      })();
    }, PUSH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [data.trees, ready, userId]);

  /* Which numbers have been used here, and who is on the device now. */
  useEffect(() => {
    if (!ready) return;
    writeRegistry({ version: 1, accounts, activeNumber, settings: deviceSettings });
  }, [ready, accounts, activeNumber, deviceSettings]);

  /* ---- signing in and out --------------------------------------------
   * The number is now a credential. There is no signup here: an account exists
   * because the owner created it and sent the person a password.
   */

  const signIn = useCallback(
    async (raw: string, password: string): Promise<SignInError | null> => {
      const phone = normalizePhone(raw);
      if (!phone.replace(/\D/g, '')) return 'empty';
      if (!isValidPhone(phone)) return 'invalid';

      const client = supabase();
      if (!client) {
        // Local-only mode: no password to check, and the number is a label
        // again. Kept so the app still runs with no keys configured.
        const stored = (() => {
          try {
            const raw2 = readDataFor(phone);
            return raw2 ? coerce(raw2) : null;
          } catch {
            return null;
          }
        })();
        let loaded = stored;
        if (!loaded && accounts.length === 0) {
          const legacy = claimLegacyData();
          if (legacy) {
            try {
              loaded = coerce(legacy);
              localStorage.setItem(dataKeyFor(phone), JSON.stringify(loaded));
              clearLegacyData();
            } catch {
              loaded = null;
            }
          }
        }
        setData(loaded ?? { ...emptyData(), settings: { ...deviceSettings } });
        if (loaded) setDeviceSettings(loaded.settings);
        setAccounts((prev) => sortAccounts(touchAccount(prev, phone)));
        undoStack.current = [];
        setCanUndo(false);
        setActiveNumber(phone);
        return null;
      }

      if (!password) return 'no-password';
      // The number has to be in full international form, because it is what the
      // auth address is derived from - and we refuse to guess a country code,
      // the same rule as `normalizePhone`. The link the owner sends has it.
      if (!isE164(phone)) return 'needs-country-code';

      let result;
      try {
        // Signed in through the email provider under a derived address; see the
        // note above `authEmailFor` for why this is not the phone provider.
        result = await client.auth.signInWithPassword({
          email: authEmailFor(phone),
          password,
        });
      } catch {
        return 'offline';
      }
      if (result.error || !result.data.user) return 'wrong';

      const user = result.data.user;

      // A number can be switched off without deleting anything, so check the
      // roster before letting them in.
      let account = null;
      try {
        account = await fetchAccount(client, user.id);
      } catch {
        account = null; // unreachable roster is not a reason to lock them out
      }
      if (account && !account.isActive) {
        await client.auth.signOut();
        return 'inactive';
      }

      let loaded: AppData | null = null;
      try {
        const stored = readDataFor(phone);
        if (stored) loaded = coerce(stored);
      } catch {
        loaded = null;
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
            loaded = null;
          }
        }
      }

      // Settings from the roster win over the device's, so the language a
      // person chose follows them onto a phone they have never used.
      const settings = account?.settings ?? loaded?.settings ?? { ...deviceSettings };
      const next: AppData = loaded
        ? { ...loaded, settings }
        : { ...emptyData(), settings };

      setData(next);
      setDeviceSettings(settings);
      setAccounts((prev) => sortAccounts(touchAccount(prev, phone)));
      undoStack.current = [];
      setCanUndo(false);
      cloudSeen.current = new Map();
      setActiveNumber(phone);
      setUserId(user.id);
      await firstSync(user.id, next.trees);
      return null;
    },
    [accounts.length, deviceSettings, firstSync],
  );

  const signOut = useCallback(async () => {
    // Nothing is deleted: the families stay filed under the number on this
    // device, and the cloud copy is untouched.
    const client = supabase();
    if (client) {
      try {
        await client.auth.signOut();
      } catch {
        // Already gone as far as this device is concerned; carry on clearing.
      }
    }
    undoStack.current = [];
    cloudSeen.current = new Map();
    setCanUndo(false);
    setUserId(null);
    setActiveNumber(null);
    setSyncState(cloudConfigured() ? 'idle' : 'off');
    setData({ ...emptyData(), settings: { ...deviceSettings } });
  }, [deviceSettings]);

  const forgetAccount = useCallback((raw: string) => {
    const phone = normalizePhone(raw);
    setAccounts((prev) => prev.filter((a) => a.phone !== phone));
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
        isPublic: false,
        cloudUid: null,
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
      // Deleting here deletes the cloud copy too, otherwise the next sync would
      // hand the tree straight back. Undo restores the local copy and the push
      // effect writes it out again.
      cloudSeen.current.delete(id);
      const client = supabase();
      if (client && userId) {
        void deleteTreeRow(client, userId, id).catch(() => setSyncState('error'));
      }
    },
    [mutate, userId],
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

  const setTreePublic = useCallback(
    (id: string, isPublic: boolean) => {
      // Sharing is a decision about the tree, not a change to it: `updatedAt`
      // stays put so this never wins a merge against somebody's real edit, and
      // it stays off the undo stack so Undo keeps meaning "undo my last edit".
      // The push effect watches the flag separately for exactly that reason.
      mutate((d) => {
        const t = d.trees.find((x) => x.id === id);
        if (!t) return;
        t.isPublic = isPublic;
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

  /* Mirrored three ways: onto the signed-in data, onto the device - so the
     sign-in screen, which has no families to read, opens the way it was left -
     and onto the roster row, so the choice follows the person to a new phone. */
  const pushSettings = useCallback(
    (settings: Settings) => {
      const client = supabase();
      if (!client || !userId) return;
      void saveAccountSettings(client, userId, settings).catch(() => {
        // A language that failed to reach the cloud is not worth a warning; it
        // is already right on this device and will go up with the next change.
      });
    },
    [userId],
  );

  const setLocale = useCallback(
    (locale: Locale) => {
      setDeviceSettings((prev) => {
        const next = { ...prev, locale };
        pushSettings(next);
        return next;
      });
      mutate((d) => { d.settings.locale = locale; }, false);
    },
    [mutate, pushSettings],
  );
  const setTextScale = useCallback(
    (textScale: number) => {
      setDeviceSettings((prev) => {
        const next = { ...prev, textScale };
        pushSettings(next);
        return next;
      });
      mutate((d) => { d.settings.textScale = textScale; }, false);
    },
    [mutate, pushSettings],
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
      userId,
      accounts,
      cloudOn: cloudConfigured(),
      syncState,
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
      setTreePublic,
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
      ready, activeNumber, userId, accounts, syncState, signIn, signOut, forgetAccount,
      deviceSettings, data, getTree, setLocale, setTextScale, createTree, addSampleTree,
      renameTree, deleteTree, setTreeField, setTreePublic, addPerson, updatePerson,
      reorderChildren, deletePerson,
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
