/** Cooperative export cancellation (Esc / Cancel button). */
let cancelled = false;

export function requestExportCancel(): void {
  cancelled = true;
}

export function consumeExportCancel(): boolean {
  const was = cancelled;
  cancelled = false;
  return was;
}

export function isExportCancelled(): boolean {
  return cancelled;
}
