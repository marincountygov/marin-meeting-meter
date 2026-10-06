# Marin App Shell 1.5.0

Pinned Marin UI baseline: 1.19.0.

This directory is generated. Do not edit files inside an application. Load
`marinos.css` before app CSS and deferred `marinos.js` before app JavaScript.
The CSS already contains Pico; do not load a separate Pico/shared-brand bundle.

## Install the complete runtime

From the shell source checkout:

```bash
bash scripts/install.sh /path/to/app
```

The installer copies this directory to `APP/vendor/marinos/` and synchronizes:

- `vendor/fonts/Jost-wght.ttf`
- `vendor/fonts/open-sans/OpenSans-VariableFont_wdth,wght.woff2`
- `vendor/fonts/open-sans/OFL.txt`
- `vendor/icons/lucide/{layout-grid,chevron-down,copy,check}.svg` and `LICENSE`

Fonts are read from a verified shell `fonts/` cache or a sibling `marin-ui`
checkout, or from `--font-source /path/to/marin-ui`. Required hashes are in
`manifest.json`; wrong or missing files fail before application mutation.
No network download occurs. Do not deploy just this directory without the
companion assets. After installation, the app needs no sibling repository,
font service, external icon bundle, package manager, or build step to run.

Font URLs remain relative to this stylesheet (`../fonts/...`). Source icon
files are included for traceability; generated JS embeds their canonical
geometry, so icon rendering requires no extra runtime request.

`manifest.json` records release/file hashes and managed companion assets.
`brand-source.json` records the reviewed input provenance. Set the app's
`platform.shell` to `1.5.0` and validate before publishing.
