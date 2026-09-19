import type { Edge } from '../domain/edge.js';
import type { Background } from '../domain/background.js';
import type { SceneComponent } from '../domain/component.js';

/**
 * Popout synchronization — the recording/OBS mirror window.
 * The editor posts every frame (project + take state + canvas theme) on a
 * BroadcastChannel; popout.html renders the same SceneView from the same
 * resolved frame, so editor, popout and recording always agree.
 */

export const POPOUT_CHANNEL = 'explainer-studio-popout';
export const POPOUT_HELLO = 'explainer-popout-hello';

export interface PopoutFrameMessage {
  v: 1;
  comps: SceneComponent[];
  edges: Edge[];
  scene: { w: number; h: number };
  theme: string;
  background?: Background;
  active: boolean;
  shown: number;
  revealed: Record<string, number>;
}

export interface PopoutPoster {
  postMessage(msg: unknown): void;
}

function channel(): BroadcastChannel | null {
  try {
    if (typeof BroadcastChannel === 'undefined') return null;
    return new BroadcastChannel(POPOUT_CHANNEL);
  } catch {
    return null;
  }
}

let shared: BroadcastChannel | null = null;

/** Editor side: push the current frame (call on every store change). */
export function postPopoutFrame(msg: Omit<PopoutFrameMessage, 'v'>): void {
  try {
    if (!shared) shared = channel();
    shared?.postMessage({ ...msg, v: 1 });
  } catch {
    /* popout closed or unsupported — the editor never depends on it */
  }
}

/** Editor side: answer popout hello-handshakes with a fresh frame. */
export function listenPopoutHello(onHello: () => void): () => void {
  let bc: BroadcastChannel | null = null;
  try {
    bc = channel();
  } catch {
    return () => {};
  }
  if (!bc) return () => {};
  bc.onmessage = (ev) => {
    if (ev.data === POPOUT_HELLO) onHello();
  };
  return () => bc?.close();
}

/** Popout side: subscribe to frames + announce presence. */
export function subscribePopoutFrames(
  onFrame: (msg: PopoutFrameMessage) => void,
): () => void {
  let bc: BroadcastChannel | null = null;
  try {
    bc = channel();
  } catch {
    return () => {};
  }
  if (!bc) return () => {};
  bc.onmessage = (ev) => {
    const m = ev.data as Partial<PopoutFrameMessage>;
    if (m && m.v === 1 && Array.isArray(m.comps)) onFrame(m as PopoutFrameMessage);
  };
  try {
    bc.postMessage(POPOUT_HELLO);
  } catch {
    /* editor will push on its next change regardless */
  }
  return () => bc?.close();
}
