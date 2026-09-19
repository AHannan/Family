'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A list whose items can be put into a different order.
 *
 * Two ways to do it, and neither one is hidden:
 *
 *  - "Up" and "Down" on every row move it one step per tap. No gesture, no
 *    steady hand, no mouse - this is the way that always works.
 *  - A "Move" handle beside them, the full height of the row, is pressed and
 *    dragged. It is its own control rather than a secret gesture on the
 *    arrows: a handle you can see is a handle you can find, and the arrows go
 *    back to being plain buttons that do one thing.
 *
 * Three things make the drag itself forgiving:
 *
 *  - The rows slide aside to open a gap where the person would land, and the
 *    gap says "Place here". You are putting somebody into a space, not aiming
 *    at a row.
 *  - Hit testing runs against the row positions measured at the moment the
 *    drag started, in page coordinates, so the sliding rows never feed their
 *    new positions back into the hit test - that is what makes lists like
 *    this flicker between two orders - and neither the lift nor auto-scroll
 *    can move the target out from under the pointer.
 *  - Nothing moves until the finger comes up, and Escape abandons the drag
 *    with nothing moved at all.
 *
 * Pointer events are used directly rather than HTML5 drag-and-drop, which
 * does not exist on touch screens.
 */

/** How far the pointer must travel before a press counts as a drag. Small,
 *  because the handle has no other job - a press on it is already a drag. */
const DRAG_START = 6;
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

/** Everything about the list's shape, measured once when the drag began. */
interface Geometry {
  boxes: Box[];
  /** Vertical space between one row and the next. */
  gap: number;
  /** Top of the list itself, so the gap can be placed inside it. */
  containerTop: number;
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
  dragLabel,
  dragLabelFor,
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
  /** The word on the drag handle, e.g. "Move". */
  dragLabel: string;
  /** Spoken label for the handle, which also says how to work it. */
  dragLabelFor: (item: T) => string;
  /** Shown in the gap a drag would drop into, e.g. "Place here". */
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
  const geometry = useRef<Geometry | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const frame = useRef<number | null>(null);
  /** After a step that greys out the button just pressed, move focus across. */
  const refocus = useRef<{ id: string; dir: -1 | 1 } | null>(null);

