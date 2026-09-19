/** data components — extracted verbatim from index.html REGISTRY. */
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

export const dataComponents: Record<string, ComponentDef> = {
  db:       { name:'TK · database',
    group:'data',
    props:{label:'postgres', sub:'', w:190, h:150, accent:'var(--cyan-dim)'},
    fields:['label','sub','w','h','accent'], fieldTypes:{w:'number',h:'number'},
    markup:p=>tkCyl(p) },
  cache:    { name:'TK · cache',
    group:'data',
    props:{label:'redis', sub:'TTL 60s', w:170, h:140, accent:'var(--amber)'},
    fields:['label','sub','w','h','accent'], fieldTypes:{w:'number',h:'number'},
    markup:p=>tkCyl(p,{bolt:true}) },
  queue:    { name:'TK · message queue',
    group:'data',
    props:{label:'kafka', cells:4, accent:'var(--cyan-dim)'},
    fields:['label','cells','accent'], fieldTypes:{cells:'number'},
    markup:p=>{ const n=Math.max(1,Math.min(10,+p.cells||4));
      return `<div class="tk-queue" style="--stroke:${p.accent}">${'<span class="cell"></span>'.repeat(n)}<span class="qcap">${rich(p.label)}</span></div>`; } },
  nosql:    { name:'TK · nosql database',
    group:'data',
    props:{label:'mongo', sub:'', w:190, h:150, accent:'var(--cyan-dim)'},
    fields:['label','sub','w','h','accent'], fieldTypes:{w:'number',h:'number'},
    markup:p=>tkCyl(p,{hexes:true}) },
  stream:   { name:'TK · event stream (pub/sub)',
    group:'data',
    help:'source dot fanning marching dashes — subscribers implied at the right',
    props:{label:'events topic', lanes:3, accent:'var(--cyan-dim)'},
    fields:['label','lanes','accent'], fieldTypes:{lanes:'number'},
    markup:p=>{ const n=Math.max(1,Math.min(6,+p.lanes||3));
      return `<div class="tk-stream" style="--stroke:${p.accent}">
        <div class="fan"><span class="node"></span><span class="waves">${'<span class="wv"></span>'.repeat(n)}</span><span class="node"></span></div>
        ${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>`; } },
  bucket:   { name:'TK · object storage',
    group:'data',
    props:{label:'s3://assets', accent:'var(--cyan-dim)'},
    fields:['label','accent'],
    markup:p=>`<div class="tk-bucket" style="--stroke:${p.accent}">
      <svg width="130" height="138" viewBox="0 0 130 138" fill="none" stroke="var(--stroke)" stroke-width="3">
        <ellipse cx="65" cy="30" rx="48" ry="12"/>
        <path d="M17 30 L31 118 A34 10 0 0 0 99 118 L113 30"/>
        <path d="M20 18 Q65 -8 110 18"/>
      </svg>${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>` },
  warehouse:{ name:'TK · data warehouse',
    group:'data',
    props:{label:'snowflake', rows:3, w:150, h:70, accent:'var(--cyan-dim)'},
    fields:['label','rows','w','h','accent'], fieldTypes:{rows:'number',w:'number',h:'number'},
    markup:p=>{ const n=Math.max(2,Math.min(4,+p.rows||3));
      const cyls=Array.from({length:n},()=>tkCyl({label:'',sub:'',w:+p.w||150,h:+p.h||70,accent:p.accent}));
      return `<div style="display:flex;flex-direction:column;align-items:center">
        <div class="tk-warehouse">${cyls.map((m,i)=>i===0?m:`<span style="display:inline-block;margin-top:-${Math.round((+p.h||70)*0.48)}px">${m}</span>`).join('')}</div>
        ${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>`; } },
  doc:      { name:'TK · file / document',
    group:'data',
    props:{text:'nginx.conf', accent:'var(--text-dim)'},
    fields:['text','accent'],
    markup:p=>`<div class="tk-doc" style="--stroke:${p.accent}">
      <svg width="44" height="56" viewBox="0 0 46 58"><path d="M3 3 H32 L43 14 V55 H3 Z" fill="var(--ghost-fill)" stroke="var(--stroke)" stroke-width="2.5"/><path d="M32 3 V14 H43" fill="none" stroke="var(--stroke)" stroke-width="2.5"/><line x1="10" y1="25" x2="36" y2="25" stroke="var(--text-dim)" stroke-width="2"/><line x1="10" y1="34" x2="36" y2="34" stroke="var(--text-dim)" stroke-width="2"/><line x1="10" y1="43" x2="27" y2="43" stroke="var(--text-dim)" stroke-width="2"/></svg>
      <span>${rich(p.text)}</span></div>` },
  logs:     { name:'TK · log stream',
    group:'data',
    help:'scrolling log lines — ambient loop; one line per row in the body field',
    props:{body:`10:14:02 ERR checkout timeout\n10:14:03 ERR retry 1/3\n10:14:05 WRN circuit half-open`, w:430, h:170, dur:7, accent:'var(--amber)'},
    fields:['body','w','h','dur','accent'], fieldTypes:{body:'textarea',w:'number',h:'number',dur:'number'},
    markup:p=>`<div class="tk-logs" style="--stroke:${p.accent};--w:${+p.w||430}px;--h:${+p.h||190}px;--dur:${+p.dur||7}s">
      <div class="lset">${String(p.body).split('\n').map(l=>`<div>${rich(l)||'&nbsp;'}</div>`).join('')}</div></div>` },
  kv:       { name:'TK · key → value',
    group:'data',
    props:{key:'session:42', val:'redis-A', accent:'var(--amber)'},
    fields:['key','val','accent'],
    markup:p=>`<div class="tk-kv"><span class="kk">${rich(p.key)}</span><span class="arr">──▶</span><span class="kv">${rich(p.val)}</span></div>` },
};
