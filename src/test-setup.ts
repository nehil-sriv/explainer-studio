import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom lacks ResizeObserver (CanvasWorkspace fit-scaling); stub it.
if (typeof ResizeObserver === 'undefined') {
  class StubObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as Record<string, unknown>)['ResizeObserver'] = StubObserver;
}

afterEach(() => {
  cleanup();
});
