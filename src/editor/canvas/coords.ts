/**
 * Pointer → canvas coordinate conversion. The scene node is CSS-scaled to
 * fit, so canvas units = (client - rect.left) / (rect.width / canvasW).
 * Self-contained (no fit prop needed): the live rect already encodes scale.
 */
export interface CanvasRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function toCanvasCoords(
  clientX: number,
  clientY: number,
  rect: CanvasRect,
  canvasW: number,
  canvasH: number,
): { x: number; y: number } {
  const sx = rect.width > 0 ? rect.width / canvasW : 1;
  const sy = rect.height > 0 ? rect.height / canvasH : 1;
  return {
    x: (clientX - rect.left) / sx,
    y: (clientY - rect.top) / sy,
  };
}
