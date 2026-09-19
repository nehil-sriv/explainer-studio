/** nodes components — extracted verbatim from index.html REGISTRY. */
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

export const nodesComponents: Record<string, ComponentDef> = {
  knode:    { name:'Node (worker) — drop pods inside',
    group:'nodes',
    props:{label:'node-1', role:'worker'},
    fields:['label','role'],
    markup:p=>`<div class="nodebox tech"><div class="nodebox-head"><span>${p.label}</span><span style="color:var(--text-dim)">${p.role}</span></div>
      <div class="nodebox-body" data-slot="pods">drop pods here</div></div>` },
  kcp:      { name:'Control plane',
    group:'nodes',
    props:{label:'control-plane'},
    fields:['label'],
    markup:p=>`<div class="nodebox tech cpbadge" style="--amber:1"><div class="nodebox-head" style="background:var(--fill-amber)"><span>${p.label}</span></div>
      <div class="nodebox-body" style="color:var(--text-dim);font-size:13px">apiserver · scheduler · etcd</div></div>` },
  svc:      { name:'TK · service block',
    group:'nodes',
    help:'the generic microservice box — name + tech subtitle. add boundaries FIRST so they sit behind. state adds the status dot (absorbed from legacy svcblock).',
    props:{name:'payment-svc', sub:'go · grpc', accent:'var(--phos-green)', state:'none'},
    fields:['name','sub','accent','state'], fieldTypes:{state:'select'}, options:{state:['none','healthy','warn','error']},
    markup:p=>`<div class="tk-svc" style="--stroke:${p.accent}">${p.state&&p.state!=='none'?`<span class="svc-dot${p.state==='healthy'?' tpulse':''}" style="--dotc:${p.state==='warn'?'var(--amber)':p.state==='error'?'var(--alert-red)':'var(--phos-green)'}"></span>`:''}<div class="tk-name">${rich(p.name)}</div>${p.sub?`<div class="tk-sub">${p.sub}</div>`:''}</div>` },
  gnode:    { name:'GG · node card',
    group:'nodes',
    help:'gravel-style service card — icon chip + name + subtitle. connect cards via 🔗 ports.',
    props:{icon:'api', title:'API', sub:'REST service', accent:'var(--cyan-dim)'},
    fields:['icon','title','sub','accent'],
    fieldTypes:{icon:'select'},
    options:{icon:['gateway','api','db','cache','queue','worker','user','cdn','app','ram','cpu','gpu','bw']},
    markup:p=>`<div class="gnode" style="--stroke:${p.accent}"><span class="gicon"><svg width="22" height="22" viewBox="0 0 24 24">${gnIcon(p.icon)}</svg></span><span class="gtext"><b>${rich(p.title)}</b>${p.sub?`<i>${rich(p.sub)}</i>`:''}</span></div>` },
  server:   { name:'TK · rack server',
    group:'nodes',
    props:{label:'api-01', units:4, accent:'var(--phos-green)'},
    fields:['label','units','accent'], fieldTypes:{units:'number'},
    markup:p=>{ const u=Math.max(2,Math.min(8,+p.units||4));
      return `<div style="display:flex;flex-direction:column;align-items:center">
        <div class="tk-server" style="--stroke:${p.accent}">${Array.from({length:u},()=>'<span class="slat"><i></i><i></i></span>').join('')}</div>
        ${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>`; } },
  pod:      { name:'TK · pod',
    group:'nodes',
    help:'status dot: ok / warn / dead — place on top of a boundary (cluster/node)',
    props:{name:'web-7f9d', status:'ok', accent:'var(--phos-green)'},
    fields:['name','status','accent'], fieldTypes:{status:'select'}, options:{status:['ok','warn','dead']},
    markup:p=>`<div class="tk-pod" style="--stroke:${p.accent}"><div class="pbox">`+`<svg width="58" height="56" viewBox="0 0 18.035334 17.500378" fill="none" stroke="var(--stroke)" stroke-width="0.9" stroke-linejoin="round" stroke-linecap="round"><g transform="translate(-0.99262638,-1.174181)"><g transform="matrix(1.0148887,0,0,1.0148887,16.902146,-2.698726)"><path d="m -6.8492015,4.2724668 a 1.1191255,1.1099671 0 0 0 -0.4288818,0.1085303 l -5.8524037,2.7963394 a 1.1191255,1.1099671 0 0 0 -0.605524,0.7529759 l -1.443828,6.2812846 a 1.1191255,1.1099671 0 0 0 0.151943,0.851028 1.1191255,1.1099671 0 0 0 0.06362,0.08832 l 4.0508,5.036555 a 1.1191255,1.1099671 0 0 0 0.874979,0.417654 l 6.4961011,-0.0015 a 1.1191255,1.1099671 0 0 0 0.8749788,-0.416906 L 1.3818872,15.149453 A 1.1191255,1.1099671 0 0 0 1.5981986,14.210104 L 0.15212657,7.9288154 A 1.1191255,1.1099671 0 0 0 -0.45339794,7.1758396 L -6.3065496,4.3809971 A 1.1191255,1.1099671 0 0 0 -6.8492015,4.2724668 Z"/></g><g transform="translate(0.12766661,0.35147801)"><path d="M 6.2617914,7.036086 9.8826317,5.986087 13.503462,7.036086 9.8826317,8.086087 Z" stroke-width="0.55"/><path d="m 6.2617914,7.43817 0,3.852778 3.3736103,1.868749 0.0167,-4.713193 z" stroke-width="0.55"/><path d="m 13.503462,7.43817 0,3.852778 -3.37361,1.868749 -0.0167,-4.713193 z" stroke-width="0.55"/></g></g></svg>`+`<span class="hdot ${p.status}" style="position:absolute;top:-9px;right:-9px;width:18px;height:18px;"></span></div>${p.name?`<div class="pname">${rich(p.name)}</div>`:''}</div>` },
  vm:       { name:'TK · virtual machine',
    group:'nodes',
    props:{label:'vm-2', units:4, accent:'var(--phos-green)'},
    fields:['label','units','accent'], fieldTypes:{units:'number'},
    markup:p=>{ const u=Math.max(2,Math.min(8,+p.units||4));
      return `<div style="display:flex;flex-direction:column;align-items:center">
        <div class="tk-server dashed" style="--stroke:${p.accent}">${Array.from({length:u},()=>'<span class="slat"><i></i><i></i></span>').join('')}</div>
        ${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>`; } },
  container:{ name:'TK · docker container',
    group:'nodes',
    props:{name:'checkout · v2', accent:'var(--cyan-dim)'},
    fields:['name','accent'],
    markup:p=>`<div class="tk-cont" style="--stroke:${p.accent}">`+`<svg width="64" height="64" viewBox="0 0 24 24" fill="var(--stroke)" style="position:relative;display:block;margin:0 auto 8px"><path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z"/></svg>`+`<div class="tk-name">${rich(p.name)}</div></div>` },
  controlplane:{ name:'TK · control plane',
    group:'nodes',
    props:{name:'control plane', sub:'kube-apiserver · etcd', accent:'var(--amber)'},
    fields:['name','sub','accent'],
    markup:p=>`<div class="tk-cp" style="--stroke:${p.accent}"><div class="crown">★ ★ ★</div><div class="tk-name">${rich(p.name)}</div>${p.sub?`<div class="tk-sub">${p.sub}</div>`:''}</div>` },
  lb:       { name:'TK · load balancer',
    group:'nodes',
    props:{label:'', accent:'var(--phos-green)'},
    fields:['label','accent'],
    markup:p=>`<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}">
      <svg width="180" height="122" fill="none" stroke="var(--stroke)" stroke-width="3">
        <line x1="90" y1="2" x2="90" y2="24"/>
        <path d="M50 26 H130 L102 62 H78 Z"/>
        <path d="M79 64 L38 104 M90 64 V110 M101 64 L142 104"/>
        <polygon points="34,112 46,106 40,98" fill="var(--stroke)" stroke="none"/>
        <polygon points="84,120 96,120 90,108" fill="var(--stroke)" stroke="none"/>
        <polygon points="146,112 140,98 154,106" fill="var(--stroke)" stroke="none"/>
      </svg>${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>` },
  gateway:  { name:'TK · api gateway / proxy',
    group:'nodes',
    help:'one gate covers B9 reverse-proxy and B10 api-gateway — label decides',
    props:{name:'api-gateway', sub:'auth · routing', accent:'var(--phos-green)'},
    fields:['name','sub','accent'],
    markup:p=>`<div class="tk-gate" style="--stroke:${p.accent}"><div class="door"></div><div class="tk-name">${rich(p.name)}</div>${p.sub?`<div class="tk-sub">${p.sub}</div>`:''}</div>` },
  cdn:      { name:'TK · edge / CDN',
    group:'nodes',
    props:{label:'cdn · 42 pops', accent:'var(--cyan-dim)'},
    fields:['label','accent'],
    markup:p=>`<div class="tk-cdn" style="--stroke:${p.accent}">
      <svg width="150" height="150" fill="none">
        <circle cx="75" cy="75" r="44" stroke="var(--stroke)" stroke-width="3"/>
        <ellipse cx="75" cy="75" rx="19" ry="44" stroke="var(--stroke)" stroke-width="2"/>
        <line x1="31" y1="75" x2="119" y2="75" stroke="var(--stroke)" stroke-width="2"/>
        <line x1="118" y1="52" x2="136" y2="36" stroke="var(--amber)" stroke-width="2" stroke-dasharray="5 5"/><circle cx="140" cy="32" r="5.5" fill="var(--amber)"/>
        <line x1="34" y1="98" x2="16" y2="116" stroke="var(--phos-green)" stroke-width="2" stroke-dasharray="5 5"/><circle cx="13" cy="120" r="5.5" fill="var(--phos-green)"/>
        <line x1="104" y1="114" x2="120" y2="132" stroke="var(--cyan-dim)" stroke-width="2" stroke-dasharray="5 5"/><circle cx="123" cy="136" r="5.5" fill="var(--cyan-dim)"/>
      </svg>${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>` },
  lambda:   { name:'TK · serverless fn',
    group:'nodes',
    props:{label:'resizeImg()', accent:'var(--amber)'},
    fields:['label','accent'],
    markup:p=>`<div class="tk-lambda" style="--stroke:${p.accent}">${TK_BOLT}${p.label?`<span class="tk-caption" style="margin-top:0">${rich(p.label)}</span>`:''}</div>` },
  worker:   { name:'TK · queue worker',
    group:'nodes',
    props:{label:'job-runner ×4', cells:3, accent:'var(--cyan-dim)'},
    fields:['label','cells','accent'], fieldTypes:{cells:'number'},
    markup:p=>{ const n=Math.max(1,Math.min(6,+p.cells||3));
      return `<div class="tk-worker" style="--stroke:${p.accent}">
        <div class="belt">${'<i></i>'.repeat(n)}</div>${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>`; } },
  firewall: { name:'TK · firewall',
    group:'nodes',
    props:{label:'allow :443 only', accent:'var(--alert-red)'},
    fields:['label','accent'],
    markup:p=>`<div class="tk-firewall" style="--stroke:${p.accent}"><span class="tk-fw-cap">${rich(p.label)}</span></div>` },
  bootnode: { name:'KK · node bootstrap',
    group:'nodes',
    help:'outline draws itself in, status lights up — "worker nodes coming up". replays every time it is pulled.',
    props:{label:'node-3 joining', units:4, status:'ok', accent:'var(--phos-green)'},
    fields:['label','units','status','accent'], fieldTypes:{units:'number',status:'select'}, options:{status:['ok','warn','dead']},
    markup:p=>{ const u=Math.max(2,Math.min(6,+p.units||4)); const H=u*34+10;
      return `<div class="tk-boot" style="--stroke:${p.accent}">
        <svg width="130" height="${H}">
          <rect class="draw" x="3" y="3" width="124" height="${H-6}" rx="6" fill="var(--ghost-fill)" stroke="var(--stroke)" stroke-width="3"/>
          ${Array.from({length:u},(_,i)=>`<line class="draw" x1="14" y1="${21+i*34}" x2="116" y2="${21+i*34}" stroke="var(--line-dim)" stroke-width="2.5" style="animation-delay:${(0.25+i*0.12).toFixed(2)}s"/>`).join('')}
        </svg>
        <span class="hdot ${p.status}" style="position:absolute;top:-8px;right:-8px;width:19px;height:19px;"></span>
        ${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>`; } },
  crashpod: { name:'KK · crash-looping pod',
    group:'nodes',
    help:'flickers red, collapses, restarts on loop — CrashLoopBackOff while you narrate',
    props:{name:'payment-svc-7f9d', accent:'var(--alert-red)'},
    fields:['name','accent'],
    markup:p=>`<div class="tk-cpod" style="--stroke:${p.accent}"><div class="pbox2">✕</div><div class="pname">${rich(p.name)}</div></div>` },
  swarm:    { name:'KK · scale-to-N swarm',
    group:'nodes',
    help:'grid of tiny nodes materializing in stagger — "scaling to 100 servers". dead count tints some red.',
    props:{n:48, dead:0, label:'×100 nodes', gap:10, accent:'var(--phos-green)'},
    fields:['n','dead','label','gap','accent'], fieldTypes:{n:'number',dead:'number',gap:'number'},
    markup:p=>{
      const n=Math.max(4,Math.min(100,+p.n||48)), deadN=Math.max(0,Math.min(n,+p.dead||0));
      const cols=Math.ceil(Math.sqrt(n*16/9));
      const stride=deadN>0?(n/deadN):Infinity;
      const isDead=i=>deadN>0 && Math.floor(i/stride)!==Math.floor((i+1)/stride);
      return `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:10px">
        <div class="tk-swarm" style="--stroke:${p.accent};grid-template-columns:repeat(${cols},auto);gap:${+p.gap||10}px">${Array.from({length:n},(_,i)=>`<span class="celln${isDead(i)?' dead':''}" style="animation-delay:${(i*0.02).toFixed(2)}s"></span>`).join('')}</div>
        ${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>`; } },
};
