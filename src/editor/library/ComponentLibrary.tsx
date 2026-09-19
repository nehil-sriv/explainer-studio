import { useMemo, useState } from 'react';
import { CATALOG_GROUPS } from '../../catalog/groups.js';
import { REGISTRY } from '../../catalog/registry.js';
import { gnIcon } from '../../renderer/componentHelpers.js';
import { commands } from '../../store/commands.js';
import { useEditorTheme } from '../storeHooks.js';
import { useEditor } from '../storeHooks.js';
import {
  CURATED_CATALOG,
  curatedMatches,
  registryKeysForSection,
  sectionGroupTitles,
} from './catalog.js';

export const ICON_PICKER_KINDS = [
  'gateway', 'api', 'db', 'cache', 'queue', 'worker',
  'user', 'cdn', 'app', 'ram', 'cpu', 'gpu',
];

function Tile({
  comp,
  glyph,
  label,
  title,
  wide,
  onAdd,
}: {
  comp?: string;
  glyph: React.ReactNode;
  label: string;
  title: string;
  wide?: boolean;
  onAdd: () => void;
}) {
  return (
    <button
      className={'es-tile' + (wide ? ' wide' : '')}
      data-comp={comp}
      title={title}
      onClick={onAdd}
    >
      <span className="glyph">{glyph}</span>
      <span>{label}</span>
    </button>
  );
}

/** Settings — real editor preferences (theme, timing, canvas, project). */
function SettingsPane() {
  const [theme, toggleTheme] = useEditorTheme();
  const hold = useEditor((s) => s.playback.holdDefault);
  const scene = useEditor((s) => s.project.scene);
  return (
    <div>
      <div className="es-group-head"><span className="t">Settings</span></div>
      <div className="es-row">
        <label>Theme</label>
        <button className="es-btn" onClick={toggleTheme}>
          {theme === 'light' ? '☀ Light' : '☾ Dark'}
        </button>
      </div>
      <div className="es-row">
        <label htmlFor="es-set-hold">Hold s</label>
        <input
          id="es-set-hold"
          type="number"
          min={0}
          max={30}
          step={0.1}
          value={hold}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (isFinite(v) && v >= 0) commands.setHoldDefault(v);
          }}
        />
      </div>
      <div className="es-row">
        <label htmlFor="es-set-cw">Canvas W</label>
        <input
          id="es-set-cw"
          type="number"
          value={scene.w}
          onChange={(e) => commands.setCanvasSize(+e.target.value || 1920, scene.h)}
        />
      </div>
      <div className="es-row">
        <label htmlFor="es-set-ch">Canvas H</label>
        <input
          id="es-set-ch"
          type="number"
          value={scene.h}
          onChange={(e) => commands.setCanvasSize(scene.w, +e.target.value || 1080)}
        />
      </div>
      <div className="es-row">
        <button
          className="es-btn"
          onClick={() => {
            if (window.confirm('Start a new project? Clears the canvas.')) commands.newProject();
          }}
        >
          New project
        </button>
      </div>
    </div>
  );
}

/** Uploads — local images stamped onto the canvas as data URLs. */
function UploadsPane() {
  const [key, setKey] = useState(0);
  return (
    <div>
      <div className="es-group-head"><span className="t">Uploads</span></div>
      <p style={{ fontSize: 11, color: 'var(--ed-text-muted)' }}>
        Local PNGs land on the canvas (stored as data URLs).
      </p>
      <input
        key={key}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/svg+xml"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const r = new FileReader();
          r.onload = () => {
            commands.addComponent({
              type: 'image',
              props: { src: String(r.result), w: 400 },
            });
            setKey((k) => k + 1);
          };
          r.readAsDataURL(f);
        }}
      />
    </div>
  );
}

/** Icons — built-in stroke set; each tile stamps that icon. */
function IconsPane({ query }: { query: string }) {
  const q = query.trim().toLowerCase();
  const kinds = ICON_PICKER_KINDS.filter((k) => !q || k.includes(q));
  return (
    <div>
      <div className="es-group-head"><span className="t">Icons</span></div>
      <div className="es-tiles">
        {kinds.map((k) => (
          <Tile
            key={k}
            comp="icon"
            title={`icon · ${k}`}
            label={k}
            glyph={
              <svg width="24" height="24" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: gnIcon(k) }} />
            }
            onAdd={() => commands.addComponent({ type: 'icon', props: { icon: k } })}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Component library: curated storefront (mock look) + full registry,
 * section grids, icon picker, uploads and settings. Click adds through
 * commands.addComponent; drag-and-drop onto the canvas also works.
 */
export function ComponentLibrary({
  section,
  onCollapse,
}: {
  section: string;
  onCollapse: () => void;
}) {
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(false);
  const keys = useMemo(() => Object.keys(REGISTRY), []);

  const renderRegistryGrid = (list: string[]) => (
    <div className="es-tiles">
      {list.map((k) => (
        <Tile
          key={k}
          comp={k}
          title={REGISTRY[k].name}
          label={REGISTRY[k].name.split('·').pop()?.trim() ?? k}
          glyph={<span>{REGISTRY[k].name.charAt(0)}</span>}
          onAdd={() => commands.addComponent({ type: k })}
        />
      ))}
    </div>
  );

  let body: React.ReactNode = null;
  if (section === 'settings') body = <SettingsPane />;
  else if (section === 'uploads') body = <UploadsPane />;
  else if (section === 'icons') body = <IconsPane query={q} />;
  else if (section === 'components' && !showAll) {
    body = (
      <>
        {curatedMatches(q).map((g) => (
          <div key={g.key}>
            <div className="es-group-head">
              <span className="t">{g.title}</span>
              <button className="es-seeall" onClick={() => setShowAll(true)}>See all</button>
            </div>
            <div className="es-tiles">
              {g.tiles.map((t) => (
                <Tile
                  key={t.label}
                  comp={t.type}
                  title={t.label}
                  label={t.label}
                  glyph={<span>{t.glyph}</span>}
                  onAdd={() => commands.addComponent({ type: t.type, props: t.props })}
                />
              ))}
            </div>
          </div>
        ))}
      </>
    );
  } else {
    const list =
      section === 'components'
        ? keys.filter((k) => {
            if (!q.trim()) return true;
            const def = REGISTRY[k];
            return `${k} ${def.name}`.toLowerCase().includes(q.trim().toLowerCase());
          })
        : registryKeysForSection(section, q);
    body = (
      <>
        {section === 'components' && (
          <button className="es-seeall" onClick={() => setShowAll(false)}>← Curated</button>
        )}
        {section !== 'components' &&
          sectionGroupTitles(section).map((g) => (
            <div key={g.key}>
              <div className="es-group-head">
                <span className="t">{g.key} · {g.count}</span>
              </div>
              {renderRegistryGrid(list.filter((k) => REGISTRY[k].group === g.key))}
            </div>
          ))}
        {section === 'components' && (
          <>
            <div className="es-group-head"><span className="t">All components · {list.length}</span></div>
            {renderRegistryGrid(list)}
          </>
        )}
      </>
    );
  }

  return (
    <div>
      <div className="es-lib-head">
        <h2>Components</h2>
        <button className="es-icon-btn" title="collapse panel" onClick={onCollapse}>✕</button>
      </div>
      {section !== 'settings' && section !== 'uploads' && (
        <input
          className="es-search"
          placeholder="Search components…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      )}
      {body}
    </div>
  );
}
