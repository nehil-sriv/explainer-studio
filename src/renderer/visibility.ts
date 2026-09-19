import type { Edge } from '../domain/edge.js';
import type { SceneComponent } from '../domain/component.js';
import { isState } from './stateChanges.js';

/**
 * Visibility + sequence-state resolution — pure extraction of index.html
 * compVisible() (take path) / retiredBy() plus the edge rule.
 *
 * Take/export rule (deterministic — editor preview adds anchor/👁 handling
 * on top in the shell, Phase 5):
 * - only positions below `shown` are reached (`i >= shown` hides)
 * - 🧹 clear: nearest shown clear-step hides everything before it (📌 survives)
 * - ⊘ hides: any shown step retires listed earlier comps
 * - scheduled exit: hideWhen target reached (k > targetIndex) retires the comp
 * - 🅿 parked and state steps draw nothing
 * - scene take: only the scene's comps play
 * - solo take: only soloed ids show
 * - an edge draws when BOTH endpoints are visible
 */

export interface VisibilityContext {
  /** sequence length revealed so far (SEQ.shown) */
  shown: number;
  /** restricts a take to one scene (SEQ.scene) */
  sceneId?: string | null;
  /** solo-recording id set (REC.solo) */
  soloIds?: string[] | null;
}

export function retiredBy(
  comps: SceneComponent[],
  c: SceneComponent,
  shown: number,
): boolean {
  if (!c.hideWhen) return false;
  const t = comps.findIndex((x) => x && x.id === c.hideWhen);
  return t >= 0 && shown > t;
}

/** Take-mode visibility for one comp at index i. */
export function compVisibleAt(
  comps: SceneComponent[],
  c: SceneComponent,
  i: number,
  ctx: VisibilityContext,
): boolean {
  if (isState(c)) return false;
  if (ctx.soloIds && ctx.soloIds.length && !ctx.soloIds.includes(c.id))
    return false;
  if (c.parked) return false;
  if (ctx.sceneId && c.sceneId !== ctx.sceneId) return false;
  const k = ctx.shown;
  if (i < 0 || i >= k) return false;
  for (let j = k - 1; j >= 0; j--) {
    const s = comps[j];
    if (s && s.clearBefore) {
      if (i < j && !c.pin) return false;
      break;
    }
  }
  for (let j = 0; j < k; j++) {
    const s = comps[j];
    if (s && Array.isArray(s.hides) && s.hides.includes(c.id)) return false;
  }
  if (retiredBy(comps, c, k)) return false;
  return true;
}

export interface SceneFrame {
  /** ids visible at this position, in sequence order */
  visibleIds: string[];
  /** edge ids whose BOTH endpoints are visible */
  edgeIds: string[];
}

/**
 * The deterministic resolver (MIGRATION_PLAN.md Phase 9): editor preview,
 * popout and recording consume this frame instead of reimplementing
 * visibility rules independently.
 */
export function resolveSceneAtStep(
  comps: SceneComponent[],
  edges: Edge[],
  shown: number,
  ctx: Omit<VisibilityContext, 'shown'> = {},
): SceneFrame {
  const full: VisibilityContext = { ...ctx, shown };
  const visible = new Set<string>();
  comps.forEach((c, i) => {
    if (compVisibleAt(comps, c, i, full)) visible.add(c.id);
  });
  return {
    visibleIds: [...visible],
    edgeIds: edges
      .filter((e) => e && visible.has(e.from) && e.to && visible.has(e.to))
      .map((e) => e.id),
  };
}
