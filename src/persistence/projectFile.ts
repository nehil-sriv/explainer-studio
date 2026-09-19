import type { Project } from '../domain/project.js';
import { serializeProject } from '../domain/migrations.js';

/**
 * Project-file adapter — mirrors index.html btn-save / file-open.
 *
 * File shape (v3): { version: 3, scene:{w,h}, comps, edges, scenes,
 * saved, seqHoldDefault?, script?, currentSceneName? }.
 * Comps serialize with `draft` coerced to bool; import strips runtime
 * transients (see migrations.ts). Pure functions — DOM-free so tests
 * and (later) the React shell can share them.
 */
export function toFileJson(project: Project): string {
  return JSON.stringify(serializeProject(project), null, 2);
}
