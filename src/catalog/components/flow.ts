/** flow components — extracted verbatim from index.html REGISTRY. */
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

export const flowComponents: Record<string, ComponentDef> = {
  wire:     { name:'TK · wire (labeled arrow)',
    group:'flow',
    help:'head: closed ▶ sync · open › async · none plain. both = duplex. clock = latency glyph on label. flow = marching dashes.',
    props:{dir:'→', len:420, label:'', dashed:false, flow:false, head:'closed', both:false, clock:false, accent:'var(--phos-green)'},
    fields:['dir','len','label','dashed','flow','head','both','clock','accent'], fieldTypes:{dir:'select',len:'number',label:'textarea',dashed:'check',flow:'check',head:'select',both:'check',clock:'check'}, options:{dir:['→','←','↑','↓'], head:['closed','open','none']},
    markup:p=>{
      const vert=p.dir==='↑'||p.dir==='↓';
      const rotC={'→':0,'↓':90,'←':180,'↑':270}[p.dir];
      const rotO={'→':45,'↓':135,'←':225,'↑':315}[p.dir];
      const dim=vert?`height:${+p.len||300}px;width:48px;`:`width:${+p.len||300}px;height:44px;`;
      const mkHead=atStart=>{
        if(p.head==='none') return '';
        let r=(p.head==='open'?rotO:rotC); if(atStart) r=(r+180)%360;
        return `<span class="head ${p.head}${atStart?' backh':''}" style="transform:rotate(${r}deg)"></span>`;
      };
      return `<div class="tk-wire ${vert?'v':'h'} ${p.dashed?'dashed':''} ${p.flow?'flow':''}" style="${dim}--stroke:${p.accent}">${mkHead(true)}<span class="line"></span>${mkHead(false)}${(p.label||p.clock)?`<span class="wlbl">${p.clock?TK_CLOCK:''}${p.label?rich(p.label):''}</span>`:''}</div>`; } },
  packet:   { name:'TK · packet (traveling dot)',
    group:'flow',
    help:'drop on top of a wire — dot travels end to end. loop off = fires once.',
    props:{dir:'→', len:420, dur:2, loop:true, accent:'var(--amber)'},
    fields:['dir','len','dur','loop','accent'], fieldTypes:{dir:'select',len:'number',dur:'number',loop:'check'}, options:{dir:['→','←','↑','↓']},
    markup:p=>{
      const vert=p.dir==='↑'||p.dir==='↓';
      const rev=p.dir==='←'||p.dir==='↑';
      return `<div class="tk-packet ${vert?'v':'h'} ${rev?'rev':''} ${p.loop?'':'once'}" style="${vert?`height:${+p.len||300}px;width:24px;`:`width:${+p.len||300}px;`}--stroke:${p.accent};--dur:${+p.dur||2}s"><span class="pk"></span></div>`; } },
  cloud:    { name:'TK · internet cloud',
    group:'flow',
    props:{label:'the internet', w:260, accent:'var(--text-dim)'},
    fields:['label','w','accent'],
    markup:p=>{ const s=+p.w||260;
      return `<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}">
        <svg width="${s}" height="${s*0.62}" viewBox="0 0 200 124" fill="none">
          <path d="M56 100 A30 30 0 0 1 58 41 A38 38 0 0 1 128 28 A32 32 0 0 1 172 74 A26 26 0 0 1 156 100 Z"
                stroke="var(--stroke)" stroke-width="3.5"/>
        </svg>${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>`; } },
  ws:       { name:'TK · websocket (realtime)',
    group:'flow',
    props:{label:'', len:240, accent:'var(--cyan-dim)'},
    fields:['label','len','accent'], fieldTypes:{len:'number'},
    markup:p=>{
      const waves=n=>'M8 17 '+Array.from({length:n-1},(_,i)=>`Q ${23+i*30} ${i%2?22:2} ${38+i*30} 17`).join(' ');
      const n=Math.max(3,Math.min(8,Math.round((+p.len||240)/30)));
      return `<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}">
        <svg width="${n*30}" height="34" fill="none" stroke="var(--stroke)" stroke-width="3">
          <path d="${waves(n)}"/>
          <polygon points="2,17 14,10 14,24" fill="var(--stroke)" stroke="none"/>
          <polygon points="${n*30-2},17 ${n*30-14},10 ${n*30-14},24" fill="var(--stroke)" stroke="none"/>
        </svg>${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>`; } },
  retry:    { name:'TK · retry loop',
    group:'flow',
    props:{label:'retry ×3', accent:'var(--amber)'},
    fields:['label','accent'],
    markup:p=>`<span class="tk-retry" style="--stroke:${p.accent}">
      <svg width="54" height="54" viewBox="0 0 56 56" fill="none" stroke="var(--stroke)" stroke-width="4">
        <path d="M46 28 A18 18 0 1 1 28 10"/><polygon points="28,2 40,10 28,18" fill="var(--stroke)" stroke="none"/></svg>
      <span>${rich(p.label)}</span></span>` },
  timeout:  { name:'TK · timeout (broken call)',
    group:'flow',
    props:{label:'deadline exceeded', accent:'var(--alert-red)'},
    fields:['label','accent'],
    markup:p=>`<span class="tk-timeout" style="--stroke:${p.accent}">
      <svg width="152" height="44" fill="none">
        <line x1="2" y1="22" x2="84" y2="22" stroke="var(--phos-green)" stroke-width="3" stroke-dasharray="12 9"/>
        <circle cx="110" cy="22" r="15" stroke="var(--text-dim)" stroke-width="3"/>
        <line x1="110" y1="22" x2="110" y2="12" stroke="var(--text-dim)" stroke-width="2.5"/><line x1="110" y1="22" x2="118" y2="27" stroke="var(--text-dim)" stroke-width="2.5"/>
        <path d="M134 13 l15 18 M149 13 l-15 18" stroke="var(--alert-red)" stroke-width="4.5"/>
      </svg><span>${rich(p.label)}</span></span>` },
  valve:    { name:'TK · rate limiter',
    group:'flow',
    props:{label:'max 100 rps', accent:'var(--phos-green)'},
    fields:['label','accent'],
    markup:p=>`<span class="tk-valve" style="--stroke:${p.accent}">
      <svg width="168" height="58" fill="none">
        <line x1="2" y1="42" x2="166" y2="42" stroke="var(--cyan-dim)" stroke-width="4"/>
        <line x1="84" y1="42" x2="84" y2="18" stroke="var(--stroke)" stroke-width="3"/>
        <circle cx="84" cy="13" r="11" stroke="var(--amber)" stroke-width="3.5"/>
        <line x1="74" y1="13" x2="94" y2="13" stroke="var(--amber)" stroke-width="2.5"/>
      </svg><span>${rich(p.label)}</span></span>` },
  pipe:     { name:'TK · bandwidth pipe',
    group:'flow',
    help:'bore = pipe width in px — narrow vs wide · flow animates the stream, untick for a dry pipe · drag E/S to resize like shapes',
    props:{label:'narrow pipe · trickle', len:560, bore:14, flow:true, accent:'var(--phos-green)'},
    fields:['label','len','bore','flow','accent'], fieldTypes:{len:'number',bore:'number',flow:'check'},
    markup:p=>{ const len=Math.max(120,+p.len||560), bore=Math.max(6,Math.min(80,+p.bore||14));
      const cy=34, h=cy*2+bore, mid=cy+bore/2, fw=Math.max(3,Math.round(bore*0.35));
      return `<div class="tk-pipe" style="--stroke:${p.accent}"><svg width="${len}" height="${h}" fill="none">`
      +`<rect x="4" y="${cy}" width="${len-8}" height="${bore}" rx="${bore/2}" class="pipe-body"/>`
      +`<line x1="16" y1="${mid}" x2="${len-16}" y2="${mid}" stroke-width="${fw}" class="pipe-flow${p.flow?' go':''}"/>`
      +`<path d="M10 ${cy-6} V${cy+bore+6} M${len-10} ${cy-6} V${cy+bore+6}" class="pipe-flange"/>`
      +`</svg><span>${rich(p.label)}</span></div>`} },
  pipeline: { name:'TK · pipeline stages',
    group:'flow',
    help:'stages separated by |',
    props:{stages:'chunk|embed|store|retrieve', accent:'var(--phos-green)'},
    fields:['stages','accent'],
    markup:p=>{ const st=String(p.stages).split('|').filter(Boolean);
      return `<div class="tk-pipe" style="--stroke:${p.accent};--cbg:var(--fill-green)">${st.map(s=>`<span class="st">${rich(s)}</span>`).join('')}</div>`; } },
  breaker:  { name:'TK · circuit breaker',
    group:'flow',
    help:'open = circuit broken (red gap) · closed = flowing',
    props:{state:'open', label:'', accent:'var(--alert-red)'},
    fields:['state','label','accent'], fieldTypes:{state:'select'}, options:{state:['open','closed']},
    markup:p=>{ const open=p.state!=='closed';
      return `<span class="tk-breaker" style="--stroke:${open?'var(--alert-red)':p.accent}">
        <svg width="200" height="60" fill="none" stroke="${open?'var(--alert-red)':'var(--stroke)'}" stroke-width="3.5">
          <line x1="2" y1="34" x2="80" y2="34"/><line x1="136" y1="34" x2="198" y2="34" ${open?'stroke-dasharray="10 8"':''}/>
          <line x1="80" y1="34" x2="${open?126:136}" y2="${open?8:34}"/>
          <circle cx="80" cy="34" r="5" fill="var(--ghost-fill)"/><circle cx="136" cy="34" r="5" fill="var(--ghost-fill)"/>
        </svg>${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</span>`; } },
  consensus:{ name:'TK · consensus vote',
    group:'flow',
    props:{label:'quorum 2/3', accent:'var(--phos-green)'},
    fields:['label','accent'],
    markup:p=>`<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}">
      <svg width="210" height="160" fill="none">
        <line x1="45" y1="45" x2="165" y2="45" stroke="var(--text-dim)" stroke-width="1.5" opacity=".6"/>
        <line x1="45" y1="45" x2="105" y2="125" stroke="var(--text-dim)" stroke-width="1.5" opacity=".6"/>
        <line x1="165" y1="45" x2="105" y2="125" stroke="var(--text-dim)" stroke-width="1.5" opacity=".6"/>
        <circle cx="40" cy="40" r="17" stroke="var(--stroke)" stroke-width="3" fill="var(--ghost-fill)"/>
        <circle cx="170" cy="40" r="17" stroke="var(--stroke)" stroke-width="3" fill="var(--ghost-fill)"/>
        <circle cx="105" cy="130" r="17" stroke="var(--stroke)" stroke-width="3" fill="var(--ghost-fill)"/>
        <path d="M32 40 l6 6 l10 -12" stroke="var(--phos-green)" stroke-width="3.5"/>
        <path d="M162 40 l6 6 l10 -12" stroke="var(--phos-green)" stroke-width="3.5"/>
        <text x="99" y="136" fill="var(--amber)" font-family="var(--font-display)" font-size="22">?</text>
      </svg>${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>` },
  elbow:    { name:'TK · elbow wire (ports)',
    group:'flow',
    help:'comes from top, exits right — flipH/flipV mirror it. ports = attach squares on node edges.',
    props:{lenH:260, lenV:180, ports:true, flipH:false, flipV:false, accent:'var(--phos-green)'},
    fields:['lenH','lenV','ports','flipH','flipV','accent'], fieldTypes:{lenH:'number',lenV:'number',ports:'check',flipH:'check',flipV:'check'},
    markup:p=>`<div class="tk-elbow ${p.flipH?'flipx':''} ${p.flipV?'flipy':''}" style="width:${+p.lenH||260}px;height:${+p.lenV||180}px;--stroke:${p.accent}"><span class="vseg"></span><span class="hseg"></span>${p.ports?`<span class="port" style="left:-6px;top:-7px"></span><span class="port" style="right:-7px;bottom:-6px"></span>`:''}</div>` },
  arcwire:  { name:'KK · curved flow wire',
    group:'flow',
    help:'bezier arc with moving data — data: one packet · stream: many dots · pulse: slow single. rotate the component for direction.',
    props:{len:420, bow:-90, mode:'data', n:4, label:'', dashed:false, head:false, accent:'var(--phos-green)'},
    fields:['len','bow','mode','n','label','dashed','head','accent'],
    fieldTypes:{len:'number',bow:'number',mode:'select',n:'number',label:'textarea',dashed:'check',head:'check'}, options:{mode:['data','stream','pulse']},
    markup:p=>{
      const L=+p.len||420, bow=Math.max(-160,Math.min(160,+p.bow||-90));
      const H=Math.abs(bow)*2+36, base=H-18;
      const path=`M 14 ${base} Q ${L/2} ${base+bow*2} ${L-14} ${base}`;
      const dur=p.mode==='pulse'?3.4:1.7;
      let dots='';
      // CSS offset-path dots (not SMIL): export snapshots restart SMIL clocks, freezing
      // flow — CSS motion captures frame-to-frame like the token streams do
      if(p.mode==='stream'){
        const nn=Math.max(2,Math.min(10,+p.n||4));
        for(let i=0;i<nn;i++) dots+=`<circle class="flowdot" r="${i%3===2?4:5.5}" fill="${i%3===2?'var(--cyan-dim)':'var(--stroke)'}" cx="0" cy="0" style="offset-path:path('${path}');animation-duration:${dur}s;animation-delay:${(-(i*dur/nn)).toFixed(2)}s"/>`;
      } else {
        dots=`<circle class="flowdot" r="6" fill="var(--stroke)" cx="0" cy="0" style="offset-path:path('${path}');animation-duration:${dur}s"/>`;
      }
      const head=p.head?`<polygon class="headf" points="${L-16},${base-8} ${L-3},${base} ${L-16},${base+8}"/>`:'';
      return `<div class="tk-aw ${p.dashed?'dashed':''}" style="--stroke:${p.accent};width:${L}px;position:relative">
        <svg width="${L}" height="${H}"><path class="track" d="${path}"/>${head}${dots}</svg>
        ${p.label?`<span class="lbl" style="position:absolute;left:50%;top:${base+bow}px;transform:translate(-50%,-50%)">${rich(p.label)}</span>`:''}</div>`; } },
  fanout:   { name:'KK · fan-out branches',
    group:'flow',
    help:'one source splitting into N curved branches — branching services, sharding, fan-out reads',
    props:{n:4, len:380, spread:220, mode:'stream', label:'', accent:'var(--phos-green)'},
    fields:['n','len','spread','mode','label','accent'],
    fieldTypes:{n:'number',len:'number',spread:'number',mode:'select'}, options:{mode:['data','stream','pulse']},
    markup:p=>{
      const n=Math.max(2,Math.min(8,+p.n||4)), L=+p.len||380, S=+p.spread||220;
      const H=S+44, cy=(H)/2;
      const fade=i=>(0.55+0.45*(1-Math.abs(i-(n-1)/2)/(((n-1)/2)||1))).toFixed(2);
      /* canonical 4-branch stream = exact showcase geometry; other counts use the formula */
      const CTRL4=[9,5,18,31], BEG4=[-0,-.95,-.35,-1.3];
      let paths='',dots='';
      for(let i=0;i<n;i++){
        const ty=14+i*(S/(n-1));
        const ctrl=(n===4&&p.mode==='stream')?(CTRL4[i]!==undefined?cy+CTRL4[i]:cy+(ty-cy)*0.25):(cy+(ty-cy)*0.25);
        const d=`M 10 ${cy} Q ${(L*0.45).toFixed(0)} ${ctrl.toFixed(1)} ${L-16} ${ty}`;
        paths+=`<path class="track" d="${d}" opacity="${fade(i)}"/>`;
        if(p.mode==='stream'){
          const col=i%2?'var(--cyan-dim)':'var(--stroke)';
          const beg=(n===4)?BEG4[i]:-(i*0.475);
          dots+=`<circle class="flowdot" r="4.5" fill="${col}" opacity="${fade(i)}" cx="0" cy="0" style="offset-path:path('${d}');animation-duration:1.9s;animation-delay:${beg}s"/>`;
        } else {
          const dur=p.mode==='pulse'?3.2:1.7;
          dots+=`<circle class="flowdot" r="5" fill="var(--stroke)" opacity="${fade(i)}" cx="0" cy="0" style="offset-path:path('${d}');animation-duration:${dur}s;animation-delay:${(i*0.25).toFixed(2)}s"/>`;
        }
      }
      return `<div class="tk-fan" style="--stroke:${p.accent};width:${L}px;position:relative">
        <svg width="${L}" height="${H}">${paths}<circle cx="10" cy="${cy}" r="8" fill="var(--stroke)"/>${dots}</svg>
        ${p.label?`<span class="lbl" style="position:absolute;left:16px;top:${cy+22}px">${rich(p.label)}</span>`:''}</div>`; } },
};
