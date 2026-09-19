'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChartView } from '@/components/ChartView';
import { FamilyView } from '@/components/FamilyView';
import { LanguageToggle } from '@/components/Header';
import { ListView } from '@/components/ListView';
import { PersonSheet } from '@/components/PersonSheet';
import { fetchPublicTree } from '@/lib/cloud';
import { displayName, t } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import type { Tree } from '@/lib/types';

type ViewName = 'family' | 'chart' | 'list';

/**
 * A shared family, read only.
 *
 * This is the one page that opens without an account - see `AuthGate`. It holds
 * the tree in its own state rather than in the store, which is what makes it
 * read only: none of the store's mutations can reach a tree that is not in
 * `data.trees`, so there is no "add" or "delete" path to guard. Walking between
 * relatives and switching views are local state here, so a visitor can explore
 * the family without changing anybody's data.
 *
 * Only a row with `is_public` set comes back at all; RLS decides that, not this
 * component, so a link to a family that has stopped being shared simply finds
 * nothing.
 */
export default function SharedTreePage() {
  const params = useParams<{ uid: string }>();
  const { settings } = useApp();
  const s = t(settings.locale);

  const [tree, setTree] = useState<Tree | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [view, setView] = useState<ViewName>('family');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [sheetPersonId, setSheetPersonId] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- fetching needs the client */
  useEffect(() => {
    let cancelled = false;
    const client = supabase();
    if (!client) {
      setState('missing');
      return;
    }
    void fetchPublicTree(client, params.uid)
      .then((found) => {
        if (cancelled) return;
        if (!found) {
          setState('missing');
          return;
        }
        setTree(found);
        setFocusId(found.focusId ?? found.rootId ?? found.people[0]?.id ?? null);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [params.uid]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const focus = tree?.people.find((p) => p.id === focusId) ?? null;
  const title = tree
    ? displayName({ name: tree.name, nameUr: tree.nameUr }, settings.locale)
    : s.publicHeading;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b-2 border-line bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold">{title}</h1>
            <p className="truncate text-base text-ink-faint">{s.publicHeading}</p>
          </div>
          <LanguageToggle />
        </div>
      </header>

      {state === 'loading' && (
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 text-center">
          <p className="text-xl text-ink-soft">{s.publicLoading}</p>
        </main>
      )}

      {state === 'missing' && (
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
          <div className="rounded-3xl border-2 border-dashed border-line bg-card p-8 text-center">
            <p className="text-2xl font-bold">{s.publicNotFound}</p>
          </div>
        </main>
      )}

      {state === 'ready' && tree && (
        <>
          <div className="border-b-2 border-line bg-card px-4 py-2">
            <div
              role="tablist"
              aria-label={s.viewFamily}
              className="mx-auto flex max-w-6xl gap-1 rounded-2xl bg-sunk p-1"
            >
              {(
                [
                  ['family', s.viewFamily],
                  ['chart', s.viewChart],
                  ['list', s.viewList],
                ] as [ViewName, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  type="button"
                  aria-selected={view === key}
                  onClick={() => setView(key)}
                  className={`tap flex-1 rounded-xl text-lg font-semibold transition-colors ${
                    view === key ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
            <p className="mb-4 rounded-2xl border-2 border-line bg-sunk p-3 text-base text-ink-soft">
              {s.publicNote}
            </p>

            {view === 'family' && focus ? (
              <FamilyView
                tree={tree}
                focus={focus}
                onFocus={setFocusId}
                /* There is nothing to add to somebody else's family, so every
                   empty slot is simply absent here rather than a dead button. */
                onAdd={() => {}}
                onOpen={setSheetPersonId}
                readOnly
              />
            ) : view === 'chart' ? (
              <ChartView tree={tree} focusId={focusId} onOpen={setSheetPersonId} />
            ) : (
              <ListView tree={tree} onOpen={setSheetPersonId} />
            )}
          </main>

          <PersonSheet
            tree={tree}
            personId={sheetPersonId}
            onClose={() => setSheetPersonId(null)}
            onFocus={setFocusId}
            onAdd={() => {}}
            readOnly
          />
        </>
      )}
    </div>
  );
}
