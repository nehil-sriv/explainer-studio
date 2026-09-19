import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEYS,
  readAutosave,
  readLibrary,
  writeAutosave,
  writeLibrary,
  type KeyValueStorage,
} from './localStorage.js';

function memStorage(seed: Record<string, string> = {}): KeyValueStorage {
  const m = new Map(Object.entries(seed));
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

describe('localStorage adapters', () => {
  it('autosave writes only the autosave key (explicit-save rule)', () => {
    const s = memStorage();
    writeAutosave(s, { comps: [], edges: [] });
    expect(s.getItem(STORAGE_KEYS.autosave)).toContain('comps');
    // library keys untouched — autosave must never overwrite saved scenes
    expect(s.getItem(STORAGE_KEYS.savedComponents)).toBeNull();
    expect(s.getItem(STORAGE_KEYS.compositions)).toBeNull();
  });

  it('reads v2 fallback and rejects corrupt payloads', () => {
    const s = memStorage({
      [STORAGE_KEYS.autosaveV2]: JSON.stringify({ comps: [{ id: 'a' }] }),
    });
    expect(readAutosave(s)).toEqual({ comps: [{ id: 'a' }] });
    expect(readAutosave(memStorage())).toBeNull();
    expect(
      readAutosave(memStorage({ [STORAGE_KEYS.autosave]: 'not-json{' })),
    ).toBeNull();
  });

  it('library round-trips behind the explicit-save path only', () => {
    const s = memStorage();
    writeLibrary(s, STORAGE_KEYS.savedComponents, [{ type: 'svc' }]);
    expect(readLibrary(s, STORAGE_KEYS.savedComponents)).toEqual([
      { type: 'svc' },
    ]);
    expect(readLibrary(memStorage(), STORAGE_KEYS.savedComponents)).toEqual([]);
  });
});
