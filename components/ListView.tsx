'use client';

import { useMemo, useState } from 'react';
import { Avatar, Button } from '@/components/ui';
import { lifespan } from '@/lib/family';
import { altName, displayName, t } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import type { Tree } from '@/lib/types';

/** A plain alphabetical list with a search box. No chart, no gestures - the
 *  fallback for anyone who would rather just read names. */
export function ListView({
  tree,
  onOpen,
  onAddPerson,
}: {
  tree: Tree;
  onOpen: (id: string) => void;
  /* Absent on the shared-link page - there is nobody to add to a family that
     is not yours, so the button goes with it. */
  onAddPerson?: () => void;
}) {
  const { settings } = useApp();
  const s = t(settings.locale);
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? tree.people.filter((p) =>
          `${p.name} ${p.nameUr ?? ''} ${p.title ?? ''} ${p.notes ?? ''}`
            .toLowerCase()
            .includes(q),
        )
      : tree.people;
    return [...filtered].sort((a, b) =>
      displayName(a, settings.locale).localeCompare(displayName(b, settings.locale)),
    );
  }, [tree.people, query, settings.locale]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={s.searchHint}
          aria-label={s.search}
          className="tap min-w-0 flex-1 rounded-xl border-2 border-line bg-card px-4 text-lg text-ink placeholder:text-ink-faint focus:border-brand"
        />
        {onAddPerson && (
          <Button variant="primary" onClick={onAddPerson}>
            + {s.addPerson}
          </Button>
        )}
      </div>

      <p className="mb-2 text-base text-ink-soft">
        {query ? `${rows.length} / ${tree.people.length}` : s.everyone}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-xl text-ink-soft">
          {query ? s.noResults : s.noneYet}
        </p>
      ) : (
        <ul className="grid gap-2">
          {rows.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpen(p.id)}
                className="tap flex w-full items-center gap-3 rounded-2xl border-2 border-line bg-card px-4 py-3 text-start hover:border-brand"
              >
                <Avatar name={p.name} gender={p.gender} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xl font-semibold">
                    {displayName(p, settings.locale)}
                  </span>
                  <span className="block truncate text-base text-ink-soft">
                    {[
                      settings.locale === 'ur' ? p.titleUr || p.title : p.title,
                      lifespan(p),
                      altName(p, settings.locale),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
