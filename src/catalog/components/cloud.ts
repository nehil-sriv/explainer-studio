/** cloud components — extracted verbatim from index.html REGISTRY. */
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

export const cloudComponents: Record<string, ComponentDef> = {
  k8s:      { name:'CL · kubernetes',
    group:'cloud',
    props:{label:'eks · prod', accent:'var(--cyan-dim)'},
    fields:['label','accent'],
    markup:p=>`<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}" class="tech">`
      // official Kubernetes wheel (CNCF), monochrome via --stroke
      +`<svg width="96" height="96" viewBox="9.70 9.20 210.86 204.86" fill="var(--stroke)"><path d="M134.4 126.5a3.6 3.6 0.0 0.0 0.0-0.9-0.1 3.7 3.7 0.0 0.0 0.0-1.40.4 3.7 3.7 0.0 0.0 0.0-1.8 4.8l-0.00.0 8.5 20.6a43.5 43.5 0.0 0.0 0.0 17.6-22.1l-22.0-3.7zm-34.2 2.9a3.7 3.7 0.0 0.0 0.0-3.6-2.9 3.7 3.7 0.0 0.0 0.0-0.70.1l-0.0-0.0-21.8 3.7a43.7 43.7 0.0 0.0 0.0 17.5 21.9l8.4-20.4-0.1-0.1a3.7 3.7 0.0 0.0 0.0 0.2-2.3zm18.2 8.0a3.7 3.7 0.0 0.0 0.0-6.60.0h-0.0l-10.7 19.4a43.6 43.6 0.0 0.0 0.0 23.8 1.2q2.2-0.5 4.3-1.2l-10.7-19.4zm33.9-45.0l-16.5 14.80.00.0a3.7 3.7 0.0 0.0 0.0 1.5 6.4l0.00.1 21.4 6.2a44.3 44.3 0.0 0.0 0.0-6.4-27.4zM121.7 94.0a3.7 3.7 0.0 0.0 0.0 5.9 2.8l0.10.0 18.0-12.8a43.9 43.9 0.0 0.0 0.0-25.3-12.2l1.3 22.1zm-19.1 2.9a3.7 3.7 0.0 0.0 0.0 5.9-2.9l0.1-0.0 1.3-22.1a44.7 44.7 0.0 0.0 0.0-4.50.8 43.5 43.5 0.0 0.0 0.0-20.9 11.4l18.2 12.9zm-9.7 16.7a3.7 3.7 0.0 0.0 0.0 1.5-6.4l0.0-0.1-16.6-14.8a43.5 43.5 0.0 0.0 0.0-6.2 27.5l21.2-6.1zm16.1 6.5l6.1 2.9 6.1-2.9 1.5-6.6-4.2-5.3h-6.8l-4.2 5.3z"/><path d="M216.2 133.2l-17.4-75.7a13.6 13.6 0.0 0.0 0.0-7.3-9.1l-70.5-33.7a13.6 13.6 0.0 0.0 0.0-11.7 0.0l-70.5 33.7a13.6 13.6 0.0 0.0 0.0-7.3 9.1l-17.4 75.7a13.3 13.3 0.0 0.0 0.0-0.0 5.8 13.5 13.5 0.0 0.0 0.0 0.5 1.7 13.1 13.1 0.0 0.0 0.0 1.3 2.7c0.20.40.50.70.8 1.1l48.8 60.7c0.20.30.40.50.70.8a13.4 13.4 0.0 0.0 0.0 2.6 2.1 13.9 13.9 0.0 0.0 0.0 3.9 1.7 13.3 13.3 0.0 0.0 0.0 3.40.5h0.8l77.5-0.0a13.0 13.0 0.0 0.0 0.0 1.4-0.1 13.5 13.5 0.0 0.0 0.0 2.0-0.4 13.9 13.9 0.0 0.0 0.0 1.4-0.4c0.4-0.10.7-0.3 1.0-0.4a13.9 13.9 0.0 0.0 0.0 1.5-0.8 13.3 13.3 0.0 0.0 0.0 3.2-2.9l1.5-1.9 47.3-58.8a13.2 13.2 0.0 0.0 0.0 2.1-3.8 13.7 13.7 0.0 0.0 0.0 0.5-1.7 13.3 13.3 0.0 0.0 0.0-0.0-5.8zm-73.1 29.4a14.5 14.5 0.0 0.0 0.0 0.7 1.7 3.3 3.3 0.0 0.0 0.0-0.3 2.5 39.4 39.4 0.0 0.0 0.0 3.7 6.7 35.1 35.1 0.0 0.0 1.0 2.3 3.4c0.20.30.40.80.6 1.1a4.2 4.2 0.0 1.0 1.0-7.6 3.6c-0.2-0.3-0.4-0.8-0.5-1.1a35.3 35.3 0.0 0.0 1.0-1.2-3.9 39.3 39.3 0.0 0.0 0.0-2.9-7.1 3.3 3.3 0.0 0.0 0.0-2.2-1.3c-0.1-0.2-0.6-1.1-0.9-1.6a54.6 54.6 0.0 0.0 1.0-38.9-0.1l-1.0 1.7a3.4 3.4 0.0 0.0 0.0-1.80.9 29.5 29.5 0.0 0.0 0.0-3.3 7.6 34.9 34.9 0.0 0.0 1.0-1.2 3.9c-0.10.3-0.40.7-0.5 1.1v0.0l-0.00.0a4.2 4.2 0.0 1.0 1.0-7.6-3.6c0.2-0.30.4-0.80.5-1.1a35.2 35.2 0.0 0.0 1.0 2.3-3.4 41.2 41.2 0.0 0.0 0.0 3.8-6.9 4.2 4.2 0.0 0.0 0.0-0.4-2.4l0.8-1.8a54.9 54.9 0.0 0.0 1.0-24.3-30.4l-1.80.3a4.7 4.7 0.0 0.0 0.0-2.4-0.9 39.5 39.5 0.0 0.0 0.0-7.4 2.2 35.6 35.6 0.0 0.0 1.0-3.8 1.4c-0.30.1-0.70.2-1.10.2-0.00.0-0.10.0-0.10.0a0.60.6 0.0 0.0 1.0-0.10.0 4.2 4.2 0.0 1.0 1.0-1.9-8.2l0.1-0.00.0-0.0c0.4-0.10.8-0.2 1.1-0.3a35.3 35.3 0.0 0.0 1.0 4.0-0.3 39.4 39.4 0.0 0.0 0.0 7.6-1.2 5.8 5.8 0.0 0.0 0.0 1.8-1.8l1.8-0.5a54.6 54.6 0.0 0.0 1.0 8.6-38.1l-1.4-1.2a4.7 4.7 0.0 0.0 0.0-0.8-2.4 39.4 39.4 0.0 0.0 0.0-6.3-4.4 35.3 35.3 0.0 0.0 1.0-3.5-2.0c-0.3-0.2-0.6-0.5-0.9-0.7l-0.1-0.0a4.5 4.5 0.0 0.0 1.0-1.0-6.2 4.1 4.1 0.0 0.0 1.0 3.4-1.5 5.0 5.0 0.0 0.0 1.0 2.9 1.1c0.30.20.70.50.90.7a35.3 35.3 0.0 0.0 1.0 2.8 3.0 39.4 39.4 0.0 0.0 0.0 5.7 5.1 3.3 3.3 0.0 0.0 0.0 2.50.2q0.80.6 1.5 1.1a54.3 54.3 0.0 0.0 1.0 27.6-15.8 55.1 55.1 0.0 0.0 1.0 7.6-1.2l0.1-1.8a4.6 4.6 0.0 0.0 0.0 1.4-2.2 39.5 39.5 0.0 0.0 0.0-0.5-7.7 35.5 35.5 0.0 0.0 1.0-0.6-4.0c-0.0-0.30.0-0.70.0-1.1 0.0-0.0-0.0-0.1-0.0-0.1a4.2 4.2 0.0 1.0 1.0 8.4-0.0c0.0 0.40.00.90.0 1.2a35.1 35.1 0.0 0.0 1.0-0.6 4.0 39.5 39.5 0.0 0.0 0.0-0.5 7.7 3.3 3.3 0.0 0.0 0.0 1.4 2.1c0.00.30.1 1.30.1 1.9a55.3 55.3 0.0 0.0 1.0 35.0 16.9l1.6-1.1a4.7 4.7 0.0 0.0 0.0 2.6-0.3 39.5 39.5 0.0 0.0 0.0 5.7-5.1 35.0 35.0 0.0 0.0 1.0 2.8-3.0c0.3-0.20.7-0.50.9-0.7a4.2 4.2 0.0 1.0 1.0 5.3 6.6c-0.30.2-0.70.5-0.90.8a35.1 35.1 0.0 0.0 1.0-3.5 2.0 39.5 39.5 0.0 0.0 0.0-6.3 4.4 3.3 3.3 0.0 0.0 0.0-0.8 2.4c-0.20.2-1.10.9-1.5 1.3a54.8 54.8 0.0 0.0 1.0 8.8 38.0l1.70.5a4.7 4.7 0.0 0.0 0.0 1.8 1.8 39.5 39.5 0.0 0.0 0.0 7.6 1.2 35.6 35.6 0.0 0.0 1.0 4.00.3c0.40.10.90.2 1.20.3a4.2 4.2 0.0 1.0 1.0-1.9 8.2l-0.1-0.0c-0.0-0.0-0.1-0.0-0.1-0.0-0.3-0.1-0.8-0.2-1.1-0.2a35.1 35.1 0.0 0.0 1.0-3.8-1.5 39.5 39.5 0.0 0.0 0.0-7.4-2.2 3.3 3.3 0.0 0.0 0.0-2.40.9q-0.9-0.2-1.8-0.3a54.9 54.9 0.0 0.0 1.0-24.3 30.6z"/></svg>${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>` },
  alarm:    { name:'CL · alarm / alert',
    group:'cloud',
    props:{label:'p99 breach', accent:'var(--amber)'},
    fields:['label','accent'],
    markup:p=>`<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}" class="tech">`
      +`<svg width="80" height="88" viewBox="0 0 80 88" fill="none" stroke="var(--stroke)" stroke-width="4">`
      +`<path d="M40 8 C26 8 20 24 20 36 L14 52 H66 L60 36 C60 24 54 8 40 8 Z"/><line x1="32" y1="62" x2="32" y2="70"/><line x1="48" y1="62" x2="48" y2="70"/><line x1="30" y1="76" x2="50" y2="76"/>`
      +`<path d="M10 22 C6 30 6 40 10 48 M70 22 C74 30 74 40 70 48" stroke-width="3"/></svg>`
      +`${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>` },
  cron:     { name:'CL · schedule / cron',
    group:'cloud',
    props:{label:'nightly 02:00', accent:'var(--cyan-dim)'},
    fields:['label','accent'],
    markup:p=>`<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}" class="tech">`
      +`<svg width="88" height="88" viewBox="0 0 88 88" fill="none" stroke="var(--stroke)" stroke-width="4">`
      +`<circle cx="44" cy="48" r="32"/><line x1="44" y1="48" x2="44" y2="28"/><line x1="44" y1="48" x2="60" y2="56"/>`
      +`<line x1="44" y1="8" x2="44" y2="2" /><line x1="30" y1="10" x2="28" y2="4"/><line x1="58" y1="10" x2="60" y2="4"/></svg>`
      +`${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>` },
  globe:    { name:'CL · globe / edge users',
    group:'cloud',
    props:{label:'global traffic', accent:'var(--phos-green)'},
    fields:['label','accent'],
    markup:p=>`<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}" class="tech">`
      +`<svg width="92" height="92" viewBox="0 0 92 92" fill="none" stroke="var(--stroke)" stroke-width="3.5">`
      +`<circle cx="46" cy="46" r="34"/><ellipse cx="46" cy="46" rx="15" ry="34"/><line x1="12" y1="46" x2="80" y2="46"/>`
      +`<line x1="18" y1="28" x2="74" y2="28" opacity=".6"/><line x1="18" y1="64" x2="74" y2="64" opacity=".6"/></svg>`
      +`${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>` },
  secret:   { name:'CL · secrets / KMS key',
    group:'cloud',
    props:{label:'api keys', accent:'var(--amber)'},
    fields:['label','accent'],
    markup:p=>`<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}" class="tech">`
      +`<svg width="92" height="64" viewBox="0 0 92 64" fill="none" stroke="var(--stroke)" stroke-width="4">`
      +`<circle cx="22" cy="32" r="15"/><line x1="37" y1="32" x2="86" y2="32"/><line x1="66" y1="32" x2="66" y2="44"/><line x1="78" y1="32" x2="78" y2="44"/></svg>`
      +`${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>` },
  policy:   { name:'CL · IAM policy / shield',
    group:'cloud',
    props:{label:'least privilege', accent:'var(--phos-green)'},
    fields:['label','accent'],
    markup:p=>`<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}" class="tech">`
      +`<svg width="80" height="92" viewBox="0 0 80 92" fill="none" stroke="var(--stroke)" stroke-width="4">`
      +`<path d="M40 4 L70 16 V44 C70 66 56 78 40 88 C24 78 10 66 10 44 V16 Z"/>`
      +`<path d="M30 44 l8 8 l14 -18" stroke-width="4.5"/></svg>`
      +`${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>` },
  repo:     { name:'CL · git repo',
    group:'cloud',
    props:{label:'main', accent:'var(--text-primary)'},
    fields:['label','accent'],
    markup:p=>`<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}" class="tech">`
      +`<svg width="92" height="80" viewBox="0 0 92 80" fill="none" stroke="var(--stroke)" stroke-width="4">`
      +`<circle cx="24" cy="16" r="9"/><circle cx="24" cy="64" r="9"/><circle cx="68" cy="40" r="9"/>`
      +`<line x1="24" y1="25" x2="24" y2="55"/><path d="M24 40 C40 40 44 40 58 40"/></svg>`
      +`${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>` },
  cirunner: { name:'CL · CI runner / gear',
    group:'cloud',
    props:{label:'deploy', accent:'var(--cyan-dim)'},
    fields:['label','accent'],
    markup:p=>{ const teeth=[0,45,90,135,180,225,270,315].map(a=>{ const r=a*Math.PI/180;
        return `<line x1="${(46+20*Math.cos(r)).toFixed(1)}" y1="${(46+20*Math.sin(r)).toFixed(1)}" x2="${(46+32*Math.cos(r)).toFixed(1)}" y2="${(46+32*Math.sin(r)).toFixed(1)}" stroke-width="7"/>`; }).join('');
      return `<div style="display:flex;flex-direction:column;align-items:center;--stroke:${p.accent}" class="tech">`
      +`<svg width="92" height="92" viewBox="0 0 92 92" fill="none" stroke="var(--stroke)">${teeth}`
      +`<circle cx="46" cy="46" r="20" stroke-width="4"/><circle cx="46" cy="46" r="6" fill="var(--stroke)" stroke="none"/></svg>`
      +`${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>`; } },
};
