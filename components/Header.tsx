'use client';

import Link from 'next/link';
import { t } from '@/lib/i18n';
import { useApp } from '@/lib/store';

/**
 * The language switch lives in the header on every screen, not buried in
 * settings. Someone who opens the app in the wrong language needs to be one
 * tap from fixing it, and each option is written in its own script so it is
 * recognisable without being able to read the other one.
 */
export function LanguageToggle() {
  const { settings, setLocale } = useApp();
  const other = settings.locale === 'ur' ? 'en' : 'ur';
  const label = other === 'ur' ? 'اردو' : 'English';

  return (
    <button
      type="button"
      onClick={() => setLocale(other)}
      lang={other}
      className="tap rounded-xl border-2 border-line bg-card px-4 text-lg font-semibold text-ink hover:border-ink-faint"
    >
      {label}
    </button>
  );
}

export function Header({
  title,
  backHref,
  right,
}: {
  title: string;
  backHref?: string;
  right?: React.ReactNode;
}) {
  const { settings } = useApp();
  const s = t(settings.locale);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-line bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        {backHref && (
          <Link
            href={backHref}
            className="tap inline-flex items-center gap-1.5 rounded-xl border-2 border-line px-3 text-lg font-semibold hover:border-ink-faint"
          >
            {/* Flips with the document direction, so it always points "back". */}
            <span aria-hidden="true" className="rtl:-scale-x-100">
              ←
            </span>
            <span className="hidden sm:inline">{s.back}</span>
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate text-2xl font-bold">{title}</h1>
        <div className="flex shrink-0 items-center gap-2">
          {right}
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
