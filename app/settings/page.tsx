'use client';

import { useRef } from 'react';
import { Header } from '@/components/Header';
import { SignOutButton } from '@/components/SignOutButton';
import { useToast } from '@/components/Toast';
import { Button, LinkButton, Segmented } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import type { Locale } from '@/lib/types';

export default function SettingsPage() {
  const { settings, setLocale, setTextScale, exportBlob, importFile, trees, activeNumber, isAdmin } =
    useApp();
  const s = t(settings.locale);
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  function saveBackup() {
    // Local date, not UTC - a file stamped with yesterday is confusing.
    const d = new Date();
    const stamp = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');

    const url = URL.createObjectURL(exportBlob());
    const a = document.createElement('a');
    a.href = url;
    // The number is in the filename so backups from a shared device do not all
    // land in the downloads folder under the same name.
    a.download = `family-trees-${activeNumber ?? 'device'}-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function openBackup(file: File) {
    try {
      const count = await importFile(file);
      toast.show(s.importDone(count));
    } catch {
      toast.show(s.importFailed);
    }
  }

  return (
    <div className="min-h-dvh">
      <Header title={s.settings} backHref="/" />

      <main className="mx-auto max-w-2xl px-4 py-6">
        <Card title={s.yourNumber}>
          <p dir="ltr" className="text-2xl font-bold">
            {activeNumber}
          </p>
          <p className="mt-2 text-lg text-ink-soft">{s.yourNumberBody}</p>
          {/* "Sign out" is the word people look for; the line under it is what
              they actually want to know before tapping it. */}
          <div className="mt-4">
            <SignOutButton />
          </div>
        </Card>

        {isAdmin && (
          <Card title="Accounts">
            <p className="mb-4 text-lg text-ink-soft">
              Add people, issue passwords, and turn accounts on or off.
            </p>
            <LinkButton href="/admin" variant="secondary">
              Manage accounts
            </LinkButton>
          </Card>
        )}

        <Card title={s.language}>
          <Segmented<Locale>
            label={s.language}
            value={settings.locale}
            onChange={setLocale}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ur', label: 'اردو' },
            ]}
          />
        </Card>

        <Card title={s.textSize}>
          <Segmented<string>
            label={s.textSize}
            value={String(settings.textScale)}
            onChange={(v) => setTextScale(Number(v))}
            options={[
              { value: '1', label: s.textNormal },
              { value: '1.15', label: s.textLarge },
              { value: '1.3', label: s.textExtraLarge },
            ]}
          />
          <p className="mt-3 text-lg text-ink-soft">
            {/* Deliberately shown at the chosen size, so the effect is visible
                before leaving the screen. */}
            {s.myFamiliesSub}
          </p>
        </Card>

        <Card title={s.backup}>
          <p className="mb-4 text-lg text-ink-soft">{s.backupBody}</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={saveBackup} disabled={trees.length === 0}>
              {s.saveToFile}
            </Button>
            <Button onClick={() => fileInput.current?.click()}>{s.openFromFile}</Button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void openBackup(f);
              e.target.value = '';
            }}
          />
        </Card>
      </main>

    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-3xl border-2 border-line bg-card p-5">
      <h2 className="mb-3 text-2xl font-bold">{title}</h2>
      {children}
    </section>
  );
}
