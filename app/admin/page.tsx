'use client';

/**
 * The admin panel: who may sign in, and what their password is.
 *
 * Two things make this screen different from the rest of the app:
 *
 *  - **It is English only.** Everything else is bilingual, but this is an
 *    operator's tool used by the person who runs the app, not by the families.
 *    Keeping it out of `t()` keeps two hundred strings out of both tables.
 *  - **It talks to route handlers, not to Supabase.** Creating and resetting
 *    other people's accounts needs the service key, which must never reach a
 *    browser, so every action here goes through /api/admin - which re-checks
 *    that the caller is an admin, server side, on every request.
 *
 * A password is shown exactly once, when it is created. There is no way to read
 * one back afterwards; if it is lost, issue a new one.
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Button, Confirm, TextField } from '@/components/ui';
import { useApp } from '@/lib/store';
import { supabase } from '@/lib/supabase';

interface AdminAccount {
  id: string;
  phone: string;
  displayName: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  trees: number;
}

/** A password to pass on, held only until it is dismissed. */
interface Issued {
  phone: string;
  password: string;
  isNew: boolean;
}

export default function AdminPage() {
  const { isAdmin, activeNumber, ready } = useApp();

  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [you, setYou] = useState('');
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);

  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [issued, setIssued] = useState<Issued | null>(null);
  const [confirming, setConfirming] = useState<
    { kind: 'delete' | 'reset'; account: AdminAccount } | null
  >(null);

  const toast = useToast();

  /** Every admin call carries the caller's own session token, and nothing else. */
  const call = useCallback(
    async (path: string, init?: RequestInit): Promise<Response> => {
      const client = supabase();
      if (!client) throw new Error('This deployment has no Supabase keys configured.');
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      return fetch(path, {
        ...init,
        headers: {
          ...(init?.headers ?? {}),
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
      });
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setFailure('');
    try {
      const res = await call('/api/admin/accounts');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not load the accounts.');
      setAccounts(body.accounts as AdminAccount[]);
      setYou(body.you as string);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Could not load the accounts.');
    } finally {
      setLoading(false);
    }
  }, [call]);

  /* eslint-disable react-hooks/set-state-in-effect -- fetching needs the client */
  useEffect(() => {
    if (!ready || !isAdmin) {
      setLoading(false);
      return;
    }
    void load();
  }, [ready, isAdmin, load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function createAccount() {
    if (!newPhone.trim()) {
      setFailure('Please give a phone number.');
      return;
    }
    setBusy(true);
    setFailure('');
    try {
      const res = await call('/api/admin/accounts', {
        method: 'POST',
        body: JSON.stringify({ phone: newPhone, displayName: newName }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not create the account.');
      setIssued({ phone: body.phone, password: body.password, isNew: true });
      setNewPhone('');
      setNewName('');
      await load();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(account: AdminAccount) {
    setBusy(true);
    setFailure('');
    try {
      const res = await call(`/api/admin/accounts/${account.id}?action=password`, {
        method: 'POST',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not issue a new password.');
      setIssued({ phone: account.phone, password: body.password, isNew: false });
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Could not issue a new password.');
    } finally {
      setBusy(false);
    }
  }

  async function patch(account: AdminAccount, body: Record<string, unknown>, done: string) {
    setBusy(true);
    setFailure('');
    try {
      const res = await call(`/api/admin/accounts/${account.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Could not change the account.');
      toast.show(done);
      await load();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Could not change the account.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(account: AdminAccount) {
    setBusy(true);
    setFailure('');
    try {
      const res = await call(`/api/admin/accounts/${account.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not delete the account.');
      toast.show(`${account.phone} deleted.`);
      await load();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Could not delete the account.');
    } finally {
      setBusy(false);
    }
  }

  /* ---- not an admin ---------------------------------------------------- */

  if (ready && !isAdmin) {
    return (
      <Shell>
        <div className="rounded-3xl border-2 border-line bg-card p-8 text-center">
          <p className="text-2xl font-bold">This page is not for you</p>
          <p className="mx-auto mt-2 max-w-md text-lg text-ink-soft">
            {activeNumber} is not an administrator. If that is wrong, ask whoever runs this app
            to turn it on for your number.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/"
              className="tap inline-flex items-center rounded-xl border-2 border-line bg-card px-5 text-lg font-semibold"
            >
              Back to my families
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {failure && (
        <p
          role="alert"
          className="mb-5 rounded-2xl border-2 border-danger/60 bg-card p-4 text-lg text-danger"
        >
          {failure}
        </p>
      )}

      {/* ---- the password, shown once ---- */}
      {issued && (
        <section className="mb-6 rounded-3xl border-2 border-brand bg-brand-soft p-5">
          <h2 className="text-2xl font-bold text-brand">
            {issued.isNew ? 'Account created' : 'New password issued'}
          </h2>
          <p className="mt-1 text-lg text-ink-soft">
            Send these two lines to {issued.phone}. This password is shown{' '}
            <strong>once</strong> and cannot be read back later - if it is lost, issue a new one.
          </p>
          <div className="mt-4 rounded-2xl border-2 border-line bg-card p-4">
            <p dir="ltr" className="break-all text-lg font-semibold">
              {typeof window !== 'undefined' ? window.location.origin : ''}/?n=
              {encodeURIComponent(issued.phone)}
            </p>
            <p dir="ltr" className="mt-2 text-2xl font-bold">
              Password: {issued.password}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={() => {
                const origin = window.location.origin;
                const text =
                  `${origin}/?n=${encodeURIComponent(issued.phone)}\n` +
                  `Password: ${issued.password}`;
                void navigator.clipboard.writeText(text).then(
                  () => toast.show('Copied.'),
                  () => toast.show('Could not copy - select the text instead.'),
                );
              }}
            >
              Copy both lines
            </Button>
            <Button onClick={() => setIssued(null)}>Done - hide it</Button>
          </div>
        </section>
      )}

      {/* ---- add somebody ---- */}
      <section className="mb-6 rounded-3xl border-2 border-line bg-card p-5">
        <h2 className="mb-1 text-2xl font-bold">Add somebody</h2>
        <p className="mb-4 text-lg text-ink-soft">
          Creates the account and generates a password. Nothing is sent to them - you pass it on
          yourself.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Phone number"
            hint="With the country code: +923001234567"
            value={newPhone}
            type="tel"
            inputMode="tel"
            dir="ltr"
            onChange={(e) => {
              setNewPhone(e.target.value);
              setFailure('');
            }}
          />
          <TextField
            label="Name (optional)"
            hint="Only so you can tell the rows apart."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <Button
          variant="primary"
          className="mt-4"
          disabled={busy}
          onClick={() => void createAccount()}
        >
          {busy ? 'Working...' : 'Create the account'}
        </Button>
      </section>

      {/* ---- the roster ---- */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">
            Accounts{accounts.length > 0 && ` (${accounts.length})`}
          </h2>
          <Button onClick={() => void load()} disabled={loading || busy}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {loading ? (
          <p className="text-lg text-ink-soft">Loading...</p>
        ) : accounts.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-line bg-card p-6 text-center text-lg text-ink-soft">
            No accounts yet.
          </p>
        ) : (
          <ul className="grid gap-3">
            {accounts.map((a) => (
              <li key={a.id} className="rounded-2xl border-2 border-line bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span dir="ltr" className="text-xl font-bold">
                        {a.phone}
                      </span>
                      {a.id === you && <Badge tone="brand">You</Badge>}
                      {a.isAdmin && <Badge tone="brand">Admin</Badge>}
                      {!a.isActive && <Badge tone="danger">Turned off</Badge>}
                    </p>
                    <p className="mt-0.5 text-base text-ink-soft">
                      {a.displayName || 'No name'} ·{' '}
                      {a.trees === 1 ? '1 family' : `${a.trees} families`} · added{' '}
                      {new Date(a.createdAt).toLocaleDateString()}
                      {a.lastSeenAt
                        ? ` · last seen ${new Date(a.lastSeenAt).toLocaleDateString()}`
                        : ' · never signed in'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    disabled={busy}
                    onClick={() => setConfirming({ kind: 'reset', account: a })}
                  >
                    New password
                  </Button>
                  {a.id !== you && (
                    <>
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void patch(
                            a,
                            { isActive: !a.isActive },
                            a.isActive ? `${a.phone} turned off.` : `${a.phone} turned back on.`,
                          )
                        }
                      >
                        {a.isActive ? 'Turn off' : 'Turn back on'}
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void patch(
                            a,
                            { isAdmin: !a.isAdmin },
                            a.isAdmin ? `${a.phone} is no longer an admin.` : `${a.phone} is now an admin.`,
                          )
                        }
                      >
                        {a.isAdmin ? 'Remove admin' : 'Make admin'}
                      </Button>
                      <Button
                        variant="danger"
                        disabled={busy}
                        onClick={() => setConfirming({ kind: 'delete', account: a })}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Confirm
        open={!!confirming}
        title={
          confirming?.kind === 'delete' ? 'Delete this account' : 'Issue a new password'
        }
        message={
          confirming?.kind === 'delete'
            ? `Delete ${confirming.account.phone}, and the ${
                confirming.account.trees === 1
                  ? '1 family'
                  : `${confirming.account.trees} families`
              } saved under it? This cannot be undone, and there is no backup on the server.`
            : confirming
              ? `Give ${confirming.account.phone} a new password? Their old one stops working, and you will need to send them the new one. They stay signed in on any device until that session expires.`
              : ''
        }
        confirmLabel={confirming?.kind === 'delete' ? 'Delete it' : 'Issue it'}
        cancelLabel="Cancel"
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (!confirming) return;
          const { kind, account } = confirming;
          setConfirming(null);
          if (kind === 'delete') void remove(account);
          else void resetPassword(account);
        }}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b-2 border-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="tap inline-flex items-center gap-1.5 rounded-xl border-2 border-line px-3 text-lg font-semibold"
          >
            <span aria-hidden="true" className="rtl:-scale-x-100">
              ←
            </span>
            <span className="hidden sm:inline">Back</span>
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-2xl font-bold">Accounts</h1>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}

function Badge({ tone, children }: { tone: 'brand' | 'danger'; children: React.ReactNode }) {
  const cls =
    tone === 'brand'
      ? 'bg-brand-soft text-brand'
      : 'bg-card text-danger border-2 border-danger/60';
  return <span className={`rounded-full px-3 py-0.5 text-sm font-semibold ${cls}`}>{children}</span>;
}
