/** basics components — extracted verbatim from index.html REGISTRY. */
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

export const basicsComponents: Record<string, ComponentDef> = {
  kicker:   { name:'Kicker chip (EP.NNN // TYPE)',
    group:'basics',
    props:{text:'EP.001 // HOT TAKE'},
    fields:['text'],
    markup:p=>`<span class="kicker">${p.text}</span>` },
  title:    { name:'Title line (VT323 big)',
    group:'basics',
    help:'TAGS: [g]green [a]amber [r]red [c]cyan [m]mint [d]dim · [#hex]custom · [b]bold [i]italic [s1.5]bigger',
    props:{text:'RAG IS JUST GREP', glitch:'', size:150},
    fields:['text','glitch','size'], fieldTypes:{size:'number'},
    markup:p=>{
      let t=rich(p.text);
      if(p.glitch) t=t.replace(p.glitch, `<span class="glitch-word" data-w="${p.glitch}">${p.glitch}</span>`);
      return `<div class="title-line" style="font-size:${p.size}px">${t}</div>`; } },
  thumbtitle:{ name:'Thumbnail title (outlined)',
    group:'basics',
    help:'huge stroked shout for thumbnails — pair with the 1280×720 canvas preset · rotate freely for energy',
    props:{text:'STOP DOING THIS', fill:'var(--amber)', stroke:'var(--bg-deep)', size:150},
    fields:['text','fill','stroke','size'], fieldTypes:{size:'number'},
    markup:p=>`<div class="thumb-title" style="font-size:${Math.max(40,+p.size||150)}px;--tfill:${p.fill};--tstroke:${p.stroke}">${rich(p.text)}</div>` },
  terminal: { name:'Terminal window',
    group:'basics',
    props:{title:'~/opinions — zsh', body:`$ rag --ask "does it scale?"\n✓ match found (score 0.02)`, w:900, stepped:false},
    fields:['title','body','w','stepped'], fieldTypes:{body:'code', w:'number', stepped:'check'}, help:'enable stepped to reveal line-by-line (Space = next line) · source code? use the Code block component (keeps indentation + highlights Python)',
    markup:p=>`
      <div class="term glow" style="width:${p.w}px">
        <div class="term-bar"><span class="dot dot-r"></span><span class="dot dot-a"></span><span class="dot dot-g"></span><span class="term-title">${p.title}</span></div>
        <div class="term-body">${rich(p.body).split("\n").map(l=>`<div class="tline">${l||"&nbsp;"}</div>`).join("")}</div>
      </div>` },
  code:     { name:'Code block (Python)',
    group:'basics',
    help:'paste Python — indentation is kept exactly. focus "4-6" (or "4-6,9") dims every other line. stepped reveals one line at a time. clear the title to drop the window chrome',
    props:{title:'retrieve.py', lang:'python',
      body:`def retrieve(question, k=4):\n    """Top-k chunks for a question."""\n    vec = embed(question)  # 1536-dim\n    hits = index.search(vec, k=k)\n    return [h["text"] for h in hits]`,
      w:900, nums:true, focus:'', stepped:false, accent:'var(--phos-green)'},
    fields:['title','lang','body','w','nums','focus','stepped','accent'],
    fieldTypes:{lang:'select', body:'code', w:'number', nums:'check', stepped:'check'},
    options:{lang:['python','text']},
    markup:p=>codeMarkup(p) },
  timer:    { name:'Timer · ticks every second',
    group:'basics',
    help:'stopwatch (up) or countdown (down) — starts when revealed, ticks live on canvas and in recordings · seconds = start value',
    props:{label:'ELAPSED', mode:'up', seconds:60, accent:'var(--phos-green)'},
    fields:['label','mode','seconds','accent'], fieldTypes:{mode:'select', seconds:'number'},
    options:{mode:['up','down']},
    markup:p=>{
      const mode=(p.mode==='down')?'down':'up';
      const start=Math.max(0,Math.floor(+p.seconds||0));
      return `<div class="tk-timer" data-mode="${mode}" data-start="${start}" style="--stroke:${p.accent}"><div class="tk-timer-label">${rich(p.label)}</div><div class="tk-timer-digits">${fmtTime(start)}</div></div>`} },
  textbg:   { name:'Text with background',
    group:'basics',
    help:'centered text on a soft accent wash — no border · w/h = box size via the E/S handles or inspector (0 = auto-fit the text) · untick fill for bare text, tick border for an outline box',
    props:{text:'the cache is a lie we all agree on', accent:'var(--phos-green)', w:0, h:0, fill:true, border:false},
    fields:['text','accent','w','h','fill','border'], fieldTypes:{text:'textarea', w:'number', h:'number', fill:'check', border:'check'},
    markup:p=>{const w=Math.max(0,+p.w||0), h=Math.max(0,+p.h||0);
      return `<div style="${p.fill?`background:color-mix(in srgb, ${p.accent} 16%, transparent);`:'background:none;'}${p.border?`border:3px solid ${p.accent};`:''}border-radius:14px;padding:22px 38px;${w>0?`width:${w}px;`:''}${h>0?`min-height:${h}px;display:flex;flex-direction:column;align-items:center;justify-content:center;`:''}font-size:calc(30px*var(--fscale,1));color:var(--ct,var(--text-primary));text-align:center">${rich(p.text)}</div>`} },
  caption:  { name:'Caption pops',
    group:'basics',
    help:'same word tags: [w]=green [e]=red [n]=amber still valid',
    props:{text:'it handles [n]10x[/n] load — [w]works![/w] …in prod it\'s a [e]fire[/e]'},
    fields:['text'], fieldTypes:{text:'textarea'},
    markup:p=>`<div class="caps">${rich(p.text)}</div>` },
  bullets:  { name:'TK · bullet points',
    group:'basics',
    help:'points as rows below — text, accent, background + reveal animation each (blank = block default) · tick stepped, then Space (or next ⏭) reveals each point when you want it · look: list, cards, pills, ribbon, tabs, timeline, dividers or hero · marker: dots, 1.2.3., A.B.C. or none',
    props:{items:'First win|Second win|Third win', stepped:true, marker:'dot', look:'list', fills:'', anims:'', pointacc:'', accent:'var(--phos-green)'},
    fields:['items','fills','anims','pointacc','stepped','marker','look','accent'], fieldTypes:{items:'textarea', fills:'textarea', anims:'textarea', pointacc:'textarea', stepped:'check', marker:'select', look:'select'},
    options:{marker:['dot','num','alpha','none'], look:['list','cards','pills','ribbon','tabs','timeline','dividers','hero']},
    markup:p=>{const mk=['dot','num','alpha','none'].includes(p.marker)?p.marker:'dot';const lk=['list','cards','pills','ribbon','tabs','timeline','dividers','hero'].includes(p.look)?p.look:'list';const rows=bulletRows(p);return `<ul class="tk-bullets mk-${mk} lk-${lk}" style="--stroke:${p.accent}">${rows.map(r=>{const fl=r.bg.split(';')[0].trim().replace(/"/g,'&quot;');const ac=cleanThemeColor(r.ac);const st=(fl?`background:${fl};`:'')+(ac?`--stroke:${ac};`:'');return `<li class="cline"${st?` style="${st}"`:''}${fl?' data-fill="1"':''}>${rich(r.t)}</li>`}).join('')}</ul>`} },
  checklist:{ name:'Checklist card',
    group:'basics',
    props:{items:'write code|done\nwrite tests|done\nupdate docs|never', stepped:false},
    fields:['items','stepped'], fieldTypes:{items:'textarea', stepped:'check'}, help:'one per line: text | done|never · enable stepped to reveal line-by-line',
    markup:p=>`<ul class="checklist">${p.items.split('\n').map(l=>{
      const [t,s]=l.split('|');
      return `<li class="cline ${(s||'').trim()}">${t}</li>`;}).join('')}</ul>` },
  icon:     { name:'TK · icon (built-in set)',
    group:'basics',
    help:'38 stroke icons: tech, money, charts, docs, time, actions, shapes — size in px · keywords: coin card chartup chartdown doc calc clock cal check x plus search bell mail pin star heart lock globe shield bulb target rocket gear download ram cpu gpu',
    props:{icon:'coin', size:96, accent:'var(--phos-green)'},
    fields:['icon','size','accent'], fieldTypes:{icon:'select', size:'number'},
    options:{icon:['gateway','api','db','cache','queue','worker','user','cdn','app','ram','cpu','gpu','bw','coin','card','chartup','chartdown','doc','calc','clock','cal','check','x','plus','search','bell','mail','pin','star','heart','lock','globe','shield','bulb','target','rocket','gear','download']},
    markup:p=>{ const s=Math.max(16,Math.min(480,+p.size||96));
      return `<span class="tk-icon" style="color:${p.accent}"><svg width="${s}" height="${s}" viewBox="0 0 24 24">${gnIcon(p.icon)}</svg></span>`} },
  image:    { name:'Image / logo (PNG)',
    group:'basics',
    props:{src:'', w:400},
    fields:['src','w'], fieldTypes:{src:'textarea', w:'number'},
    help:'paste an image URL / data-URI in the text box, or use the file picker below',
    markup:p=>p.src
      ?`<img src="${p.src}" style="width:${p.w}px;display:block" onerror="this.style.outline='3px solid #FF5555'; this.title='image failed to load'">`
      :`<div style="width:${p.w}px;padding:40px;border:3px dashed var(--line-dim);text-align:center;color:var(--text-dim);font-family:var(--font-body);font-size:20px;line-height:1.6">
          🖼 IMAGE PLACEHOLDER<br><span style="font-size:14px;color:var(--text-dim)">select me →<br>choose a file or paste a URL<br>in EDIT SELECTED</span>
        </div>` },
};
