/** Catalog groups manifest — order of first appearance in the registry. */
export interface CatalogGroup { key: string; count: number; }

export const CATALOG_GROUPS: CatalogGroup[] = [
  { key: 'basics', count: 12 },
  { key: 'ui', count: 10 },
  { key: 'meta', count: 41 },
  { key: 'seq', count: 4 },
  { key: 'nodes', count: 18 },
  { key: 'actors', count: 2 },
  { key: 'shapes', count: 2 },
  { key: 'data', count: 10 },
  { key: 'groups', count: 1 },
  { key: 'flow', count: 14 },
  { key: 'ai', count: 20 },
  { key: 'logic', count: 4 },
  { key: 'chrome', count: 7 },
  { key: 'charts', count: 6 },
  { key: 'finance', count: 11 },
  { key: 'cloud', count: 8 },
];
