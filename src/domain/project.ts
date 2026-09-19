import { z } from 'zod';
import { SceneComponentSchema } from './component.js';
import { EdgeSchema } from './edge.js';

/**
 * Scene — Sequence → Scene → Components. Ordered SCENES array plus per-comp
 * sceneId (index.html `ensureDefaultScene` / `sceneComps`). The plan's richer
 * Scene{steps, components, edges} shape lands in Phase 8; here Scene is the
 * observed {id, name} row so imports stay lossless.
 */
export const SceneSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
  })
  .catchall(z.unknown());

export type Scene = z.infer<typeof SceneSchema>;

export const CanvasSettingsSchema = z
  .object({
    w: z.number().optional(),
    h: z.number().optional(),
  })
  .catchall(z.unknown());

export type CanvasSettings = z.infer<typeof CanvasSettingsSchema>;

/**
 * Project — top-level file shape. `version` is the plan's schemaVersion
 * (files in the wild carry version 1 or 3; absent → 1).
 * Legacy aliases preserved for import, normalized on export:
 * holdDefault → seqHoldDefault, episode.scenes → scenes,
 * scenes-as-object-map → scenes array + flattened comps.
 */
export const ProjectSchema = z
  .object({
    version: z.number().optional(),
    scene: CanvasSettingsSchema.optional(),
    comps: z.array(SceneComponentSchema).optional(),
    edges: z.array(EdgeSchema).optional(),
    scenes: z.array(SceneSchema).optional(),
    saved: z.array(z.unknown()).optional(),
    seqHoldDefault: z.number().optional(),
    holdDefault: z.number().optional(),
    script: z.string().optional(),
    currentSceneName: z.string().optional(),
  })
  .catchall(z.unknown());

export type Project = z.infer<typeof ProjectSchema>;
