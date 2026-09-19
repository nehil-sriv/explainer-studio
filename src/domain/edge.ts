import { z } from 'zod';

/**
 * Edge — wires live in the edges[] layer (NOT comps).
 * Observed keys from the Edge panel + canvas renderer:
 * from/fromPort → to/toPort, preset, label, caption, routing
 * (smooth/step/straight/curved), branch tint, weight, dir, style
 * (dots/dash/pulse), speed, animate, pillAccent.
 */
export const EdgeSchema = z
  .object({
    id: z.string(),
    from: z.string(),
    fromPort: z.string().optional(),
    to: z.string().optional(),
    toPort: z.string().optional(),
    preset: z.string().optional(),
    label: z.string().optional(),
    caption: z.string().optional(),
    routing: z.string().optional(),
    branch: z.string().optional(),
    weight: z.number().optional(),
    dir: z.string().optional(),
    style: z.string().optional(),
    speed: z.number().optional(),
    animate: z.boolean().optional(),
    pillAccent: z.string().optional(),
  })
  .catchall(z.unknown());

export type Edge = z.infer<typeof EdgeSchema>;
