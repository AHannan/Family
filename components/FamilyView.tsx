'use client';

import { ReorderList } from '@/components/ReorderList';
import { useToast } from '@/components/Toast';
import { Avatar, Button } from '@/components/ui';

import { childrenOf, lifespan, siblingsOf, spousesOf, type RelationKind } from '@/lib/family';
import { altName, displayName, t } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import type { Person, Tree } from '@/lib/types';

/**
 * The default view, and the one built for someone who has never used software
 * like this.
 *
 * It shows one person at a time with their immediate family around them -
 * parents above, husband or wife beside, children below - instead of a chart
 * that has to be panned and zoomed. Tapping any relative walks to them, so the
 * whole tree is reachable without ever touching a zoom control, and every
 * empty slot is an obvious labelled button rather than a blank space.
 */
export function FamilyView({
  tree,
  focus,
  onFocus,
  onAdd,
  onOpen,
}: {
  tree: Tree;
  focus: Person;
  onFocus: (id: string) => void;
  onAdd: (kind: RelationKind, toId: string) => void;
  onOpen: (id: string) => void;
}) {
  const { settings, reorderChildren, undo } = useApp();
  const toast = useToast();
  const s = t(settings.locale);

  const father = tree.people.find((p) => p.id === focus.fatherId);
  const mother = tree.people.find((p) => p.id === focus.motherId);
  const spouses = spousesOf(tree.people, focus.id);
  const kids = childrenOf(tree.people, focus.id);
  const sibs = siblingsOf(tree.people, focus.id);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-5">
      <p className="mb-4 text-center text-base text-ink-faint">{s.familyViewHint}</p>

      {/* ---- parents ---- */}
      <Section title={s.parents}>
        <div className="grid gap-3 sm:grid-cols-2">
          {father ? (
            <RelativeButton person={father} onClick={() => onFocus(father.id)} role={s.father} />
          ) : (
            <AddSlot label={s.addFather} onClick={() => onAdd('father', focus.id)} />
          )}
          {mother ? (
            <RelativeButton person={mother} onClick={() => onFocus(mother.id)} role={s.mother} />
          ) : (
            <AddSlot label={s.addMother} onClick={() => onAdd('mother', focus.id)} />
          )}
        </div>
      </Section>

      <Connector />

      {/* ---- the person, and whoever they married ---- */}
      <div className="grid items-stretch gap-3 sm:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border-4 border-brand bg-card p-5 text-center">
          <div className="flex justify-center">
            <Avatar name={focus.name} gender={focus.gender} size="lg" />
          </div>
          <h2 className="mt-3 text-3xl font-bold leading-tight">
            {displayName(focus, settings.locale)}
          </h2>
          {altName(focus, settings.locale) && (
            <p
              className="text-xl text-ink-soft"
              lang={settings.locale === 'ur' ? 'en' : 'ur'}
              dir={settings.locale === 'ur' ? 'ltr' : 'rtl'}
            >
              {altName(focus, settings.locale)}
            </p>
          )}
          {(settings.locale === 'ur' ? focus.titleUr || focus.title : focus.title) && (
            <p className="mt-1 text-lg italic text-gold">
              {settings.locale === 'ur' ? focus.titleUr || focus.title : focus.title}
            </p>
          )}
          {lifespan(focus) && <p className="mt-1 text-lg text-ink-soft">{lifespan(focus)}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => onOpen(focus.id)}>{s.personDetails}</Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-base font-semibold text-ink-soft">{s.marriedTo}</p>
          {spouses.map((sp) => (
            <RelativeButton key={sp.id} person={sp} onClick={() => onFocus(sp.id)} />
          ))}
          <AddSlot
            label={focus.gender === 'f' ? s.addHusband : s.addWife}
            onClick={() => onAdd(focus.gender === 'f' ? 'husband' : 'wife', focus.id)}
            compact
          />
        </div>
      </div>

      <Connector />

      {/* ---- children ----
          Nothing can work out who is the eldest - the dates are free text and
          often missing - so the order is whatever the user puts it in, and
          that order is what the chart draws. */}
      <Section title={`${s.children}${kids.length ? ` (${kids.length})` : ''}`}>
        {kids.length > 1 ? (
          <>
            <p className="mb-2 text-base text-ink-faint">{s.reorderHint}</p>
            <ReorderList
              key={focus.id}
              items={kids}
              className="grid gap-3 sm:grid-cols-2"
              rtl={settings.locale === 'ur'}
              moveLabel={s.move}
              moveLabelFor={(k) => s.movePerson(displayName(k, settings.locale))}
              describeMove={(n, total) => s.movedTo(n, total)}
              onReorder={(orderedIds) => {
                reorderChildren(tree.id, focus.id, orderedIds);
                toast.show(s.orderSaved, { label: s.undo, onAction: () => undo() });
              }}
              renderItem={(k) => (
                <RelativeButton person={k} onClick={() => onFocus(k.id)} />
              )}
            />
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {kids.map((k) => (
              <RelativeButton key={k.id} person={k} onClick={() => onFocus(k.id)} />
            ))}
          </div>
        )}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <AddSlot label={s.addSon} onClick={() => onAdd('son', focus.id)} />
          <AddSlot label={s.addDaughter} onClick={() => onAdd('daughter', focus.id)} />
        </div>
      </Section>

      {/* ---- brothers and sisters ---- */}
      <Section title={`${s.siblings}${sibs.length ? ` (${sibs.length})` : ''}`}>
        {sibs.length > 0 && (
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            {sibs.map((b) => (
              <RelativeButton key={b.id} person={b} onClick={() => onFocus(b.id)} />
            ))}
          </div>
        )}
        {(focus.fatherId || focus.motherId) && (
          <div className="grid gap-3 sm:grid-cols-2">
            <AddSlot label={s.addBrother} onClick={() => onAdd('brother', focus.id)} />
            <AddSlot label={s.addSister} onClick={() => onAdd('sister', focus.id)} />
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="mb-2 text-lg font-bold text-ink-soft">{title}</h3>
      {children}
    </section>
  );
}

/** Short vertical rule that ties the three bands together visually. */
function Connector() {
  return (
    <div aria-hidden="true" className="mx-auto my-1 h-6 w-1 rounded bg-line" />
  );
}

function RelativeButton({
  person,
  onClick,
  role,
}: {
  person: Person;
  onClick: () => void;
  role?: string;
}) {
  const { settings } = useApp();
  const span = lifespan(person);
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap flex w-full items-center gap-3 rounded-2xl border-2 border-line bg-card px-4 py-3 text-start transition-colors hover:border-brand"
    >
      <Avatar name={person.name} gender={person.gender} />
      <span className="min-w-0 flex-1">
        {role && <span className="block text-sm font-semibold text-ink-faint">{role}</span>}
        <span className="block truncate text-xl font-semibold">
          {displayName(person, settings.locale)}
        </span>
        {span && <span className="block truncate text-base text-ink-soft">{span}</span>}
      </span>
    </button>
  );
}

function AddSlot({
  label,
  onClick,
  compact,
}: {
  label: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-transparent px-4 text-lg font-semibold text-ink-soft transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand ${
        compact ? 'py-3' : 'py-4'
      }`}
    >
      <span aria-hidden="true" className="text-2xl leading-none">
        +
      </span>
      {label}
    </button>
  );
}
