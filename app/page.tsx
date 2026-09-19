'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { useToast } from '@/components/Toast';
import { Button, Confirm, LinkButton, Sheet, TextField } from '@/components/ui';
import { displayName, t } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import type { Tree } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const { trees, settings, createTree, addSampleTree, renameTree, deleteTree, undo } = useApp();
  const s = t(settings.locale);
  const toast = useToast();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');
  const [renaming, setRenaming] = useState<Tree | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleting, setDeleting] = useState<Tree | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Opening a family we have only just created is a race: the route would
  // render before the new tree is in state, and the tree page would bounce
  // straight back here. Wait until the store actually has it. The ref guard
  // keeps this to a single navigation without a second state update.
  const navigated = useRef(false);
  useEffect(() => {
    if (!pendingId || navigated.current) return;
    if (trees.some((tr) => tr.id === pendingId)) {
      navigated.current = true;
      router.push(`/tree/${pendingId}`);
    }
  }, [pendingId, trees, router]);

  function handleCreate() {
    if (!newName.trim()) {
      setNameError(s.nameRequired);
      return;
    }
    const tree = createTree(newName);
    setCreating(false);
    setNewName('');
    setNameError('');
    setPendingId(tree.id);
  }

  function handleExample() {
    setPendingId(addSampleTree().id);
  }

  return (
    <div className="min-h-dvh">
      <Header
        title={s.appName}
        right={<LinkButton href="/settings" variant="secondary">{s.settings}</LinkButton>}
      />

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold">{s.myFamilies}</h2>
            {trees.length > 0 && <p className="text-lg text-ink-soft">{s.myFamiliesSub}</p>}
          </div>
          {trees.length > 0 && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              + {s.newFamily}
            </Button>
          )}
        </div>

        {trees.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-line bg-card p-8 text-center">
            <p className="text-2xl font-bold">{s.noFamiliesTitle}</p>
            <p className="mx-auto mt-2 max-w-md text-lg text-ink-soft">{s.noFamiliesBody}</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button variant="primary" onClick={() => setCreating(true)}>
                + {s.newFamily}
              </Button>
              <Button onClick={handleExample}>{s.openExample}</Button>
            </div>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {trees.map((tree) => (
              <li
                key={tree.id}
                className="flex flex-col gap-3 rounded-2xl border-2 border-line bg-card p-5"
              >
                <button
                  type="button"
                  onClick={() => router.push(`/tree/${tree.id}`)}
                  className="rounded-xl text-start"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl font-bold">
                      {displayName({ name: tree.name, nameUr: tree.nameUr }, settings.locale)}
                    </span>
                    {tree.isSample && (
                      <span className="rounded-full bg-brand-soft px-3 py-0.5 text-sm font-semibold text-brand">
                        {s.exampleBadge}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-lg text-ink-soft">
                    {s.peopleCount(tree.people.length)}
                  </span>
                </button>

                <div className="mt-auto flex flex-wrap gap-2">
                  <Button variant="primary" onClick={() => router.push(`/tree/${tree.id}`)}>
                    {tree.people.length ? s.openFamily : s.addFirstPerson}
                  </Button>
                  <Button
                    onClick={() => {
                      setRenaming(tree);
                      setRenameValue(tree.name);
                    }}
                  >
                    {s.renameFamily}
                  </Button>
                  <Button variant="danger" onClick={() => setDeleting(tree)}>
                    {s.remove}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {trees.length > 0 && !trees.some((tr) => tr.isSample) && (
          <div className="mt-6 text-center">
            <Button variant="quiet" onClick={handleExample}>
              {s.openExample}
            </Button>
          </div>
        )}

        <p className="mt-8 text-center text-base text-ink-faint">{s.savedOnDevice}</p>
      </main>

      {/* new family */}
      <Sheet
        open={creating}
        title={s.newFamilyTitle}
        closeLabel={s.close}
        onClose={() => setCreating(false)}
        footer={
          <>
            <Button onClick={() => setCreating(false)}>{s.cancel}</Button>
            <Button variant="primary" onClick={handleCreate}>
              {s.save}
            </Button>
          </>
        }
      >
        <TextField
          label={s.familyName}
          hint={s.familyNameHint}
          value={newName}
          error={nameError}
          autoFocus
          onChange={(e) => {
            setNewName(e.target.value);
            setNameError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
          }}
        />
      </Sheet>

      {/* rename */}
      <Sheet
        open={!!renaming}
        title={s.renameFamily}
        closeLabel={s.close}
        onClose={() => setRenaming(null)}
        footer={
          <>
            <Button onClick={() => setRenaming(null)}>{s.cancel}</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (renaming && renameValue.trim()) renameTree(renaming.id, renameValue);
                setRenaming(null);
              }}
            >
              {s.save}
            </Button>
          </>
        }
      >
        <TextField
          label={s.familyName}
          value={renameValue}
          autoFocus
          onChange={(e) => setRenameValue(e.target.value)}
        />
      </Sheet>

      {/* delete */}
      <Confirm
        open={!!deleting}
        title={s.deleteFamily}
        message={deleting ? s.deleteFamilyConfirm(deleting.name) : ''}
        confirmLabel={s.confirm}
        cancelLabel={s.cancel}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          deleteTree(deleting.id);
          setDeleting(null);
          toast.show(s.familyRemoved(deleting.name), {
            label: s.undo,
            onAction: () => undo(),
          });
        }}
      />
    </div>
  );
}
