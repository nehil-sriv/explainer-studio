/** charts components — extracted verbatim from index.html REGISTRY. */
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

export const chartsComponents: Record<string, ComponentDef> = {
  chartline:{ name:'X · line / area chart',
    group:'charts',
    help:'comma-separated values, normalized to peak',
    props:{label:'p99 latency', data:'12,34,28,52,46,74,88', area:true, color:'var(--phos-green)'},
    fields:['label','data','area','color'], fieldTypes:{area:'check'},
    markup:p=>{
      const vals=String(p.data).split(',').map(Number).filter(v=>!isNaN(v));
      if(vals.length<2) return '<b>needs 2+ values</b>';
      const C=liveHex(p.color);
      const W=340,H=180,P=14, max=Math.max(...vals,1);
      const pts=vals.map((v,i)=>`${(P+i*((W-2*P)/(vals.length-1))).toFixed(1)},${(H-P-(v/max)*(H-2*P)).toFixed(1)}`);
      return `<div class="tk-chart" style="--cc:${p.color}">${p.label?`<div class="clbl">${rich(p.label)}</div>`:''}
        <svg width="${W}" height="${H}">
          <line x1="${P}" y1="${H-P}" x2="${W-P}" y2="${H-P}" stroke="var(--line-dim)" stroke-width="2"/>
          <line x1="${P}" y1="${P}" x2="${P}" y2="${H-P}" stroke="var(--line-dim)" stroke-width="2"/>
          ${p.area?`<polygon points="${P},${H-P} ${pts.join(' ')} ${W-P},${H-P}" fill="${C}" opacity=".14"/>`:''}
          <polyline points="${pts.join(' ')}" fill="none" stroke="${C}" stroke-width="3.5"/>
          <circle cx="${pts[pts.length-1].split(',')[0]}" cy="${pts[pts.length-1].split(',')[1]}" r="5.5" fill="${C}"/>
        </svg></div>`; } },
  chartbars:{ name:'X · comparison bars',
    group:'charts',
    help:'rows: label:value separated by |',
    props:{label:'who serves faster', rows:'gRPC:91|REST:62|SOAP:23', color:'var(--phos-green)'},
    fields:['label','rows','color'],
    markup:p=>{ const rows=String(p.rows).split('|').filter(Boolean).map(r=>{
        const i=r.lastIndexOf(':'); return [r.slice(0,i).trim(), parseFloat(r.slice(i+1))||0]; });
      return `<div class="tk-chart">${p.label?`<div class="clbl">${rich(p.label)}</div>`:''}
        <div class="tk-bars">${rows.map(([lab,val])=>`<div class="brow"><span class="blab">${rich(lab)}</span><span class="btrack"><span class="bfill" style="width:${Math.min(100,val)}%;background:${p.color||'var(--phos-green)'}"></span></span><span class="bval">${val}</span></div>`).join('')}</div></div>`; } },
  chartdonut:{ name:'X · donut split',
    group:'charts',
    props:{label:'64%', pct:64, d:220, color:'var(--phos-green)'},
    fields:['label','pct','d','color'], fieldTypes:{pct:'number',d:'number'},
    markup:p=>{ const pct=Math.max(0,Math.min(100,+p.pct||0));
      return `<div class="tk-chart"><div class="tk-donut" style="--d:${+p.d||220}px;--pct:${pct};--dc:${p.color}"><span class="dcap">${rich(p.label||(pct+'%'))}</span></div></div>`; } },
  probars:  { name:'TK · probability bars',
    group:'charts',
    help:'one per line: word|pct · fill color follows value (green→blue→amber→red) · tick stepped to reveal bars one by one',
    props:{items:'fish|40\nfood|25\nmilk|15\ntreats|10\nyarn|5\nrocks|1\nmoon|0', stepped:true, w:760},
    fields:['items','stepped','w'], fieldTypes:{items:'textarea', stepped:'check', w:'number'},
    markup:p=>{
      const rows=String(p.items||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
        const i=l.indexOf('|'), word=(i<0?l:l.slice(0,i)).trim();
        let v=parseFloat(i<0?'0':l.slice(i+1)); v=isFinite(v)?Math.max(0,Math.min(100,v)):0;
        const cls=v>=25?'pf-g':v>=10?'pf-b':v>=3?'pf-a':'pf-r';
        return `<div class="cline pbar-row"><span class="pbar-word">${rich(word)}</span><span class="pbar-track"><span class="pbar-fill ${cls}" style="width:${v}%"><span class="pbar-pct">${Math.round(v)}%</span></span></span></div>`;
      }).join('');
      return `<div class="tk-probars" style="--w:${+p.w||760}px">${rows}</div>`} },
  metric:   { name:'TK · metric tile',
    group:'charts',
    help:'KPI tile: code + name, big value, status chip, description line',
    props:{code:'QSI', name:'Quiet Shift Index', value:'99', chip:'Skewed low', desc:'Below 100: below-proportional damage relative to frequency.', w:340, accent:'var(--cyan-dim)'},
    fields:['code','name','value','chip','desc','w','accent'], fieldTypes:{desc:'textarea', w:'number'},
    markup:p=>`<div class="tk-metric" style="--stroke:${p.accent};width:${Math.max(200,+p.w||340)}px"><div class="m-head"><span class="m-code">${rich(p.code)}</span><span class="m-name">${rich(p.name)}</span></div><div class="m-val">${rich(p.value)}</div>${String(p.chip||'').trim()?`<span class="m-chip">${rich(p.chip)}</span>`:''}<div class="m-desc">${rich(p.desc)}</div></div>` },
  tbl:      { name:'TK · table',
    group:'charts',
    help:'header + rows, cells separated by |, one row per line. [g]x[/g] / [a]x[/a] / [r]x[/r] color cells.',
    props:{title:'', head:'Service|Stack|Status', rows:'api|rest|[g]live[/g]\ndb|postgres|[a]slow[/a]\nworker|queue|[r]down[/r]', accent:'var(--phos-green)'},
    fields:['title','head','rows','accent'], fieldTypes:{head:'textarea', rows:'textarea'},
    markup:p=>{
      const head=String(p.head||'').split('|').map(s=>s.trim());
      const rows=String(p.rows||'').split('\n').map(r=>r.split('|').map(s=>s.trim())).filter(r=>r.some(c=>c));
      const n=Math.max(head.length,...rows.map(r=>r.length));
      const td=(c,i,tag)=>`<${tag}>${rich(c||'')}</${tag}>`;
      return `<div class="tk-tbl" style="--stroke:${p.accent}">
        ${p.title?`<div class="tltitle">${rich(p.title)}</div>`:''}
        <table><thead><tr>${Array.from({length:n},(_,i)=>td(head[i]||'',i,'th')).join('')}</tr></thead>
        <tbody>${rows.map(r=>`<tr>${Array.from({length:n},(_,i)=>td(r[i]||'',i,'td')).join('')}</tr>`).join('')}</tbody></table></div>`; } },
};
