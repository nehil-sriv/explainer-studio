import { STATE_TYPE, type SceneComponent } from './component.js';

/**
 * Steps are DERIVED, not stored (Phase 2).
 *
 * Observed engine rule (index.html SEQ): comps[] order === show order.
 * Edit mode shows all; playback reveals the first SEQ.shown entries.
 * `type: 'state'` entries draw nothing — they patch the target's props
 * from their position onward — but they still occupy a sequence position.
 *
 * The plan's first-class Step{componentIds, clearBefore, holdSeconds}
 * objects land with the Phase 8 Story workflow. Until then:
 * - one sequence position per comps[] entry (state steps included),
 * - a step's clearBefore/pin/holdSeconds live on its comp
 *   (c.clearBefore / c.pin / c.seqHold).
 */
export interface DerivedStep {
  /** index into comps[] */
  index: number;
  /** the comp revealed at this position */
  comp: SceneComponent;
  /** true for patch-steps (draw nothing) */
  isState: boolean;
}

export function stepsFromComponents(comps: SceneComponent[]): DerivedStep[] {
  return comps.map((comp, index) => ({
    index,
    comp,
    isState: comp.type === STATE_TYPE,
  }));
}

export function sequenceLength(comps: SceneComponent[]): number {
  return comps.length;
}

/* ===== Merged runs (shared stepId — one Space press reveals a run) =====
 * Legacy parity (index.html runStart/runEnd/...): no stepId →
 * runEnd(i)===i+1 (byte-identical old behaviour). A run MUST be adjacent —
 * takes window a single index, so half a merged beat never shows.
 * Merge makes entries contiguous; splitting always clears the whole run.
 */

export function runStart(comps: SceneComponent[], i: number): number {
  const s = comps[i] && comps[i].stepId;
  if (!s) return i;
  let j = i;
  while (j > 0 && comps[j - 1] && comps[j - 1].stepId === s) j--;
  return j;
}

export function runEnd(comps: SceneComponent[], i: number): number {
  const s = comps[i] && comps[i].stepId;
  if (!s) return i + 1;
  let j = i;
  while (j + 1 < comps.length && comps[j + 1] && comps[j + 1].stepId === s) j++;
  return j + 1;
}

export function runBoundaries(comps: SceneComponent[]): number[] {
  const out: number[] = [];
  let i = 0;
  while (i < comps.length) {
    out.push(i);
    i = runEnd(comps, i);
  }
  return out;
}

export function runMembers(comps: SceneComponent[], i: number): SceneComponent[] {
  return comps.slice(runStart(comps, i), runEnd(comps, i));
}

export function runCount(comps: SceneComponent[]): number {
  return runBoundaries(comps).length;
}

export function runIndexOf(comps: SceneComponent[], i: number): number {
  return runBoundaries(comps).filter((b) => b <= i).length - 1;
}

/**
 * Hold timing for auto takes (legacy seqHoldFor parity): per-step
 * override wins, otherwise the global default. Blank/invalid → default.
 */
export function seqHoldFor(
  c: Pick<SceneComponent, 'seqHold'>,
  holdDefault: number,
): number {
  const per = parseFloat(String(c.seqHold));
  if (isFinite(per) && per >= 0) return per;
  return holdDefault;
}
