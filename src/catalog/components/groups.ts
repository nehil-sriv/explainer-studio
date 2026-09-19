/** groups components — extracted verbatim from index.html REGISTRY. */
// @ts-nocheck — verbatim legacy JS (see header below). Type safety lives
// at the ComponentDef boundary (registry.ts) plus the golden tests
// (registry.test.ts), not inside these generated bodies.
import type { ComponentDef } from '../registry.js';
import { rich, escHtml } from '../../renderer/richText.js';
import {
  bulletRows,
  cleanThemeColor,
  codeMarkup,
  escXml,
  fmtMoney,
  fmtTime,
  gnIcon,
  liveHex,
  splitPipeLines,
  tkCyl,
  TK_BOLT,
  TK_CLOCK,
} from '../../renderer/componentHelpers.js';

export const groupsComponents: Record<string, ComponentDef> = {
  boundary: { name:'TK · boundary (cluster/node/AZ)',
    group:'groups',
    help:'dashed region with title tab — add it FIRST so pods/services sit on top. tint = trust/blast-radius wash.',
    props:{label:'cluster-prod', tint:'none', w:900, h:520, accent:'var(--text-dim)'},
    fields:['label','tint','w','h','accent'], fieldTypes:{tint:'select',w:'number',h:'number'}, options:{tint:['none','green','red']},
    markup:p=>`<div class="tk-zone ${p.tint==='green'?'tint-g':p.tint==='red'?'tint-r':''}" style="--stroke:${p.accent};width:${+p.w||900}px;height:${+p.h||520}px"><span class="ztab">${rich(p.label)}</span></div>` },
};
