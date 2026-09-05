/* ============================================================
   llmao.md · canvas theme manifest — the ONLY file you edit
   to add or hide a theme.
   - Add: copy themes/_template.css → themes/<key>.css, then one line here.
   - Hide: add `hidden: true` — the file keeps working (old projects,
     recordings) but drops out of the picker.
   js/themes.js never needs touching.
   ============================================================ */
window.CANVAS_THEMES = [
  /* ---- picker (curated) ---- */
  { key: 'minimal',          label: 'Minimal · neutral black/white',          dark: true },
  { key: 'warm-paper',       label: 'Warm Paper · paper grain',               dark: false },
  { key: 'quiet-terminal',   label: 'Quiet Terminal · soft green',            dark: true },
  { key: 'technical-blue',   label: 'Technical Blue · engineering',           dark: true },
  { key: 'ink-grid',         label: 'Ink Grid · signal red on warm white',    dark: false },
  { key: 'editorial',        label: 'Editorial · cream on near-black, one ochre', dark: true },
  { key: 'neon',             label: 'Neon · magenta/cyan',                    dark: true },
  /* ---- hidden (kept working, out of the picker) ---- */
  { key: 'phosphor',         label: 'Phosphor · green CRT (house theme)',     dark: true },
  { key: 'phosphor2',        label: 'Phosphor II · sage, disciplined',        dark: true },
  { key: 'studio-black',     label: 'Studio Black · cinematic black, quiet blue', dark: true },
  { key: 'blueprint',        label: 'Blueprint · drafting navy, thin strokes', dark: true },
  { key: 'blueprint-classic', label: 'Blueprint Classic · original preset',   dark: true },
  { key: 'contrast',         label: 'Contrast · black/white, one red',        dark: true },
  { key: 'paper',            label: 'Paper · ink on warm white (light)',      dark: false },
  { key: 'glass',            label: 'Glass · frosted panels',                 dark: true },
  { key: 'brutal',           label: 'Brutal · hard shadows',                  dark: false },
];
