/** actors components — extracted verbatim from index.html REGISTRY. */
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

export const actorsComponents: Record<string, ComponentDef> = {
  clientdev:{ name:'Client device (browser)',
    group:'actors',
    props:{label:'browser', accent:'var(--cyan-dim)'},
    fields:['label','accent'],
    markup:p=>`<div class="tech" style="text-align:center">
      <svg width="110" height="72" viewBox="0 0 110 72"><rect x="3" y="3" width="104" height="66" rx="6" fill="var(--panel)" stroke="${p.accent}" stroke-width="2"/>
      <path d="M3 17 h104" stroke="${p.accent}" stroke-width="2"/><circle cx="14" cy="10" r="3" style="fill:var(--alert-red)"/><circle cx="24" cy="10" r="3" style="fill:var(--amber)"/><circle cx="34" cy="10" r="3" style="fill:var(--phos-green)"/>
      <rect x="12" y="26" width="86" height="34" rx="3" fill="none" stroke="${p.accent}" stroke-width="1.4" opacity=".6"/></svg>
      <div style="color:var(--text-primary);font-size:15px">${p.label}</div></div>` },
  user:     { name:'TK · user actor',
    group:'actors',
    props:{label:'user', size:120, accent:'var(--phos-green)'},
    fields:['label','size','accent'], fieldTypes:{size:'number'},
    markup:p=>`<div class="tk-user" style="--stroke:${p.accent}">
      <svg width="${+p.size||120}" height="${Math.round((+p.size||120)*1.15)}" viewBox="0 0 100 115" fill="none">
        <circle cx="50" cy="30" r="22" stroke="var(--stroke)" stroke-width="6"/>
        <path d="M12 110 C12 80 30 67 50 67 C70 67 88 80 88 110" stroke="var(--stroke)" stroke-width="6"/>
      </svg>${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>` },
};
