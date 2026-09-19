/**
 * Runtime measured sizes — the React equivalent of legacy `_rw/_rh`.
 *
 * The scene renderer paints through `dangerouslySetInnerHTML`, so the store
 * never learns a component's real layout box. CanvasWorkspace measures each
 * rendered `.comp` and records it here; `visualBox` (and therefore handles,
 * snapping, marquee and edges) reads the true size instead of the 220×120
 * fallback.
 *
 * Keyed by comp id and never serialized: purely transient editor state.
 */

const sizes = new Map<string, { w: number; h: number }>();

export function setMeasuredSize(id: string, w: number, h: number): void {
  if (!id || w <= 0 || h <= 0) return;
  sizes.set(id, { w, h });
}

export function measuredSize(id: string | undefined): { w: number; h: number } | undefined {
  return id ? sizes.get(id) : undefined;
}

export function clearMeasuredSize(id: string): void {
  sizes.delete(id);
}

export function clearMeasuredSizes(): void {
  sizes.clear();
}
