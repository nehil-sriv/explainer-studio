import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PopoutApp } from './popout/PopoutApp.js';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');
createRoot(root).render(
  <StrictMode>
    <PopoutApp />
  </StrictMode>,
);
