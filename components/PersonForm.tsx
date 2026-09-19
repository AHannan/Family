'use client';

import { useState } from 'react';
import { Button, Segmented, SelectField, Sheet, TextArea, TextField } from '@/components/ui';
import { RELATION_GENDER, type RelationKind } from '@/lib/family';
import { displayName, t } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import type { Gender, Person } from '@/lib/types';

export interface FormTarget {
  /** Editing an existing person, or adding a new one. */
  mode: 'add' | 'edit';
  personId?: string;
  /** Present when adding from someone's card, e.g. "add son of Rashid". */
  relation?: { kind: RelationKind; toId: string };
}

const BLANK = {
  name: '',
  nameUr: '',
  title: '',
  gender: '' as Gender,
  birth: '',
  death: '',
  notes: '',
  fatherId: '',
  motherId: '',
};

function initialValues(target: FormTarget | null, editing: Person | undefined) {
  if (editing) {
    return {
      name: editing.name,
      nameUr: editing.nameUr ?? '',
      title: editing.title ?? '',
      gender: editing.gender,
      birth: editing.birth ?? '',
      death: editing.death ?? '',
      notes: editing.notes ?? '',
      fatherId: editing.fatherId ?? '',
      motherId: editing.motherId ?? '',
    };
  }
  return {
    ...BLANK,
    // "Add daughter" already tells us the gender; do not ask again.
    gender: target?.relation ? RELATION_GENDER[target.relation.kind] : ('' as Gender),
  };
}

/** Identity of whatever the form is open for - drives the remount key. */
export function formKey(target: FormTarget | null): string {
  if (!target) return 'none';
  return [target.mode, target.personId ?? '', target.relation?.kind ?? '', target.relation?.toId ?? ''].join(':');
}

/**
 * One form for both adding and editing.
 *
 * When it opens from "Add son", the relationship is already decided, so the
 * parent pickers are hidden entirely - the user answers one question (the
 * name) instead of being handed a form full of fields they did not ask for.
 * The pickers only appear when adding somebody unattached.
 */
export function PersonForm({
  treeId,
  target,
  onClose,
  onSaved,
}: {
  treeId: string;
  target: FormTarget | null;
  onClose: () => void;
  onSaved?: (person: Person) => void;
}) {
  const { getTree, settings, addPerson, updatePerson } = useApp();
  const s = t(settings.locale);
  const tree = getTree(treeId);
  const people = tree?.people ?? [];
  const editing = target?.mode === 'edit' ? people.find((p) => p.id === target.personId) : undefined;
  const anchor = target?.relation ? people.find((p) => p.id === target.relation!.toId) : undefined;

  // The parent gives this component a key derived from `target`, so it
  // remounts whenever the form is opened for someone else. That means the
  // initial values can be computed once here instead of being synced back in
  // from an effect on every change.
  const [form, setForm] = useState(() => initialValues(target, editing));
  const [error, setError] = useState('');

  if (!target || !tree) return null;

  const relationKind = target.relation?.kind;
  const titleText = editing
    ? `${s.edit}: ${displayName(editing, settings.locale)}`
    : relationKind && anchor
      ? `${relationLabel(relationKind, s)} — ${displayName(anchor, settings.locale)}`
      : s.addPerson;

  function save() {
    if (!form.name.trim()) {
      setError(s.nameRequired);
      return;
    }
    const payload: Partial<Person> = {
      name: form.name,
      nameUr: form.nameUr,
      title: form.title,
      gender: form.gender,
      birth: form.birth,
      death: form.death,
      notes: form.notes,
    };
    if (editing) {
      updatePerson(treeId, editing.id, {
        ...payload,
        fatherId: form.fatherId || null,
        motherId: form.motherId || null,
      });
      onSaved?.({ ...editing, ...payload } as Person);
    } else {
      if (!target!.relation) {
        payload.fatherId = form.fatherId || null;
        payload.motherId = form.motherId || null;
      }
      const created = addPerson(treeId, payload, target!.relation);
      if (created) onSaved?.(created);
    }
    onClose();
  }

  const showParentPickers = !!editing || !target.relation;

  return (
    <Sheet
      open
      title={titleText}
      closeLabel={s.close}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{s.cancel}</Button>
          <Button variant="primary" onClick={save}>
            {s.save}
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <TextField
          label={s.name}
          value={form.name}
          error={error}
          autoFocus
          autoComplete="off"
          onChange={(e) => {
            setForm({ ...form, name: e.target.value });
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
        />

        <TextField
          label={s.nameUr}
          value={form.nameUr}
          dir="rtl"
          lang="ur"
          autoComplete="off"
          onChange={(e) => setForm({ ...form, nameUr: e.target.value })}
        />

        {/* Already answered by "Add son" / "Add wife" and friends. */}
        {!relationKind && (
          <div>
            <p className="mb-1 text-base font-semibold text-ink-soft">{s.gender}</p>
            <Segmented
              label={s.gender}
              value={form.gender}
              onChange={(gender) => setForm({ ...form, gender })}
              options={[
                { value: 'm' as Gender, label: s.male },
                { value: 'f' as Gender, label: s.female },
                { value: '' as Gender, label: s.unspecified },
              ]}
            />
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label={s.born}
            hint={s.dateHint}
            value={form.birth}
            autoComplete="off"
            onChange={(e) => setForm({ ...form, birth: e.target.value })}
          />
          <TextField
            label={s.died}
            value={form.death}
            autoComplete="off"
            onChange={(e) => setForm({ ...form, death: e.target.value })}
          />
        </div>

        <TextField
          label={s.title}
          hint={s.titleHint}
          value={form.title}
          autoComplete="off"
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        {showParentPickers && (
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label={s.father}
              value={form.fatherId}
              onChange={(e) => setForm({ ...form, fatherId: e.target.value })}
            >
              <option value="">{s.noParent}</option>
              {people
                .filter((p) => p.id !== editing?.id && p.gender !== 'f')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {displayName(p, settings.locale)}
                  </option>
                ))}
            </SelectField>
            <SelectField
              label={s.mother}
              value={form.motherId}
              onChange={(e) => setForm({ ...form, motherId: e.target.value })}
            >
              <option value="">{s.noParent}</option>
              {people
                .filter((p) => p.id !== editing?.id && p.gender !== 'm')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {displayName(p, settings.locale)}
                  </option>
                ))}
            </SelectField>
          </div>
        )}

        <TextArea
          label={s.notes}
          hint={s.notesHint}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
    </Sheet>
  );
}

export function relationLabel(kind: RelationKind, s: ReturnType<typeof t>): string {
  switch (kind) {
    case 'son':
      return s.addSon;
    case 'daughter':
      return s.addDaughter;
    case 'wife':
      return s.addWife;
    case 'husband':
      return s.addHusband;
    case 'father':
      return s.addFather;
    case 'mother':
      return s.addMother;
    case 'brother':
      return s.addBrother;
    case 'sister':
      return s.addSister;
  }
}