  const list = useRef<HTMLDivElement | null>(null);
  const rows = useRef(new Map<string, HTMLDivElement | null>());
  const arrows = useRef(new Map<string, HTMLButtonElement | null>());

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
    const boxes = geometry.current?.boxes ?? [];
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
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
    geometry.current = null;
    put(null);
  }

  /** Escape abandons a drag with nothing moved. */
  const dragging = drag !== null && drag.lifted;
  useEffect(() => {
    if (!dragging) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      geometry.current = null;
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
    if (stuck) arrows.current.get(`${want.id}:${-want.dir}`)?.focus();
  });

  const startPress =
    (id: string, index: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // Freeze where every row is now, in page coordinates, so that neither
      // the rows sliding aside nor the page scrolling can change the answer
      // mid-drag.
      const boxes = ids.flatMap((rowId) => {
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
      // Half-measured is worse than not dragging at all: the gap would open in
      // the wrong place. Up and Down still work.
      if (boxes.length !== ids.length || boxes.length < 2) return;
      const frame = list.current?.getBoundingClientRect();
      geometry.current = {
        boxes,
        gap: Math.max(0, boxes[1].top - boxes[0].bottom),
        containerTop: (frame?.top ?? 0) + window.scrollY,
      };
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
    // A press that never became a drag leaves the order alone - the handle has
    // nothing else to do on a tap.
    if (d.lifted) apply(d.id, d.target);
    stop();
  };

  const onCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    stop();
  };

  /** Arrow keys on the handle, so it is worth something without a pointer.
   *  The handle is never disabled, so focus stays on it however far the row
   *  travels - it needs no partner button to hand focus to, as Up and Down do. */
  const onGripKey = (id: string) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const at = ids.indexOf(id);
    if (at < 0) return;
    let to = at;
    if (e.key === 'ArrowUp') to = at - 1;
    else if (e.key === 'ArrowDown') to = at + 1;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = ids.length - 1;
    else return;
    e.preventDefault();
    apply(id, to);
  };

  const step = (id: string, dir: -1 | 1) => () => {
    refocus.current = { id, dir };
    apply(id, ids.indexOf(id) + dir);
  };

  const arrow = (item: T, index: number, dir: -1 | 1) => {
    const off = dir === -1 ? index === 0 : index === items.length - 1;
    // `flex-1` inside the stacked column: the two buttons split the height of
    // the row between them and the row grows to fit, so the targets stay
    // comfortable however large the text is set. No `leading-none` on the
    // label either - it is Urdu half the time, and Nastaliq loses its
    // descenders at anything tighter than the leading globals.css gives it.
    return (
      <button
        type="button"
        ref={(el) => {
          arrows.current.set(`${item.id}:${dir}`, el);
        }}
        disabled={off}
        aria-label={dir === -1 ? upLabelFor(item) : downLabelFor(item)}
        className={`tap flex w-full flex-1 select-none flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-1 text-sm font-semibold transition-colors ${
          off
            ? 'cursor-default border-line-soft bg-transparent text-ink-faint opacity-50'
            : 'border-line bg-sunk text-ink-soft hover:border-brand hover:text-brand'
        }`}
        onClick={step(item.id, dir)}
      >
        <span aria-hidden="true" className="text-lg leading-none">
          {dir === -1 ? '▲' : '▼'}
        </span>
        <span aria-hidden="true">{dir === -1 ? upLabel : downLabel}</span>
      </button>
    );
  };

  /** The grip. Full height of the row, and it says "Move" - the dots on their
   *  own would be an icon-only control, which nothing here is. */
  const grip = (item: T, index: number) => {
    const grabbed = drag !== null && drag.lifted && drag.id === item.id;
    return (
      <button
        type="button"
        aria-label={dragLabelFor(item)}
        className={`tap flex w-full flex-1 touch-none select-none flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 text-sm font-semibold transition-colors ${
          grabbed
            ? 'cursor-grabbing border-brand bg-brand text-white'
            : 'cursor-grab border-line bg-sunk text-ink-soft hover:border-brand hover:text-brand'
        }`}
        onPointerDown={startPress(item.id, index)}
        onPointerMove={onMove}
        onPointerUp={onRelease}
        onPointerCancel={onCancel}
        onKeyDown={onGripKey(item.id)}
      >
        <span aria-hidden="true" className="grid grid-cols-2 gap-[0.2rem]">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="size-[0.3rem] rounded-full bg-current" />
          ))}
        </span>
        <span aria-hidden="true">{dragLabel}</span>
      </button>
    );
  };

  /* ---- where everything sits while a drag is in progress ---- */
  const geo = geometry.current;
  const busy = drag !== null && drag.lifted && geo !== null;
  /** The height the dragged row takes with it: exactly the space the rows it
   *  passes have to give back, and the space the gap has to open. */
  const span =
    busy && drag && geo
      ? geo.boxes[drag.from].bottom - geo.boxes[drag.from].top + geo.gap
      : 0;

  /** How far row `i` slides to make room. Every row between where the person
   *  came from and where they would land moves one place towards the vacancy. */
  const slide = (i: number) => {
    if (!busy || !drag) return 0;
    const { from, target } = drag;
    if (i === from) return 0;
    if (target > from && i > from && i <= target) return -span;
    if (target < from && i >= target && i < from) return span;
    return 0;
  };

  let gapTop = 0;
  let gapHeight = 0;
  if (busy && drag && geo) {
    const b = geo.boxes;
    gapHeight = b[drag.from].bottom - b[drag.from].top;
    // Dragging downwards, the rows in between have already slid up, so the
    // vacancy is below the last of them. Upwards, it is simply where that row
    // used to be.
    const top =
      drag.target > drag.from ? b[drag.target].bottom - span + geo.gap : b[drag.target].top;
    gapTop = top - geo.containerTop;
  }

  return (
    <div ref={list} className={`relative ${className}`}>
      {busy && (
        <div
          className="pointer-events-none absolute start-0 end-0 z-0 flex items-center justify-center rounded-2xl border-4 border-dashed border-gold bg-gold/10 px-2 text-center text-base font-semibold text-gold"
          style={{ top: `${gapTop}px`, height: `${gapHeight}px` }}
        >
          {placeHereLabel}
        </div>
      )}

      {items.map((item, index) => {
        const lifted = busy && drag !== null && drag.id === item.id;
        const by = slide(index);
        return (
          <div
            key={item.id}
            ref={(el) => {
              rows.current.set(item.id, el);
            }}
            style={
              lifted && drag
                ? { transform: `translate3d(${drag.dx}px, ${drag.dy}px, 0)` }
                : by
                  ? { transform: `translate3d(0, ${by}px, 0)` }
                  : undefined
            }
            className={`relative flex items-stretch gap-2 rounded-2xl ${
              busy ? 'select-none bg-paper' : ''
            } ${
              lifted
                ? 'z-30 shadow-2xl ring-4 ring-brand'
                : // Only the rows sliding aside are animated, and only while
                  // the drag is on: the dragged row has to sit under the
                  // finger rather than catch up with it, and on release the
                  // list is re-ordered for real, so a transition left running
                  // would slide every row back out of its new place.
                  busy
                  ? 'z-10 transition-transform duration-150 ease-out'
                  : ''
            }`}
          >
            <span
              aria-hidden="true"
              className="flex w-5 shrink-0 items-center justify-center text-base font-bold text-ink-faint"
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-1 items-stretch">{renderItem(item)}</div>
            {/* Both control columns are the 3rem `tap` minimum and no wider:
                the handle and the pair of arrows together cost the width of
                two buttons, and the name beside them still has room on a small
                phone at the largest text size. Up sits above Down so that the
                words mean what they say. */}
            <div className="flex w-12 shrink-0 flex-col">{grip(item, index)}</div>
            <div className="flex w-12 shrink-0 flex-col gap-1">
              {arrow(item, index, -1)}
              {arrow(item, index, 1)}
            </div>

            {lifted && drag && (
              <span className="pointer-events-none absolute -top-3 start-6 rounded-full bg-brand px-3 py-0.5 text-sm font-semibold text-white shadow-lg">
                {describePosition(drag.target + 1, items.length)}
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
