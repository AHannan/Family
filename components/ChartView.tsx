'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/ui';
import { lifespan, spousesOf } from '@/lib/family';
import { altName, displayName, t } from '@/lib/i18n';
import {
  buildTree,
  curvePath,
  elbowPath,
  positionTree,
  type PositionedTree,
} from '@/lib/layout';
import { useApp } from '@/lib/store';
import type { Person, Tree } from '@/lib/types';

/** Below this the names stop being readable, so "fit" refuses to go smaller
 *  and aims at the person of interest instead. */
const MIN_FIT = 0.55;

export function ChartView({
  tree,
  focusId,
  onOpen,
  onRootChange,
}: {
  tree: Tree;
  focusId: string | null;
  onOpen: (id: string) => void;
  onRootChange: (id: string) => void;
}) {
  const { settings } = useApp();
  const s = t(settings.locale);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showSpouses, setShowSpouses] = useState(true);
  const [showMaternal, setShowMaternal] = useState(true);
  const [placed, setPlaced] = useState<PositionedTree | null>(null);
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });

  const viewport = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  const built = useMemo(
    () => buildTree(tree.people, tree.rootId, collapsed),
    [tree.people, tree.rootId, collapsed],
  );

  // Cards hold a variable amount of text, so they have to be in the document
  // before anything can be positioned. First paint renders them hidden at the
  // origin; this measures them and hands real coordinates back. Measuring
  // after layout is the one case where setting state from an effect is the
  // correct tool - the sizes do not exist until the browser has laid them out.
  /* eslint-disable react-hooks/set-state-in-effect -- see note above */
  useLayoutEffect(() => {
    if (!built.order.length) {
      setPlaced(null);
      return;
    }
    const heights: Record<string, number> = {};
    for (const id of built.order) {
      heights[id] = cardRefs.current.get(id)?.offsetHeight ?? 110;
    }
    setPlaced(positionTree(built, heights, collapsed));
  }, [built, collapsed, showSpouses, settings.locale, settings.textScale]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const fit = useCallback(() => {
    const box = viewport.current?.getBoundingClientRect();
    if (!placed || !box || !placed.width || !placed.height) return;
    const raw = Math.min(
      (box.width - 48) / placed.width,
      (box.height - 64) / placed.height,
      1.1,
    );
    const zoom = Math.max(raw, MIN_FIT);
    let x = (box.width - placed.width * zoom) / 2;
    let y = 24;
    if (raw < MIN_FIT && focusId && placed.pos[focusId]) {
      // Too big to show whole: aim at the person of interest instead.
      const p = placed.pos[focusId];
      x = box.width / 2 - p.x * zoom;
      if (placed.height * zoom > box.height - 64) {
        y = box.height / 2 - (p.y + p.h / 2) * zoom;
      }
    }
    setView({ zoom, x, y });
  }, [placed, focusId]);

  // Frame it once the first measurement lands, and whenever the root changes.
  const framedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!placed) return;
    const key = `${tree.rootId}:${Object.keys(placed.pos).length}`;
    if (framedFor.current === key) return;
    framedFor.current = key;
    fit();
  }, [placed, tree.rootId, fit]);

  /* ---- pan ---- */
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('[data-card]')) return;
    drag.current = { x: e.clientX, y: e.clientY, ox: view.x, oy: view.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setView((v) => ({
      ...v,
      x: drag.current!.ox + (e.clientX - drag.current!.x),
      y: drag.current!.oy + (e.clientY - drag.current!.y),
    }));
  }
  function endDrag() {
    drag.current = null;
  }

  function zoomBy(factor: number) {
    const box = viewport.current?.getBoundingClientRect();
    setView((v) => {
      const next = Math.max(0.25, Math.min(2.5, v.zoom * factor));
      if (!box) return { ...v, zoom: next };
      const cx = box.width / 2;
      const cy = box.height / 2;
      return {
        zoom: next,
        x: cx - (cx - v.x) * (next / v.zoom),
        y: cy - (cy - v.y) * (next / v.zoom),
      };
    });
  }

  const roots = tree.people;

  if (!tree.rootId || !built.order.length) {
    return <p className="p-8 text-center text-xl text-ink-soft">{s.noneYet}</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* controls */}
      <div className="flex flex-wrap items-center gap-3 border-b-2 border-line-soft bg-card px-4 py-2.5">
        <label className="flex items-center gap-2 text-base font-semibold text-ink-soft">
          {s.startFrom}
          <select
            value={tree.rootId ?? ''}
            onChange={(e) => onRootChange(e.target.value)}
            className="tap max-w-52 rounded-xl border-2 border-line bg-card px-3 text-lg text-ink"
          >
            {roots.map((p) => (
              <option key={p.id} value={p.id}>
                {displayName(p, settings.locale)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-base text-ink-soft">
          <input
            type="checkbox"
            checked={showSpouses}
            onChange={(e) => setShowSpouses(e.target.checked)}
            className="size-6 accent-brand"
          />
          {s.showSpouses}
        </label>
        <label className="flex items-center gap-2 text-base text-ink-soft">
          <input
            type="checkbox"
            checked={showMaternal}
            onChange={(e) => setShowMaternal(e.target.checked)}
            className="size-6 accent-brand"
          />
          {s.showMaternal}
        </label>

        <div className="ms-auto flex items-center gap-2">
          <Button onClick={() => zoomBy(1 / 1.25)} aria-label={s.zoomOut} className="px-4">
            −
          </Button>
          <span className="min-w-14 text-center text-base tabular-nums text-ink-soft">
            {Math.round(view.zoom * 100)}%
          </span>
          <Button onClick={() => zoomBy(1.25)} aria-label={s.zoomIn} className="px-4">
            +
          </Button>
          <Button onClick={fit}>{s.fit}</Button>
        </div>
      </div>

      {/* canvas */}
      <div
        ref={viewport}
        className="chart-field relative min-h-0 flex-1 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
            width: placed?.width ?? 0,
            height: placed?.height ?? 0,
          }}
        >
          {/* Links sit behind the cards. SVG path coordinates are absolute,
              so nothing here flips when the page direction does. */}
          <svg
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            width={placed?.width ?? 0}
            height={placed?.height ?? 0}
            aria-hidden="true"
          >
            {placed &&
              built.order.map((id) => {
                // `placed` is measured one render behind `built`, so on the
                // render that adds a person there is not a position for them
                // yet. The card below hides itself in the same situation;
                // here the whole link is simply left out for that one frame.
                const me = placed.pos[id];
                if (!me) return null;
                const parentId = built.parentOf[id];
                const par = parentId ? placed.pos[parentId] : undefined;
                const otherId = built.otherParent[id];
                const other = showMaternal && otherId ? placed.pos[otherId] : undefined;
                return (
                  <g key={id}>
                    {par && (
                      <path
                        d={elbowPath(par.x, par.y + par.h, me.x, me.y)}
                        fill="none"
                        stroke="var(--color-line)"
                        strokeWidth={2}
                      />
                    )}
                    {other && (
                      <path
                        d={curvePath(other.x, other.y + other.h, me.x, me.y)}
                        fill="none"
                        stroke="var(--color-woman)"
                        strokeWidth={1.5}
                        strokeDasharray="4 5"
                        opacity={0.5}
                      />
                    )}
                  </g>
                );
              })}
          </svg>

          {built.order.map((id) => {
            const person = tree.people.find((p) => p.id === id);
            if (!person) return null;
            const box = placed?.pos[id];
            const kids = built.children[id] ?? [];
            const isCollapsed = !!collapsed[id];
            return (
              <div
                key={id}
                data-card
                ref={(el) => {
                  if (el) cardRefs.current.set(id, el);
                  else cardRefs.current.delete(id);
                }}
                className={`absolute rounded-2xl border-2 bg-card p-3 shadow-sm ${
                  id === focusId ? 'border-brand ring-4 ring-brand-soft' : 'border-line'
                }`}
                style={{
                  width: 220,
                  insetInlineStart: 'auto',
                  left: box ? box.x - box.w / 2 : 0,
                  top: box ? box.y : 0,
                  visibility: box ? 'visible' : 'hidden',
                  borderTopColor:
                    person.gender === 'f'
                      ? 'var(--color-woman)'
                      : person.gender === 'm'
                        ? 'var(--color-man)'
                        : undefined,
                  borderTopWidth: 5,
                }}
              >
                <button type="button" onClick={() => onOpen(id)} className="w-full text-start">
                  <span className="block text-lg font-bold leading-snug">
                    {displayName(person, settings.locale)}
                  </span>
                  {altName(person, settings.locale) && (
                    <span
                      className="block text-base text-ink-soft"
                      lang={settings.locale === 'ur' ? 'en' : 'ur'}
                      dir={settings.locale === 'ur' ? 'ltr' : 'rtl'}
                    >
                      {altName(person, settings.locale)}
                    </span>
                  )}
                  {lifespan(person) && (
                    <span className="block text-sm text-ink-soft">{lifespan(person)}</span>
                  )}
                  {showSpouses && <SpouseLine tree={tree} personId={id} />}
                </button>

                {(kids.length > 0 || isCollapsed) && (
                  <button
                    type="button"
                    title={isCollapsed ? s.showBranch : s.hideBranch}
                    aria-label={isCollapsed ? s.showBranch : s.hideBranch}
                    onClick={() =>
                      setCollapsed((c) => {
                        const n = { ...c };
                        if (n[id]) delete n[id];
                        else n[id] = true;
                        return n;
                      })
                    }
                    className={`absolute -bottom-4 start-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-full border-2 text-base font-bold rtl:translate-x-1/2 ${
                      isCollapsed
                        ? 'border-brand bg-brand text-white'
                        : 'border-line bg-card text-ink-soft'
                    }`}
                  >
                    {isCollapsed ? kids.length || '+' : '−'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm text-ink-faint">
          {s.chartHint}
        </p>
      </div>
    </div>
  );
}

function SpouseLine({ tree, personId }: { tree: Tree; personId: string }) {
  const { settings } = useApp();
  const s = t(settings.locale);
  const spouses: Person[] = spousesOf(tree.people, personId);
  if (!spouses.length) return null;
  const names = spouses.slice(0, 2).map((p) => displayName(p, settings.locale)).join('، ');
  const extra = spouses.length > 2 ? ` +${spouses.length - 2}` : '';
  return (
    <span className="mt-2 block border-t-2 border-dashed border-line pt-1.5 text-sm text-ink-soft">
      <span className="font-semibold text-ink">{s.marriedTo}: </span>
      {names}
      {extra}
    </span>
  );
}
