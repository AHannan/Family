'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A list whose items can be put into a different order.
 *
 * Dragging is the *second* way to do this, never the only one. Each row
 * carries a plain "Up" and "Down" button, so the order can be changed one
 * step at a time with single taps - no gesture, no steady hand, no mouse. The
 * same two buttons double as drag handles: press one and move more than a few
 * millimetres and the row lifts and follows the finger instead.
 *
 * Two things make the drag itself forgiving:
 *
 *  - The list does **not** re-order underneath the finger. Shuffling rows
 *    while the pointer is over them feeds their new positions straight back
 *    into the hit test, and the list flickers between two orders. Here the
 *    rows hold still, the row being dropped onto is ringed and labelled
 *    "Place here", and the move happens once, on release.
 *  - Hit testing runs against the row positions measured at the moment the
 *    drag started, in page coordinates, so neither the lift nor auto-scroll
 *    can move the target out from under the pointer.
 *
 * Pointer events are used directly rather than HTML5 drag-and-drop, which
 * does not exist on touch screens.
 */

/** How far the pointer must travel before a press counts as a drag rather
 *  than a tap. Generous, because a tap from an unsteady hand is not a drag. */
const DRAG_START = 12;
/** Auto-scroll once the pointer comes this close to the top or bottom. */
const EDGE = 96;
const EDGE_SPEED = 16;

