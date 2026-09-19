import { CATALOG_GROUPS } from '../../catalog/groups.js';
import { REGISTRY } from '../../catalog/registry.js';

/**
 * Curated component catalog — the mock's welcoming storefront
 * (Infrastructure / Services / People & Devices / Arrows & Connectors)
 * over the full 170-type registry. "See all" drops into the complete
 * grid; every tile adds a real component through commands.addComponent.
 */

export interface CatalogTile {
  type: string;
  label: string;
  glyph: string;
  props?: Record<string, unknown>;
}

export interface CatalogGroup {
  key: string;
  title: string;
  tiles: CatalogTile[];
}

export const CURATED_CATALOG: CatalogGroup[] = [
  {
    key: 'infrastructure',
    title: 'Infrastructure',
    tiles: [
      { type: 'server', label: 'Server', glyph: '🖥️' },
      { type: 'db', label: 'Database', glyph: '🗄️' },
      { type: 'cloud', label: 'Cloud', glyph: '☁️' },
      { type: 'container', label: 'Container', glyph: '📦' },
      { type: 'lb', label: 'Load Balancer', glyph: '🔀' },
      { type: 'firewall', label: 'Firewall', glyph: '🧱' },
    ],
  },
  {
    key: 'services',
    title: 'Services',
    tiles: [
      { type: 'gateway', label: 'API', glyph: '</>' },
      { type: 'lambda', label: 'Function', glyph: 'λ' },
      { type: 'queue', label: 'Queue', glyph: '☰' },
      { type: 'bucket', label: 'Storage', glyph: '🪣' },
      { type: 'cache', label: 'Cache', glyph: '🗂️' },
      { type: 'chatmsg', label: 'Message', glyph: '✉️' },
    ],
  },
  {
    key: 'people',
    title: 'People & Devices',
    tiles: [
      { type: 'user', label: 'User', glyph: '👤' },
      { type: 'clientdev', label: 'Laptop', glyph: '💻', props: { label: 'Laptop' } },
      { type: 'clientdev', label: 'Mobile', glyph: '📱', props: { label: 'Mobile' } },
    ],
  },
  {
    key: 'arrows',
    title: 'Arrows & Connectors',
    tiles: [
      { type: 'arrow', label: 'Arrow', glyph: '→' },
      { type: 'wire', label: 'Dashed Arrow', glyph: '⇢', props: { dashed: true } },
      { type: 'wire', label: 'Bidirectional', glyph: '⇄', props: { both: true } },
    ],
  },
];

/** Library rail sections: curated storefront, registry groups, upload, prefs. */
export interface RailSection {
  key: string;
  label: string;
  glyph: string;
}

export const RAIL_SECTIONS: RailSection[] = [
  // Canvas settings come first — this is where every project starts.
  { key: 'canvas', label: 'Canvas', glyph: '▣' },
  { key: 'components', label: 'Components', glyph: '▦' },
  { key: 'text', label: 'Text', glyph: 'T' },
  { key: 'shapes', label: 'Shapes', glyph: '◫' },
  { key: 'icons', label: 'Icons', glyph: '☆' },
  { key: 'illustrations', label: 'Illustrations', glyph: '✎' },
  { key: 'uploads', label: 'Uploads', glyph: '☁' },
  { key: 'settings', label: 'Settings', glyph: '⚙' },
];

/** Registry groups backing each rail section (empty = custom view). */
export const SECTION_GROUPS: Record<string, string[]> = {
  text: ['basics'],
  shapes: ['shapes', 'flow', 'logic', 'seq'],
  illustrations: ['charts', 'finance'],
};

export function sectionGroupTitles(section: string): { key: string; count: number }[] {
  const groups = SECTION_GROUPS[section] ?? [];
  return CATALOG_GROUPS.filter((g) => groups.includes(g.key));
}

export function registryKeysForSection(section: string, query: string): string[] {
  const groups = SECTION_GROUPS[section];
  if (!groups) return [];
  const q = query.trim().toLowerCase();
  return Object.keys(REGISTRY).filter((k) => {
    const def = REGISTRY[k];
    if (!groups.includes(def.group)) return false;
    if (!q) return true;
    return `${k} ${def.name} ${def.group}`.toLowerCase().includes(q);
  });
}

/** Curated storefront category for a registry type (mock subtitles). */
export function categoryFor(type: string): string | null {
  for (const g of CURATED_CATALOG) {
    if (g.tiles.some((t) => t.type === type)) return g.title;
  }
  return null;
}

/** "Scene 1 · The request flow" → "Scene 1" (mock headers). */
export function shortSceneName(name: string | undefined): string {
  return (name ?? '').split('·')[0].trim() || 'Scene';
}
export function curatedMatches(query: string): CatalogGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return CURATED_CATALOG;
  return CURATED_CATALOG.map((g) => ({
    ...g,
    tiles: g.tiles.filter((t) => `${t.label} ${t.type}`.toLowerCase().includes(q)),
  })).filter((g) => g.tiles.length > 0);
}
