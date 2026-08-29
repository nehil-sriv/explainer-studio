/* ============================================================
   llmao.md · PHOSPHOR theme engine
   Swap the entire palette at runtime. Works on ANY page that
   links assets/tokens.css — components pick up new colors live.

   Usage A (UI):     include this file → floating 🎨 button appears
   Usage B (URL):    page.html?theme=heat
                     page.html?set=--phos-green=#FF0000,--panel=#111111
   Usage C (bake):   panel → "COPY :root CSS" → paste over tokens.css

   Presets: phosphor · amber · syntaxpop · heat · paper
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
  ];

  const THEMES = {
    phosphor: {
      label: 'PHOSPHOR · green CRT (default)',
      vars: {
        '--bg-deep': '#0A0F0A', '--panel': '#101710', '--line-dim': '#1E2A1E',
        '--text-primary': '#D3FFDE', '--text-dim': '#5C8A66',
        '--phos-green': '#39FF7A', '--amber': '#FFB000', '--alert-red': '#FF5555',
        '--cyan-dim': '#57C7C0',
        '--fill-green': '#102E19', '--fill-amber': '#2A2409', '--fill-red': '#221616',
        '--ghost-fill': '#0B170E', '--ghost-stroke': '#0D1D11',
      },
    },
    amber: {
      label: 'CRT AMBER · monochrome retro',
      vars: {
        '--bg-deep': '#0C0C05', '--panel': '#16150a', '--line-dim': '#413a14',
        '--text-primary': '#ffd98a', '--text-dim': '#b39448',
        '--phos-green': '#ffb000', '--amber': '#ffd23f', '--alert-red': '#ff5e45',
        '--cyan-dim': '#d9c07a',
        '--fill-green': '#2e2508', '--fill-amber': '#332b0d', '--fill-red': '#2e1410',
        '--ghost-fill': '#151206', '--ghost-stroke': '#242009',
      },
    },
    syntaxpop: {
      label: 'SYNTAX POP · dracula IDE',
      vars: {
        '--bg-deep': '#282A36', '--panel': '#21222C', '--line-dim': '#44475A',
        '--text-primary': '#F8F8F2', '--text-dim': '#6272A4',
        '--phos-green': '#50FA7B', '--amber': '#F1FA8C', '--alert-red': '#FF5555',
        '--cyan-dim': '#8BE9FD',
        '--fill-green': '#1d3a2a', '--fill-amber': '#3a3a1f', '--fill-red': '#3a1d24',
        '--ghost-fill': '#23242f', '--ghost-stroke': '#34374a',
      },
    },
    heat: {
      label: 'LLMAO HEAT · espresso & fawn',
      vars: {
        '--bg-deep': '#191009', '--panel': '#231811', '--line-dim': '#3d2c1d',
        '--text-primary': '#F5EBDC', '--text-dim': '#A98F6F',
        '--phos-green': '#E8853D', '--amber': '#F4A261', '--alert-red': '#E5534B',
        '--cyan-dim': '#8FBFB0',
        '--fill-green': '#31200f', '--fill-amber': '#33230f', '--fill-red': '#301512',
        '--ghost-fill': '#211609', '--ghost-stroke': '#33240f',
      },
    },
    paper: {
      label: 'PAPER CUT · light editorial',
      vars: {
        '--bg-deep': '#FBF8F1', '--panel': '#FFFFFF', '--line-dim': '#E4DDD0',
        '--text-primary': '#191713', '--text-dim': '#98917F',
        '--phos-green': '#1A7F37', '--amber': '#9A6700', '--alert-red': '#CF222E',
        '--cyan-dim': '#2B59FF',
        '--fill-green': '#e7f4ec', '--fill-amber': '#f6efd9', '--fill-red': '#fbeaea',
        '--ghost-fill': '#f1ece1', '--ghost-stroke': '#ddd5c5',
      },
    },
  };

  const LS_KEY = 'llmao-theme-v1';
  const root = document.documentElement;

  function applyVars(vars) {
    Object.entries(vars).forEach(([k, v]) => {
      if (/^#[0-9a-fA-F]{3,8}$/.test(v)) root.style.setProperty(k, v);
    });
  }

  function applyPreset(key) {
    const t = THEMES[key];
    if (!t) return false;
    // clear inline overrides first so presets are clean swaps
    ROLES.forEach(([k]) => root.style.removeProperty(k));
    applyVars(t.vars);
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
    const cs = getComputedStyle(root);
    const out = {};
    ROLES.forEach(([k]) => { out[k] = cs.getPropertyValue(k).trim(); });
    return out;
  }

  /* ---- panel UI ------------------------------------------------------- */
  let panelEl = null, inputs = {};

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
        #llmao-theme-btn{position:fixed;right:14px;bottom:14px;z-index:99999;width:38px;height:38px;
          border-radius:50%;border:1px solid #31503A;background:#0B0F0B;color:#39FF7A;font-size:17px;
          cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.5)}
        #llmao-theme-btn:hover{border-color:#39FF7A}
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
        root.style.setProperty(role, v);
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
