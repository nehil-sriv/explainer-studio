/** ui components — extracted verbatim from index.html REGISTRY. */
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

export const uiComponents: Record<string, ComponentDef> = {
  avatar:   { name:'UI · avatar',
    group:'ui',
    help:'initials circle with presence dot',
    props:{initials:'AK', size:64, status:'online', accent:'var(--phos-green)'},
    fields:['initials','size','status','accent'], fieldTypes:{size:'number',status:'select'}, options:{status:['online','idle','off']},
    markup:p=>{ const s=Math.max(24,Math.min(160,+p.size||64));
      return `<span class="tk-avatar" style="--stroke:${p.accent};width:${s}px;height:${s}px;font-size:${Math.round(s*0.36)}px"><span>${rich(p.initials)}</span><i class="av-dot st-${p.status||'online'}"></i></span>`} },
  btn:      { name:'UI · button',
    group:'ui',
    help:'primary filled, ghost outline, or danger',
    props:{label:'Save changes', kind:'primary', accent:'var(--phos-green)'},
    fields:['label','kind','accent'], fieldTypes:{kind:'select'}, options:{kind:['primary','ghost','danger']},
    markup:p=>`<span class="tk-btn k-${p.kind||'primary'}" style="--stroke:${p.accent}">${rich(p.label)}</span>` },
  badge:    { name:'UI · count badge',
    group:'ui',
    help:'notification count pill',
    props:{text:'3', accent:'var(--alert-red)'},
    fields:['text','accent'],
    markup:p=>`<span class="tk-badge" style="--stroke:${p.accent}">${rich(p.text)}</span>` },
  tabs:     { name:'UI · tab bar',
    group:'ui',
    help:'items one per line (or | separated) · active = 0-based index of the lit tab',
    props:{items:'Overview|Activity|Billing', active:0, accent:'var(--phos-green)'},
    fields:['items','active','accent'], fieldTypes:{items:'textarea', active:'number'},
    markup:p=>{ const items=String(p.items||'').split('\n').flatMap(l=>l.split('|')).map(s=>s.trim()).filter(Boolean);
      const a=Math.max(0,Math.min(items.length-1,Math.round(+p.active||0)));
      return `<div class="tk-tabs" style="--stroke:${p.accent}">${items.map((t,i)=>`<span class="tab${i===a?' on':''}">${rich(t)}</span>`).join('')}</div>`} },
  input:    { name:'UI · text field',
    group:'ui',
    help:'label over a mock input box',
    props:{label:'Email', value:'you@co.com', w:340, accent:'var(--phos-green)'},
    fields:['label','value','w','accent'], fieldTypes:{w:'number'},
    markup:p=>`<div class="tk-input" style="--stroke:${p.accent};width:${Math.max(160,+p.w||340)}px"><span class="in-label">${rich(p.label)}</span><span class="in-box">${rich(p.value)||'—'}</span></div>` },
  toggle:   { name:'UI · toggle switch',
    group:'ui',
    help:'on/off switch with label',
    props:{label:'Email alerts', on:true, accent:'var(--phos-green)'},
    fields:['label','on','accent'], fieldTypes:{on:'check'},
    markup:p=>`<div class="tk-toggle${p.on?' on':''}" style="--stroke:${p.accent}"><span class="tg-track"><span class="tg-knob"></span></span><span class="tg-label">${rich(p.label)}</span></div>` },
  nav:      { name:'UI · side nav',
    group:'ui',
    help:'vertical menu rows · active = 0-based lit row',
    props:{items:'Dashboard|Customers|Reports|Settings', active:0, accent:'var(--phos-green)'},
    fields:['items','active','accent'], fieldTypes:{items:'textarea', active:'number'},
    markup:p=>{ const items=String(p.items||'').split('\n').flatMap(l=>l.split('|')).map(s=>s.trim()).filter(Boolean);
      const a=Math.max(0,Math.min(items.length-1,Math.round(+p.active||0)));
      return `<div class="tk-nav" style="--stroke:${p.accent}">${items.map((t,i)=>`<span class="nv${i===a?' on':''}">${i===a?'▸':'·'}<span>${rich(t)}</span></span>`).join('')}</div>`} },
  search:   { name:'UI · search field',
    group:'ui',
    help:'rounded search box with magnifier',
    props:{text:'Search customers…', w:340},
    fields:['text','w'], fieldTypes:{w:'number'},
    markup:p=>`<div class="tk-search" style="width:${Math.max(160,+p.w||340)}px"><span class="s-ico">⌕</span><span class="s-txt">${rich(p.text)}</span></div>` },
  card:     { name:'UI · content card',
    group:'ui',
    help:'generic panel: title over body text',
    props:{title:'Monthly churn', body:'Down 2 pts since May. Nudges beat discounts.', w:440, accent:'var(--phos-green)'},
    fields:['title','body','w','accent'], fieldTypes:{body:'textarea', w:'number'},
    markup:p=>`<div class="tk-card" style="--stroke:${p.accent};width:${Math.max(200,+p.w||440)}px"><div class="c-title">${rich(p.title)}</div><div class="c-body">${rich(p.body)}</div></div>` },
  steps:    { name:'UI · stepper',
    group:'ui',
    help:'checkout-style progress · done = how many are completed',
    props:{items:'Cart|Shipping|Payment', done:1, accent:'var(--phos-green)'},
    fields:['items','done','accent'], fieldTypes:{items:'textarea', done:'number'},
    markup:p=>{ const items=String(p.items||'').split('\n').flatMap(l=>l.split('|')).map(s=>s.trim()).filter(Boolean);
      const d=Math.max(0,Math.min(items.length,+p.done||0));
      return `<div class="tk-steps" style="--stroke:${p.accent}">${items.map((t,i)=>`${i?`<span class="stp-link${i<=d?' full':''}"></span>`:''}<span class="stp${i<d?' done':i===d?' now':''}"><span class="stp-n">${i<d?'✓':i+1}</span><span>${rich(t)}</span></span>`).join('')}</div>`} },
};
