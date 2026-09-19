'use client';

import { useState } from 'react';
import { t } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { useToast } from './Toast';
import { Button, Confirm } from './ui';

/**
 * Leaving the number that is currently open.
 *
 * It lives in its own component because it belongs in more than one place - on
 * the families screen, where somebody handing the tablet on will look for it,
 * and in Settings, where they will look for it second. Both need the same
 * confirm wording, and that wording matters: signing out deletes nothing, and
 * saying so is what stops a user hunting for a "keep my families" option that
 * does not exist.
 *
 * The toast survives the screen it was fired from, because ToastProvider sits
 * above AuthGate - by the time it shows, the sign-in screen is already drawn.
 */
export function SignOutButton({
  variant = 'secondary',
  full,
}: {
  variant?: 'secondary' | 'quiet' | 'danger';
  full?: boolean;
}) {
  const { settings, activeNumber, signOut } = useApp();
  const s = t(settings.locale);
  const toast = useToast();
  const [asking, setAsking] = useState(false);

  return (
    <>
      <Button variant={variant} full={full} onClick={() => setAsking(true)}>
        {s.signOut}
      </Button>
      <Confirm
        open={asking}
        title={s.signOutTitle}
        message={activeNumber ? s.signOutConfirm(activeNumber) : ''}
        confirmLabel={s.signOut}
        cancelLabel={s.cancel}
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          signOut();
          toast.show(s.signedOut);
        }}
      />
    </>
  );
}
