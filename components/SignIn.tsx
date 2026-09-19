'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { summarise } from '@/lib/accounts';
import { t } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { LanguageToggle } from './Header';
import { useToast } from './Toast';
import { Button, Confirm, TextField } from './ui';

/**
 * The first screen: one number, and the families filed under it.
 *
 * There is no server here, so this is not a login - it is a label on a drawer.
 * Saying that plainly matters more than looking secure: someone who thinks this
 * is an account would expect their tree to follow them to a new phone, and it
 * will not. The wording, and the backup line at the foot, say so.
 */
export function SignIn() {
  const { settings, accounts, signIn, forgetAccount } = useApp();
  const s = t(settings.locale);
  const router = useRouter();
  const toast = useToast();

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [forgetting, setForgetting] = useState<string | null>(null);

  function submit(value: string) {
    const failure = signIn(value);
    if (failure === 'empty') {
      setError(s.phoneRequired);
      return;
    }
    if (failure === 'invalid') {
      setError(s.phoneInvalid);
      return;
    }
    setError('');
    // Whichever page was being asked for, a number that has just been typed in
    // wants the family list - the old page belonged to somebody else's number.
    router.replace('/');
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b-2 border-line bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <span className="text-2xl font-bold">{s.appName}</span>
          <LanguageToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-3xl font-bold">{s.signInTitle}</h1>
        <p className="mt-2 text-lg text-ink-soft">{s.signInBody}</p>

        <form
          className="mt-6 rounded-3xl border-2 border-line bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit(phone);
          }}
        >
          {/* Numbers read left-to-right in both languages, so this one field
              keeps its own direction even when the page is flipped. */}
          <TextField
            label={s.phoneLabel}
            hint={s.phoneHint}
            error={error}
            value={phone}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            autoFocus
            onChange={(e) => {
              setPhone(e.target.value);
              setError('');
            }}
          />
          <Button type="submit" variant="primary" full className="mt-4">
            {s.continueLabel}
          </Button>
          <p className="mt-3 text-base text-ink-faint">{s.newNumberNote}</p>
        </form>

        {accounts.length > 0 && (
          <section className="mt-8">
            <h2 className="text-2xl font-bold">{s.savedNumbers}</h2>
            <p className="mt-1 text-lg text-ink-soft">{s.savedNumbersHint}</p>
            <ul className="mt-4 grid gap-3">
              {accounts.map((a) => {
                const count = summarise(a.phone);
                return (
                  <li
                    key={a.phone}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-line bg-card p-4"
                  >
                    <button
                      type="button"
                      onClick={() => submit(a.phone)}
                      className="tap min-w-0 flex-1 rounded-xl text-start"
                    >
                      <span dir="ltr" className="block text-2xl font-bold">
                        {a.phone}
                      </span>
                      <span className="mt-0.5 block text-lg text-ink-soft">
                        {count.trees === 0
                          ? s.emptyAccount
                          : `${s.familyCount(count.trees)} · ${s.peopleCount(count.people)}`}
                      </span>
                    </button>
                    <Button variant="primary" onClick={() => submit(a.phone)}>
                      {s.openFamily}
                    </Button>
                    <Button variant="quiet" onClick={() => setForgetting(a.phone)}>
                      {s.forgetNumber}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <p className="mt-8 text-center text-base text-ink-faint">{s.signInNotice}</p>
      </main>

      <Confirm
        open={!!forgetting}
        title={s.forgetNumberTitle}
        message={forgetting ? s.forgetNumberConfirm(forgetting) : ''}
        confirmLabel={s.confirm}
        cancelLabel={s.cancel}
        onCancel={() => setForgetting(null)}
        onConfirm={() => {
          if (forgetting) {
            forgetAccount(forgetting);
            toast.show(s.numberForgotten(forgetting));
          }
          setForgetting(null);
        }}
      />
    </div>
  );
}

/**
 * Holds every app screen behind a number.
 *
 * It sits inside LocaleShell, so the sign-in screen is already in the right
 * language and direction by the time it is drawn, and above the pages, which
 * can then assume there is somebody to show families for.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { activeNumber } = useApp();
  if (!activeNumber) return <SignIn />;
  return <>{children}</>;
}
