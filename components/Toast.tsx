'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

/**
 * One message at a time, at the bottom of the screen, optionally with a single
 * action. Deliberately not a stack: a queue of overlapping notifications is
 * exactly the kind of thing that loses a hesitant user.
 */

interface ToastState {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastCtx {
  show: (message: string, action?: { label: string; onAction: () => void }) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, action?: { label: string; onAction: () => void }) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, actionLabel: action?.label, onAction: action?.onAction });
      // An undoable message stays long enough to actually read and act on.
      timer.current = setTimeout(() => setToast(null), action ? 9000 : 3500);
    },
    [],
  );

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toast && (
        <div
          className="fixed inset-x-0 bottom-0 z-[80] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="status"
          aria-live="polite"
        >
          <div className="flex max-w-[34rem] items-center gap-4 rounded-2xl bg-ink px-5 py-3 text-paper shadow-2xl">
            <p className="text-base leading-snug">{toast.message}</p>
            {toast.actionLabel && (
              <button
                type="button"
                className="tap -my-2 shrink-0 rounded-xl px-3 text-base font-semibold text-brand-soft underline underline-offset-4"
                onClick={() => {
                  if (timer.current) clearTimeout(timer.current);
                  setToast(null);
                  toast.onAction?.();
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
