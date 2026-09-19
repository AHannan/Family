'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { lineageOf, searchPeople } from '@/lib/family';
import { displayName, t } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import type { Person } from '@/lib/types';

/** How many names a list shows before it asks the user to keep typing. */
const MAX_ROWS = 40;

/**
 * A name with the line it sits on: father (or mother) on one side, first child
 * on the other, with the person themselves in the middle.
 *
 *     Rashid  ›  Imran  ›  Bilal
 *
 * A family is full of repeated names, so a name on its own does not identify
 * anybody - this is what makes a search result pickable without opening it.
 * The chevron flips with the page direction, so in Urdu the father still reads
 * first, on the right.
 */
export function Lineage({
  people,
  id,
  compact,
  className = '',
}: {
  people: Person[];
  id: string;
  /** Smaller type, for a dropdown row rather than a list row. */
  compact?: boolean;
  className?: string;
}) {
  const { settings } = useApp();
  const { parent, person, child } = lineageOf(people, id);
  if (!person) return null;

  const main = compact ? 'text-lg font-semibold' : 'text-xl font-semibold';
  const side = compact ? 'text-sm' : 'text-base';

  return (
    <span className={`flex min-w-0 items-baseline gap-1.5 ${className}`}>
      {parent && (
        <>
          <span className={`max-w-[8rem] truncate text-ink-soft ${side}`}>
            {displayName(parent, settings.locale)}
          </span>
          <Chevron />
        </>
      )}
      <span className={`min-w-0 truncate text-ink ${main}`}>
        {displayName(person, settings.locale)}
      </span>
      {child && (
        <>
          <Chevron />
          <span className={`max-w-[8rem] truncate text-ink-soft ${side}`}>
            {displayName(child, settings.locale)}
          </span>
        </>
      )}
    </span>
  );
}

function Chevron() {
  return (
    <span aria-hidden="true" className="shrink-0 text-ink-faint rtl:-scale-x-100">
      ›
    </span>
  );
}

/**
 * Pick somebody out of the whole tree by typing their name.
 *
 * This replaces a `<select>` of every person: a dropdown of two hundred bare
 * names is unusable on a phone, and half of them read the same. The box shows
 * who is chosen now, selects that text when it is tapped so typing replaces
 * it, and lists whoever matches with their line around them. Leaving the box
 * without picking puts the current name back - nothing is ever cleared by
 * walking away from it.
 */
export function PersonSearchField({
  people,
  valueId,
  onPick,
  label,
  className = '',
}: {
  people: Person[];
  valueId: string | null;
  onPick: (person: Person) => void;
  label: string;
  className?: string;
}) {
  const { settings } = useApp();
  const s = t(settings.locale);
  const inputId = useId();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  /** null means "not typing yet" - the box is showing the current choice. */
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  const current = people.find((p) => p.id === valueId) ?? null;
  const text = query ?? (current ? displayName(current, settings.locale) : '');

  // No query yet means the box was only tapped, so it stands in for the old
  // dropdown and offers everybody.
  const matches = useMemo(
    () => (query === null || !query.trim() ? people : searchPeople(people, query, MAX_ROWS + 1)),
    [people, query],
  );
  const rows = matches.slice(0, MAX_ROWS);
  const more = matches.length > rows.length;

  function close() {
    setOpen(false);
    setQuery(null);
    setActive(0);
  }

  function pick(person: Person) {
    onPick(person);
    close();
    input.current?.blur();
  }

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      // Losing focus to anything outside - including a tap on the page - puts
      // the box back the way it was. A tap on a row lands inside, so the list
      // is still there for the click that follows.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close();
      }}
    >
      <label htmlFor={inputId} className="shrink-0 text-base font-semibold text-ink-soft">
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          ref={input}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && rows[active] ? `${listId}-${rows[active].id}` : undefined}
          autoComplete="off"
          value={text}
          placeholder={s.searchHint}
          onFocus={(e) => {
            setOpen(true);
            e.target.select();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setOpen(true);
              setActive((i) => {
                const n = rows.length;
                if (!n) return 0;
                return e.key === 'ArrowDown' ? (i + 1) % n : (i - 1 + n) % n;
              });
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (open && rows[active]) pick(rows[active]);
            } else if (e.key === 'Escape') {
              close();
            }
          }}
          className="tap w-56 rounded-xl border-2 border-line bg-card px-3 text-lg text-ink placeholder:text-ink-faint focus:border-brand"
        />

        {open && (
          <div
            id={listId}
            role="listbox"
            aria-label={s.search}
            className="absolute start-0 top-[calc(100%+0.375rem)] z-50 max-h-[22rem] w-[min(24rem,80vw)] overflow-y-auto rounded-2xl border-2 border-line bg-card p-1.5 shadow-2xl"
          >
            {rows.length === 0 ? (
              <p className="px-3 py-4 text-lg text-ink-soft">{s.noResults}</p>
            ) : (
              <ul>
                {rows.map((p, i) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      id={`${listId}-${p.id}`}
                      role="option"
                      aria-selected={p.id === valueId}
                      onMouseEnter={() => setActive(i)}
                      // Keep the caret in the box: a button that never takes
                      // focus cannot blur the input out from under its own
                      // click, which is what Safari does otherwise.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(p)}
                      className={`tap flex w-full items-center rounded-xl px-3 text-start ${
                        i === active ? 'bg-sunk' : ''
                      } ${p.id === valueId ? 'ring-2 ring-brand' : ''}`}
                    >
                      <Lineage people={people} id={p.id} compact />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {more && <p className="px-3 py-2 text-sm text-ink-faint">{s.searchMore}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
