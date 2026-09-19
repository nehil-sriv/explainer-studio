/** chrome components — extracted verbatim from index.html REGISTRY. */
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

export const chromeComponents: Record<string, ComponentDef> = {
  dtitle:   { name:'CH · diagram title',
    group:'chrome',
    props:{kicker:'EP.014 // ARCHITECTURE', title:'how payments actually flows'},
    fields:['kicker','title'],
    markup:p=>`<div class="tk-dtitle"><div class="dk">${rich(p.kicker)}</div><div class="dt">${rich(p.title)}</div></div>` },
  legend:   { name:'CH · legend / key',
    group:'chrome',
    help:'rows: style|text — styles: solid dashed red amber open',
    props:{rows:`solid|sync call\ndashed|async / response\nred|failure path\nopen|fire-and-forget`},
    fields:['rows'], fieldTypes:{rows:'textarea'},
    markup:p=>{ const S={solid:['solid','var(--phos-green)'],dashed:['dashed','var(--phos-green)'],red:['solid','var(--alert-red)'],amber:['dashed','var(--amber)']};
      return `<div class="tk-legend">${String(p.rows).split('\n').filter(Boolean).map(r=>{
        const i=r.indexOf('|'); const st=(r.slice(0,i)||'solid').trim(), txt=r.slice(i+1);
        if(st==='open') return `<div class="lr"><span class="sw open"></span><span>${rich(txt)}</span></div>`;
        const [cls,col]=S[st]||S.solid;
        return `<div class="lr"><span class="sw ${cls}" style="border-top-color:${col}"></span><span>${rich(txt)}</span></div>`; }).join('')}</div>`; } },
  footnote: { name:'CH · source footnote',
    group:'chrome',
    props:{text:'source: a guy on hacker news'},
    fields:['text'],
    markup:p=>`<div class="tk-footnote">${rich(p.text)}</div>` },
  frame:    { name:'CH · frame border',
    group:'chrome',
    help:'thin outer rectangle — add FIRST, lowest z, then build inside it',
    props:{w:1600, h:880},
    fields:['w','h'], fieldTypes:{w:'number',h:'number'},
    markup:p=>`<div class="tk-frame" style="--w:${+p.w||1600}px;--h:${+p.h||880}px"></div>` },
  timeline: { name:'TK · timeline / roadmap',
    group:'chrome',
    help:'milestones on a line — items and dates are |-separated, aligned by position. done = how many are completed.',
    props:{title:'2026 roadmap', items:'Alpha|Beta|GA', dates:'Q1|Q2|Q3', done:1, accent:'var(--phos-green)'},
    fields:['title','items','dates','done','accent'], fieldTypes:{items:'textarea', dates:'textarea', done:'number'},
    markup:p=>{
      const items=String(p.items||'').split('|').map(s=>s.trim()).filter(Boolean);
      const dates=String(p.dates||'').split('|').map(s=>s.trim());
      const done=Math.max(0,Math.min(items.length,+p.done||0));
      return `<div class="tk-tline" style="--stroke:${p.accent}">
        ${p.title?`<div class="tltitle">${rich(p.title)}</div>`:''}
        <div class="tltrack">${items.map((t,i)=>{
          const st=i<done?'done':(i===done?'now':'todo');
          return `<span class="tlnode ${st}"><i class="tldot"></i><b>${rich(t)}</b>${dates[i]?`<s>${rich(dates[i])}</s>`:''}</span>`; }).join('')}</div></div>`; } },
  backdrop: { name:'KK · environment backdrop',
    group:'chrome',
    help:'place FIRST — gradient mood + perspective floor + twinkling stars. sits behind everything.',
    props:{mood:'green', grid:true, stars:true, w:1920, h:1080},
    fields:['mood','grid','stars','w','h'], fieldTypes:{mood:'select',grid:'check',stars:'check',w:'number',h:'number'}, options:{mood:['green','amber','cyan']},
    markup:p=>{
      const stars=[[8,12],[22,6],[35,18],[48,9],[61,15],[74,7],[88,20],[15,28],[55,30],[82,32],[68,24],[40,34]];
      return `<div class="tk-bd ${p.mood!=='green'?p.mood:''}" style="width:${+p.w||1920}px;height:${+p.h||1080}px">
        <span class="neb"></span>${p.grid?'<span class="floor"></span>':''}
        ${p.stars?stars.map(([x,y],i)=>`<span class="star" style="left:${x}%;top:${Math.round(y*4.2)}%;animation-delay:${(i*0.4).toFixed(1)}s"></span>`).join(''):''}
      </div>`; } },
  camera:   { name:'KK · camera move',
    group:'chrome',
    help:'invisible on canvas. during ⏺ REC the popout pans/zooms from start→end across the take. zoom 1 = full frame.',
    props:{zoomFrom:1, zoomTo:1.35, panX:0, panY:-120, durS:6},
    fields:['zoomFrom','zoomTo','panX','panY','durS'], fieldTypes:{zoomFrom:'number',zoomTo:'number',panX:'number',panY:'number',durS:'number'},
    markup:p=>`<div class="tk-cam" title="camera move — visible only in the recording"></div>` },
};
