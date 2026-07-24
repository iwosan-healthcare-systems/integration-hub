import { useCallback, useRef, useState, type RefObject } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

interface Point {
  x: number;
  y: number;
}

function clampScale(s: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

// Wheel/pinch-to-zoom + drag-to-pan for a single image, anchored at the
// cursor/pinch midpoint (Google Photos-style). Zero external deps.
export function useZoomPan<T extends HTMLElement>(containerRef: RefObject<T>) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState<Point>({ x: 0, y: 0 });
  const stateRef = useRef({ scale: 1, pos: { x: 0, y: 0 } });
  stateRef.current = { scale, pos };

  const pointers = useRef<Map<number, Point>>(new Map());
  const lastDist = useRef<number | null>(null);
  const lastSingle = useRef<Point | null>(null);

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const { scale: curScale, pos: curPos } = stateRef.current;
      const newScale = clampScale(curScale * factor);
      if (newScale === curScale) return;

      if (newScale === MIN_SCALE) {
        setScale(newScale);
        setPos({ x: 0, y: 0 });
        return;
      }

      const contentX = (clientX - cx - curPos.x) / curScale;
      const contentY = (clientY - cy - curPos.y) / curScale;
      setScale(newScale);
      setPos({ x: clientX - cx - contentX * newScale, y: clientY - cy - contentY * newScale });
    },
    [containerRef]
  );

  const reset = useCallback(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
    pointers.current.clear();
    lastDist.current = null;
    lastSingle.current = null;
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
    },
    [zoomAt]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      lastSingle.current = { x: e.clientX, y: e.clientY };
    } else if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      lastDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = Array.from(pointers.current.values());

      if (pts.length === 2) {
        const [a, b] = pts;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        if (lastDist.current) zoomAt(midX, midY, dist / lastDist.current);
        lastDist.current = dist;
      } else if (pts.length === 1 && stateRef.current.scale > 1 && lastSingle.current) {
        const dx = e.clientX - lastSingle.current.x;
        const dy = e.clientY - lastSingle.current.y;
        setPos((p) => ({ x: p.x + dx, y: p.y + dy }));
        lastSingle.current = { x: e.clientX, y: e.clientY };
      }
    },
    [zoomAt]
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    lastDist.current = null;
    const remaining = Array.from(pointers.current.values());
    lastSingle.current = remaining.length === 1 ? remaining[0] : null;
  }, []);

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (stateRef.current.scale > 1) reset();
      else zoomAt(e.clientX, e.clientY, 2.5);
    },
    [zoomAt, reset]
  );

  return {
    scale,
    pos,
    reset,
    isZoomed: scale > 1,
    bind: {
      onWheel,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onDoubleClick,
    },
  };
}
