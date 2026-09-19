/**
 * Storage-key registry + explicit-save rule, mirrored from index.html.
 *
 * Observed keys:
 * - phosphor-autosave-v3 (canvas state; written every 2s) with
 *   phosphor-autosave-v2 read-fallback (beats-era)
 * - phosphor-saved-v1 (component library — written ONLY by saveComp)
 * - phosphor-compositions-v1 (kits — written ONLY by kit save)
 * - UI-only: phosphor-chrome, phosphor-comptab, phosphor-railtab,
 *   phosphor-palclosed-v1, phosphor-scenefold, phosphor-onboarded,
 *   phosphor-grid, phosphor-safe, explainer-mic
 *
 * HARD RULE (AGENTS.md): only an explicit save action writes library /
 * composition storage. Autosave, clear and file-open must NEVER touch
 * those keys — a past bug silently wiped saved scenes. These adapters
 * enforce that by construction: the autosave adapter only knows AKEY,
 * and library writes live behind `writeLibrary` (explicit-save path).
 */

export const STORAGE_KEYS = {
  autosave: 'phosphor-autosave-v3',
  autosaveV2: 'phosphor-autosave-v2',
  savedComponents: 'phosphor-saved-v1',
  compositions: 'phosphor-compositions-v1',
} as const;

/** Minimal storage surface so adapters run in node tests and browsers alike. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Autosave write — canvas state only. Must never write library keys. */
export function writeAutosave(
  storage: KeyValueStorage,
  payload: Record<string, unknown>,
): void {
  storage.setItem(STORAGE_KEYS.autosave, JSON.stringify(payload));
}

/** Autosave read with v2 fallback. Returns null when nothing is stored. */
export function readAutosave(storage: KeyValueStorage): unknown | null {
  const raw =
    storage.getItem(STORAGE_KEYS.autosave) ??
    storage.getItem(STORAGE_KEYS.autosaveV2);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Explicit-save path for the component library (saveComp / kit save). */
export function writeLibrary(
  storage: KeyValueStorage,
  key:
    | typeof STORAGE_KEYS.savedComponents
    | typeof STORAGE_KEYS.compositions,
  value: unknown,
): void {
  storage.setItem(key, JSON.stringify(value ?? []));
}

export function readLibrary(storage: KeyValueStorage, key: string): unknown {
  try {
    return JSON.parse(storage.getItem(key) ?? '[]') ?? [];
  } catch {
    return [];
  }
}
