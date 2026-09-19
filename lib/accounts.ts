/** Who the app is currently showing data for.
 *
 *  There is no server, no password and no code to type in - a phone number is
 *  simply the label a pile of families is filed under on this device. Someone
 *  hands the tablet to their brother, he types his own number, and he gets his
 *  own families. Nothing leaves the device and nothing is verified; the sign-in
 *  screen says as much so nobody mistakes it for a real account.
 *
 *  Deliberately free of React so the rules can be reasoned about (and one day
 *  tested) on their own.
 */

import type { Settings } from './types';

/** Where a single number's families live. */
const DATA_PREFIX = 'family-tree-app/v1/';

/** The list of numbers used here, plus who is signed in. */
const REGISTRY_KEY = 'family-tree-app/accounts/v1';

/** Where everything lived before numbers existed. See `claimLegacyData`. */
export const LEGACY_DATA_KEY = 'family-tree-app/v1';

export interface Account {
  /** Normalised - this is also the storage key and what the UI shows. */
  phone: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface Registry {
  version: 1;
  accounts: Account[];
  activeNumber: string | null;
  /** Last settings seen, so the sign-in screen opens in the right language. */
  settings: Settings;
}

/**
 * Reduce what was typed to just its digits, keeping a leading `+`.
 *
 * People write the same number a dozen ways - `0300 123 4567`,
 * `+92-300-123-4567`, `(0300) 1234567`. Spaces, dashes and brackets are
 * dropped so all of those reach the same families. A country code is *not*
 * guessed at: `+92300...` and `0300...` stay different numbers, because
 * guessing wrong would show somebody a stranger's tree.
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  return (trimmed.startsWith('+') ? '+' : '') + digits;
}

/** Loose on purpose: long enough to be a phone number, short enough to be one. */
export function isValidPhone(normalized: string): boolean {
  const digits = normalized.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Whether a number is in full international form, which Supabase requires.
 *
 * Checked rather than fixed, on purpose. `normalizePhone` refuses to guess a
 * country code because guessing wrong would aim somebody at a stranger's
 * account; the same reasoning applies here, so a number without one is sent
 * back to the user to complete. The link the owner sends already carries it.
 */
export function isE164(normalized: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(normalized);
}

export function dataKeyFor(phone: string): string {
  return DATA_PREFIX + encodeURIComponent(phone);
}

function defaultRegistry(settings: Settings): Registry {
  return { version: 1, accounts: [], activeNumber: null, settings: { ...settings } };
}

/** Read the registry, treating anything unreadable as "nobody has signed in". */
export function readRegistry(fallbackSettings: Settings): Registry {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return defaultRegistry(fallbackSettings);
    const parsed = JSON.parse(raw) as Partial<Registry> | null;
    const accounts: Account[] = (Array.isArray(parsed?.accounts) ? parsed.accounts : [])
      .map((a) => {
        const phone = normalizePhone(String((a as Account)?.phone ?? ''));
        return {
          phone,
          createdAt: (a as Account)?.createdAt || new Date().toISOString(),
          lastUsedAt: (a as Account)?.lastUsedAt || new Date().toISOString(),
        };
      })
      .filter((a) => isValidPhone(a.phone));

    // A number listed twice would give two rows opening the same families.
    const seen = new Set<string>();
    const unique = accounts.filter((a) => !seen.has(a.phone) && seen.add(a.phone));

    const active = parsed?.activeNumber ? normalizePhone(parsed.activeNumber) : null;
    const s = (parsed?.settings ?? {}) as Partial<Settings>;
    return {
      version: 1,
      accounts: unique,
      activeNumber: active && unique.some((a) => a.phone === active) ? active : null,
      settings: {
        locale: s.locale === 'ur' ? 'ur' : fallbackSettings.locale,
        textScale: [1, 1.15, 1.3].includes(Number(s.textScale))
          ? Number(s.textScale)
          : fallbackSettings.textScale,
      },
    };
  } catch {
    return defaultRegistry(fallbackSettings);
  }
}

export function writeRegistry(reg: Registry): void {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
  } catch {
    // Private mode or a full quota. The app still works for this session;
    // the backup file in Settings is the documented way out.
  }
}

/** Newest use first, so the number somebody last used is the easiest to tap. */
export function sortAccounts(accounts: Account[]): Account[] {
  return [...accounts].sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
}

export function touchAccount(accounts: Account[], phone: string): Account[] {
  const now = new Date().toISOString();
  const existing = accounts.find((a) => a.phone === phone);
  const rest = accounts.filter((a) => a.phone !== phone);
  return [{ phone, createdAt: existing?.createdAt ?? now, lastUsedAt: now }, ...rest];
}

export function readDataFor(phone: string): unknown | null {
  try {
    const raw = localStorage.getItem(dataKeyFor(phone));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Hand the pre-numbers data to the first number that signs in.
 *
 * Before this screen existed, every family on the device sat under one key.
 * Whoever was using the app is whoever is now typing their number first, so
 * they keep their trees; the old key is then cleared so the same families
 * cannot also turn up under a second number later.
 */
export function claimLegacyData(): unknown | null {
  try {
    const raw = localStorage.getItem(LEGACY_DATA_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearLegacyData(): void {
  try {
    localStorage.removeItem(LEGACY_DATA_KEY);
  } catch {
    /* nothing useful to do */
  }
}

/** Enough to show "3 families · 85 people" beside a number without loading it. */
export function summarise(phone: string): { trees: number; people: number } {
  const raw = readDataFor(phone) as { trees?: { people?: unknown[] }[] } | null;
  const trees = Array.isArray(raw?.trees) ? raw.trees : [];
  return {
    trees: trees.length,
    people: trees.reduce((n, t) => n + (Array.isArray(t?.people) ? t.people.length : 0), 0),
  };
}
