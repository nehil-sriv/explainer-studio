import { useStore } from 'zustand';
import { useState } from 'react';
import { editorStore, type EditorStore } from '../store/editorStore.js';

/** Subscribe to a store slice (re-renders on change). */
export function useEditor<T>(sel: (s: EditorStore) => T): T {
  return useStore(editorStore, sel);
}

export type EditorTheme = 'light' | 'dark';

const THEME_KEY = 'explainer-editor-theme';

export function getEditorTheme(): EditorTheme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
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
