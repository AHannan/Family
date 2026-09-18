'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChartView } from '@/components/ChartView';
import { FamilyView } from '@/components/FamilyView';
import { Header } from '@/components/Header';
import { ListView } from '@/components/ListView';
import { PersonForm, formKey, type FormTarget } from '@/components/PersonForm';
import { PersonSheet } from '@/components/PersonSheet';
import { useToast } from '@/components/Toast';
import { Button, LinkButton } from '@/components/ui';
import type { RelationKind } from '@/lib/family';
import { displayName, t } from '@/lib/i18n';
import { useApp } from '@/lib/store';

type ViewName = 'family' | 'chart' | 'list';

export default function TreePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const treeId = params.id;

  const { getTree, settings, setTreeField, undo } = useApp();
  const s = t(settings.locale);
  const toast = useToast();

  const [view, setView] = useState<ViewName>('family');
  const [sheetPersonId, setSheetPersonId] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);

  const tree = getTree(treeId);

  // A tree that is gone - deleted in another tab, or a stale bookmark - should
  // land the user back on the list rather than on a broken screen.
  useEffect(() => {
    if (!tree) router.replace('/');
  }, [tree, router]);

  if (!tree) return null;

  const focusId = tree.focusId && tree.people.some((p) => p.id === tree.focusId)
    ? tree.focusId
    : (tree.people[0]?.id ?? null);
  const focus = tree.people.find((p) => p.id === focusId) ?? null;

  function setFocus(id: string) {
    setTreeField(treeId, { focusId: id });
  }

  function openAdd(kind: RelationKind, toId: string) {
    setSheetPersonId(null);
    setFormTarget({ mode: 'add', relation: { kind, toId } });
  }

  const title = displayName({ name: tree.name, nameUr: tree.nameUr }, settings.locale);

  return (
    <div className="flex min-h-dvh flex-col">
      <Header
        title={title}
        backHref="/"
        right={<LinkButton href="/settings" variant="secondary">{s.settings}</LinkButton>}
      />

      {/* View switch - three big tabs, always visible. */}
      <div className="border-b-2 border-line bg-card px-4 py-2">
        <div
          role="tablist"
          aria-label={s.viewFamily}
          className="mx-auto flex max-w-3xl gap-2 rounded-2xl bg-sunk p-1.5"
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
              aria-selected={view === key}
              onClick={() => setView(key)}
              className={`tap flex-1 rounded-xl px-3 text-lg font-semibold transition-colors ${
                view === key ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex min-h-0 flex-1 flex-col">
        {tree.people.length === 0 ? (
          <div className="mx-auto max-w-lg px-4 py-16 text-center">
            <p className="text-2xl font-bold">{s.addFirstPerson}</p>
            <p className="mt-2 text-lg text-ink-soft">{s.addFirstPersonBody}</p>
            <div className="mt-6">
              <Button variant="primary" onClick={() => setFormTarget({ mode: 'add' })}>
                + {s.addPerson}
              </Button>
            </div>
          </div>
        ) : view === 'family' && focus ? (
          <FamilyView
            tree={tree}
            focus={focus}
            onFocus={setFocus}
            onAdd={openAdd}
            onOpen={setSheetPersonId}
          />
        ) : view === 'chart' ? (
          <ChartView
            tree={tree}
            focusId={focusId}
            onOpen={setSheetPersonId}
            onRootChange={(id) => setTreeField(treeId, { rootId: id })}
          />
        ) : (
          <ListView
            tree={tree}
            onOpen={setSheetPersonId}
            onAddPerson={() => setFormTarget({ mode: 'add' })}
          />
        )}
      </main>

      <PersonSheet
        tree={tree}
        personId={sheetPersonId}
        onClose={() => setSheetPersonId(null)}
        onFocus={setFocus}
        onEdit={(id) => {
          setSheetPersonId(null);
          setFormTarget({ mode: 'edit', personId: id });
        }}
        onAdd={openAdd}
      />

      <PersonForm
        key={formKey(formTarget)}
        treeId={treeId}
        target={formTarget}
        onClose={() => setFormTarget(null)}
        onSaved={(person) => {
          const added = formTarget?.mode === 'add';
          // Adding a relative keeps you on the person you added them to -
          // someone entering four children in a row should not have to walk
          // back after each one. Only a standalone new person takes focus.
          if (added && !formTarget?.relation) setFocus(person.id);
          toast.show(added ? s.personAdded(person.name) : s.saved, {
            label: s.undo,
            onAction: () => undo(),
          });
        }}
      />
    </div>
  );
}
