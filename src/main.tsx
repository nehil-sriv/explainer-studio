import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/editor-tokens.css';
import './styles/editor-light.css';
import './styles/editor-dark.css';
import { AppShell } from './editor/shell/AppShell.js';
import { applyEditorTheme, getEditorTheme } from './editor/storeHooks.js';

// Editor chrome theme before first paint (canvas themes stay independent).
applyEditorTheme(getEditorTheme());

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');
createRoot(root).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
