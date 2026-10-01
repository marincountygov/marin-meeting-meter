# Marin App Shell distribution

Version: `1.0.1`

Marin UI baseline: `1.18.0`

Copy this directory into an application's `vendor/marinos/` directory without modifying its contents.

Load the shell before the application's own CSS and JavaScript:

```html
<link rel="stylesheet" href="vendor/marinos/marinos.css">
<link rel="stylesheet" href="assets/app.css">
<script src="vendor/marinos/marinos.js" defer></script>
<script src="assets/app.js" defer></script>
```

The CSS expects the existing MarinOS font assets at:

- `vendor/fonts/Jost-wght.ttf`
- `vendor/fonts/open-sans/OpenSans-VariableFont_wdth,wght.woff2`

The application remains functional with system fallback fonts if those files are absent, but published MarinOS apps should retain the self-hosted fonts.

Do not edit files in this directory inside an application. Upgrade by replacing the complete directory with a newer release.
