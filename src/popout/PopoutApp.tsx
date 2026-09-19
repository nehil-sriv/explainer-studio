import { useEffect, useState } from 'react';
import '../../assets/tokens.css';
import '../../css/core.css';
import '../../css/phosphor.css';
import '../../themes/minimal.css';
import '../../themes/warm-paper.css';
import '../../themes/quiet-terminal.css';
import '../../themes/technical-blue.css';
import '../../themes/ink-grid.css';
import '../../themes/editorial.css';
import '../../themes/neon.css';
import '../../themes/ember.css';
import '../../themes/insta.css';
import '../../themes/studio-black.css';
import '../../themes/phosphor.css';
import '../../themes/paper.css';
import '../../themes/glass.css';
import '../../themes/brutal.css';
import '../editor/canvas/canvas.css';
import '../editor/canvas/entrances.css';
import { SceneView } from '../editor/canvas/SceneView.js';
import { resolveSceneAtStep } from '../renderer/visibility.js';
import { subscribePopoutFrames, type PopoutFrameMessage } from './sync.js';

/**
 * Popout mirror — the OBS recording target: scene only, no chrome.
 * Consumes the same resolved frame as the editor (agreement gate).
 */
export function PopoutApp({ initial }: { initial?: PopoutFrameMessage }) {
  const [msg, setMsg] = useState<PopoutFrameMessage | null>(initial ?? null);

  useEffect(() => subscribePopoutFrames(setMsg), []);

  if (!msg) {
    return (
      <div style={{ color: '#888', fontFamily: 'system-ui', padding: 40 }}>
        Waiting for the editor… (open this from the ⧉ Popout button)
      </div>
    );
  }

  const frame = msg.active
    ? resolveSceneAtStep(msg.comps, msg.edges, msg.shown)
    : null;
  const visible = frame ? new Set(frame.visibleIds) : null;
  const edgeIds = frame
    ? new Set(frame.edgeIds)
    : new Set(
        msg.edges
          .filter(
            (e) =>
              msg.comps.some((c) => c.id === e.from) &&
              e.to &&
              msg.comps.some((c) => c.id === e.to),
          )
          .map((e) => e.id),
      );

  return (
    <div
      style={{
        margin: 0,
        background: '#000',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SceneView
        comps={msg.comps}
        edges={msg.edges}
        w={msg.scene.w}
        h={msg.scene.h}
        theme={msg.theme}
        background={msg.background}
        fit={1}
        active={msg.active}
        shown={msg.shown}
        revealed={msg.revealed ?? {}}
        visibleIds={visible}
        edgeIds={edgeIds}
      />
    </div>
  );
}
