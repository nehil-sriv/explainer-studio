/** Component catalog — merged REGISTRY (verbatim extraction). */
import { basicsComponents } from './components/basics.js';
import { uiComponents } from './components/ui.js';
import { metaComponents } from './components/meta.js';
import { seqComponents } from './components/seq.js';
import { nodesComponents } from './components/nodes.js';
import { actorsComponents } from './components/actors.js';
import { shapesComponents } from './components/shapes.js';
import { dataComponents } from './components/data.js';
import { groupsComponents } from './components/groups.js';
import { flowComponents } from './components/flow.js';
import { aiComponents } from './components/ai.js';
import { logicComponents } from './components/logic.js';
import { chromeComponents } from './components/chrome.js';
import { chartsComponents } from './components/charts.js';
import { financeComponents } from './components/finance.js';
import { cloudComponents } from './components/cloud.js';

export interface ComponentDef {
  name: string;
  group: string;
  // biome-ignore lint/suspicious/noExplicitAny: registry props are free-form by design
  props: Record<string, any>;
  fields: string[];
  fieldTypes?: Record<string, string>;
  // biome-ignore lint/suspicious/noExplicitAny: registry options are free-form by design
  options?: Record<string, any>;
  help?: string;
  // biome-ignore lint/suspicious/noExplicitAny: markup receives free-form props by design
  markup: (p: any) => string;
  // biome-ignore lint/suspicious/noExplicitAny: forward-compat passthrough
  [key: string]: any;
}

export const REGISTRY: Record<string, ComponentDef> = Object.assign(
  {},

  basicsComponents,
  uiComponents,
  metaComponents,
  seqComponents,
  nodesComponents,
  actorsComponents,
  shapesComponents,
  dataComponents,
  groupsComponents,
  flowComponents,
  aiComponents,
  logicComponents,
  chromeComponents,
  chartsComponents,
  financeComponents,
  cloudComponents,
);
