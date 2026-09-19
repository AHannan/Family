'use client';

import { useState } from 'react';
import { t } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import type { Tree } from '@/lib/types';
import { useToast } from './Toast';
import { Button, Sheet } from './ui';

/** The address a shared family opens at. Built here so the wording and the
 *  route cannot drift apart. */
export function shareUrl(cloudUid: string): string {
  return `${window.location.origin}/shared/${cloudUid}`;
}

/**
 * Turning a family into something other people can look at.
 *
 * Sharing is off until it is asked for, and turning it on is spelled out rather
 * than implied by a switch: "anyone you send the link to can look at this
 * family - they cannot change anything" is the whole of what happens, and it is
 * the sort of thing a user must not discover afterwards.
 *
 * The link only exists once the tree has reached the cloud, because it points at
 * the row id. A family created seconds ago on a bad connection therefore shows
 * `sharePending` instead of a link that would not open.
 */
export function ShareSheet({
  tree,
  open,
  onClose,
}: {
  tree: Tree | null;
  open: boolean;
  onClose: () => void;
}) {
  const { settings, setTreePublic, cloudOn } = useApp();
  const s = t(settings.locale);
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  if (!tree) return null;
  const link = tree.cloudUid ? shareUrl(tree.cloudUid) : '';

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.show(s.linkCopied);
    } catch {
      // Clipboard blocked, which happens on an insecure origin. The link is on
      // screen and selectable, so there is nothing to apologise for.
      setCopied(false);
    }
  }

  return (
    <Sheet
      open={open}
      title={s.shareTitle}
      closeLabel={s.close}
      onClose={() => {
        setCopied(false);
        onClose();
      }}
      footer={<Button onClick={onClose}>{s.close}</Button>}
    >
      <p className="text-lg text-ink-soft">{s.shareBody}</p>

      {!cloudOn ? (
        <p className="mt-4 text-lg">{s.savedOnDevice}</p>
      ) : (
        <>
          <p className="mt-4 text-xl font-bold">{tree.isPublic ? s.shareOn : s.shareOff}</p>

          <div className="mt-4">
            {tree.isPublic ? (
              <Button
                variant="danger"
                onClick={() => {
                  setTreePublic(tree.id, false);
                  setCopied(false);
                  toast.show(s.shareStopped);
                }}
              >
                {s.shareTurnOff}
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setTreePublic(tree.id, true)}>
                {s.shareTurnOn}
              </Button>
            )}
          </div>

          {tree.isPublic && (
            <div className="mt-5 rounded-2xl border-2 border-line bg-sunk p-4">
              <p className="text-base font-semibold text-ink-soft">{s.shareLink}</p>
              {link ? (
                <>
                  {/* A URL reads left-to-right in both languages, and wraps
                      rather than scrolling so the whole of it is readable. */}
                  <p dir="ltr" className="mt-1 break-all text-lg font-semibold">
                    {link}
                  </p>
                  <Button className="mt-3" onClick={() => void copy()}>
                    {copied ? s.linkCopied : s.copyLink}
                  </Button>
                </>
              ) : (
                <p className="mt-1 text-lg text-ink-soft">{s.sharePending}</p>
              )}
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
