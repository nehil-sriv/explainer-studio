/** meta components — extracted verbatim from index.html REGISTRY. */
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

export const metaComponents: Record<string, ComponentDef> = {
  hottake:  { name:'Lower third · HOT TAKE',
    group:'meta',
    props:{label:'HOT TAKE', text:"it's grep with a marketing budget"},
    fields:['label','text'],
    markup:p=>`<div class="hot-take"><div class="hot-take-tab">${p.label}</div><div class="hot-take-text">${p.text}<span class="cursor is-on"></span></div></div>` },
  toast:    { name:'Error toast',
    group:'meta',
    props:{text:'confidence 0.97 · sources read: none ⚠'},
    fields:['text'],
    markup:p=>`<div class="toast-error"><b>ERROR:</b> ${p.text}</div>` },
  info:     { name:'Info note',
    group:'meta',
    props:{text:'cache hit rate 98% — no action needed', accent:'var(--cyan-dim)'},
    fields:['text','accent'], fieldTypes:{text:'textarea'},
    markup:p=>`<div class="toast-error" style="border-left-color:${p.accent}"><b style="color:${p.accent}">INFO:</b> ${rich(p.text)}</div>` },
  alert:    { name:'Warning banner',
    group:'meta',
    props:{text:'disk 90% full — scale soon', accent:'var(--amber)'},
    fields:['text','accent'], fieldTypes:{text:'textarea'},
    markup:p=>`<div class="toast-error" style="border-left-color:${p.accent}"><b style="color:${p.accent}">WARN:</b> ${rich(p.text)}</div>` },
  success:  { name:'Success note',
    group:'meta',
    props:{text:'deploy finished in 41s — all green', accent:'var(--phos-green)'},
    fields:['text','accent'], fieldTypes:{text:'textarea'},
    markup:p=>`<div class="toast-error" style="border-left-color:${p.accent}"><b style="color:${p.accent}">OK:</b> ${rich(p.text)}</div>` },
  popup:    { name:'Popup dialog',
    group:'meta',
    help:'title + message + two buttons — a modal moment in the story',
    props:{title:'Delete cluster?', body:'this cannot be undone', ok:'Delete', cancel:'Keep', accent:'var(--phos-green)'},
    fields:['title','body','ok','cancel','accent'], fieldTypes:{body:'textarea'},
    markup:p=>`<div class="term glow" style="width:640px">`
      +`<div class="term-bar"><span class="dot dot-r"></span><span class="dot dot-a"></span><span class="dot dot-g"></span><span class="term-title">${rich(p.title)}</span></div>`
      +`<div class="term-body"><div class="tline">${rich(p.body)}</div>`
      +`<div class="tline" style="display:flex;gap:14px;margin-top:14px"><span style="border:1px solid ${p.accent};border-radius:8px;padding:6px 22px">${rich(p.ok)}</span><span style="opacity:.65;border:1px solid var(--line-dim);border-radius:8px;padding:6px 22px">${rich(p.cancel)}</span></div></div></div>` },
  lower3rd: { name:'Lower third',
    group:'meta',
    help:'name plate for speakers — tab + role line, pinned low like a broadcast bug',
    props:{name:'Ada Lovelace', role:'first programmer', accent:'var(--phos-green)'},
    fields:['name','role','accent'],
    markup:p=>`<div class="hot-take" style="--ca:${p.accent}"><div class="hot-take-tab">${rich(p.name)}</div><div class="hot-take-text">${rich(p.role)}</div></div>` },
  quote:    { name:'Quote',
    group:'meta',
    help:'testimonial or pull-quote with attribution',
    props:{text:'premature optimization is the root of all evil', who:'Knuth (allegedly)', accent:'var(--phos-green)'},
    fields:['text','who','accent'], fieldTypes:{text:'textarea'},
    markup:p=>`<div style="border-left:4px solid ${p.accent};padding:6px 0 6px 26px;max-width:820px"><div style="font-size:calc(44px*var(--fscale,1));color:${p.accent};line-height:1">“</div><div style="font-family:var(--font-hand);font-size:calc(36px*var(--fscale,1));color:var(--ct,var(--text-primary));line-height:1.25">${rich(p.text)}</div><div style="margin-top:10px;font-size:calc(20px*var(--fscale,1));color:var(--text-dim)">— ${rich(p.who)}</div></div>` },
  duo:      { name:'Duo · side-by-side cards',
    group:'meta',
    help:'two cards: chip pill + head + quote + body each · tick stepped to reveal left, then right',
    props:{chipL:'Top-k', colorL:'var(--alert-red)', headL:'Fixed headcount', quoteL:'"Always let exactly k words into the room."', bodyL:'Simple and predictable, but blind to context — same cutoff whether the model is very sure or very unsure.',
           chipR:'Top-p', colorR:'var(--phos-green)', headR:'Fixed confidence', quoteR:'"Let in however many words it takes to reach 85% sure."', bodyR:'Adapts automatically: fewer words when the model is confident, more words when it is unsure.', stepped:false},
    fields:['chipL','colorL','headL','quoteL','bodyL','chipR','colorR','headR','quoteR','bodyR','stepped'],
    fieldTypes:{quoteL:'textarea',bodyL:'textarea',quoteR:'textarea',bodyR:'textarea',stepped:'check'},
    markup:p=>{
      const card=(chip,color,head,quote,body)=>`<div class="cline duo-card">`
        +`<span class="duo-chip" style="--cc:${color}">${rich(chip)}</span>`
        +`<div class="duo-head">${rich(head)}</div>`
        +(String(quote||'').trim()?`<div class="duo-quote">${rich(quote)}</div>`:'')
        +`<div class="duo-body">${rich(body)}</div></div>`;
      return `<div class="tk-duo">${card(p.chipL,p.colorL,p.headL,p.quoteL,p.bodyL)}${card(p.chipR,p.colorR,p.headR,p.quoteR,p.bodyR)}</div>`} },
  versus:   { name:'VS · claim vs counter-claim',
    group:'meta',
    help:'two sides, one winner pending — title frames the debate',
    props:{title:'Tabs vs Spaces', left:'fewer files to juggle', right:'fewer brackets to count', accent:'var(--phos-green)'},
    fields:['title','left','right','accent'], fieldTypes:{left:'textarea',right:'textarea'},
    markup:p=>`<div style="max-width:1000px;text-align:center">`
      +(p.title?`<div style="font-size:calc(34px*var(--fscale,1));font-weight:700;color:var(--ct,var(--text-primary));margin-bottom:14px">${rich(p.title)}</div>`:'')
      +`<div style="display:flex;gap:16px;align-items:stretch;text-align:left">`
      +`<div style="flex:1;border:1px solid var(--line-dim);border-radius:12px;padding:18px 22px;font-size:calc(24px*var(--fscale,1));color:var(--ct,var(--text-primary))">${rich(p.left)}</div>`
      +`<div style="align-self:center;flex:none;width:58px;height:58px;border-radius:50%;border:2px solid ${p.accent};display:grid;place-items:center;font-weight:700;font-size:calc(20px*var(--fscale,1));color:${p.accent}">VS</div>`
      +`<div style="flex:1;border:1px solid var(--line-dim);border-radius:12px;padding:18px 22px;font-size:calc(24px*var(--fscale,1));color:var(--ct,var(--text-primary))">${rich(p.right)}</div>`
      +`</div></div>` },
  myth:     { name:'Myth vs reality',
    group:'meta',
    help:'crossed-out myth on top, reality below in green',
    props:{myth:'more servers = more reliable', reality:'more servers = more ways to fail', accent:'var(--phos-green)'},
    fields:['myth','reality','accent'], fieldTypes:{myth:'textarea',reality:'textarea'},
    markup:p=>`<div style="max-width:900px;display:flex;flex-direction:column;gap:14px;font-size:calc(26px*var(--fscale,1))">`
      +`<div style="display:flex;gap:14px;align-items:baseline"><span style="flex:none;font-weight:700;color:var(--alert-red)">✗ MYTH</span><s style="opacity:.7;color:var(--ct,var(--text-primary))">${rich(p.myth)}</s></div>`
      +`<div style="display:flex;gap:14px;align-items:baseline"><span style="flex:none;font-weight:700;color:${p.accent}">✓ REALITY</span><span style="color:var(--ct,var(--text-primary))">${rich(p.reality)}</span></div>`
      +`</div>` },
  proscons: { name:'Pros and cons',
    group:'meta',
    help:'one per line (or | separated) on each side',
    props:{title:'Should we ship Friday?', pro:'small diff|easy rollback', con:'tired reviewers|no cover on weekend', accent:'var(--phos-green)'},
    fields:['title','pro','con','accent'], fieldTypes:{pro:'textarea',con:'textarea'},
    markup:p=>{ const side=t=>String(t||'').split('\n').flatMap(l=>l.split('|')).map(s=>s.trim()).filter(Boolean);
      const col=(items,mark,mc)=>items.map(t=>`<div style="display:flex;gap:10px;margin-top:8px"><span style="color:${mc};font-weight:700">${mark}</span><span>${rich(t)}</span></div>`).join('');
      return `<div style="max-width:1000px;text-align:center">`
      +(p.title?`<div style="font-size:calc(32px*var(--fscale,1));font-weight:700;color:var(--ct,var(--text-primary));margin-bottom:12px">${rich(p.title)}</div>`:'')
      +`<div style="display:flex;gap:16px;text-align:left;font-size:calc(23px*var(--fscale,1));color:var(--ct,var(--text-primary))">`
      +`<div style="flex:1;border:1px solid var(--line-dim);border-radius:12px;padding:16px 20px"><div style="font-weight:700;color:${p.accent};letter-spacing:2px">PROS</div>${col(side(p.pro),'✓',p.accent)}</div>`
      +`<div style="flex:1;border:1px solid var(--line-dim);border-radius:12px;padding:16px 20px"><div style="font-weight:700;color:var(--alert-red);letter-spacing:2px">CONS</div>${col(side(p.con),'✗','var(--alert-red)')}</div>`
      +`</div></div>`; } },
  matrix:   { name:'Decision matrix',
    group:'meta',
    help:'one criterion per line as crit | left | right — ✓/✗ cells tint themselves',
    props:{title:'Pick a queue', left:'Kafka', right:'SQS', rows:'ops burden|high|none\ncost at scale|low|high\nordering|exact|best-effort', accent:'var(--phos-green)'},
    fields:['title','left','right','rows','accent'], fieldTypes:{rows:'textarea'},
    markup:p=>{ const cell=t=>{ const v=String(t||'').trim();
        const good=/^(✓|✔|yes|y|true)$/i.test(v), bad=/^(✗|✘|no|n|false)$/i.test(v);
        return `<span style="${good?`color:${p.accent};font-weight:700`:bad?'color:var(--alert-red);font-weight:700':''}">${rich(v)}</span>`; };
      const rows=String(p.rows||'').split('\n').map(l=>l.trim()).filter(Boolean);
      return `<div style="max-width:1000px;text-align:center">`
      +(p.title?`<div style="font-size:calc(32px*var(--fscale,1));font-weight:700;color:var(--ct,var(--text-primary));margin-bottom:12px">${rich(p.title)}</div>`:'')
      +`<div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px 18px;text-align:left;font-size:calc(22px*var(--fscale,1));color:var(--ct,var(--text-primary));align-items:center">`
      +`<span></span><b style="color:${p.accent}">${rich(p.left)}</b><b style="color:${p.accent}">${rich(p.right)}</b>`
      +rows.map(r=>{ const [c,a,b]=r.split('|'); return `<span style="color:var(--text-dim)">${rich((c||'').trim())}</span><span>${cell(a)}</span><span>${cell(b)}</span>`; }).join('')
      +`</div></div>`; } },
  tiers:    { name:'Tier list',
    group:'meta',
    help:'S/A/B/C rows — items separated by | or new lines',
    props:{title:'Message queues', s:'Kafka', a:'NATS | SQS', b:'RabbitMQ', c:'in-house DIY', accent:'var(--phos-green)'},
    fields:['title','s','a','b','c','accent'], fieldTypes:{s:'textarea',a:'textarea',b:'textarea',c:'textarea'},
    markup:p=>{ const items=t=>String(t||'').split('\n').flatMap(l=>l.split('|')).map(s=>s.trim()).filter(Boolean);
      const tier=(L,col,v)=>{ const it=items(v); if(!it.length) return '';
        return `<div style="display:flex;gap:14px;align-items:center;margin-top:10px"><span style="flex:none;width:52px;height:52px;border-radius:10px;display:grid;place-items:center;font-weight:700;font-size:calc(26px*var(--fscale,1));color:var(--bg-deep);background:${col}">${L}</span><span style="font-size:calc(24px*var(--fscale,1));color:var(--ct,var(--text-primary))">${it.map(rich).join(' · ')}</span></div>`; };
      return `<div style="max-width:1000px;text-align:center">`
      +(p.title?`<div style="font-size:calc(32px*var(--fscale,1));font-weight:700;color:var(--ct,var(--text-primary));margin-bottom:6px">${rich(p.title)}</div>`:'')
      +tier('S','var(--amber)',p.s)+tier('A',p.accent,p.a)+tier('B','var(--cyan-dim)',p.b)+tier('C','var(--text-dim)',p.c)
      +`</div>`; } },
  quotecard:{ name:'Quote card',
    group:'meta',
    help:'framed pull-quote — bolder sibling of Quote',
    props:{text:'the network is neither fast nor reliable — plan like it', who:'every on-call engineer', role:'3am wisdom', accent:'var(--phos-green)'},
    fields:['text','who','role','accent'], fieldTypes:{text:'textarea'},
    markup:p=>`<div style="max-width:860px;text-align:center;border:1px solid var(--line-dim);border-top:5px solid ${p.accent};border-radius:16px;padding:34px 48px;background:var(--cbg,var(--panel))">`
      +`<div style="font-family:var(--font-display);font-size:calc(38px*var(--fscale,1));color:var(--ct,var(--text-primary));line-height:1.35">“${rich(p.text)}”</div>`
      +`<div style="margin-top:16px;font-size:calc(22px*var(--fscale,1));color:var(--text-dim)">— ${rich(p.who)}${p.role?`, ${rich(p.role)}`:''}</div></div>` },
  beforeafter:{ name:'Before / after',
    group:'meta',
    help:'dim past on the left, accent future on the right',
    props:{before:'deploy Friday\npray', after:'deploy daily\nsleep', blabel:'BEFORE', alabel:'AFTER', accent:'var(--phos-green)'},
    fields:['before','after','blabel','alabel','accent'], fieldTypes:{before:'textarea',after:'textarea'},
    markup:p=>{ const lines=t=>String(t||'').split('\n').map(s=>s.trim()).filter(Boolean).map(l=>`<div>${rich(l)}</div>`).join('');
      return `<div style="display:flex;gap:18px;align-items:stretch;max-width:1100px">`
      +`<div style="flex:1;border:1px solid var(--line-dim);border-radius:12px;padding:20px 26px;opacity:.6"><div style="font-size:calc(18px*var(--fscale,1));letter-spacing:3px;color:var(--text-dim);margin-bottom:10px">${rich(p.blabel)}</div><div style="font-size:calc(26px*var(--fscale,1));color:var(--ct,var(--text-primary))">${lines(p.before)}</div></div>`
      +`<div style="align-self:center;font-size:calc(44px*var(--fscale,1));color:${p.accent}">→</div>`
      +`<div style="flex:1;border:2px solid ${p.accent};border-radius:12px;padding:20px 26px"><div style="font-size:calc(18px*var(--fscale,1));letter-spacing:3px;color:${p.accent};margin-bottom:10px">${rich(p.alabel)}</div><div style="font-size:calc(26px*var(--fscale,1));color:var(--ct,var(--text-primary))">${lines(p.after)}</div></div>`
      +`</div>`; } },
  blame:    { name:'git blame tag',
    group:'meta',
    props:{who:'<rahul@management>', msg:'just a small change'},
    fields:['who','msg'],
    markup:p=>`<div class="blame"><span class="who">&lt;${p.who.replace(/^<|>$/g,'')}&gt;</span> <span class="msg">"${p.msg}"</span></div>` },
  comment:  { name:'Code-comment bar',
    group:'meta',
    props:{text:'// hot take incoming'},
    fields:['text'],
    markup:p=>`<div class="code-comment">${p.text}</div>` },
  stamp:    { name:'Stamp',
    group:'meta',
    props:{text:'NOT APPROVED'},
    fields:['text'],
    markup:p=>`<div class="stamp">${p.text}</div>` },
  sticky:   { name:'Sticky note',
    group:'meta',
    props:{text:'TODO:<br>read the docs ← nah', rot:-3},
    fields:['text','rot'], fieldTypes:{text:'textarea', rot:'number'},
    markup:p=>`<div class="sticky-note" style="--rot:${p.rot}deg">${p.text}</div>` },
  box:      { name:'Box (border+fill)',
    group:'meta',
    props:{text:'TRANSLATION:<br>chunk docs → pray', accent:'var(--phos-green)', fill:true, alert:false},
    fields:['text','accent','fill','alert'], fieldTypes:{text:'textarea', fill:'check', alert:'check'},
    markup:p=>`<div class="${p.fill?'box-fill':'box-border'}${p.alert?' box-alert':''}"${p.color?'':` style="--stroke:${p.accent}; --boxbg:${['#FFB000','var(--amber)'].includes(p.accent)?'var(--fill-amber)':(['#FF5555','var(--alert-red)'].includes(p.accent)?'var(--fill-red)':'var(--fill-green)')}"`}>${p.text}</div>` },
  progress: { name:'Progress bar',
    group:'meta',
    props:{pct:64, stall:false},
    fields:['pct','stall'], fieldTypes:{pct:'number', stall:'check'},
    markup:p=>{
      const pct=Math.max(0,Math.min(100,+p.pct||0));
      const total=10, filled=Math.round(total*pct/100);
      return `<div class="progress${p.stall?' stall':''}">
        <span class="bar-fill">${'▓'.repeat(filled)}</span><span class="bar-rest">${'░'.repeat(total-filled)}</span> ${pct}%
      </div>`; } },
  rec:      { name:'REC indicator',
    group:'meta',
    props:{}, fields:[],
    markup:()=>`<span class="rec">REC</span>` },
  diff:     { name:'Diff pair',
    group:'meta',
    props:{bad:'microservices for everything', good:'one boring process'},
    fields:['bad','good'],
    markup:p=>`<div class="diff"><div class="diff-del">− ${p.bad}</div><div class="diff-add">+ ${p.good}</div></div>` },
  arrow:    { name:'Arrow (annotation)',
    group:'meta',
    props:{accent:'var(--phos-green)', w:220, thick:false},
    fields:['accent','w','thick'], fieldTypes:{w:'number', thick:'check'},
    markup:p=>`<span class="annot glow" style="color:${p.color||p.accent||'var(--phos-green)'}"><svg width="${p.w}" viewBox="0 0 200 60"><line x1="8" y1="30" x2="172" y2="30" stroke="currentColor" stroke-width="${p.thick?10:6}"/><polygon points="188,30 158,15 158,45" fill="currentColor"/></svg></span>` },
  circle:   { name:'Hand-drawn circle',
    group:'meta',
    props:{accent:'var(--amber)', s:300},
    fields:['accent','s'], fieldTypes:{s:'number'},
    markup:p=>`<span class="annot" style="color:${p.color||p.accent||'var(--phos-green)'}"><svg width="${p.s}" viewBox="0 0 180 120"><path d="M88 13 C142 14, 171 38, 167 64 C163 95, 118 111, 78 107 C34 103, 11 84, 15 54 C19 27, 55 12, 102 18" fill="none" stroke="currentColor" stroke-width="5"/></svg></span>` },
  verdict:  { name:'✓ / ✗ verdict mark',
    group:'meta',
    props:{kind:'ok', s:260},
    fields:['kind','s'], fieldTypes:{kind:'select', s:'number'}, options:{kind:['ok','bad']},
    markup:p=>p.kind==='ok'
      ? `<span class="annot glow" style="color:${p.color||'var(--phos-green)'}"><svg width="${p.s}" viewBox="0 0 100 100"><polyline points="18,52 40,74 82,26" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`
      : `<span class="annot" style="color:${p.color||'var(--alert-red)'}"><svg width="${p.s}" viewBox="0 0 100 100"><line x1="22" y1="22" x2="78" y2="78" stroke="currentColor" stroke-width="12" stroke-linecap="round"/><line x1="78" y1="22" x2="22" y2="78" stroke="currentColor" stroke-width="12" stroke-linecap="round"/></svg></span>` },
  countbadg:{ name:'Count badge (×N)',
    group:'meta',
    props:{n:'×12', accent:'var(--amber)'},
    fields:['n','accent'],
    markup:p=>`<span class="tech" style="display:inline-block;background:${p.accent};color:var(--ink-on-accent);font-weight:700;font-size:15px;padding:3px 10px;border-radius:99px">${p.n}</span>` },
  callout:  { name:'Callout chip + leader',
    group:'meta',
    props:{text:'this: broken', accent:'var(--phos-green)'},
    fields:['text','accent'],
    markup:p=>`<div class="callout" style="position:relative"><span class="callout-chip"${p.color?'':` style="--cc:${p.accent}"`}>${p.text}</span><span class="callout-line dashed"></span></div>` },
  chip:     { name:'TK · chip (tech tag / protocol)',
    group:'meta',
    props:{text:'k8s', color:'var(--cyan-dim)'},
    fields:['text','color'],
    markup:p=>`<span class="tk-chip"${p.color?` style="--cc:${p.color}"`:''}>${rich(p.text)}</span>` },
  health:   { name:'TK · health dot',
    group:'meta',
    help:'ok = steady green · warn = amber pulse · dead = red flicker (absorbed legacy statdot: size included)',
    props:{status:'ok', label:'UP', size:22},
    fields:['status','label','size'], fieldTypes:{status:'select', size:'number'}, options:{status:['ok','warn','dead']},
    markup:p=>`<span class="tk-health"><span class="hdot ${p.status}" style="width:${+p.size||22}px;height:${+p.size||22}px;"></span>${p.label?`<span>${rich(p.label)}</span>`:''}</span>` },
  gauge:    { name:'TK · fill gauge',
    group:'meta',
    help:'amber sweep toward full — over = overflow flicker. label rides the bar.',
    props:{label:'cache 84%', pct:84, over:false, w:280, accent:'var(--amber)'},
    fields:['label','pct','over','w','accent'], fieldTypes:{pct:'number',over:'check',w:'number'},
    markup:p=>{ const pct=Math.max(0,Math.min(100,+p.pct||0));
      return `<div class="tk-gauge${p.over?' over':''}" style="--stroke:${p.accent};--w:${+p.w||280}px;--pct:${pct}%"><span class="gfill"></span>${p.label?`<span class="gcap">${rich(p.label)}</span>`:''}</div>`; } },
  latency:  { name:'TK · latency marker',
    group:'meta',
    props:{text:'p99 · 420ms', accent:'var(--amber)'},
    fields:['text','accent'],
    markup:p=>`<span class="tk-latency" style="--stroke:${p.accent}">
      <svg width="34" height="40" viewBox="0 0 34 40" fill="none" stroke="var(--stroke)" stroke-width="2.5">
        <rect x="12" y="2" width="10" height="5"/><circle cx="17" cy="23" r="13"/>
        <line x1="17" y1="23" x2="17" y2="13"/><line x1="17" y1="23" x2="24" y2="27"/></svg>
      <span>${rich(p.text)}</span></span>` },
  scale:    { name:'TK · autoscaling',
    group:'meta',
    help:'up = boxes spawn in staggered · down = fade & drop out',
    props:{dir:'up', n:4, accent:'var(--phos-green)'},
    fields:['dir','n','accent'], fieldTypes:{dir:'select',n:'number'}, options:{dir:['up','down']},
    markup:p=>{ const n=Math.max(2,Math.min(6,+p.n||4));
      return `<div class="tk-scale ${p.dir==='down'?'down':'up'}" style="--stroke:${p.accent}">${Array.from({length:n},(_,i)=>`<span class="sb" style="animation-delay:${(i*0.15).toFixed(2)}s"></span>`).join('')}</div>`; } },
  lock:     { name:'TK · locked',
    group:'meta',
    props:{label:'TLS', accent:'var(--phos-green)'},
    fields:['label','accent'],
    markup:p=>`<span class="tk-lock" style="--stroke:${p.accent}">
      <svg width="44" height="52" viewBox="0 0 44 52" fill="none" stroke="var(--stroke)" stroke-width="3.5">
        <rect x="5" y="22" width="34" height="27" fill="var(--fill-green)"/>
        <path d="M12 22 V14 a10 10 0 0 1 20 0 V22"/>
        <circle cx="22" cy="33" r="3.5" fill="var(--stroke)" stroke="none"/><line x1="22" y1="36" x2="22" y2="43"/></svg>
      <span>${rich(p.label)}</span></span>` },
  replicate:{ name:'TK · replication twins',
    group:'meta',
    help:'two cylinders + solid sync / dashed async twin wires',
    props:{label:'', accent:'var(--cyan-dim)'},
    fields:['label','accent'],
    markup:p=>`<div style="display:flex;flex-direction:column;align-items:center">
      <div class="tk-replicate" style="--stroke:${p.accent}">
        ${tkCyl({label:'',sub:'',w:110,h:92,accent:p.accent})}
        <svg width="86" height="46" fill="none" stroke="var(--stroke)">
          <line x1="2" y1="12" x2="72" y2="12" stroke-width="3"/><polygon points="84,12 72,6 72,18" fill="var(--stroke)" stroke="none"/>
          <line x1="84" y1="34" x2="14" y2="34" stroke-width="3" stroke-dasharray="9 7"/><polygon points="2,34 14,28 14,40" fill="var(--stroke)" stroke="none"/>
        </svg>
        ${tkCyl({label:'',sub:'',w:110,h:92,accent:p.accent})}
      </div>${p.label?`<span class="tk-caption">${rich(p.label)}</span>`:''}</div>` },
  plate:    { name:'TK · name plate',
    group:'meta',
    props:{title:'kafka-cluster', sub:'3 brokers · rf=3', accent:'var(--phos-green)'},
    fields:['title','sub','accent'],
    markup:p=>`<span class="tk-plate" style="--cc:${p.accent}"><span class="pt">${rich(p.title)}</span>${p.sub?`<span class="ps">${p.sub}</span>`:''}</span>` },
  region:   { name:'TK · region tag',
    group:'meta',
    props:{text:'us-east-1a', accent:'var(--text-dim)'},
    fields:['text','accent'],
    markup:p=>`<span class="tk-region" style="--stroke:${p.accent}">${rich(p.text)}</span>` },
  warn:     { name:'TK · warning triangle',
    group:'meta',
    props:{label:'degraded', accent:'var(--amber)'},
    fields:['label','accent'],
    markup:p=>`<span class="tk-warn" style="--stroke:${p.accent}">
      <svg width="54" height="48" viewBox="0 0 54 48" fill="none"><path d="M27 3 L51 45 H3 Z" stroke="var(--stroke)" stroke-width="3.5"/><line x1="27" y1="17" x2="27" y2="31" stroke="var(--stroke)" stroke-width="3.5"/><circle cx="27" cy="38" r="2.6" fill="var(--stroke)"/></svg>
      ${p.label?`<span>${rich(p.label)}</span>`:''}</span>` },
  burst:    { name:'TK · error burst',
    group:'meta',
    props:{label:'outage'},
    fields:['label'],
    markup:p=>`<span class="tk-burst"><svg width="56" height="56" viewBox="0 0 56 56"><path d="M28 2 L33 20 L50 10 L40 26 L54 32 L38 35 L44 52 L28 40 L12 52 L18 35 L2 32 L16 26 L6 10 L23 20 Z" fill="var(--alert-red)"/></svg>${p.label?`<span>${rich(p.label)}</span>`:''}</span>` },
  spinner:  { name:'TK · loading spinner',
    group:'meta',
    props:{},
    fields:[],
    markup:p=>`<span class="tk-spinner"><svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="var(--phos-green)" stroke-width="4"><path d="M22 4 A18 18 0 0 1 40 22"/></svg></span>` },
};
