'use client';

import { useState } from 'react';
import { Avatar, Button, Confirm, Sheet } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { childrenOf, lifespan, siblingsOf, spousesOf, type RelationKind } from '@/lib/family';
import { altName, displayName, t } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import type { Person, Tree } from '@/lib/types';

/**
 * Everything about one person, and every action that can be taken on them.
 *
 * Add buttons are spelled out as relationships ("Add son") rather than as a
 * generic "new record", so nobody has to work out what a field means before
 * they can use it.
 */
export function PersonSheet({
  tree,
  personId,
  onClose,
  onFocus,
  onEdit,
  onAdd,
}: {
  tree: Tree;
  personId: string | null;
  onClose: () => void;
  onFocus: (id: string) => void;
  onEdit: (id: string) => void;
  onAdd: (kind: RelationKind, toId: string) => void;
}) {
  const { settings, deletePerson, linkSpouse, unlinkSpouse, undo } = useApp();
  const s = t(settings.locale);
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  const person = tree.people.find((p) => p.id === personId);
  if (!person) return null;

  const father = tree.people.find((p) => p.id === person.fatherId);
  const mother = tree.people.find((p) => p.id === person.motherId);
  const spouses = spousesOf(tree.people, person.id);
  const kids = childrenOf(tree.people, person.id);
  const sibs = siblingsOf(tree.people, person.id);
  const title = settings.locale === 'ur' ? person.titleUr || person.title : person.title;

  function go(id: string) {
    onFocus(id);
    onClose();
  }

  return (
    <>
      <Sheet
        open
        title={displayName(person, settings.locale)}
        onClose={onClose}
        footer={
          <>
            <Button onClick={() => onEdit(person!.id)}>{s.edit}</Button>
            <Button variant="danger" onClick={() => setConfirming(true)}>
              {s.remove}
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-4">
          <Avatar name={person.name} gender={person.gender} size="lg" />
          <div className="min-w-0">
            <p className="text-2xl font-bold leading-tight">
              {displayName(person, settings.locale)}
            </p>
            {altName(person, settings.locale) && (
              <p
                className="text-xl text-ink-soft"
                lang={settings.locale === 'ur' ? 'en' : 'ur'}
                dir={settings.locale === 'ur' ? 'ltr' : 'rtl'}
              >
                {altName(person, settings.locale)}
              </p>
            )}
            {title && <p className="text-lg italic text-gold">{title}</p>}
            {lifespan(person) && <p className="text-lg text-ink-soft">{lifespan(person)}</p>}
          </div>
        </div>

        {person.notes && (
          <p className="mt-4 rounded-2xl border-2 border-line-soft bg-paper p-4 text-lg leading-relaxed">
            {person.notes}
          </p>
        )}

        <Group title={s.parents}>
          {father ? (
            <Chip person={father} onClick={() => go(father.id)} />
          ) : (
            <AddChip label={s.addFather} onClick={() => onAdd('father', person.id)} />
          )}
          {mother ? (
            <Chip person={mother} onClick={() => go(mother.id)} />
          ) : (
            <AddChip label={s.addMother} onClick={() => onAdd('mother', person.id)} />
          )}
        </Group>

        <Group title={s.marriedTo}>
          {spouses.map((sp) => (
            <span key={sp.id} className="inline-flex">
              <Chip person={sp} onClick={() => go(sp.id)} joined />
              <button
                type="button"
                aria-label={`${s.remove}: ${displayName(sp, settings.locale)}`}
                onClick={() => {
                  unlinkSpouse(tree.id, person.id, sp.id);
                  toast.show(s.saved, { label: s.undo, onAction: () => undo() });
                }}
                className="tap rounded-e-2xl border-2 border-s-0 border-line px-3 text-lg text-ink-faint hover:bg-danger hover:text-white"
              >
                ✕
              </button>
            </span>
          ))}
          <AddChip
            label={person.gender === 'f' ? s.addHusband : s.addWife}
            onClick={() => onAdd(person.gender === 'f' ? 'husband' : 'wife', person.id)}
          />
        </Group>

        {/* Marrying two people who are both already in the tree is common
            enough - cousins, in-laws - to deserve its own control. */}
        {tree.people.length > 1 && (
          <label className="mt-2 block">
            <span className="mb-1 block text-base font-semibold text-ink-soft">
              {s.linkExisting}
            </span>
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                linkSpouse(tree.id, person.id, e.target.value);
                toast.show(s.saved, { label: s.undo, onAction: () => undo() });
                e.target.value = '';
              }}
              className="tap w-full rounded-xl border-2 border-line bg-card px-4 text-lg"
            >
              <option value="">{s.choosePerson}</option>
              {tree.people
                .filter((p) => p.id !== person.id && !person.spouseIds.includes(p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {displayName(p, settings.locale)}
                  </option>
                ))}
            </select>
          </label>
        )}

        <Group title={`${s.children}${kids.length ? ` (${kids.length})` : ''}`}>
          {kids.map((k) => (
            <Chip key={k.id} person={k} onClick={() => go(k.id)} />
          ))}
          <AddChip label={s.addSon} onClick={() => onAdd('son', person.id)} />
          <AddChip label={s.addDaughter} onClick={() => onAdd('daughter', person.id)} />
        </Group>

        {sibs.length > 0 && (
          <Group title={`${s.siblings} (${sibs.length})`}>
            {sibs.map((b) => (
              <Chip key={b.id} person={b} onClick={() => go(b.id)} />
            ))}
          </Group>
        )}
      </Sheet>

      <Confirm
        open={confirming}
        title={s.removePerson}
        message={
          kids.length
            ? s.removeConfirmChildren(displayName(person, settings.locale), kids.length)
            : s.removeConfirm(displayName(person, settings.locale))
        }
        confirmLabel={s.confirm}
        cancelLabel={s.cancel}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          const label = displayName(person, settings.locale);
          deletePerson(tree.id, person.id);
          setConfirming(false);
          onClose();
          toast.show(s.personRemoved(label), { label: s.undo, onAction: () => undo() });
        }}
      />
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-base font-bold uppercase tracking-wide text-ink-faint">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function Chip({
  person,
  onClick,
  joined,
}: {
  person: Person;
  onClick: () => void;
  joined?: boolean;
}) {
  const { settings } = useApp();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap inline-flex items-center gap-2 border-2 border-line bg-card px-4 text-lg font-semibold hover:border-brand ${
        joined ? 'rounded-s-2xl border-e-0' : 'rounded-2xl'
      }`}
    >
      <Avatar name={person.name} gender={person.gender} size="sm" />
      {displayName(person, settings.locale)}
    </button>
  );
}

function AddChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap inline-flex items-center gap-1.5 rounded-2xl border-2 border-dashed border-line px-4 text-lg font-semibold text-ink-soft hover:border-brand hover:bg-brand-soft hover:text-brand"
    >
      <span aria-hidden="true" className="text-xl leading-none">
        +
      </span>
      {label}
    </button>
  );
}
