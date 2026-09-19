import { useStore } from 'zustand';
import { useState } from 'react';
import { editorStore, type EditorStore } from '../store/editorStore.js';

/** Subscribe to a store slice (re-renders on change). */
export function useEditor<T>(sel: (s: EditorStore) => T): T {
  return useStore(editorStore, sel);
}

export type EditorTheme = 'light' | 'dark';

const THEME_KEY = 'explainer-editor-theme';

/**
 * Editor chrome theme. Follows the system appearance until the person makes
 * an explicit choice, per `dark-mode.md › Best practices` ("Avoid offering an
 * app-specific appearance setting"). The toggle stays as an override.
 */
export function getEditorTheme(): EditorTheme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* private mode — fall through to the system preference */
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }
  return 'dark';
}

export function applyEditorTheme(t: EditorTheme): void {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* private mode — theme still applies for the session */
  }
  document.documentElement.dataset.editorTheme = t;
}

/** Editor chrome theme (light/dark) — canvas themes are independent. */
export function useEditorTheme(): [EditorTheme, () => void] {
  const [theme, setTheme] = useState<EditorTheme>(() =>
    typeof document === 'undefined'
      ? 'dark'
      : (document.documentElement.dataset.editorTheme as EditorTheme) || 'dark',
  );
  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    applyEditorTheme(next);
    setTheme(next);
  };
  return [theme, toggle];
}