/** A row's position on the page, frozen when the drag began. */
interface Box {
  id: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface Drag {
  id: string;
  pointerId: number;
  from: number;
  /** Where the press started, in page coordinates. */
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  /** Index the row would land at if it were released now. */
  target: number;
  /** False until the pointer has moved far enough to count as a drag. */
  lifted: boolean;
}

export function ReorderList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  upLabel,
  downLabel,
  upLabelFor,
  downLabelFor,
  placeHereLabel,
  describePosition,
  describeMove,
  className = '',
}: {
  items: T[];
  /** Called with the full list of ids whenever the order actually changes. */
  onReorder: (orderedIds: string[]) => void;
  renderItem: (item: T) => ReactNode;
  /** The word on the two buttons, e.g. "Up" / "Down". */
  upLabel: string;
  downLabel: string;
  /** Spoken label for one button, e.g. "Move Ali up". */
  upLabelFor: (item: T) => string;
  downLabelFor: (item: T) => string;
  /** Shown on the row a drag would drop onto, e.g. "Place here". */
  placeHereLabel: string;
  /** Live readout while dragging, e.g. "Position 3 of 5". */
  describePosition: (position: number, total: number) => string;
  /** Spoken confirmation after a move, e.g. "Moved to number 2 of 5". */
  describeMove: (position: number, total: number) => string;
  className?: string;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [said, setSaid] = useState('');

  /** The same drag in a ref: pointermove can arrive before the state that
   *  started it has rendered, and the auto-scroll loop needs it too. */
  const dragRef = useRef<Drag | null>(null);
  const boxes = useRef<Box[]>([]);
  const pointer = useRef({ x: 0, y: 0 });
  const frame = useRef<number | null>(null);
  /** A finished drag ends in a click on the handle; that click is not a tap. */
  const swallowClick = useRef(false);
  /** After a step that greys out the button just pressed, move focus across. */
  const refocus = useRef<{ id: string; dir: -1 | 1 } | null>(null);

  const rows = useRef(new Map<string, HTMLDivElement | null>());
  const handles = useRef(new Map<string, HTMLButtonElement | null>());

  const ids = items.map((i) => i.id);

  const put = (d: Drag | null) => {
    dragRef.current = d;
    setDrag(d);
  };

  /** The list with `id` moved to `to`, or null if that is not a move. */
  const moved = (id: string, to: number): string[] | null => {
    const next = [...ids];
    const from = next.indexOf(id);
    const at = Math.max(0, Math.min(next.length - 1, to));
    if (from < 0 || at === from) return null;
    next.splice(from, 1);
    next.splice(at, 0, id);
    return next;
  };

  const apply = (id: string, to: number) => {
    const next = moved(id, to);
    if (!next) return;
    onReorder(next);
    setSaid(describeMove(next.indexOf(id) + 1, next.length));
  };

  /** Which row is the pointer over? Containment first, nearest centre after,
   *  so a pointer dragged off the side of the list still has an answer. */
  const indexAt = (x: number, y: number): number => {
    const list = boxes.current;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) return i;
      const d = (y - (b.top + b.bottom) / 2) ** 2 + (x - (b.left + b.right) / 2) ** 2;
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    return nearest;
  };

  /** Recompute the lift and the target from the last known pointer position.
   *  Split out because auto-scrolling has to redo it without a new event.
   *  Reads only refs, so the copy the scroll loop captured never goes stale. */
  function track() {
    const d = dragRef.current;
    if (!d) return;
    const x = pointer.current.x + window.scrollX;
    const y = pointer.current.y + window.scrollY;
    const dx = x - d.startX;
    const dy = y - d.startY;
    const lifted = d.lifted || Math.hypot(dx, dy) > DRAG_START;
    put({ ...d, dx, dy, lifted, target: lifted ? indexAt(x, y) : d.from });
  }

  /** Scroll the page while the pointer is held near the top or bottom edge,
   *  which is the only way to reach a row that is off-screen. */
  function tick() {
    const d = dragRef.current;
    if (!d || !d.lifted) {
      frame.current = null;
      return;
    }
    const y = pointer.current.y;
    const h = window.innerHeight;
    let by = 0;
    if (y < EDGE) by = -EDGE_SPEED * Math.min(1, (EDGE - y) / EDGE);
    else if (y > h - EDGE) by = EDGE_SPEED * Math.min(1, (y - (h - EDGE)) / EDGE);
    if (by) {
      window.scrollBy(0, by);
      track();
    }
    frame.current = requestAnimationFrame(tick);
  }

  function stop() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    put(null);
  }

  /** Escape abandons a drag with nothing moved. */
  const dragging = drag !== null && drag.lifted;
  useEffect(() => {
    if (!dragging) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      swallowClick.current = true;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      dragRef.current = null;
      setDrag(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dragging]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  /** A button that has just become disabled cannot keep the focus, so hand it
   *  to its partner - otherwise a run of taps on "Up" drops the user out of
   *  the list the moment the row reaches the top. */
  useEffect(() => {
    const want = refocus.current;
    if (!want) return;
    refocus.current = null;
    const i = ids.indexOf(want.id);
    if (i < 0) return;
    const stuck = want.dir === -1 ? i === 0 : i === ids.length - 1;
    if (stuck) handles.current.get(`${want.id}:${-want.dir}`)?.focus();
  });

  const startPress =
    (id: string, index: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // Browsers disagree about whether a click follows a drag, so a swallow
      // left armed by the last one is cleared here rather than left to eat the
      // next genuine tap.
      swallowClick.current = false;
      // Freeze where every row is now, in page coordinates, so that lifting a
      // row and scrolling the page cannot change the answer mid-drag.
      boxes.current = ids.flatMap((rowId) => {
        const r = rows.current.get(rowId)?.getBoundingClientRect();
        if (!r) return [];
        return [
          {
            id: rowId,
            top: r.top + window.scrollY,
            bottom: r.bottom + window.scrollY,
            left: r.left + window.scrollX,
            right: r.right + window.scrollX,
          },
        ];
      });
      pointer.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      put({
        id,
        pointerId: e.pointerId,
        from: index,
        startX: e.clientX + window.scrollX,
        startY: e.clientY + window.scrollY,
        dx: 0,
        dy: 0,
        target: index,
        lifted: false,
      });
    };

  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    pointer.current = { x: e.clientX, y: e.clientY };
    const was = d.lifted;
    track();
    if (!was && dragRef.current?.lifted && frame.current === null) {
      frame.current = requestAnimationFrame(tick);
    }
  };

  const onRelease = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    // A press that never became a drag falls through to the click handler,
    // and the button does its ordinary one-step job.
    if (d.lifted) {
      swallowClick.current = true;
      apply(d.id, d.target);
    }
    stop();
  };

  const onCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (d.lifted) swallowClick.current = true;
    stop();
  };

  const step = (id: string, dir: -1 | 1) => () => {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    refocus.current = { id, dir };
    apply(id, ids.indexOf(id) + dir);
  };

  const handle = (item: T, index: number, dir: -1 | 1) => {
    const off = dir === -1 ? index === 0 : index === items.length - 1;
    const grabbed = drag !== null && drag.lifted && drag.id === item.id;
    // `flex-1` inside the stacked column: the two buttons split the height of
    // the row between them and the row grows to fit, so the targets stay
    // comfortable however large the text is set. No `leading-none` on the
    // label either - it is Urdu half the time, and Nastaliq loses its
    // descenders at anything tighter than the leading globals.css gives it.
    return (
      <button
        type="button"
        ref={(el) => {
          handles.current.set(`${item.id}:${dir}`, el);
        }}
        disabled={off}
        aria-label={dir === -1 ? upLabelFor(item) : downLabelFor(item)}
        className={`tap flex w-full flex-1 touch-none select-none flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-1 text-sm font-semibold transition-colors ${
          off
            ? 'cursor-default border-line-soft bg-transparent text-ink-faint opacity-50'
            : grabbed
              ? 'cursor-grabbing border-brand bg-brand text-white'
              : 'border-line bg-sunk text-ink-soft hover:border-brand hover:text-brand'
        }`}
        onClick={step(item.id, dir)}
        onPointerDown={off ? undefined : startPress(item.id, index)}
        onPointerMove={onMove}
        onPointerUp={onRelease}
        onPointerCancel={onCancel}
      >
        <span aria-hidden="true" className="text-lg leading-none">
          {dir === -1 ? '▲' : '▼'}
        </span>
        <span aria-hidden="true">{dir === -1 ? upLabel : downLabel}</span>
      </button>
    );
  };

  return (
    <div className={className}>
      {items.map((item, index) => {
        const busy = drag !== null && drag.lifted;
        const lifted = busy && drag.id === item.id;
        const isTarget = busy && drag.id !== item.id && drag.target === index;
        const faded = busy && !lifted && !isTarget;
        return (
          <div
            key={item.id}
            ref={(el) => {
              rows.current.set(item.id, el);
            }}
            style={
              lifted && drag
                ? { transform: `translate3d(${drag.dx}px, ${drag.dy}px, 0)` }
                : undefined
            }
            className={`relative flex items-stretch gap-2 rounded-2xl ${
              busy ? 'select-none' : ''
            } ${lifted ? 'z-30 shadow-2xl ring-4 ring-brand' : ''} ${
              isTarget ? 'z-10 ring-4 ring-gold' : ''
            } ${faded ? 'opacity-60' : ''}`}
          >
            <span
              aria-hidden="true"
              className="flex w-5 shrink-0 items-center justify-center text-base font-bold text-ink-faint"
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-1 items-stretch">{renderItem(item)}</div>
            {/* One narrow column, Up above Down, so the pair costs the width of
                a single button - the row still fits a small phone at the
                largest text size. */}
            <div className="flex w-[3.5rem] shrink-0 flex-col gap-1">
              {handle(item, index, -1)}
              {handle(item, index, 1)}
            </div>

            {lifted && drag && (
              <span className="pointer-events-none absolute -top-3 start-6 rounded-full bg-brand px-3 py-0.5 text-sm font-semibold text-white shadow-lg">
                {describePosition(drag.target + 1, items.length)}
              </span>
            )}
            {isTarget && (
              <span className="pointer-events-none absolute -top-3 start-6 rounded-full bg-gold px-3 py-0.5 text-sm font-semibold text-white shadow-lg">
                {placeHereLabel}
              </span>
            )}
          </div>
        );
      })}
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
    </div>
  );
}
