/** ai components — extracted verbatim from index.html REGISTRY. */
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

export const aiComponents: Record<string, ComponentDef> = {
  embed:    { name:'TK · embedding cube',
    group:'ai',
    props:{label:'', size:150, accent:'var(--cyan-dim)'},
    fields:['label','size','accent'], fieldTypes:{size:'number'},
    markup:p=>{ const s=+p.size||150;
      const pts=[[18,30],[42,14],[70,26],[92,44],[30,58],[58,52],[82,72],[22,80],[50,88],[74,96],[40,110],[64,120]];
      return `<div class="tk-embed" style="--stroke:${p.accent}">
        <svg width="${s}" height="${s}" viewBox="0 0 140 140" fill="none">
          <path d="M20 34 L70 12 L120 34 L120 106 L70 130 L20 106 Z M20 34 L70 56 L120 34 M70 56 L70 130"
                stroke="var(--stroke)" stroke-width="3" opacity=".8"/>
          ${pts.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i%3?3:4.5}" fill="${i%2?'var(--cyan-dim)':'var(--phos-green)'}"/>`).join('')}
        </svg>${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>`; } },
  vdb:      { name:'TK · vector db',
    group:'ai',
    props:{label:'pgvector', sub:'cosine', w:190, h:160, accent:'var(--cyan-dim)'},
    fields:['label','sub','w','h','accent'], fieldTypes:{w:'number',h:'number'},
    markup:p=>tkCyl(p,{constel:true}) },
  model:    { name:'TK · model / neural net',
    group:'ai',
    help:'gpu toggle = chip-pins frame for hardware-angle videos',
    props:{label:'llama-3', layers:[3,4,3], gpu:false, w:210, accent:'var(--phos-green)'},
    fields:['label','layers','gpu','w','accent'], fieldTypes:{gpu:'check'},
    markup:p=>{
      const cols=(Array.isArray(p.layers)?p.layers:String(p.layers||'').split(',')).map(Number).filter(n=>n>0);
      if(!cols.length) cols.push(3,4,3);
      const W=+p.w||210, H=Math.max(...cols)*44;
      const colX=i=>28+(W-56)*(cols.length>1?i/(cols.length-1):0);
      let links='';
      for(let i=0;i<cols.length-1;i++)
        for(let a=0;a<cols[i];a++) for(let b=0;b<cols[i+1];b++)
          links+=`<line x1="${colX(i)}" y1="${(a+.5)*(H/cols[i])}" x2="${colX(i+1)}" y2="${(b+.5)*(H/cols[i+1])}" stroke="var(--text-dim)" stroke-width="1.1" opacity=".55"/>`;
      let nodes='';
      cols.forEach((n,i)=>{ for(let a=0;a<n;a++)
        nodes+=`<circle cx="${colX(i)}" cy="${(a+.5)*(H/n)}" r="9" fill="var(--ghost-fill)" stroke="var(--stroke)" stroke-width="2.5"/>`; });
      return `<div class="tk-model${p.gpu?' gpu':''}" style="--stroke:${p.accent}">
        <svg width="${W}" height="${H}">${links}${nodes}</svg>
        ${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>`; } },
  tokens:   { name:'TK · token stream',
    group:'ai',
    help:'falling/streaming character chips — ambient loop; height sizes the column, width the row',
    props:{text:'the|cat|sat|down', dir:'vertical', h:200, w:420, dur:3.5, accent:'var(--phos-green)'},
    fields:['text','dir','h','w','dur','accent'], fieldTypes:{dir:'select',h:'number',w:'number',dur:'number'},
    options:{dir:['vertical','horizontal']},
    markup:p=>{
      const parts=String(p.text).split('|').filter(Boolean);
      const horiz=(p.dir||'vertical')==='horizontal';
      return `<div class="tk-tokens${horiz?' horiz':''}" style="--stroke:${p.accent};--h:${+p.h||190}px;--w:${+p.w||420}px;--dur:${+p.dur||3.2}s">
        ${parts.map((t,i)=>`<span style="animation-delay:${(-i*(+p.dur||3.2)/parts.length).toFixed(2)}s">${rich(t)}</span>`).join('')}</div>`; } },
  prompt:   { name:'TK · prompt box',
    group:'ai',
    props:{text:'why did my prod db fall over?', send:'▸ send', accent:'var(--phos-green)'},
    fields:['text','send','accent'],
    markup:p=>`<div class="tk-prompt" style="--stroke:${p.accent}"><span class="ptext">${rich(p.text)}<span class="cursor is-on"></span></span><span class="psend">${p.send}</span></div>` },
  ctxwin:   { name:'TK · context window',
    group:'ai',
    help:'slots: on = filled context, hot = about to overflow (amber)',
    props:{label:'context · 8k tokens', used:5, total:8, hot:false, accent:'var(--phos-green)'},
    fields:['label','used','total','hot','accent'], fieldTypes:{used:'number',total:'number',hot:'check'},
    markup:p=>{ const tot=Math.max(1,Math.min(16,+p.total||8)), use=Math.max(0,Math.min(tot,+p.used||0));
      return `<div class="tk-ctx" style="--stroke:${p.accent}">
        <div class="clbl">${rich(p.label)}</div>
        <div class="slots">${Array.from({length:tot},(_,i)=>`<span class="slot ${i<use?(p.hot&&i===use-1?'hot':'on'):''}"></span>`).join('')}</div></div>`; } },
  index:    { name:'TK · search index',
    group:'ai',
    props:{label:'inverted index', accent:'var(--cyan-dim)'},
    fields:['label','accent'],
    markup:p=>`<div style="display:flex;flex-direction:column;align-items:center">
      <div class="tk-index" style="--stroke:${p.accent}"><span></span><span></span><span></span></div>
      ${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>` },
  splitter: { name:'KK · doc → chunks splitter',
    group:'ai',
    help:'document splits into chunks drifting out staggered — RAG ingestion, sharding, fanning out work',
    props:{doc:'doc.pdf', chunks:'c1|c2|c3|c4|c5', accent:'var(--amber)', docAccent:'var(--phos-green)'},
    fields:['doc','chunks','accent','docAccent'],
    markup:p=>{ const ch=String(p.chunks).split('|').filter(Boolean);
      return `<div class="tk-split" style="--stroke:${p.docAccent}">
        <div class="doc">${rich(p.doc)}</div>
        <span style="color:var(--text-dim);font-size:26px">⟶</span>
        <div class="chunks" style="--stroke:${p.accent}">${ch.map((c,i)=>`<span class="chk" style="animation-delay:${(i*0.18).toFixed(2)}s">${rich(c)}</span>`).join('')}</div></div>`; } },
  agent:    { name:'AI · agent card',
    group:'ai',
    help:'goal + tool chips + iteration dots — who acts in the loop',
    props:{name:'researcher', goal:'find competitor pricing', tools:'search|browser|pdf', iters:3, accent:'var(--phos-green)'},
    fields:['name','goal','tools','iters','accent'], fieldTypes:{goal:'textarea', tools:'textarea', iters:'number'},
    markup:p=>{ const tools=String(p.tools||'').split('\n').flatMap(l=>l.split('|')).map(s=>s.trim()).filter(Boolean);
      const n=Math.max(1,Math.min(8,Math.round(+p.iters||3)));
      return `<div class="tk-agent" style="--stroke:${p.accent}"><div class="ag-name">${rich(p.name)}</div><div class="ag-goal">◎ ${rich(p.goal)}</div><div class="ag-tools">${tools.map(t=>`<span>${rich(t)}</span>`).join('')}</div><div class="ag-iters">${Array.from({length:n},(_,i)=>`<i class="${i===0?'on':''}"></i>`).join('')}</div></div>`} },
  attention:{ name:'AI · attention map',
    group:'ai',
    help:'word × word heat grid — vals are 0-9 per cell, row-major, accent intensity',
    props:{words:'the|cat|sat', vals:'9,1,2,3,8,4,2,5,7', accent:'var(--cyan-dim)'},
    fields:['words','vals','accent'], fieldTypes:{words:'textarea'},
    markup:p=>{ const words=String(p.words||'').split('\n').flatMap(l=>l.split('|')).map(s=>s.trim()).filter(Boolean);
      const n=Math.max(2,Math.min(6,words.length));
      const vals=String(p.vals||'').split(',').map(v=>Math.max(0,Math.min(9,parseFloat(v)||0)));
      let cells='';
      for(let r=0;r<n;r++) for(let c=0;c<n;c++){ const v=vals[r*n+c]||0;
        cells+=`<span class="at-cell" style="background:color-mix(in srgb, var(--stroke) ${Math.round(v/9*85+10)}%, transparent)" title="${words[r]} → ${words[c]}: ${v}"></span>`; }
      return `<div class="tk-attn" style="--stroke:${p.accent};--n:${n}"><div class="at-words">${words.slice(0,n).map(w=>`<span>${rich(w)}</span>`).join('')}</div><div class="at-grid">${cells}</div></div>`} },
  tokenizer:{ name:'AI · tokenizer',
    group:'ai',
    help:'text split into numbered token chips',
    props:{text:'tokenize me please', accent:'var(--amber)'},
    fields:['text','accent'], fieldTypes:{text:'textarea'},
    markup:p=>{ const toks=String(p.text||'').split(/(\s+)/).filter(s=>s.length);
      return `<div class="tk-tok" style="--stroke:${p.accent}">${toks.map((t,i)=>/^\s+$/.test(t)?'<span class="tk-sp"></span>':`<span class="tk-chip2"><i>${i+1}</i>${rich(t)}</span>`).join('')}</div>`} },
  chatmsg:  { name:'AI · chat message',
    group:'ai',
    help:'user (right) / assistant (left) / system (center) bubble',
    props:{role:'assistant', text:'Here are your three options…', accent:'var(--phos-green)'},
    fields:['role','text','accent'], fieldTypes:{role:'select', text:'textarea'}, options:{role:['user','assistant','system']},
    markup:p=>{ const r=p.role||'assistant';
      return `<div class="tk-chatmsg r-${r}" style="--stroke:${p.accent}"><span class="cm-role">${r}</span><span class="cm-body">${rich(p.text)}</span></div>`} },
  vector:   { name:'AI · embedding vector',
    group:'ai',
    help:'label hashed into dim diverging bars — same label, same bars',
    props:{label:'"king" − "man"', dims:12, accent:'var(--phos-green)'},
    fields:['label','dims','accent'], fieldTypes:{dims:'number'},
    markup:p=>{ const d=Math.max(4,Math.min(24,Math.round(+p.dims||12)));
      let h=0; const str=String(p.label||'');
      const rnd=()=>{ h=(h*31+str.length*7+13)>>>0; for(const ch of str) h=(h*31+ch.charCodeAt(0))>>>0; h=(h*1103515245+12345)>>>0; return ((h>>>8)%2000/1000)-1; };
      let bars='';
      for(let i=0;i<d;i++){ const v=rnd(), w=Math.round(Math.abs(v)*100);
        bars+=`<span class="vx-row"><i>${i}</i><span class="vx-track"><span class="vx-fill ${v<0?'neg':''}" style="width:${w}%"></span></span><span class="vx-v">${v.toFixed(2)}</span></span>`; }
      return `<div class="tk-vector" style="--stroke:${p.accent}"><div class="vx-label">${rich(p.label)}</div>${bars}</div>`} },
  agentloop:{ name:'AI · agent loop',
    group:'ai',
    help:'reason → act → observe cycle — the planner that calls tools',
    props:{label:'planner', accent:'var(--phos-green)'},
    fields:['label','accent'],
    markup:p=>{
      const pts=[0,120,240].map(a=>{ const r=(a-90)*Math.PI/180; return [48+34*Math.cos(r),48+34*Math.sin(r)]; });
      return `<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}">`
      +`<svg width="96" height="96" viewBox="0 0 96 96" fill="none" stroke="var(--stroke)" stroke-width="3">`
      +`<circle cx="48" cy="48" r="34" stroke-dasharray="7 6" opacity=".75"/>`
      +pts.map(([x,y])=>`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="var(--ghost-fill)"/>`).join('')
      +`<circle cx="48" cy="48" r="4" fill="var(--stroke)" stroke="none"/>`
      +`</svg>${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>`; } },
  mcp:      { name:'AI · MCP endpoint',
    group:'ai',
    help:'Model Context Protocol — server exposes tools, client consumes them',
    props:{label:'fs-server', role:'server', accent:'var(--cyan-dim)'},
    fields:['label','role','accent'], fieldTypes:{role:'select'}, options:{role:['server','client']},
    markup:p=>`<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}">`
      +`<svg width="96" height="88" viewBox="0 0 96 88" fill="none" stroke="var(--stroke)" stroke-width="3">`
      +`<rect x="20" y="14" width="56" height="48" rx="10"/>`
      +(p.role==='client'
        ? `<path d="M40 32 L30 38 L40 44 M56 32 L66 38 L56 44"/>`
        : `<line x1="32" y1="30" x2="64" y2="30"/><line x1="32" y1="38" x2="64" y2="38"/><line x1="32" y1="46" x2="52" y2="46"/><circle cx="59" cy="46" r="2.5" fill="var(--stroke)" stroke="none"/>`)
      +`</svg><span class="tk-caption">${rich(p.label)}</span><span class="tk-sub">${p.role}</span></div>` },
  tool:     { name:'AI · tool call',
    group:'ai',
    help:'one function the agent can call — name is the function signature',
    props:{name:'get_weather', accent:'var(--phos-green)'},
    fields:['name','accent'],
    markup:p=>`<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}">`
      +`<svg width="84" height="72" viewBox="0 0 84 72" fill="none" stroke="var(--stroke)" stroke-width="3">`
      +`<rect x="8" y="8" width="68" height="56" rx="10"/>`
      +`<text x="42" y="46" text-anchor="middle" font-size="24" fill="var(--stroke)" stroke="none">ƒ()</text>`
      +`</svg>${p.name?`<span class="tk-caption">${rich(p.name)}</span>`:''}</div>` },
  memory:   { name:'AI · conversation memory',
    group:'ai',
    help:'turns = stacked dialogue lines, older ones fade',
    props:{label:'chat history', turns:6, accent:'var(--cyan-dim)'},
    fields:['label','turns','accent'], fieldTypes:{turns:'number'},
    markup:p=>{ const t=Math.max(1,Math.min(8,Math.round(+p.turns||6)));
      return `<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}">`
      +`<svg width="96" height="84" viewBox="0 0 96 84" fill="none" stroke="var(--stroke)" stroke-width="3" stroke-linecap="round">`
      +Array.from({length:t},(_,i)=>{ const y=10+i*(60/Math.max(1,t-1));
        return `<line x1="10" y1="${y.toFixed(1)}" x2="86" y2="${y.toFixed(1)}" opacity="${(0.3+0.7*(i+1)/t).toFixed(2)}"/>`; }).join('')
      +`</svg>${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>`; } },
  reranker: { name:'AI · reranker',
    group:'ai',
    help:'scores top-k down to the few worth reading',
    props:{label:'rerank top-20', accent:'var(--phos-green)'},
    fields:['label','accent'],
    markup:p=>`<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}">`
      +`<svg width="84" height="84" viewBox="0 0 84 84" fill="none" stroke="var(--stroke)" stroke-width="3" stroke-linejoin="round">`
      +`<path d="M12 10 H72 L52 42 V68 L32 74 V42 Z"/>`
      +`<line x1="34" y1="22" x2="62" y2="22" opacity=".45"/><line x1="40" y1="30" x2="56" y2="30" opacity=".7"/>`
      +`</svg>${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>` },
  judge:    { name:'AI · LLM judge',
    group:'ai',
    help:'scores output — label what it grades, score the verdict',
    props:{label:'faithfulness', score:8.5, accent:'var(--phos-green)'},
    fields:['label','score','accent'], fieldTypes:{score:'number'},
    markup:p=>`<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}">`
      +`<svg width="84" height="84" viewBox="0 0 84 84" fill="none" stroke="var(--stroke)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">`
      +`<circle cx="42" cy="42" r="30"/><path d="M32 43 L40 51 L55 33"/>`
      +`</svg><span class="tk-caption">${rich(p.label)} · ${p.score}</span></div>` },
  guardrail:{ name:'AI · guardrail',
    group:'ai',
    help:'policy gate — PII, toxicity and secrets stay in or out',
    props:{label:'pii filter', accent:'var(--phos-green)'},
    fields:['label','accent'],
    markup:p=>`<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}">`
      +`<svg width="84" height="88" viewBox="0 0 84 88" fill="none" stroke="var(--stroke)" stroke-width="3" stroke-linejoin="round">`
      +`<path d="M42 6 L74 18 V44 C74 64 60 76 42 82 C24 76 10 64 10 44 V18 Z"/>`
      +`<path d="M34 45 L41 52 L53 37" stroke-linecap="round"/>`
      +`</svg>${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>` },
};
