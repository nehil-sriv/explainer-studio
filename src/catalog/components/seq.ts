/** seq components — extracted verbatim from index.html REGISTRY. */
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

export const seqComponents: Record<string, ComponentDef> = {
  loopbox:  { name:'Loop box (dashed)',
    group:'seq',
    props:{text:'↻ see: recursion'},
    fields:['text'],
    markup:p=>`<div class="loopbox">${p.text}</div>` },
  lifeline: { name:'SQ · lifeline',
    group:'seq',
    help:'participant box + dashed drop — place activation bars and messages on top',
    props:{label:'api-gateway', h:380, accent:'var(--phos-green)'},
    fields:['label','h','accent'], fieldTypes:{h:'number'},
    markup:p=>`<div class="tk-life" style="--stroke:${p.accent}"><span class="pbox">${rich(p.label)}</span><span class="ll" style="--h:${+p.h||380}px"></span></div>` },
  activation:{ name:'SQ · activation bar',
    group:'seq',
    props:{h:140, accent:'var(--phos-green)'},
    fields:['h','accent'], fieldTypes:{h:'number'},
    markup:p=>`<span class="tk-act" style="--stroke:${p.accent};--h:${+p.h||140}px"></span>` },
  selfcall: { name:'SQ · self-call loop',
    group:'seq',
    props:{accent:'var(--phos-green)'},
    fields:['accent'],
    markup:p=>`<span class="tk-selfcall" style="--stroke:${p.accent}">
      <svg width="76" height="94" viewBox="0 0 76 94" fill="none" stroke="var(--stroke)" stroke-width="3">
        <path d="M14 90 V26 Q14 8 40 8 Q66 8 66 28 V74"/>
        <polygon points="66,88 58,72 74,72" fill="var(--stroke)" stroke="none"/></svg></span>` },
};
