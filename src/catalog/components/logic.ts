/** logic components — extracted verbatim from index.html REGISTRY. */
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

export const logicComponents: Record<string, ComponentDef> = {
  fproc:    { name:'FL · process step',
    group:'logic',
    props:{text:'validate payload', accent:'var(--phos-green)'},
    fields:['text','accent'],
    markup:p=>`<div class="tk-fproc" style="--stroke:${p.accent}">${rich(p.text)}</div>` },
  fdec:     { name:'FL · decision diamond',
    group:'logic',
    help:'yes/no branches — pair with chips for edge labels',
    props:{text:'valid?', accent:'var(--amber)'},
    fields:['text','accent'],
    markup:p=>`<div style="width:283px;height:283px;display:flex;align-items:center;justify-content:center;overflow:visible"><div class="tk-dec" style="--stroke:${p.accent}"><div>${rich(p.text)}</div></div></div>` },
  fterm:    { name:'FL · start / end',
    group:'logic',
    props:{text:'START', accent:'var(--phos-green)'},
    fields:['text','accent'],
    markup:p=>`<div class="tk-term" style="--stroke:${p.accent}">${rich(p.text)}</div>` },
  fio:      { name:'FL · input / output',
    group:'logic',
    props:{text:'read events', accent:'var(--cyan-dim)'},
    fields:['text','accent'],
    markup:p=>`<div class="tk-io" style="--stroke:${p.accent}"><span>${rich(p.text)}</span></div>` },
};
