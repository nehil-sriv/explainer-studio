/** finance components — extracted verbatim from index.html REGISTRY. */
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

export const financeComponents: Record<string, ComponentDef> = {
  candles:{ name:'FIN · candlestick chart',
    group:'finance',
    help:'one per line: label|open|high|low|close · green/red by close vs open',
    props:{label:'NIFTY 50 · daily', data:'M|100|112|98|110\nT|110|118|105|116\nW|116|120|108|112\nT|112|125|110|122\nF|122|130|118|128', upAccent:'var(--mkt-up)', downAccent:'var(--mkt-down)'},
    fields:['label','data','upAccent','downAccent'], fieldTypes:{data:'textarea'},
    markup:p=>{
      const rows=String(p.data||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
        const c=l.split('|').map(s=>s.trim());
        const f=i=>{ const v=parseFloat(c[i]); return isFinite(v)?v:NaN; };
        return {lab:c[0]||'', o:f(1), h:f(2), l:f(3), c:f(4)};
      }).filter(r=>isFinite(r.o)&&isFinite(r.h)&&isFinite(r.l)&&isFinite(r.c));
      if(!rows.length) return '<b>needs rows: label|open|high|low|close</b>';
      const W=620,H=300,PT=16,PB=30,PL=8,PR=54;
      let lo=Math.min(...rows.map(r=>r.l)), hi=Math.max(...rows.map(r=>r.h));
      if(!(hi>lo)){ hi=lo+1; }
      const X=i=>rows.length>1?PL+i*(W-PL-PR)/(rows.length-1):PL+(W-PL-PR)/2;
      const Y=v=>PT+(1-(v-lo)/(hi-lo))*(H-PT-PB);
      const up=liveHex(p.upAccent), dn=liveHex(p.downAccent), flat=liveHex('var(--text-dim)');
      const plotW=rows.length>1?(W-PL-PR)/rows.length:(W-PL-PR);
      const cw=Math.max(8,Math.min(46,plotW*0.55));
      const body=rows.map((r,i)=>{ const x=X(i), col=r.c>r.o?up:(r.c<r.o?dn:flat);
        const top=Math.min(Y(r.o),Y(r.c)), hgt=Math.max(2,Math.abs(Y(r.c)-Y(r.o)));
        return `<line x1="${x.toFixed(1)}" y1="${Y(r.h).toFixed(1)}" x2="${x.toFixed(1)}" y2="${Y(r.l).toFixed(1)}" stroke="${col}" stroke-width="2.5"/><rect x="${(x-cw/2).toFixed(1)}" y="${top.toFixed(1)}" width="${cw.toFixed(1)}" height="${hgt.toFixed(1)}" fill="${col}"/>`; }).join('');
      const labs=rows.map((r,i)=>`<text x="${X(i).toFixed(1)}" y="${H-8}" text-anchor="middle">${escXml(r.lab)}</text>`).join('');
      return `<div class="tk-candles">${p.label?`<div class="clbl">${rich(p.label)}</div>`:''}<svg width="${W}" height="${H}">${body}${labs}<text x="${W-4}" y="${(Y(hi)+4).toFixed(1)}" text-anchor="end">${hi}</text><text x="${W-4}" y="${(Y(lo)+4).toFixed(1)}" text-anchor="end">${lo}</text></svg></div>`; } },
  stquote:{ name:'FIN · price quote card',
    group:'finance',
    help:'symbol + price + day change — the badge follows the sign automatically',
    props:{sym:'RELIANCE', name:'Reliance Industries', price:'2,984.50', chg:'+1.8', upAccent:'var(--mkt-up)', downAccent:'var(--mkt-down)'},
    fields:['sym','name','price','chg','upAccent','downAccent'],
    markup:p=>{ const v=parseFloat(String(p.chg).replace('%',''));
      const fin=isFinite(v), neg=fin?v<0:String(p.chg||'').trim().startsWith('-'), flat=fin&&v===0;
      const side=flat?'var(--text-dim)':(neg?p.downAccent:p.upAccent);
      const mag=fin?Math.abs(v).toFixed(1):String(p.chg||'').replace(/^[+-]/,'').trim();
      return `<div class="tk-quote" style="--side:${side}"><div class="q-top"><span class="q-sym">${rich(p.sym)}</span><span class="q-name">${rich(p.name)}</span></div><div class="q-price">${rich(p.price)}</div>${String(p.chg).trim()?`<span class="q-chg">${flat?'—':(neg?'▼':'▲')} ${mag}%</span>`:''}</div>`; } },
  ticker:{ name:'FIN · ticker tape',
    group:'finance',
    help:'one per line: SYM|+1.8 · sign colors it · loops forever, records as motion',
    props:{items:'RELIANCE|+1.8\nTCS|-0.6\nHDFCBANK|+0.4\nINFY|+2.2\nSBIN|-1.1', speed:22, upAccent:'var(--mkt-up)', downAccent:'var(--mkt-down)'},
    fields:['items','speed','upAccent','downAccent'], fieldTypes:{items:'textarea', speed:'number'},
    markup:p=>{ const rows=String(p.items||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
        const i=l.indexOf('|'); const s=(i<0?l:l.slice(0,i)).trim();
        const v=parseFloat(i<0?'0':l.slice(i+1)); return [s, isFinite(v)?v:0]; });
      if(!rows.length) return '<b>needs rows: SYM|chg</b>';
      const half=rows.map(([s,v])=>{ const neg=v<0, flat=v===0;
        const side=flat?'var(--text-dim)':(neg?p.downAccent:p.upAccent);
        return `<span class="tk-tick" style="--side:${side}"><b>${rich(s)}</b><i>${flat?'—':(neg?'▼':'▲')+' '+Math.abs(v).toFixed(1)+'%'}</i></span>`; }).join('<span class="tk-sep">•</span>');
      const dur=Math.max(4,Math.min(120,+p.speed||22));
      return `<div class="tk-ticker"><div class="tk-ticker-track" style="--dur:${dur}s">${half}<span class="tk-sep">•</span>${half}<span class="tk-sep">•</span></div></div>`; } },
  waterfall:{ name:'FIN · waterfall bridge',
    group:'finance',
    help:'start value + signed deltas, one per line: label|+40 · totals use accent',
    props:{label:'Q3 P&L bridge (₹ Cr)', start:'120', startLabel:'Q2', rows:'Sales|+40\nCosts|-18\nTax|-6', endLabel:'Q3', upAccent:'var(--mkt-up)', downAccent:'var(--mkt-down)', accent:'var(--amber)'},
    fields:['label','start','startLabel','rows','endLabel','upAccent','downAccent','accent'], fieldTypes:{rows:'textarea'},
    markup:p=>{ const s0=parseFloat(p.start)||0;
      const ds=String(p.rows||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
        const i=l.lastIndexOf('|'); if(i<=0) return null;
        return {lab:l.slice(0,i).trim()||'?', d:parseFloat(l.slice(i+1))||0}; }).filter(Boolean);
      if(!ds.length) return '<b>needs rows: label|delta</b>';
      let cum=s0; const segs=[{lab:p.startLabel||'start', a:0, b:s0, total:true}];
      ds.forEach(r=>{ const a=cum; cum+=r.d; segs.push({lab:r.lab, a, b:cum}); });
      segs.push({lab:p.endLabel||'end', a:0, b:cum, total:true, end:true});
      const W=640,H=300,PT=22,PB=32,PL=8,PR=56;
      const lo=Math.min(0,...segs.map(g=>Math.min(g.a,g.b))), hi=Math.max(0,...segs.map(g=>Math.max(g.a,g.b)));
      const span=(hi>lo)?hi-lo:1;
      const X=i=>PL+i*(W-PL-PR)/segs.length, bw=(W-PL-PR)/segs.length;
      const Y=v=>PT+(1-(v-lo)/span)*(H-PT-PB);
      const up=liveHex(p.upAccent), dn=liveHex(p.downAccent), tot=liveHex(p.accent);
      const bwpx=Math.max(14,bw*0.6);
      let out='';
      segs.forEach((g,i)=>{ const x=X(i)+(bw-bwpx)/2;
        const col=g.total?(g.end?(g.b>=s0?up:dn):tot):(g.b>g.a?up:(g.b<g.a?dn:liveHex('var(--text-dim)')));
        const top=Math.min(Y(g.a),Y(g.b)), hgt=Math.max(2,Math.abs(Y(g.b)-Y(g.a)));
        out+=`<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${bwpx.toFixed(1)}" height="${hgt.toFixed(1)}" fill="${col}"/>`;
        out+=`<text x="${(X(i)+bw/2).toFixed(1)}" y="${(top-6).toFixed(1)}" text-anchor="middle">${escXml((g.b>=0?'+':'')+(Math.round(g.b*100)/100))}</text>`;
        out+=`<text x="${(X(i)+bw/2).toFixed(1)}" y="${H-8}" text-anchor="middle">${escXml(g.lab)}</text>`;
        if(i<segs.length-1){ const lvl=g.b;
          out+=`<line x1="${(X(i)+bw-2).toFixed(1)}" y1="${Y(lvl).toFixed(1)}" x2="${(X(i+1)+2).toFixed(1)}" y2="${Y(lvl).toFixed(1)}" stroke="var(--text-dim)" stroke-width="1.5" stroke-dasharray="5 4" opacity=".6"/>`; } });
      return `<div class="tk-waterfall">${p.label?`<div class="clbl">${rich(p.label)}</div>`:''}<svg width="${W}" height="${H}">${out}</svg></div>`; } },
  allocdonut:{ name:'FIN · allocation donut',
    group:'finance',
    help:'one per line: label|pct — add |var(--amber) to pin a slice color, else theme roles cycle',
    props:{label:'Portfolio', center:'100%', rows:'Equity|55|\nDebt|25|\nGold|12|\nCash|8|', d:240},
    fields:['label','center','rows','d'], fieldTypes:{rows:'textarea', d:'number'},
    markup:p=>{ const PAL=['var(--phos-green)','var(--cyan-dim)','var(--amber)','var(--alert-red)','var(--text-primary)','var(--text-dim)'];
      const rows=String(p.rows||'').split('\n').map(l=>l.trim()).filter(Boolean).map((l,i)=>{
        const c=l.split('|').map(s=>s.trim());
        let v=parseFloat(c[1]); v=isFinite(v)&&v>0?v:0;
        return {lab:c[0]||('slice '+(i+1)), v, col:c[2]||PAL[i%PAL.length]}; });
      const sum=rows.reduce((a,r)=>a+r.v,0);
      if(sum<=0) return '<b>needs rows: label|pct</b>';
      const R=84, C=2*Math.PI*R, D=Math.max(120,+p.d||240);
      let acc=0;
      const segs=rows.map(r=>{ const frac=r.v/sum, len=frac*C, off=-acc*C; acc+=frac;
        return `<circle cx="100" cy="100" r="${R}" fill="none" style="stroke:${r.col}" stroke-width="30" stroke-dasharray="${len.toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>`; }).join('');
      const leg=rows.map(r=>`<div class="al-row"><span class="al-sw" style="background:${r.col}"></span><span class="al-lab">${rich(r.lab)}</span><span class="al-pct">${Math.round(r.v/sum*100)}%</span></div>`).join('');
      return `<div class="tk-alloc">${p.label?`<div class="clbl">${rich(p.label)}</div>`:''}<div class="al-main"><div class="al-ring" style="width:${D}px;height:${D}px"><svg viewBox="0 0 200 200" width="${D}" height="${D}"><g transform="rotate(-90 100 100)">${segs}</g></svg><span class="al-center">${rich(p.center)}</span></div><div class="al-legend">${leg}</div></div></div>`; } },
  sipcalc:{ name:'FIN · SIP growth projector',
    group:'finance',
    help:'monthly × return% × years — invested vs gains bars + totals · reveal unfolds the chart from a direction · tick stepped to grow year by year',
    props:{label:'SIP · ₹10k/mo @ 12% × 10y', monthly:10000, rate:12, years:10, ccy:'₹', stepped:false, labelAuto:true, reveal:'down', accent:'var(--mkt-up)'},
    fields:['label','monthly','rate','years','ccy','stepped','reveal','accent'], fieldTypes:{monthly:'number', rate:'number', years:'number', stepped:'check', reveal:'select'},
    options:{reveal:['none','left','right','up','down']},
    markup:p=>{ const M=Math.max(0,+p.monthly||0), ar=Math.max(0,+p.rate||0), Y=Math.max(1,Math.min(40,Math.round(+p.years||10)));
      const r=ar/1200, fv=n=>r>0?M*((Math.pow(1+r,n)-1)/r)*(1+r):M*n;
      const yrs=[]; for(let y=1;y<=Y;y++){ const n=12*y, inv=M*n, tot=fv(n); yrs.push({inv, gain:Math.max(0,tot-inv)}); }
      const maxV=Math.max(...yrs.map(y=>y.inv+y.gain),1);
      const last=yrs[yrs.length-1];
      const bars=yrs.map(y=>{ const h=Math.max(2.5,(y.inv+y.gain)/maxV*100);
        const gp=y.inv+y.gain>0?(y.gain/(y.inv+y.gain)*100).toFixed(1):0;
        return `<div class="cline sip-bar" style="height:${h.toFixed(1)}%"><span class="sip-g" style="height:${gp}%"></span><span class="sip-i" style="height:${(100-gp).toFixed(1)}%"></span></div>`; }).join('');
      return `<div class="tk-sip" style="--stroke:${p.accent}">${p.label?`<div class="clbl">${rich(p.label)}</div>`:''}<div class="sip-bars">${bars}</div><div class="sip-sum"><div><span><i class="sw-inv"></i>invested</span><b>${fmtMoney(last.inv,p.ccy)}</b></div><div><span><i class="sw-g"></i>gains</span><b>${fmtMoney(last.gain,p.ccy)}</b></div><div><span>total</span><b>${fmtMoney(last.inv+last.gain,p.ccy)}</b></div></div></div>`; } },
  riskdial:{ name:'FIN · fear & greed dial',
    group:'finance',
    help:'0–100 sentiment dial with five zones',
    props:{label:'Fear & Greed', value:62},
    fields:['label','value'], fieldTypes:{value:'number'},
    markup:p=>{ const v=Math.max(0,Math.min(100,+p.value||0));
      const zones=[[0,25,'Extreme Fear','var(--mkt-down)'],[25,45,'Fear','var(--amber)'],[45,55,'Neutral','var(--text-dim)'],[55,75,'Greed','color-mix(in srgb, var(--mkt-up) 55%, var(--amber))'],[75,101,'Extreme Greed','var(--mkt-up)']];
      const zone=zones.find(z=>v>=z[0]&&v<z[1])||zones[2];
      const cx=180, cy=180, R=140;
      const pt=a=>{ const t=a*Math.PI/180; return [cx+R*Math.cos(t), cy-R*Math.sin(t)]; };
      const arcs=zones.map(z=>{ const [x0,y0]=pt(180-(z[0]/100)*180), [x1,y1]=pt(180-(Math.min(100,z[1])/100)*180);
        return `<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" style="stroke:${z[3]}" stroke-width="26" opacity=".85"/>`; }).join('');
      const na=(180-(v/100)*180)*Math.PI/180, nx=cx+(R-44)*Math.cos(na), ny=cy-(R-44)*Math.sin(na);
      return `<div class="tk-dial">${p.label?`<div class="clbl">${rich(p.label)}</div>`:''}<svg width="360" height="200" viewBox="0 0 360 200">${arcs}<line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="${liveHex('var(--text-primary)')}" stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="10" fill="${liveHex('var(--text-primary)')}"/><text x="34" y="196">0</text><text x="318" y="196">100</text></svg><div class="dial-val">${Math.round(v)}</div><div class="dial-zone" style="color:${zone[3]}">${zone[2]}</div></div>`; } },
  disclaimer:{ name:'FIN · disclaimer strip',
    group:'finance',
    help:'not-financial-advice interstitial',
    props:{text:'Not financial advice. Educational content only — do your own research.', accent:'var(--amber)'},
    fields:['text','accent'], fieldTypes:{text:'textarea'},
    markup:p=>`<div class="tk-disc" style="--stroke:${p.accent}"><span class="d-ico">⚠</span><span class="d-txt">${rich(p.text)}</span></div>` },
  earnings:{ name:'FIN · earnings calendar',
    group:'finance',
    help:'one per line: date|SYM|event|note',
    props:{title:'Earnings this week', rows:'12 Feb|RELIANCE|Q3 results|EPS ₹19.2\n14 Feb|TCS|Q3 results|EPS ₹12.8', accent:'var(--amber)'},
    fields:['title','rows','accent'], fieldTypes:{rows:'textarea'},
    markup:p=>{ const rows=String(p.rows||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
        const c=l.split('|').map(s=>s.trim()); return {d:c[0]||'', s:c[1]||'', e:c[2]||'', n:c[3]||''}; });
      if(!rows.length) return '<b>needs rows: date|SYM|event|note</b>';
      return `<div class="tk-earn" style="--stroke:${p.accent}">${p.title?`<div class="tltitle">${rich(p.title)}</div>`:''}${rows.map(r=>`<div class="er-row"><span class="er-date">${rich(r.d)}</span><span class="er-sym">${rich(r.s)}</span><span class="er-ev">${rich(r.e)}</span><span class="er-note">${rich(r.n)}</span></div>`).join('')}</div>`; } },
  heatgrid:{ name:'FIN · market heat tiles',
    group:'finance',
    help:'one per line: SYM|+1.8 · tile heat follows magnitude',
    props:{label:'Movers', rows:'RELIANCE|+1.8\nTCS|-0.6\nHDFC|+2.4\nINFY|+0.3\nSBIN|-2.1', upAccent:'var(--mkt-up)', downAccent:'var(--mkt-down)'},
    fields:['label','rows','upAccent','downAccent'], fieldTypes:{rows:'textarea'},
    markup:p=>{ const rows=String(p.rows||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
        const i=l.indexOf('|'); const s=(i<0?l:l.slice(0,i)).trim();
        const v=parseFloat(i<0?'0':l.slice(i+1)); const vv=isFinite(v)?v:0;
        return {s, v:vv}; });
      if(!rows.length) return '<b>needs rows: SYM|chg</b>';
      const tiles=rows.map(r=>{ const neg=r.v<0, flat=r.v===0;
        const side=flat?'var(--text-dim)':(neg?p.downAccent:p.upAccent);
        const heat=flat?10:Math.round(12+Math.min(1,Math.abs(r.v)/4)*58);
        const txt=flat?'— 0.0%':(neg?'▼ ':'▲ ')+Math.abs(r.v).toFixed(1)+'%';
        return `<div class="heat-tile" style="--side:${side};background:color-mix(in srgb, ${side} ${heat}%, transparent)"><b>${rich(r.s)}</b><i>${txt}</i></div>`; }).join('');
      return `<div class="tk-heat">${p.label?`<div class="clbl">${rich(p.label)}</div>`:''}<div class="heat-grid">${tiles}</div></div>`; } },
  emicalc:{ name:'FIN · EMI snapshot',
    group:'finance',
    help:'principal × rate% × years — EMI/mo + principal-vs-interest ring',
    props:{label:'Home loan · 20y @ 9%', principal:5000000, rate:9, years:20, ccy:'₹'},
    fields:['label','principal','rate','years','ccy'], fieldTypes:{principal:'number', rate:'number', years:'number'},
    markup:p=>{ const P=Math.max(0,+p.principal||0), ar=Math.max(0,+p.rate||0), Y=Math.max(1,Math.min(50,Math.round(+p.years||20)));
      const r=ar/1200, n=Y*12, pw=Math.pow(1+r,n);
      const emi=r>0?P*r*pw/(pw-1):P/n, total=emi*n, intr=Math.max(0,total-P);
      const pp=total>0?(P/total*100):100;
      return `<div class="tk-emi">${p.label?`<div class="clbl">${rich(p.label)}</div>`:''}<div class="emi-flex"><div class="emi-ring" style="background:conic-gradient(var(--cyan-dim) ${pp.toFixed(1)}%, var(--amber) 0)"><span class="emi-center"><b>${fmtMoney(emi,p.ccy)}</b><i>/mo</i></span></div><div class="emi-nums"><div><span>principal</span><b>${fmtMoney(P,p.ccy)}</b></div><div><span>interest</span><b>${fmtMoney(intr,p.ccy)}</b></div><div><span>total payable</span><b>${fmtMoney(total,p.ccy)}</b></div></div></div></div>`; } },
};
