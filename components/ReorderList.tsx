'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';

/**
 * A list (or grid) whose items can be dragged into a different order.
 *
 * Dragging hangs off a separate "Move" button rather than the card itself.
 * The card is what you tap to walk to that person, and hiding a second,
 * invisible gesture - long press, then drag - on the same target is exactly
 * the sort of rule this app avoids. The handle says "Move" in words, is a
 * full tap target, and answers the arrow keys as well as the pointer, so
 * reordering never needs a steady hand or a mouse.
 *
 * Pointer events are used directly rather than HTML5 drag-and-drop, which
 * does not exist on touch screens.
 */
export function ReorderList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  moveLabel,
  moveLabelFor,
  describeMove,
  rtl = false,
  className = '',
}: {
  items: T[];
  /** Called with the full list of ids whenever the order actually changes. */
  onReorder: (orderedIds: string[]) => void;
  renderItem: (item: T) => ReactNode;
  /** The word on the handle, e.g. "Move". */
  moveLabel: string;
  /** Spoken label for one handle, e.g. "Move Ali". */
  moveLabelFor: (item: T) => string;
  /** Spoken confirmation after a keyboard move, e.g. "Moved to number 2 of 5". */
  describeMove: (position: number, total: number) => string;
  rtl?: boolean;
  className?: string;
}) {
  /** While dragging, the shown order runs ahead of the stored one. */
  const [preview, setPreview] = useState<string[] | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  /** The same thing in a ref: the first pointermove can arrive before the
   *  state update that started the drag has been rendered. */
  const dragId = useRef<string | null>(null);
  const [said, setSaid] = useState('');
  const nodes = useRef(new Map<string, HTMLDivElement | null>());

  const byId = new Map(items.map((i) => [i.id, i]));
  // A stale preview heals itself: ids that have gone are dropped, and anyone
  // added since (a new child, say) joins at the end, where they belong.
  const ids = (preview ?? []).filter((id) => byId.has(id));
  for (const i of items) if (!ids.includes(i.id)) ids.push(i.id);

  const commit = useCallback(
    (next: string[]) => {
      const now = items.map((i) => i.id);
      if (next.length === now.length && next.every((id, i) => id === now[i])) return false;
      onReorder(next);
      return true;
    },
    [items, onReorder],
  );

  /** Which item is under the pointer? Falls back to the nearest one. */
  const idAtPoint = (x: number, y: number): string | null => {
    let nearest: string | null = null;
    let best = Infinity;
    for (const id of ids) {
      const el = nodes.current.get(id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id;
      const d = (x - (r.left + r.right) / 2) ** 2 + (y - (r.top + r.bottom) / 2) ** 2;
      if (d < best) {
        best = d;
        nearest = id;
      }
    }
    return nearest;
  };

  const moved = (id: string, to: number): string[] | null => {
    const next = [...ids];
    const from = next.indexOf(id);
    const at = Math.max(0, Math.min(next.length - 1, to));
    if (from < 0 || at === from) return null;
    next.splice(from, 1);
    next.splice(at, 0, id);
    return next;
  };

  const onKeyDown = (item: T) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const earlier = e.key === 'ArrowUp' || e.key === (rtl ? 'ArrowRight' : 'ArrowLeft');
    const later = e.key === 'ArrowDown' || e.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
    if (!earlier && !later) return;
    e.preventDefault();
    const next = moved(item.id, ids.indexOf(item.id) + (earlier ? -1 : 1));
    if (!next) return;
    setPreview(next);
    commit(next);
    setSaid(describeMove(next.indexOf(item.id) + 1, next.length));
  };

  return (
    <div className={className}>
      {ids.map((id) => {
        const item = byId.get(id);
        if (!item) return null;
        const isDragging = dragging === id;
        return (
          <div
            key={id}
            ref={(el) => {
              nodes.current.set(id, el);
            }}
            className={`flex items-stretch gap-2 rounded-2xl ${
              isDragging ? 'relative z-10 shadow-xl ring-4 ring-brand' : ''
            }`}
          >
            <div className="min-w-0 flex-1">{renderItem(item)}</div>
            <button
              type="button"
              aria-label={moveLabelFor(item)}
              className={`tap flex shrink-0 cursor-grab touch-none select-none flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 text-sm font-semibold transition-colors ${
                isDragging
                  ? 'cursor-grabbing border-brand bg-brand text-white'
                  : 'border-line bg-sunk text-ink-soft hover:border-brand hover:text-brand'
              }`}
              onKeyDown={onKeyDown(item)}
              onPointerDown={(e) => {
                if (e.button !== 0 && e.pointerType === 'mouse') return;
                e.preventDefault(); // stops the press turning into a text selection
                e.currentTarget.focus(); // ...but the handle must still take the arrow keys
                e.currentTarget.setPointerCapture(e.pointerId);
                dragId.current = id;
                setPreview([...ids]);
                setDragging(id);
              }}
              onPointerMove={(e) => {
                if (dragId.current !== id) return;
                const over = idAtPoint(e.clientX, e.clientY);
                if (!over || over === id) return;
                const next = moved(id, ids.indexOf(over));
                if (next) setPreview(next);
              }}
              onPointerUp={(e) => {
                if (dragId.current !== id) return;
                dragId.current = null;
                e.currentTarget.releasePointerCapture?.(e.pointerId);
                setDragging(null);
                commit(ids);
              }}
              onPointerCancel={() => {
                if (dragId.current !== id) return;
                dragId.current = null;
                setDragging(null);
                commit(ids);
              }}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ⇅
              </span>
              <span aria-hidden="true">{moveLabel}</span>
            </button>
          </div>
        );
      })}
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
    </div>
  );
}
