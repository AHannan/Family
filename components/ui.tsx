'use client';

import Link from 'next/link';
import {
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

/* Shared bits. Every interactive thing here is at least 3rem tall and carries a
   visible text label - no icon-only controls anywhere in this app. */

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white border-brand hover:bg-brand-dark hover:border-brand-dark',
  secondary: 'bg-card text-ink border-line hover:border-ink-faint',
  quiet: 'bg-transparent text-ink-soft border-transparent hover:bg-sunk hover:text-ink',
  danger: 'bg-card text-danger border-danger/60 hover:bg-danger hover:text-white hover:border-danger',
};

export function Button({
  variant = 'secondary',
  full,
  className = '',
  children,
  ...rest
}: ComponentPropsWithRef<'button'> & { variant?: Variant; full?: boolean }) {
  return (
    <button
      {...rest}
      className={`tap inline-flex items-center justify-center gap-2 rounded-xl border-2 px-5 text-lg font-semibold transition-colors active:translate-y-px disabled:pointer-events-none disabled:opacity-45 ${VARIANTS[variant]} ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = 'secondary',
  full,
  className = '',
  children,
}: {
  href: string;
  variant?: Variant;
  full?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`tap inline-flex items-center justify-center gap-2 rounded-xl border-2 px-5 text-lg font-semibold transition-colors ${VARIANTS[variant]} ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </Link>
  );
}

/* ---- form fields ------------------------------------------------------- */

function FieldShell({
  label,
  hint,
  error,
  children,
  id,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-base font-semibold text-ink-soft">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-sm text-ink-faint">{hint}</p>}
      {error && (
        <p className="mt-1 text-base font-semibold text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL =
  'block w-full rounded-xl border-2 border-line bg-card px-4 py-3 text-lg text-ink placeholder:text-ink-faint focus:border-brand';

export function TextField({
  label,
  hint,
  error,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} id={id}>
      <input id={id} {...rest} className={`${CONTROL} tap ${rest.className ?? ''}`} />
    </FieldShell>
  );
}

export function TextArea({
  label,
  hint,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} id={id}>
      <textarea id={id} rows={4} {...rest} className={`${CONTROL} resize-y ${rest.className ?? ''}`} />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} id={id}>
      <select id={id} {...rest} className={`${CONTROL} tap ${rest.className ?? ''}`}>
        {children}
      </select>
    </FieldShell>
  );
}

/** Big segmented choice - used for man/woman and for the view tabs. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-2 rounded-2xl bg-sunk p-1.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`tap flex-1 rounded-xl px-3 text-lg font-semibold transition-colors ${
              active ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---- overlay ----------------------------------------------------------- */

/**
 * A single modal surface used for every dialog in the app: full-height sheet
 * on a phone, centred card on a larger screen. Escape and the backdrop both
 * close it, and focus moves inside on open.
 */
export function Sheet({
  open,
  title,
  closeLabel = 'Close',
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  closeLabel?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  // Callers pass a fresh arrow for onClose on every render, so it cannot be an
  // effect dependency: the effect would tear down and set up again on every
  // keystroke, and the focus line below would yank the caret out of the field
  // and onto the close button. Keep the latest one in a ref instead.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Start in the form, not on the close button - only the content counts as a
    // landing spot, and we fall back to the close button for dialogs that are
    // just a sentence of text.
    const first = body.current?.querySelector<HTMLElement>('input, select, textarea, button');
    (first ?? closeButton.current)?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[92dvh] w-full max-w-[38rem] flex-col rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-4 border-b-2 border-line-soft px-5 py-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          <Button ref={closeButton} variant="quiet" onClick={onClose} aria-label={closeLabel} className="px-3">
            ✕
          </Button>
        </div>
        <div ref={body} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-3 border-t-2 border-line-soft px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** Destructive actions always get a plain-language sentence and a way out. */
export function Confirm({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet
      open={open}
      title={title}
      closeLabel={cancelLabel}
      onClose={onCancel}
      footer={
        <>
          <Button onClick={onCancel}>{cancelLabel}</Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-xl leading-relaxed">{message}</p>
    </Sheet>
  );
}

/** Small round tint that stands in for a photo. */
export function Avatar({
  name,
  gender,
  size = 'md',
}: {
  name: string;
  gender: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const letter = (name || '?').trim().charAt(0).toUpperCase();
  const dims = size === 'lg' ? 'size-16 text-3xl' : size === 'sm' ? 'size-10 text-lg' : 'size-12 text-xl';
  const tint =
    gender === 'f'
      ? 'bg-woman-soft text-woman'
      : gender === 'm'
        ? 'bg-man-soft text-man'
        : 'bg-sunk text-ink-soft';
  return (
    <span
      aria-hidden="true"
      className={`inline-grid shrink-0 place-items-center rounded-full font-bold ${dims} ${tint}`}
    >
      {letter}
    </span>
  );
}
