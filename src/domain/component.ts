import { z } from 'zod';

/**
 * SceneComponent — one entry in the sequence (comps[] order === show order).
 *
 * Field inventory mirrored from index.html (REGISTRY + inspector + SEQ engine):
 * - identity/placement: id, type, x, y, scale, rot, z, opacity, draft, fscale
 * - motion: anim, animDur, animDelay, out (exit animation)
 * - payload: props (per-type, free-form)
 * - story position: sceneId; clearBefore (🧹), pin (📌), hides[] + hideWhen (⊘/exit)
 * - timing: seqHold (per-step override, blank = global)
 * - state steps (type === 'state'): target + patch, draw nothing
 * - extras: groupId, locked, parked, wpx/hpx (measured sizes)
 *
 * Legacy/transient keys handled by migrations.ts, never stored here as
 * first-class fields: beat (v2 ordering), carry (→ pin), _stateAt/_played/
 * revealed/_rw/_rh (runtime caches).
 *
 * The schema is deliberately permissive: unknown keys pass through via
 * catchall so future/registry-specific fields survive round-trips.
 */
export const STATE_TYPE = 'state' as const;

export const SceneComponentSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    x: z.number().optional(),
    y: z.number().optional(),
    scale: z.number().optional(),
    rot: z.number().optional(),
    z: z.number().optional(),
    opacity: z.number().optional(),
    draft: z.boolean().optional(),
    fscale: z.number().optional(),
    anim: z.string().optional(),
    animDur: z.number().optional(),
    animDelay: z.number().optional(),
    out: z.string().optional(),
    props: z.record(z.string(), z.unknown()).optional(),
    sceneId: z.string().optional(),
    clearBefore: z.boolean().optional(),
    pin: z.boolean().optional(),
    hides: z.array(z.string()).optional(),
    hideWhen: z.string().optional(),
    seqHold: z.number().optional(),
    target: z.string().optional(),
    patch: z.record(z.string(), z.unknown()).optional(),
    /** shared run id — one Space press reveals the whole contiguous run */
    stepId: z.string().optional(),
    groupId: z.string().optional(),
    locked: z.boolean().optional(),
    parked: z.boolean().optional(),
    wpx: z.number().optional(),
    hpx: z.number().optional(),
  })
  .catchall(z.unknown());

export type SceneComponent = z.infer<typeof SceneComponentSchema>;

export function isStateStep(c: Pick<SceneComponent, 'type'>): boolean {
  return c.type === STATE_TYPE;
}
