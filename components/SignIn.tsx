'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { normalizePhone, summarise } from '@/lib/accounts';
import { t } from '@/lib/i18n';
import { useApp, type SignInError } from '@/lib/store';
import { LanguageToggle } from './Header';
import { useToast } from './Toast';
import { Button, Confirm, TextField } from './ui';

/**
 * The first screen: a number, and the password that was sent for it.
 *
 * There is no signup here and there is no code to wait for. Somebody asks to be
 * let in, the owner creates their account with `scripts/invite.mjs` and sends
 * them a link and a password; the link carries the number, so most people only
 * ever type the password. `noAccountBody` says that plainly, because a screen
 * with no "create account" button reads as broken unless it explains itself.
 */
export function SignIn() {
  const { settings, accounts, signIn, forgetAccount, cloudOn } = useApp();
  const s = t(settings.locale);
  const router = useRouter();
  const toast = useToast();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgetting, setForgetting] = useState<string | null>(null);
  const passwordBox = useRef<HTMLInputElement>(null);

  /* The number arrives in the link the owner sent, so it is already filled in
     by the time the screen is read. Taken from `location` rather than
     `useSearchParams` so this component - which sits in the provider tree, not
     in a page - does not drag a Suspense boundary into the layout. */
  /* eslint-disable react-hooks/set-state-in-effect -- reading the URL needs the client */
  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get('n');
    if (fromLink) setPhone(normalizePhone(fromLink));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  /** One sentence per reason, on the field the user can do something about. */
  function report(why: SignInError) {
    const onPhone: Partial<Record<SignInError, string>> = {
      empty: s.phoneRequired,
      invalid: s.phoneInvalid,
      'needs-country-code': s.needsCountryCode,
    };
    const onPassword: Partial<Record<SignInError, string>> = {
      'no-password': s.passwordRequired,
      wrong: s.wrongPassword,
    };
    if (onPhone[why]) {
      setPhoneError(onPhone[why]!);
      return;
    }
    if (onPassword[why]) {
      setPasswordError(onPassword[why]!);
      return;
    }
    setFailure(why === 'inactive' ? s.accountInactive : s.signInOffline);
  }

  async function submit() {
    setBusy(true);
    setPhoneError('');
    setPasswordError('');
    setFailure('');
    const why = await signIn(phone, password);
    setBusy(false);
    if (why) {
      report(why);
      return;
    }
    setPassword('');
    // Whichever page was being asked for, a number that has just signed in
    // wants the family list - the old page belonged to somebody else.
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
            void submit();
          }}
        >
          {/* Numbers read left-to-right in both languages, so this one field
              keeps its own direction even when the page is flipped. */}
          <TextField
            label={s.phoneLabel}
            hint={s.phoneHint}
            error={phoneError}
            value={phone}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            autoFocus
            onChange={(e) => {
              setPhone(e.target.value);
              setPhoneError('');
              setFailure('');
            }}
          />

          {cloudOn && (
            <div className="mt-4">
              <TextField
                ref={passwordBox}
                label={s.passwordLabel}
                hint={s.passwordHint}
                error={passwordError}
                value={password}
                type="password"
                autoComplete="current-password"
                dir="ltr"
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                  setFailure('');
                }}
              />
            </div>
          )}

          {failure && (
            <p
              role="alert"
              className="mt-4 rounded-xl border-2 border-danger/60 bg-card p-3 text-lg text-danger"
            >
              {failure}
            </p>
          )}

          <Button type="submit" variant="primary" full className="mt-4" disabled={busy}>
            {busy ? s.syncing : s.continueLabel}
          </Button>
        </form>

        {cloudOn && (
          <section className="mt-8 rounded-3xl border-2 border-dashed border-line bg-card p-5">
            <h2 className="text-2xl font-bold">{s.noAccountTitle}</h2>
            <p className="mt-2 text-lg text-ink-soft">{s.noAccountBody}</p>
          </section>
        )}

        {accounts.length > 0 && (
          <section className="mt-8">
            <h2 className="text-2xl font-bold">{s.savedNumbers}</h2>
            <p className="mt-1 text-lg text-ink-soft">{s.savedNumbersHint}</p>
            <ul className="mt-4 grid gap-3">
              {accounts.map((a) => {
                const count = summarise(a.phone);
                /* Tapping fills the number in and moves to the password, rather
                   than opening the families: the number alone is no longer
                   enough to get in. */
                const pick = () => {
                  setPhone(a.phone);
                  setPhoneError('');
                  setFailure('');
                  passwordBox.current?.focus();
                };
                return (
                  <li
                    key={a.phone}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-line bg-card p-4"
                  >
                    <button
                      type="button"
                      onClick={pick}
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
                    <Button variant="primary" onClick={pick}>
                      {s.continueLabel}
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
 * Holds every app screen behind a signed-in number.
 *
 * It sits inside LocaleShell, so the sign-in screen is already in the right
 * language and direction by the time it is drawn, and above the pages, which
 * can then assume there is somebody to show families for.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { activeNumber } = useApp();
  const pathname = usePathname();

  // A shared family has to open for somebody with no account at all, so the
  // read-only page is the one route that is not held behind a number. It reads
  // its own tree straight from Supabase; nothing of the signed-in user leaks
  // into it, because there is no signed-in user to leak.
  if (pathname?.startsWith('/shared/')) return <>{children}</>;

  if (!activeNumber) return <SignIn />;
  return <>{children}</>;
}
