/* ============================================================
   llmao.md · PHOSPHOR theme engine
   Swap the entire palette at runtime. Works on ANY page that
   links assets/tokens.css — components pick up new colors live.

   Usage A (UI):     include this file → floating 🎨 button appears
   Usage B (URL):    page.html?theme=heat
                     page.html?set=--phos-green=#FF0000,--panel=#111111
   Usage C (bake):   panel → "COPY :root CSS" → paste over tokens.css

    Presets: phosphor (house) · minimal · blueprint · glass · brutal · neon
    Presets with `attr` also flip #scene[data-theme] for extra skin
    (css/theme-glass.css, css/theme-brutal.css — dormant otherwise).
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

  const THEMES = {
    phosphor: {
      label: 'PHOSPHOR · green CRT (house theme)',
      vars: {
        '--bg-deep': '#0A0F0A', '--panel': '#101710', '--line-dim': '#1E2A1E',
        '--text-primary': '#D3FFDE', '--text-dim': '#5C8A66',
        '--phos-green': '#39FF7A', '--amber': '#FFB000', '--alert-red': '#FF5555',
        '--cyan-dim': '#57C7C0',
        '--fill-green': '#102E19', '--fill-amber': '#2A2409', '--fill-red': '#221616',
        '--ghost-fill': '#0B170E', '--ghost-stroke': '#0D1D11',
        '--shadow': 'rgba(0,0,0,0.6)', '--glow': 'rgba(57,255,122,0.3)', '--crash-ink': '#FFC9C9',
      },
    },
    minimal: {
      label: 'MINIMAL MONO · near-black, hairlines, no glow',
      vars: {
        '--bg-deep': '#050505', '--panel': '#0B0B0B', '--line-dim': '#262626',
        '--text-primary': '#FAFAFA', '--text-dim': '#8A8A8A',
        '--phos-green': '#EDEDED', '--amber': '#D6D6D6', '--alert-red': '#F87171',
        '--cyan-dim': '#93A1B5',
        '--fill-green': '#101010', '--fill-amber': '#131313', '--fill-red': '#170D0D',
        '--ghost-fill': '#070707', '--ghost-stroke': '#0E0E0E',
        '--shadow': 'rgba(0,0,0,0.7)', '--glow': 'rgba(255,255,255,0.10)', '--crash-ink': '#FCA5A5',
      },
    },
    blueprint: {
      label: 'BLUEPRINT · white line-art on engineering blue',
      vars: {
        '--bg-deep': '#082A63', '--panel': '#0D3585', '--line-dim': '#2E5CB8',
        '--text-primary': '#FFFFFF', '--text-dim': '#9DB9E8',
        '--phos-green': '#FFFFFF', '--amber': '#FFD166', '--alert-red': '#FF6B6B',
        '--cyan-dim': '#7DD3FC',
        '--fill-green': '#0E3280', '--fill-amber': '#123A86', '--fill-red': '#471D28',
        '--ghost-fill': '#072554', '--ghost-stroke': '#0C3286',
        '--shadow': 'rgba(0,0,0,0.5)', '--glow': 'rgba(255,255,255,0.22)', '--crash-ink': '#FECACA',
      },
    },
    glass: {
      label: 'LIQUID GLASS · frosted cards over aurora dark',
      attr: 'glass',
      vars: {
        '--bg-deep': '#060A14', '--panel': '#0E1626', '--line-dim': '#2A3A55',
        '--text-primary': '#EAF2FF', '--text-dim': '#8CA3C7',
        '--phos-green': '#22D3EE', '--amber': '#FBBF24', '--alert-red': '#FB7185',
        '--cyan-dim': '#67E8F9',
        '--fill-green': '#0C1830', '--fill-amber': '#141207', '--fill-red': '#1C0F1A',
        '--ghost-fill': '#081020', '--ghost-stroke': '#0E1A30',
        '--shadow': 'rgba(0,0,0,0.5)', '--glow': 'rgba(34,211,238,0.35)', '--crash-ink': '#FECDD3',
      },
    },
    brutal: {
      label: 'BRUTALIST · cream, black lines, hard shadows',
      attr: 'brutal',
      vars: {
        '--bg-deep': '#FFF6E9', '--panel': '#FFFFFF', '--line-dim': '#1A1A1A',
        '--text-primary': '#141414', '--text-dim': '#6B6257',
        '--phos-green': '#16A34A', '--amber': '#F59E0B', '--alert-red': '#DC2626',
        '--cyan-dim': '#2563EB',
        '--fill-green': '#E7F6EA', '--fill-amber': '#FEF3C7', '--fill-red': '#FDE2E2',
        '--ghost-fill': '#F1E7D2', '--ghost-stroke': '#E3D3B8',
        '--shadow': 'rgba(26,26,26,0.35)', '--glow': 'rgba(22,163,74,0.18)', '--crash-ink': '#991B1B',
      },
    },
    neon: {
      label: 'NEON DUOTONE · black + magenta/cyan glow',
      vars: {
        '--bg-deep': '#000000', '--panel': '#0B0B0F', '--line-dim': '#2A2A35',
        '--text-primary': '#F5F3FF', '--text-dim': '#8B8B9E',
        '--phos-green': '#FF2FB3', '--amber': '#FFB300', '--alert-red': '#FF3860',
        '--cyan-dim': '#00E5FF',
        '--fill-green': '#1C0A16', '--fill-amber': '#1C1405', '--fill-red': '#1C0A10',
        '--ghost-fill': '#060606', '--ghost-stroke': '#101014',
        '--shadow': 'rgba(0,0,0,0.8)', '--glow': 'rgba(255,47,179,0.4)', '--crash-ink': '#FF8FAB',
      },
    },
  };

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

  function applyPreset(key) {
    const t = THEMES[key];
    if (!t) return false;
    const scope = scopeEl();
    // clear inline overrides first so presets are clean swaps
    ROLES.forEach(([k]) => scope.style.removeProperty(k));
    applyVars(t.vars);
    // design-method themes (glass/brutal) switch extra skin via data-theme attr
    if (t.attr) scope.dataset.theme = t.attr;
    else delete scope.dataset.theme;
    save({ preset: key });
    syncInputs(t.vars);
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
  let panelEl = null, inputs = {};

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

    // presets
    const pres = panelEl.querySelector('.ltp-presets');
    Object.entries(THEMES).forEach(([key, t]) => {
      const b = document.createElement('button');
      b.textContent = key;
      b.title = t.label;
      b.onclick = () => applyPreset(key);
      pres.appendChild(b);
    });

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
        const other = v === color.value ? hex : color;
        if (other === hex) hex.value = v; else color.value = v;
      };
      color.addEventListener('input', () => commit(color.value));
      hex.addEventListener('change', () => commit(hex.value.trim()));
      wrap.appendChild(row);
    });

    // footer actions
    panelEl.querySelector('.ltp-x').onclick = () => panelEl.classList.remove('open');
    panelEl.querySelector('[data-act=reset]').onclick = () => applyPreset('phosphor');
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
    syncInputs(currentComputed());

    ensureBtnCss();
    const btn = document.createElement('button');
    btn.id = 'llmao-theme-btn';
    btn.textContent = '🎨';
    btn.title = 'theme (presets · custom hex · copy css)';
    btn.onclick = () => {
      if (!panelEl) document.body.appendChild(buildPanel());
      panelEl.classList.toggle('open');
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
  window.PHOSPHOR_THEMES = { THEMES, ROLES, applyPreset, applyVars, currentComputed };
})();
