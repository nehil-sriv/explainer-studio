/** shapes components — extracted verbatim from index.html REGISTRY. */
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

export const shapesComponents: Record<string, ComponentDef> = {
  rect:     { name:'Shape · rectangle',
    group:'shapes',
    help:'fill / border toggles compose freely (both off = invisible spacer) — radius 0 = sharp corners · drag the E/S edges on canvas to resize',
    props:{w:400, h:260, r:12, fill:false, border:true, accent:'var(--phos-green)'},
    fields:['w','h','r','fill','border','accent'], fieldTypes:{w:'number',h:'number',r:'number',fill:'check',border:'check'},
    markup:p=>{ const w=Math.max(20,+p.w||400), h=Math.max(20,+p.h||260), r=Math.max(0,+p.r||0);
      return `<div style="width:${w}px;height:${h}px;${p.border!==false?`border:3px solid ${p.accent};`:''}border-radius:${r}px;${p.fill?`background:color-mix(in srgb, ${p.accent} 14%, transparent);`:''}"></div>`; } },
  ellipse:  { name:'Shape · ellipse',
    group:'shapes',
    help:'fill / border toggles compose freely (both off = invisible spacer) — equal w/h makes a circle · drag the E/S edges on canvas to resize',
    props:{w:320, h:200, fill:false, border:true, accent:'var(--phos-green)'},
    fields:['w','h','fill','border','accent'], fieldTypes:{w:'number',h:'number',fill:'check',border:'check'},
    markup:p=>{ const w=Math.max(20,+p.w||320), h=Math.max(20,+p.h||200);
      return `<div style="width:${w}px;height:${h}px;${p.border!==false?`border:3px solid ${p.accent};`:''}border-radius:50%;${p.fill?`background:color-mix(in srgb, ${p.accent} 14%, transparent);`:''}"></div>`; } },
};
