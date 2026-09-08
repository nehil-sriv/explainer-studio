# icons/

Drop flaticon PNGs (or any images) in this folder, then list the filenames in
`icons.js`:

```js
window.ICON_FILES = [
  'coin-stack.png',
  'tax-doc.png',
];
```

The **Icons** tab in the left rail shows one row per file (filename minus
extension, dashes/underscores become spaces) — click a row to stamp it on the
canvas as an image component.

Regenerate the list any time with:

```bash
python3 -c "import os,json; print('window.ICON_FILES = ' + json.dumps(sorted(f for f in os.listdir('icons') if f.lower().endswith(('.png','.jpg','.jpeg','.gif','.svg','.webp'))), indent=2) + ';')" > icons/icons.js
```

(run from `explainer-studio/`). Reload the page after adding files.
