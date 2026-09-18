'use client';

import { useEffect, type ReactNode } from 'react';
import { dirFor } from '@/lib/i18n';
import { useApp } from '@/lib/store';

/**
 * Pushes the saved language and text size onto <html>.
 *
 * It has to happen here rather than in the server layout because both settings
 * live on the device, and the server has no way to know them. Until the store
 * has loaded we render nothing but a quiet placeholder, which avoids showing
 * an English left-to-right flash to someone who set the app to Urdu.
 */
export function LocaleShell({ children }: { children: ReactNode }) {
  const { ready, settings } = useApp();

  useEffect(() => {
    if (!ready) return;
    const el = document.documentElement;
    el.lang = settings.locale;
    el.dir = dirFor(settings.locale);
    el.style.setProperty('--text-scale', String(settings.textScale));
  }, [ready, settings.locale, settings.textScale]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-8">
        <div
          className="size-10 animate-spin rounded-full border-4 border-line border-t-brand"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  return <>{children}</>;
}
