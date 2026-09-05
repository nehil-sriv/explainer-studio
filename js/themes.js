/* ============================================================
   llmao.md · PHOSPHOR theme engine (manifest-driven)
   Swap the entire canvas palette at runtime. Works on ANY page that
   links assets/tokens.css — components pick up new colors live.

   Usage A (UI):     include this file → floating 🎨 button appears
   Usage B (URL):    page.html?theme=heat
                     page.html?set=--phos-green=#FF0000,--panel=#111111
   Usage C (bake):   panel → "COPY :root CSS" → paste over tokens.css

   Themes are CSS files (themes/<key>.css), one per theme, scoped to
   #scene[data-theme="<key>"]. themes/manifest.js is the ONLY file you
   edit to add/hide one — this file never needs touching.
   (css/theme-glass.css, css/theme-brutal.css hold extra skin for the
   glass/brutal themes — dormant otherwise.)
   ============================================================ */

(function () {
  const ROLES = [
    ['--bg-deep',      'Canvas background'],
    ['--panel',        'Panel / card fill'],
    ['--line-dim',     'Borders & dividers'],
    ['--text-primary', 'Text — primary'],
    ['--text-dim',     'Text — secondary'],
    ['--phos-green',   'ACCENT (brand voice)'],
    ['--amber',        'WARN / jokes'],
    ['--alert-red',    'ERROR / damage'],
    ['--cyan-dim',     'INFO / links'],
    ['--fill-green',   'Fill tint — green'],
    ['--fill-amber',   'Fill tint — amber'],
    ['--fill-red',     'Fill tint — red'],
    ['--ghost-fill',   'Ghost mark fill'],
    ['--ghost-stroke', 'Ghost mark stroke'],
    ['--shadow',       'Drop shadows'],
    ['--glow',         'Glow (cursor · highlights)'],
    ['--crash-ink',    'Crash-loop text'],
  ];

  /* manifest (themes/manifest.js) is the source of truth.
     VISIBLE = curated picker list. Full MANIFEST resolves restores,
     ?theme= lookups and popout/REC loads — hiding a theme drops it
     from the picker without breaking any project that uses it. */
  const MANIFEST = window.CANVAS_THEMES || [];
  const VISIBLE_MANIFEST = MANIFEST.filter(t => !t.hidden);
  const THEMES = Object.fromEntries(MANIFEST.map(t => [t.key, t]));

  /* GOTCHA: LS_KEY lives here. It was once deleted in a rewrite and save()
     swallows the resulting ReferenceError in its own catch, so the theme
     silently stopped persisting with no visible error. Check this first. */
  const LS_KEY = 'llmao-theme-v1';

  /* Theme scope = the CANVAS scene only — never :root.
     Builder chrome keeps the :root defaults (its own fixed design language);
     themed vars set inline on #scene inherit into components alone.
     In the popout (separate document, same script) this resolves to its #scene. */
  function scopeEl() { return document.getElementById('scene') || document.documentElement; }

  function applyVars(vars) {
    const scope = scopeEl();
    Object.entries(vars).forEach(([k, v]) => {
      if (/^#[0-9a-fA-F]{3,8}$/.test(v) || /^rgba?\([^)]*\)$/.test(v)) scope.style.setProperty(k, v);
    });
  }

  /* ---- additive loading, activation by attribute ----
     A sheet is injected once, on first selection, and only matches its own
     data-theme. A loaded-but-unselected theme costs nothing and never needs
     unloading — switching is one attribute write. <link> injection (not
     fetch) so file:// keeps working. */
  function themeHref(key) { return 'themes/' + key + '.css'; }
  function loadThemeCss(key, doc) {
    doc = doc || document;
    if (!THEMES[key]) return false;
    const id = 'canvas-theme-' + key;
    if (doc.getElementById(id)) return true;
    const l = doc.createElement('link');
    l.id = id; l.rel = 'stylesheet'; l.href = themeHref(key);
    (doc.head || doc.documentElement).appendChild(l);
    return true;
  }
  function loadAllThemeCss(doc) { MANIFEST.forEach(t => loadThemeCss(t.key, doc)); }
  /* popout <head> links — every sheet up front, because the cloned #scene
     already carries its data-theme when the popout opens. */
  function themeLinksForPopup() {
    return MANIFEST.map(t => '<link rel="stylesheet" href="themes/' + t.key + '.css">').join('\n');
  }

  function applyPreset(key) {
    const t = THEMES[key];
    if (!t) return false;
    const scope = scopeEl();
    // inline vars beat theme CSS — clear them first, or a theme half-applies
    ROLES.forEach(([k]) => scope.style.removeProperty(k));
    loadThemeCss(key);
    scope.dataset.theme = key;
    save({ preset: key });
    currentPreset = key;
    syncPresetButtons();
    setTimeout(() => syncInputs(currentComputed()), 60);   // sheets land async — read after
    return true;
  }

  function save(state) { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }
  function loadState() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; } }

  /* ---- URL params: ?theme=paper  |  ?set=--phos-green=#0f0,--panel=#111 ---- */
  function applyURL() {
    const q = new URLSearchParams(location.search);
    const t = q.get('theme');
    if (t && THEMES[t]) applyPreset(t);
    const set = q.get('set');
    if (set) {
      const vars = {};
      set.split(',').forEach(pair => {
        let [k, v] = pair.split('=');
        if (!k.startsWith('--')) k = '--' + k;
        if (k && v) vars[k.trim()] = v.trim();
      });
      applyVars(vars);
      currentPreset = 'custom';
      syncPresetButtons();
      syncInputs(currentComputed());
    }
  }

  function currentComputed() {
    const cs = getComputedStyle(scopeEl());
    const out = {};
    ROLES.forEach(([k]) => { out[k] = cs.getPropertyValue(k).trim(); });
    return out;
  }

  /* ---- panel UI ------------------------------------------------------- */
  let panelEl = null, inputs = {}, currentPreset = null;
  function syncPresetButtons() {
    if (!panelEl) return;
    panelEl.querySelectorAll('.ltp-presets button').forEach(b => {
      b.classList.toggle('on', b.dataset.key === currentPreset);
    });
  }

  /* The floating button's CSS must exist from mount — it used to live inside
     the lazily-built panel <style>, so on load the unstyled button stretched
     into a full-width strip (body is flex-column). Inject it up front. */
  const BTN_CSS = `#llmao-theme-btn{position:fixed;right:14px;bottom:14px;z-index:99999;width:38px;height:38px;
    border-radius:50%;border:1px solid #31503A;background:#0B0F0B;color:#39FF7A;font-size:17px;
    cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.5);flex:none}
    #llmao-theme-btn:hover{border-color:#39FF7A}`;
  function ensureBtnCss() {
    if (document.getElementById('llmao-theme-btn-css')) return;
    const st = document.createElement('style');
    st.id = 'llmao-theme-btn-css';
    st.textContent = BTN_CSS;
    document.head.appendChild(st);
  }

  function syncInputs(vars) {
    Object.entries(inputs).forEach(([role, { color, hex }]) => {
      const v = vars[role] || '';
      if (color && /^#[0-9a-fA-F]{6}/.test(v)) color.value = v.slice(0, 7);
      if (hex) hex.value = v;
    });
  }

  function buildPanel() {
    panelEl = document.createElement('div');
    panelEl.className = 'llmao-theme-panel';
    panelEl.innerHTML = `
      <style>
        .llmao-theme-panel{position:fixed;right:14px;bottom:56px;z-index:99999;width:300px;
          max-height:78vh;overflow:auto;background:#0B0F0B;border:1px solid #31503A;border-radius:12px;
          box-shadow:0 18px 50px rgba(0,0,0,.55);font-family:'JetBrains Mono',monospace;color:#D3FFDE;
          font-size:12px;display:none}
        .llmao-theme-panel.open{display:block}
        .ltp-h{padding:10px 12px;border-bottom:1px dashed #1E2A1E;font-weight:700;color:#39FF7A;
          letter-spacing:.08em;display:flex;justify-content:space-between;align-items:center}
        .ltp-x{cursor:pointer;color:#5C8A66;border:none;background:none;font-size:14px}
        .ltp-presets{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px;border-bottom:1px dashed #1E2A1E}
        .ltp-presets button{font-family:inherit;font-size:11px;background:#101710;color:#D3FFDE;
          border:1px solid #1E2A1E;padding:5px 8px;border-radius:4px;cursor:pointer}
        .ltp-presets button:hover{border-color:#39FF7A;color:#39FF7A}
        .ltp-presets button.on{border-color:#0A84FF;color:#fff;background:rgba(10,132,255,.25)}
        .ltp-roles{padding:8px 12px}
        .ltp-role{display:flex;align-items:center;gap:8px;margin-bottom:6px}
        .ltp-role label{flex:1;color:#5C8A66;font-size:11px;line-height:1.25}
        .ltp-role input[type=color]{width:34px;height:24px;padding:0;border:1px solid #1E2A1E;background:none;cursor:pointer}
        .ltp-role input[type=text]{width:82px;background:#0A0F0A;border:1px solid #1E2A1E;color:#D3FFDE;
          font-family:inherit;font-size:11px;padding:3px 6px}
        .ltp-foot{display:flex;gap:8px;padding:10px 12px;border-top:1px dashed #1E2A1E}
        .ltp-foot button{flex:1;font-family:inherit;font-size:11px;background:#101710;color:#D3FFDE;
          border:1px solid #31503A;padding:6px 4px;border-radius:4px;cursor:pointer}
        .ltp-foot button:hover{border-color:#39FF7A;color:#39FF7A}
        .ltp-note{padding:0 12px 10px;color:#5C8A66;font-size:10px;line-height:1.5}
      </style>
      <div class="ltp-h"><span>🎨 THEME</span><button class="ltp-x" title="close">✕</button></div>
      <div class="ltp-presets"></div>
      <div class="ltp-roles"></div>
      <div class="ltp-foot">
        <button data-act="copy">COPY :root CSS</button>
        <button data-act="reset">RESET</button>
      </div>
      <div class="ltp-note">Custom hex edits switch to CUSTOM automatically.
        COPY bakes current colors into assets/tokens.css.</div>`;

    // presets — curated picker list only (hidden themes stay resolvable)
    const pres = panelEl.querySelector('.ltp-presets');
    VISIBLE_MANIFEST.forEach(t => {
      const b = document.createElement('button');
      b.textContent = t.key;
      b.title = t.label;
      b.dataset.key = t.key;
      b.onclick = () => applyPreset(t.key);
      pres.appendChild(b);
    });
    syncPresetButtons();

    // role rows
    const wrap = panelEl.querySelector('.ltp-roles');
    ROLES.forEach(([role, label]) => {
      const row = document.createElement('div');
      row.className = 'ltp-role';
      row.innerHTML = `
        <input type="color"><input type="text" spellcheck="false">
        <label>${label}<br><code style="opacity:.6">${role}</code></label>`;
      const color = row.querySelector('[type=color]');
      const hex = row.querySelector('[type=text]');
      inputs[role] = { color, hex };
      const commit = v => {
        if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
        scopeEl().style.setProperty(role, v);
        save({ preset: 'custom' });
        currentPreset = 'custom';
        syncPresetButtons();
        const other = v === color.value ? hex : color;
        if (other === hex) hex.value = v; else color.value = v;
      };
      color.addEventListener('input', () => commit(color.value));
      hex.addEventListener('change', () => commit(hex.value.trim()));
      wrap.appendChild(row);
    });

    // footer actions
    panelEl.querySelector('.ltp-x').onclick = () => panelEl.classList.remove('open');
    panelEl.querySelector('[data-act=reset]').onclick = () => applyPreset(VISIBLE_MANIFEST.length ? VISIBLE_MANIFEST[0].key : 'minimal');
    panelEl.querySelector('[data-act=copy]').onclick = async () => {
      const cur = currentComputed();
      const css = ':root {\n' + ROLES.map(([k]) => `  ${k}: ${cur[k]};`).join('\n') + '\n}';
      try {
        await navigator.clipboard.writeText(css);
        flash('copied ✓ — paste over tokens.css');
      } catch (e) { flash('copy failed — select manually'); }
    };

    function flash(msg) {
      const n = panelEl.querySelector('.ltp-note');
      const old = n.textContent;
      n.textContent = msg;
      setTimeout(() => { n.textContent = old; }, 1600);
    }
    return panelEl;
  }

  function mount() {
    applyURL();
    const st = loadState();
    if (!new URLSearchParams(location.search).toString()) {
      if (st.preset && THEMES[st.preset]) applyPreset(st.preset);
    }
    // non-builder documents (popout) preload every sheet — the cloned #scene
    // already carries its data-theme, so an archived theme renders correctly
    if (!document.getElementById('complist')) loadAllThemeCss(document);
    syncInputs(currentComputed());

    ensureBtnCss();
    const btn = document.createElement('button');
    btn.id = 'llmao-theme-btn';
    btn.textContent = '🎨';
    btn.title = 'theme (presets · custom hex · copy css)';
    btn.onclick = () => {
      if (!panelEl) document.body.appendChild(buildPanel());
      panelEl.classList.toggle('open');
      syncPresetButtons();
      syncInputs(currentComputed());
    };
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  /* public API */
  window.PHOSPHOR_THEMES = { THEMES, VISIBLE_MANIFEST, ROLES, applyPreset, applyVars,
    loadThemeCss, loadAllThemeCss, themeLinksForPopup, currentComputed };
})();
