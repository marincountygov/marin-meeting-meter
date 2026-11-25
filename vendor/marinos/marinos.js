(() => {
  "use strict";

  if (window.MarinAppShell?.version) {
    console.warn(`Marin App Shell ${window.MarinAppShell.version} is already loaded.`);
    return;
  }

  const SHELL_VERSION = "2.7.0";
  const MARIN_UI_VERSION = "1.42.0";
  const MARINOS_URL = "https://marincountygov.github.io/marin-os/";
  const MARINOS_STATUS_URL = `${MARINOS_URL}#status`;
  const CATALOG_URL = `${MARINOS_URL}catalog.json`;
  // Google Lighthouse accessibility results for every MarinOS app, written
  // by marin-os's scripts/lighthouse.js. One shared file, keyed by catalog id.
  const LIGHTHOUSE_URL = `${MARINOS_URL}data/lighthouse.json`;
  // Languages, dependencies, bundled components and declared AI use for every
  // MarinOS app, written by marin-os's scripts/tech.js. SBOM files sit beside it.
  const TECH_URL = `${MARINOS_URL}data/tech.json`;
  const WCAG_URL = "https://www.w3.org/TR/WCAG22/";
  const FEEDBACK_URL = "https://form.asana.com/?k=qVUT83d5DBmlDiIyi-WAyQ&d=23133298259496";
  const SECURITY_STANDARD_URL =
    "https://github.com/marincountygov/marin-digital-standards/blob/main/security/standard.md";

  const STANDARD_LINKS = Object.freeze({
    about: "About",
    security: "Security",
    accessibility: "Accessibility",
    tech: "Tech",
    updates: "Updates",
  });
  const MARINOS_STATUS_LABELS = Object.freeze({ alpha: "Alpha", beta: "Beta", live: "Live" });

  // Generated from the hash-locked vendor/icons/lucide/*.svg at build time.
  const LUCIDE_ICONS = Object.freeze({"arrow-down": "<path d=\"M12 5v14\"/><path d=\"m19 12-7 7-7-7\"/>", "arrow-left": "<path d=\"m12 19-7-7 7-7\"/><path d=\"M19 12H5\"/>", "arrow-right": "<path d=\"M5 12h14\"/><path d=\"m12 5 7 7-7 7\"/>", "arrow-up": "<path d=\"m5 12 7-7 7 7\"/><path d=\"M12 19V5\"/>", "check": "<path d=\"M20 6 9 17l-5-5\"/>", "chevron-down": "<path d=\"m6 9 6 6 6-6\"/>", "chevron-left": "<path d=\"m15 18-6-6 6-6\"/>", "chevron-right": "<path d=\"m9 18 6-6-6-6\"/>", "chevrons-left": "<path d=\"m11 17-5-5 5-5\"/><path d=\"m18 17-5-5 5-5\"/>", "chevrons-right": "<path d=\"m6 17 5-5-5-5\"/><path d=\"m13 17 5-5-5-5\"/>", "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 6v6l4 2\"/>", "compass": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z\"/>", "copy": "<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\"/><path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\"/>", "download": "<path d=\"M12 15V3\"/><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><path d=\"m7 10 5 5 5-5\"/>", "ellipsis": "<circle cx=\"12\" cy=\"12\" r=\"1\"/><circle cx=\"19\" cy=\"12\" r=\"1\"/><circle cx=\"5\" cy=\"12\" r=\"1\"/>", "eye": "<path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>", "eye-off": "<path d=\"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49\"/><path d=\"M14.084 14.158a3 3 0 0 1-4.242-4.242\"/><path d=\"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143\"/><path d=\"m2 2 20 20\"/>", "folder-open": "<path d=\"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2\"/>", "funnel": "<path d=\"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z\"/>", "grip-vertical": "<circle cx=\"9\" cy=\"12\" r=\"1\"/><circle cx=\"9\" cy=\"5\" r=\"1\"/><circle cx=\"9\" cy=\"19\" r=\"1\"/><circle cx=\"15\" cy=\"12\" r=\"1\"/><circle cx=\"15\" cy=\"5\" r=\"1\"/><circle cx=\"15\" cy=\"19\" r=\"1\"/>", "layout-grid": "<rect width=\"7\" height=\"7\" x=\"3\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"7\" x=\"14\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"7\" x=\"14\" y=\"14\" rx=\"1\"/><rect width=\"7\" height=\"7\" x=\"3\" y=\"14\" rx=\"1\"/>", "link": "<path d=\"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\"/><path d=\"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\"/>", "map-pin": "<path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/>", "maximize": "<path d=\"M8 3H5a2 2 0 0 0-2 2v3\"/><path d=\"M21 8V5a2 2 0 0 0-2-2h-3\"/><path d=\"M3 16v3a2 2 0 0 0 2 2h3\"/><path d=\"M16 21h3a2 2 0 0 0 2-2v-3\"/>", "minimize": "<path d=\"M8 3v3a2 2 0 0 1-2 2H3\"/><path d=\"M21 8h-3a2 2 0 0 1-2-2V3\"/><path d=\"M3 16h3a2 2 0 0 1 2 2v3\"/><path d=\"M16 21v-3a2 2 0 0 1 2-2h3\"/>", "panel-left-open": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M9 3v18\"/><path d=\"m14 9 3 3-3 3\"/>", "panel-right-open": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M15 3v18\"/><path d=\"m10 15-3-3 3-3\"/>", "pencil": "<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\"/><path d=\"m15 5 4 4\"/>", "plus": "<path d=\"M5 12h14\"/><path d=\"M12 5v14\"/>", "printer": "<path d=\"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2\"/><path d=\"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6\"/><rect x=\"6\" y=\"14\" width=\"12\" height=\"8\" rx=\"1\"/>", "redo-2": "<path d=\"m15 14 5-5-5-5\"/><path d=\"M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13\"/>", "refresh-cw": "<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\"/><path d=\"M21 3v5h-5\"/><path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\"/><path d=\"M8 16H3v5\"/>", "rotate-ccw": "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/><path d=\"M3 3v5h5\"/>", "rss": "<path d=\"M4 11a9 9 0 0 1 9 9\"/><path d=\"M4 4a16 16 0 0 1 16 16\"/><circle cx=\"5\" cy=\"19\" r=\"1\"/>", "search": "<path d=\"m21 21-4.34-4.34\"/><circle cx=\"11\" cy=\"11\" r=\"8\"/>", "settings": "<path d=\"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>", "share": "<path d=\"M12 2v13\"/><path d=\"m16 6-4-4-4 4\"/><path d=\"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8\"/>", "signpost": "<path d=\"M12 13v8\"/><path d=\"M12 3v3\"/><path d=\"M2.354 10.354a1.207 1.207 0 0 1 0-1.708l2.06-2.06A2 2 0 0 1 5.828 6h12.344a2 2 0 0 1 1.414.586l2.06 2.06a1.207 1.207 0 0 1 0 1.708l-2.06 2.06a2 2 0 0 1-1.414.586H5.828a2 2 0 0 1-1.414-.586z\"/>", "sticky-note": "<path d=\"M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z\"/><path d=\"M15 3v5a1 1 0 0 0 1 1h5\"/>", "trash": "<path d=\"M10 11v6\"/><path d=\"M14 11v6\"/><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6\"/><path d=\"M3 6h18\"/><path d=\"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/>", "undo-2": "<path d=\"M9 14 4 9l5-5\"/><path d=\"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11\"/>", "upload": "<path d=\"M12 3v12\"/><path d=\"m17 8-5-5-5 5\"/><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/>", "x": "<path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/>"});
  const LUCIDE_ATTRIBUTES = Object.freeze({
    viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round",
  });

  // Text-only fallback links: app identity glyphs belong to the catalog, not
  // independent hand-maintained shapes inside the shell.
  const FALLBACK_APPS = Object.freeze([
    { name: "Marin Magic", url: "https://marincountygov.github.io/marin-magic/" },
    { name: "Marin Decision Maker", url: "https://marincountygov.github.io/marin-decision-maker/" },
    { name: "Marin Docs", url: "https://marincountygov.github.io/marin-docs/" },
  ]);

  function componentWarning(element, message) {
    console.warn(`[Marin App Shell ${SHELL_VERSION}] <${element.localName}>: ${message}`, element);
  }

  function normalizedAttribute(element, name, fallback = "") {
    const value = element.getAttribute(name)?.trim();
    return value || fallback;
  }

  // The one wording for any "still loading" message: "Loading {app name}…". Apps and the
  // shell's own sections use the same text, so a visitor sees the same message everywhere.
  function loadingMessage() {
    const info = document.querySelector("marin-app-info");
    const name = (info && normalizedAttribute(info, "app-name")) ||
      (document.querySelector(".app-title__link")?.textContent || "").trim() || "this application";
    return `Loading ${name}\u2026`;
  }

  function parseTokenList(value, fallback) {
    const source = typeof value === "string" && value.trim() ? value : fallback;
    return source
      .split(/[\s,]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  function cloneTemplate(element, selector) {
    const template = element.querySelector(selector);
    return template instanceof HTMLTemplateElement ? template.content.cloneNode(true) : null;
  }

  function defaultIconStrokeWidth(svg) {
    // Legacy app identity artwork uses 48x48 coordinates; Lucide uses 24x24.
    // Only the known 48x48 compatibility case gets a different default.
    // Read the attribute, not rendered geometry (no layout measurement).
    const parts = (svg.getAttribute("viewBox") || "").trim().split(/[\s,]+/);
    const svgNumber = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
    const valid = parts.length === 4 && parts.every(
      (part) => svgNumber.test(part) && Number.isFinite(Number(part))
    );
    return valid && Number(parts[2]) === 48 && Number(parts[3]) === 48
      ? "4"
      : LUCIDE_ATTRIBUTES["stroke-width"];
  }

  function addLucideDefaults(svg) {
    // Backward compatibility for 1.0.x icon templates that relied on shell CSS.
    // Do not rewrite consumer geometry or silently replace its identity icon.
    Object.entries(LUCIDE_ATTRIBUTES).forEach(([name, value]) => {
      if (name !== "stroke-width" && !svg.hasAttribute(name)) svg.setAttribute(name, value);
    });
    // An explicit width is app-owned, even when it differs from our default.
    if (!svg.hasAttribute("stroke-width")) {
      svg.setAttribute("stroke-width", defaultIconStrokeWidth(svg));
    }
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    return svg;
  }

  function createLucideIcon(name, className = "") {
    const markup = LUCIDE_ICONS[name];
    if (!markup) throw new Error(`Unknown bundled Lucide icon: ${name}`);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    addLucideDefaults(svg);
    // Only immutable, build-validated local SVG children enter this sink.
    svg.innerHTML = markup;
    if (className) svg.setAttribute("class", className);
    return svg;
  }

  function lucideMarkup(name, className = "") {
    return createLucideIcon(name, className).outerHTML;
  }

  const SAFE_SVG_ELEMENTS = new Set(["circle", "ellipse", "line", "path", "polygon", "polyline", "rect"]);
  const SAFE_SVG_ATTRIBUTES = new Set([
    "cx",
    "cy",
    "d",
    "fill",
    "height",
    "points",
    "r",
    "rx",
    "ry",
    "stroke",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-width",
    "transform",
    "width",
    "x",
    "x1",
    "x2",
    "y",
    "y1",
    "y2",
  ]);

  function safeLinkUrl(value) {
    try {
      const url = new URL(String(value), window.location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function createCatalogSvg(iconData) {
    if (!iconData || typeof iconData.markup !== "string" || typeof iconData.viewBox !== "string") return null;
    if (!/^[0-9+.,\s-]+$/.test(iconData.viewBox)) return null;

    const parser = new DOMParser();
    const parsed = parser.parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${iconData.viewBox}">${iconData.markup}</svg>`,
      "image/svg+xml"
    );
    if (parsed.querySelector("parsererror")) return null;

    const namespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(namespace, "svg");
    svg.setAttribute("viewBox", iconData.viewBox);
    addLucideDefaults(svg);

    function cloneSafeElement(source, destination) {
      Array.from(source.children).forEach((child) => {
        const name = child.localName;
        if (!SAFE_SVG_ELEMENTS.has(name)) return;
        const clone = document.createElementNS(namespace, name);
        Array.from(child.attributes).forEach((attribute) => {
          if (SAFE_SVG_ATTRIBUTES.has(attribute.name)) clone.setAttribute(attribute.name, attribute.value);
        });
        cloneSafeElement(child, clone);
        destination.append(clone);
      });
    }

    cloneSafeElement(parsed.documentElement, svg);
    return svg.childElementCount ? svg : null;
  }

  function createStatusBadge(status, className = "", href = "") {
    const normalizedStatus = typeof status === "string" ? status.trim().toLowerCase() : "";
    const label = MARINOS_STATUS_LABELS[normalizedStatus];
    if (!label) return null;

    const badge = href ? document.createElement("a") : document.createElement("span");
    badge.className = ["app-status", className].filter(Boolean).join(" ");
    badge.dataset.status = normalizedStatus;
    badge.textContent = label;
    if (href) badge.href = href;
    return badge;
  }

  function manifestProjectScalar(source, key) {
    if (typeof source !== "string") return "";
    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    let projectIndent = null;

    for (const line of lines) {
      if (!line.trim() || line.trimStart().startsWith("#")) continue;
      const indent = line.length - line.trimStart().length;

      if (projectIndent === null) {
        if (/^project\s*:\s*(?:#.*)?$/.test(line.trim())) projectIndent = indent;
        continue;
      }

      if (indent <= projectIndent) break;
      if (indent !== projectIndent + 2) continue;

      const match = line.trim().match(/^([A-Za-z_-]+)\s*:\s*(?:"([^"]*)"|'([^']*)'|([^#]*?))\s*(?:#.*)?$/);
      if (!match || match[1] !== key) continue;
      return (match[2] ?? match[3] ?? match[4] ?? "").trim().toLowerCase();
    }
    return "";
  }

  let localManifestStatus = "";

  function renderAppTitleStatus(status, source) {
    const title = document.querySelector(".app-title");
    if (!title) return false;
    const badge = createStatusBadge(status, "app-title__status", MARINOS_STATUS_URL);
    if (!badge) return false;

    // Only replace badges owned by the shell. App-authored title content is
    // never removed. The source marker also lets catalog fallback yield to the
    // local manifest once it arrives.
    title.querySelector(".app-title__status[data-marinos-status]")?.remove();
    badge.dataset.marinosStatus = source;
    title.append(document.createTextNode(" "), badge);
    return true;
  }

  function manifestProjectStatus(source) {
    const value = manifestProjectScalar(source, "status");
    return MARINOS_STATUS_LABELS[value] ? value : "";
  }

  // project.status in the app's own marin.yml is the local source of truth.
  // Read only that known scalar instead of introducing a browser YAML parser.
  // If it is missing/unavailable/legacy, catalog matching below remains the
  // compatibility fallback established in 1.2.0.
  fetch("marin.yml", { cache: "no-store" })
    .then((response) => (response.ok ? response.text() : Promise.reject(new Error("bad response"))))
    .then((source) => {
      const status = manifestProjectStatus(source);
      if (!status) return;
      localManifestStatus = status;
      renderAppTitleStatus(status, "manifest");
    })
    .catch(() => {
      // Status is supplementary UI; leave catalog/static fallback behavior intact.
    });

  function createMenuLink(entry) {
    const href = safeLinkUrl(entry?.url);
    const name = typeof entry?.name === "string" ? entry.name.trim() : "";
    if (!href || !name) return null;

    const link = document.createElement("a");
    link.href = href;

    const svg = createCatalogSvg(entry.icon);
    if (svg) {
      const icon = document.createElement("span");
      icon.className = "marinos-menu__icon";
      icon.setAttribute("aria-hidden", "true");
      icon.append(svg);
      link.append(icon);
    }

    const nameElement = document.createElement("span");
    nameElement.className = "marinos-menu__name";
    nameElement.textContent = name;
    link.append(nameElement);

    const badge = createStatusBadge(entry?.status, "marinos-menu__status");
    if (badge) link.append(badge);
    return link;
  }

  class MarinOsBanner extends HTMLElement {
    connectedCallback() {
      if (this.dataset.rendered === "true") return;
      this.dataset.rendered = "true";

      const label = normalizedAttribute(this, "label", "ALPHA");
      const catalogUrl = normalizedAttribute(this, "catalog-url", CATALOG_URL);
      const browseUrl = normalizedAttribute(this, "browse-url", MARINOS_URL);

      const banner = document.createElement("div");
      banner.className = "marinos-banner";

      const inner = document.createElement("div");
      inner.className = "marinos-banner__inner";

      const menu = document.createElement("div");
      menu.className = "menu marinos-menu";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "menu-toggle marinos-menu__toggle";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", "marinos-menu-panel");

      const brandIcon = document.createElement("span");
      brandIcon.className = "marinos-banner__icon";
      brandIcon.setAttribute("aria-hidden", "true");
      brandIcon.append(createLucideIcon("layout-grid"));
      toggle.append(brandIcon, document.createTextNode("MarinOS"));

      if (label) {
        const statusBadge = createStatusBadge(label, "marinos-banner__status");
        if (statusBadge) {
          toggle.append(statusBadge);
        } else {
          // Preserve arbitrary pre-1.2.0 labels for compatibility. Known
          // Alpha/Beta/Live values use the shared app-status component.
          const sup = document.createElement("sup");
          sup.textContent = label;
          toggle.append(sup);
        }
      }

      const caret = createLucideIcon("chevron-down", "menu-toggle__caret");
      toggle.append(caret);

      const panel = document.createElement("div");
      panel.id = "marinos-menu-panel";
      panel.className = "menu-panel marinos-menu__panel";
      panel.hidden = true;
      panel.dataset.catalogUrl = catalogUrl;

      FALLBACK_APPS.forEach((entry) => {
        const link = createMenuLink(entry);
        if (link) panel.append(link);
      });

      const allLink = document.createElement("a");
      allLink.className = "marinos-menu__all";
      allLink.href = browseUrl;
      allLink.textContent = "Browse all in MarinOS";
      panel.append(allLink);

      menu.append(toggle, panel);
      inner.append(menu);
      banner.append(inner);
      this.replaceChildren(banner);
    }
  }

  class MarinAppHeader extends HTMLElement {
    connectedCallback() {
      if (this.dataset.rendered === "true") return;

      const iconTemplate = cloneTemplate(this, "template[data-icon]");
      const navigationTemplate = cloneTemplate(this, "template[data-navigation]");
      const appName = normalizedAttribute(this, "app-name", "Application");
      const description = normalizedAttribute(this, "app-description");
      const navigationLabel = normalizedAttribute(this, "navigation-label", "Application navigation");
      // The header holds only the app's own tabs. About, Updates and the other standard pages are in the footer of every app,
      // so the default is none; an app that must show one in its header names it in standard-links.
      const standardLinks = parseTokenList(this.getAttribute("standard-links"), "");

      if (!this.hasAttribute("app-name")) componentWarning(this, 'missing required "app-name" attribute');

      const header = document.createElement("header");
      header.className = "app-header";
      header.dataset.marinosShellVersion = SHELL_VERSION;

      const inner = document.createElement("div");
      inner.className = "app-header__inner";

      const identity = document.createElement("div");
      identity.className = "app-identity";

      const titleRow = document.createElement("div");
      titleRow.className = "app-title-row";

      const icon = document.createElement("span");
      icon.className = "app-icon";
      icon.setAttribute("aria-hidden", "true");
      if (iconTemplate) {
        iconTemplate.querySelectorAll("svg").forEach(addLucideDefaults);
        icon.append(iconTemplate);
      } else {
        icon.append(createLucideIcon("layout-grid"));
      }

      const titleCopy = document.createElement("div");
      titleCopy.className = "app-title-copy";
      const heading = document.createElement("h1");
      heading.className = "app-title";
      const homeLink = document.createElement("a");
      homeLink.className = "app-title__link";
      homeLink.href = "./";
      homeLink.setAttribute("aria-label", `${appName} home`);
      homeLink.textContent = appName;
      heading.append(homeLink);
      titleCopy.append(heading);

      if (description) {
        const subtitle = document.createElement("p");
        subtitle.className = "app-subtitle";
        subtitle.textContent = description;
        titleCopy.append(subtitle);
      }

      titleRow.append(icon, titleCopy);
      identity.append(titleRow);

      const actions = document.createElement("div");
      actions.className = "app-header__actions";

      const menuToggle = document.createElement("button");
      menuToggle.type = "button";
      menuToggle.className = "app-menu-toggle";
      menuToggle.id = "menu-toggle";
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-controls", "app-nav");
      menuToggle.textContent = normalizedAttribute(this, "menu-label", "Menu");

      const navigation = document.createElement("nav");
      navigation.className = "app-nav";
      navigation.id = "app-nav";
      navigation.setAttribute("aria-label", navigationLabel);

      const seenHrefs = new Set();
      if (navigationTemplate) {
        navigationTemplate.querySelectorAll("a[href]").forEach((sourceLink) => {
          const link = sourceLink.cloneNode(true);
          const href = link.getAttribute("href");
          if (!href || seenHrefs.has(href)) return;
          seenHrefs.add(href);
          navigation.append(link);
        });
      }

      standardLinks.forEach((key) => {
        const label = STANDARD_LINKS[key];
        const href = `#${key}`;
        if (!label || seenHrefs.has(href)) return;
        const link = document.createElement("a");
        link.href = href;
        link.textContent = label;
        seenHrefs.add(href);
        navigation.append(link);
      });

      // An app with nothing of its own in the header has no Menu button and no empty navigation landmark.
      if (!navigation.querySelector("a")) {
        menuToggle.hidden = true;
        navigation.hidden = true;
      }

      actions.append(menuToggle, navigation);
      inner.append(identity, actions);
      header.append(inner);

      this.replaceChildren(header);
      this.dataset.rendered = "true";
    }
  }

  class MarinAppInfo extends HTMLElement {
    connectedCallback() {
      if (this.dataset.rendered === "true") return;

      const templates = {
        about: cloneTemplate(this, "template[data-about]"),
        security: cloneTemplate(this, "template[data-security-intro]"),
        accessibility: cloneTemplate(this, "template[data-accessibility]"),
        tech: cloneTemplate(this, "template[data-tech]"),
        updates: cloneTemplate(this, "template[data-updates-intro]"),
      };
      const appName = normalizedAttribute(this, "app-name", "This application");
      const repo = normalizedAttribute(this, "repo");
      const securityJson = normalizedAttribute(this, "security-src", "security.json");
      const securityStandardUrl = normalizedAttribute(this, "security-standard-url", SECURITY_STANDARD_URL);
      const securityContactUrl = normalizedAttribute(this, "security-contact-url", ".well-known/security.txt");
      const sectionKeys = parseTokenList(
        this.getAttribute("sections"),
        "about security accessibility tech updates"
      ).filter((key, index, values) => STANDARD_LINKS[key] && values.indexOf(key) === index);

      if (!this.hasAttribute("app-name")) componentWarning(this, 'missing recommended "app-name" attribute');
      if (sectionKeys.includes("updates") && !repo) {
        componentWarning(this, 'the Updates section has no "repo" attribute');
      }

      const fragment = document.createDocumentFragment();

      sectionKeys.forEach((key) => {
        const existing = document.getElementById(key);
        if (existing && !this.contains(existing)) {
          componentWarning(this, `#${key} already exists; the shell did not create a duplicate section`);
          return;
        }

        const section = document.createElement("section");
        section.id = key;
        section.className = "app-card";
        section.dataset.tabSection = key;
        section.hidden = true;

        const heading = document.createElement("h2");
        heading.textContent = STANDARD_LINKS[key];
        section.append(heading);

        if (key === "about") {
          if (templates.about) {
            section.append(templates.about);
          } else {
            const paragraph = document.createElement("p");
            paragraph.textContent = `${appName} is a MarinOS application maintained by the County of Marin.`;
            section.append(paragraph);
          }

          const relatedKeys = sectionKeys.filter((item) => item !== "about");
          if (relatedKeys.length) {
            const relatedHeading = document.createElement("h3");
            relatedHeading.textContent = "Related information";
            const list = document.createElement("ul");
            relatedKeys.forEach((item) => {
              const listItem = document.createElement("li");
              const link = document.createElement("a");
              link.href = `#${item}`;
              link.textContent = STANDARD_LINKS[item];
              listItem.append(link);
              list.append(listItem);
            });
            section.append(relatedHeading, list);
          }
        }

        if (key === "security") {
          const standard = document.createElement("p");
          standard.append(document.createTextNode(`${appName} follows the `));
          const standardLink = document.createElement("a");
          standardLink.href = securityStandardUrl;
          standardLink.textContent = "MarinOS security standard";
          standard.append(standardLink, document.createTextNode("."));
          section.append(standard);

          if (templates.security) section.append(templates.security);

          const reportHeading = document.createElement("h3");
          reportHeading.textContent = "Report an issue";
          const reportParagraph = document.createElement("p");
          reportParagraph.append(document.createTextNode("See "));
          const reportLink = document.createElement("a");
          reportLink.href = securityContactUrl;
          reportLink.textContent = "security.txt";
          reportParagraph.append(reportLink, document.createTextNode(" for contact details."));

          const applicationHeading = document.createElement("h3");
          applicationHeading.textContent = "Application security";
          const status = document.createElement("p");
          status.className = "app-help-text";
          status.dataset.securityStatus = "";
          status.setAttribute("role", "status");
          status.setAttribute("aria-live", "polite");
          status.setAttribute("aria-atomic", "true");
          status.textContent = loadingMessage();
          const content = document.createElement("div");
          content.dataset.securityContent = "";

          const technicalHeading = document.createElement("h3");
          technicalHeading.textContent = "Technical information";
          const technicalList = document.createElement("ul");
          // security.txt is already linked under "Report an issue" above, so it is not repeated here.
          [
            [securityJson, "security.json"],
          ].forEach(([href, label]) => {
            const item = document.createElement("li");
            const link = document.createElement("a");
            link.href = href;
            link.textContent = label;
            item.append(link);
            technicalList.append(item);
          });

          section.dataset.securityJson = securityJson;
          section.append(
            reportHeading,
            reportParagraph,
            applicationHeading,
            status,
            content,
            technicalHeading,
            technicalList
          );
        }

        if (key === "accessibility") {
          const standardParagraph = document.createElement("p");
          // The link to WCAG is given once, under "Accessibility standard" below; repeating the same
          // link in nearby text only adds noise for people using a screen reader.
          standardParagraph.textContent = `${appName} targets WCAG 2.2 Level AA.`;
          section.append(standardParagraph);

          if (templates.accessibility) section.append(templates.accessibility);

          const scoreHeading = document.createElement("h3");
          scoreHeading.textContent = "Accessibility score";
          const status = document.createElement("p");
          status.className = "app-help-text";
          status.dataset.accessibilityStatus = "";
          status.setAttribute("role", "status");
          status.setAttribute("aria-live", "polite");
          status.setAttribute("aria-atomic", "true");
          status.textContent = loadingMessage();
          const content = document.createElement("div");
          content.dataset.accessibilityContent = "";
          // The score is read live from marin-os's data/lighthouse.json,
          // looked up by this app's catalog id (app-id attribute, the
          // header's app-id, or <body data-app-id>; else matched by URL).
          section.dataset.accessibilityScores = "";
          section.dataset.accessibilityAppId = normalizedAttribute(this, "app-id");

          const aboutHeading = document.createElement("h3");
          aboutHeading.textContent = "About the score";
          const aboutParagraph = document.createElement("p");
          aboutParagraph.textContent =
            "Scores come from Google Lighthouse accessibility testing through the PageSpeed Insights API. Scores range from 0\u2013100. Automated testing can identify many accessibility issues, but a score does not determine WCAG conformance.";

          const standardHeading = document.createElement("h3");
          standardHeading.textContent = "Accessibility standard";
          const standardText = document.createElement("p");
          standardText.append(document.createTextNode("County of Marin digital services target "));
          const standardLink = document.createElement("a");
          standardLink.href = WCAG_URL;
          standardLink.textContent = "WCAG 2.2 Level AA";
          standardText.append(
            standardLink,
            document.createTextNode(
              ". WCAG provides internationally recognized requirements for making web content accessible to people with disabilities."
            )
          );

          const reportHeading = document.createElement("h3");
          reportHeading.textContent = "Report an issue";
          const reportText = document.createElement("p");
          reportText.textContent = `If you experience an accessibility problem with ${appName}, report the issue so we can review it.`;
          const reportParagraph = document.createElement("p");
          const reportLink = document.createElement("a");
          reportLink.href = FEEDBACK_URL;
          reportLink.target = "_blank";
          reportLink.rel = "noreferrer";
          reportLink.textContent = "Report an accessibility issue";
          reportParagraph.append(reportLink);

          section.append(
            scoreHeading,
            status,
            content,
            aboutHeading,
            aboutParagraph,
            standardHeading,
            standardText,
            reportHeading,
            reportText,
            reportParagraph
          );
        }

        if (key === "tech") {
          if (templates.tech) section.append(templates.tech);
          const intro = document.createElement("p");
          intro.textContent = `What ${appName} is made of: its languages, software dependencies, and whether it uses AI as part of the deployed service.`;
          const status = document.createElement("p");
          status.className = "app-help-text";
          status.dataset.techStatus = "";
          status.setAttribute("role", "status");
          status.setAttribute("aria-live", "polite");
          status.setAttribute("aria-atomic", "true");
          status.textContent = loadingMessage();
          const content = document.createElement("div");
          content.dataset.techContent = "";
          // Read live from marin-os's data/tech.json by catalog id (app-id
          // attribute, the header's app-id, or <body data-app-id>; else URL).
          section.dataset.techData = "";
          section.dataset.techAppId = normalizedAttribute(this, "app-id");
          section.append(intro, status, content);
        }

        if (key === "updates") {
          if (templates.updates) section.append(templates.updates);
          const status = document.createElement("p");
          status.className = "app-help-text";
          status.dataset.updatesStatus = "";
          status.setAttribute("role", "status");
          status.setAttribute("aria-live", "polite");
          status.setAttribute("aria-atomic", "true");
          if (repo) status.textContent = loadingMessage();
          else status.textContent = "Updates are not configured for this application.";
          const list = document.createElement("div");
          list.dataset.updatesList = "";
          if (repo) section.dataset.updatesRepo = repo;
          section.dataset.appName = appName;
          section.append(status, list);
        }

        fragment.append(section);
      });

      this.replaceChildren(fragment);
      this.dataset.rendered = "true";
    }
  }

  class MarinAppFooter extends HTMLElement {
    connectedCallback() {
      if (this.dataset.rendered === "true") return;

      const appName = normalizedAttribute(this, "app-name", "Application");
      const requestedLinks = parseTokenList(this.getAttribute("links"), "about security accessibility tech updates").filter(
        (key, index, values) => STANDARD_LINKS[key] && values.indexOf(key) === index
      );
      // About, Security, Accessibility, and Updates are required for every
      // MarinOS app. Keep legacy `links` ordering, but never let it omit one.
      const links = [
        ...requestedLinks,
        ...Object.keys(STANDARD_LINKS).filter((key) => !requestedLinks.includes(key)),
      ];
      const extraLinksTemplate = this.querySelector("template[data-footer-links]");
      const platformName = normalizedAttribute(this, "platform-name", "MarinOS");
      const platformUrl = normalizedAttribute(this, "platform-url", MARINOS_URL);

      if (!this.hasAttribute("app-name")) componentWarning(this, 'missing required "app-name" attribute');

      const footer = document.createElement("footer");
      footer.className = "app-footer";
      footer.setAttribute("role", "contentinfo");
      footer.dataset.marinosShellVersion = SHELL_VERSION;

      const inner = document.createElement("div");
      inner.className = "app-footer__inner";
      const local = document.createElement("div");
      local.className = "app-footer__local";
      const name = document.createElement("span");
      name.className = "app-footer__app-name";
      name.textContent = appName;
      local.append(name);

      const navigation = document.createElement("nav");
      navigation.className = "app-footer__nav";
      navigation.setAttribute("aria-label", `${appName} information`);

      // App-owned footer links are intentionally narrow: only top-level anchors
      // with an href and visible label are accepted, and they are prepended to
      // the required standard links. Rebuild rather than clone arbitrary markup.
      const requiredDestinations = new Set(links.map((key) => `#${key}`));
      const seenExtraDestinations = new Set();
      if (extraLinksTemplate instanceof HTMLTemplateElement) {
        Array.from(extraLinksTemplate.content.children).forEach((source) => {
          if (!(source instanceof HTMLAnchorElement)) return;
          const href = source.getAttribute("href")?.trim() || "";
          const label = source.textContent?.trim() || "";
          if (!href || !label) return;

          let destinationKey;
          if (href.startsWith("#")) {
            destinationKey = href.toLowerCase();
          } else {
            let destination;
            try {
              destination = new URL(href, window.location.href);
            } catch {
              return;
            }
            if (!["http:", "https:"].includes(destination.protocol)) return;
            destinationKey = destination.href;
          }
          if (requiredDestinations.has(destinationKey) || seenExtraDestinations.has(destinationKey)) return;

          seenExtraDestinations.add(destinationKey);
          const link = document.createElement("a");
          link.setAttribute("href", href);
          link.textContent = label;
          navigation.append(link);
        });
      }

      links.forEach((key) => {
        const link = document.createElement("a");
        link.href = `#${key}`;
        link.textContent = STANDARD_LINKS[key];
        navigation.append(link);
      });
      local.append(navigation);

      inner.append(local);
      if (!this.hasAttribute("hide-platform-link")) {
        const platform = document.createElement("div");
        platform.className = "app-footer__platform";
        const platformLink = document.createElement("a");
        platformLink.href = platformUrl;
        platformLink.textContent = platformName;
        platform.append(platformLink);
        inner.append(platform);
      }

      footer.append(inner);
      this.replaceChildren(footer);
      this.dataset.rendered = "true";
    }
  }

  class MarinAppFeedback extends HTMLElement {
    connectedCallback() {
      if (this.dataset.rendered === "true") return;

      const href = normalizedAttribute(this, "href", FEEDBACK_URL);
      const label = normalizedAttribute(this, "label", "Feedback");
      const target = normalizedAttribute(this, "target", "_blank");
      const link = document.createElement("a");
      link.className = "app-feedback";
      link.href = href;
      link.textContent = label;
      if (target) {
        link.target = target;
        if (target === "_blank") link.rel = "noreferrer";
      }
      // The link sits outside the page's other landmarks, so the component is its own, named by the link text.
      this.setAttribute("role", "complementary");
      this.setAttribute("aria-label", label);
      this.replaceChildren(link);
      this.dataset.rendered = "true";
      this.watchFooter(link);
    }

    // The button is fixed to the bottom corner, so when the page is scrolled until the
    // footer appears it would sit on top of footer links. Hide it then (only on pages
    // that scroll, so a short page keeps its button). It stays in the tab order and
    // shows itself on keyboard focus, so it is never unreachable.
    watchFooter(link) {
      let queued = false;
      const update = () => {
        queued = false;
        const footer = document.querySelector("marin-app-footer .app-footer");
        const scrolls = document.documentElement.scrollHeight > window.innerHeight + 1;
        const over = Boolean(footer) && scrolls && footer.getBoundingClientRect().top < window.innerHeight;
        link.toggleAttribute("data-over-footer", over);
      };
      const schedule = () => {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(update);
      };
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
      if (typeof ResizeObserver === "function") new ResizeObserver(schedule).observe(document.body);
      update();
    }
  }

  const componentDefinitions = [
    ["marin-os-banner", MarinOsBanner],
    ["marin-app-header", MarinAppHeader],
    ["marin-app-info", MarinAppInfo],
    ["marin-app-footer", MarinAppFooter],
    ["marin-app-feedback", MarinAppFeedback],
  ];

  componentDefinitions.forEach(([name, constructor]) => {
    if (!customElements.get(name)) customElements.define(name, constructor);
  });

  function ensureInfrastructure() {
    if (!document.querySelector(".skip-link")) {
      const skipLink = document.createElement("a");
      skipLink.className = "skip-link";
      skipLink.href = "#main";
      skipLink.textContent = "Skip to main content";
      document.body.prepend(skipLink);
    }

    const main = document.querySelector("main#main");
    if (!main) {
      console.warn(`[Marin App Shell ${SHELL_VERSION}] No <main id="main"> element was found.`);
      return;
    }

    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    if (!document.querySelector("#app-status-message")) {
      const status = document.createElement("div");
      status.id = "app-status-message";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      main.prepend(status);
    }
  }

  ensureInfrastructure();

  const menuToggle = document.querySelector("#menu-toggle");
  const navigation = document.querySelector("#app-nav");
  const menuQuery = window.matchMedia("(max-width: 720px)");

  function closeMenu() {
    menuToggle?.setAttribute("aria-expanded", "false");
    navigation?.removeAttribute("data-open");
  }

  if (menuToggle && navigation) {
    menuToggle.addEventListener("click", () => {
      const open = menuToggle.getAttribute("aria-expanded") !== "true";
      menuToggle.setAttribute("aria-expanded", String(open));
      navigation.toggleAttribute("data-open", open);
    });

    navigation.addEventListener("click", (event) => {
      if (event.target instanceof HTMLAnchorElement && menuQuery.matches) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
        closeMenu();
        menuToggle.focus();
      }
    });

    menuQuery.addEventListener("change", (event) => {
      if (!event.matches) closeMenu();
    });
  }

  // Each .menu (a toggle button and its panel) opens and closes with no per-page script. An app that builds a menu after the page
  // loads (Marin Learn's notes) calls window.marinWireMenus(container) once the menu is in the page; marinFormatMenus does it for
  // the menus inside the container it wires.
  function wireMenu(menu) {
    const toggle = menu.querySelector(":scope > .menu-toggle");
    const panel = menu.querySelector(":scope > .menu-panel");
    if (!toggle || !panel || menu.dataset.menuWired) return;
    menu.dataset.menuWired = "true";

    function closeMenuPanel() {
      toggle.setAttribute("aria-expanded", "false");
      panel.hidden = true;
    }

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      document.querySelectorAll(".menu-toggle[aria-expanded='true']").forEach((otherToggle) => {
        if (otherToggle !== toggle) {
          otherToggle.setAttribute("aria-expanded", "false");
          otherToggle.closest(".menu")?.querySelector(":scope > .menu-panel")?.setAttribute("hidden", "");
        }
      });
      toggle.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
    });

    panel.addEventListener("click", (event) => {
      if (event.target.closest("a, button")) closeMenuPanel();
    });

    document.addEventListener("click", (event) => {
      if (toggle.getAttribute("aria-expanded") === "true" && !menu.contains(event.target)) closeMenuPanel();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        closeMenuPanel();
        toggle.focus();
      }
    });
  }

  function wireMenus(root = document) {
    root.querySelectorAll(".menu").forEach(wireMenu);
  }

  wireMenus();
  window.marinWireMenus = wireMenus;

  // MarinOS banner menu: refresh from marinos/catalog.json so a new app
  // shows up in every other app's banner automatically, instead of every
  // app's HTML needing a hand edit. Falls back to the page's static links —
  // never touches the DOM — if the fetch fails, times out, or the response
  // isn't shaped as expected. Cached in localStorage for a few hours so a
  // visit doesn't refetch the catalog on every page load.
  const marinosMenuPanel = document.querySelector("#marinos-menu-panel");
  if (marinosMenuPanel) {
    const menuCatalogUrl = marinosMenuPanel.dataset.catalogUrl || CATALOG_URL;
    // Bump this whenever the expected catalog shape or rendering changes
    // (for example, adding the `icon` field) so browsers holding an older
    // cached shape refetch immediately instead of waiting out the TTL.
    const CACHE_KEY = "marinos-catalog-cache-v3";
    const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

    function readCatalogCache() {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.entries) || typeof parsed.fetchedAt !== "number") return null;
        if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
        return parsed.entries;
      } catch {
        return null;
      }
    }

    function writeCatalogCache(entries) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ entries, fetchedAt: Date.now() }));
      } catch {
        // Storage full or unavailable — refetching next load is fine.
      }
    }

    function renderMarinosMenu(entries) {
      if (!Array.isArray(entries)) return;
      const current = window.location.href;
      // An app marked "unlisted": true in the catalog is not shown in the menu.
      const links = entries
        .filter((entry) => !(entry && entry.unlisted))
        .map((entry) => createMenuLink(entry))
        .filter((link) => link && !current.startsWith(link.href));
      if (!links.length) return;

      const allLink = marinosMenuPanel.querySelector(".marinos-menu__all");
      marinosMenuPanel.querySelectorAll("a:not(.marinos-menu__all)").forEach((link) => link.remove());
      const fragment = document.createDocumentFragment();
      fragment.append(...links);
      if (allLink) allLink.before(fragment);
      else marinosMenuPanel.append(fragment);
    }

    function renderOwnStatusBadge(entries) {
      if (!Array.isArray(entries) || localManifestStatus) return;

      const header = document.querySelector("marin-app-header");
      const appId = (header ? normalizedAttribute(header, "app-id") : "") || document.body.dataset.appId || "";
      const current = window.location.href;
      const self = appId
        ? entries.find((entry) => entry && entry.id === appId)
        : entries.find((entry) => {
            const href = safeLinkUrl(entry?.url);
            return href && current.startsWith(href);
          });
      renderAppTitleStatus(self?.status, "catalog");
    }

    // Stale-while-revalidate: the cache is only for instant paint on repeat
    // visits, never for skipping the network. Always fetch fresh in the
    // background and re-render if it differs, so a catalog.json fix reaches
    // a returning visitor on the next load instead of up to CACHE_TTL_MS
    // later — a stale-icon report once took hours to explain because of
    // this cache, before it revalidated on every load like this.
    const cachedEntries = readCatalogCache();
    if (cachedEntries) {
      renderMarinosMenu(cachedEntries);
      renderOwnStatusBadge(cachedEntries);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    fetch(menuCatalogUrl, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("bad response"))))
      .then((entries) => {
        writeCatalogCache(entries);
        if (JSON.stringify(entries) !== JSON.stringify(cachedEntries)) {
          renderMarinosMenu(entries);
          renderOwnStatusBadge(entries);
        }
      })
      .catch(() => {
        // Leave whatever's already rendered (cache or static banner links) as-is.
      })
      .finally(() => clearTimeout(timeout));
  }

  const documentHeadings = document.querySelectorAll(
    ".docs-content h2, .docs-content h3, .docs-content h4, .content h2, .content h3, .content h4"
  );

  const claimedHeadingIds = new Set(Array.from(document.querySelectorAll("[id]"), (element) => element.id));

  function headingTargetId(heading) {
    if (heading.id) return heading.id;

    const section = heading.closest("section[id]");
    if (section && section.querySelector(":scope > h2, :scope > h3, :scope > h4") === heading) {
      return section.id;
    }

    const base = heading.textContent
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "section";
    let id = base;
    let suffix = 2;
    while (claimedHeadingIds.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    heading.id = id;
    claimedHeadingIds.add(id);
    return id;
  }

  documentHeadings.forEach((heading) => {
    if (heading.querySelector(".heading-anchor")) return;
    const targetId = headingTargetId(heading);

    const anchor = document.createElement("a");
    anchor.className = "heading-anchor";
    anchor.href = `#${targetId}`;
    anchor.setAttribute("aria-label", `Link to ${heading.textContent.trim()}`);
    anchor.textContent = "#";
    heading.append(" ", anchor);
  });

  // "On this page" table of contents: every .docs-toc / .toc marks the link for the
  // section being read with aria-current="location" (CSS makes it bold and accent
  // blue). The current section is the last one whose top has scrolled past a line
  // near the top of the window; at the very bottom of the page the last section
  // counts, even when it is too short to reach that line. Set data-on-this-page-line
  // on the list to move the line. A page that adds its
  // table of contents after load calls window.marinOnThisPage(nav).
  function marinOnThisPage(toc) {
    if (!toc || toc.dataset.onThisPageReady) return;
    const items = Array.from(toc.querySelectorAll('a[href^="#"]'))
      .filter((link) => link.hash.length > 1)
      .map((link) => ({ link, target: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
      .filter((item) => item.target);
    if (!items.length) return;
    toc.dataset.onThisPageReady = "true";

    let scheduled = false;
    function update() {
      scheduled = false;
      // The reading line: a quarter of the way down the window by default, or the
      // pixel distance from the top set with data-on-this-page-line (a page of short
      // sections wants a line near the top so a section at the top is the current one).
      const line = Number(toc.dataset.onThisPageLine);
      const threshold = line > 0 ? line : Math.max(96, window.innerHeight * 0.28);
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let current = items[0];
      items.forEach((item) => {
        if (item.target.offsetParent === null) return;
        if (item.target.getBoundingClientRect().top <= threshold) current = item;
      });
      if (atBottom) current = items[items.length - 1];
      items.forEach((item) => {
        if (item === current) item.link.setAttribute("aria-current", "location");
        else item.link.removeAttribute("aria-current");
      });
    }
    function schedule() {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    // Stop listening when the page replaces this table of contents.
    const watcher = new MutationObserver(() => {
      if (!document.contains(toc)) {
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
        window.removeEventListener("hashchange", schedule);
        watcher.disconnect();
      }
    });
    watcher.observe(document.body, { childList: true, subtree: true });
    update();
  }
  window.marinOnThisPage = marinOnThisPage;
  document.querySelectorAll(".docs-toc, .toc").forEach(marinOnThisPage);

  // Steps layout: <nav class="steps" data-steps> holds an <ol> of links to the step sections (.step, each with an
  // h2 and any .step-box parts). One step shows at a time; without JavaScript every step stays on the page and the
  // links jump down to it. The shell:
  //  - marks the current link aria-current="step" and gives every link a state word ("Completed" for the steps
  //    before the current one, "Current", "Up next") in a .step-state span, with data-step-state for the styles.
  //    Nothing is saved: completed only means earlier. Any step can be opened at any time, forward or back,
  //  - writes the "Step 2 of 6: Analyze" line and a progress bar into .steps-progress, and shows it. The line is
  //    not a live region: the current step's h2 is described by a hidden "Step 2 of 6", so when focus moves to the
  //    heading a screen reader says the heading and the position once,
  //  - sets the page title to "App: Analyze (step 2 of 6)" (the app is the title up to " | ") while the steps are on
  //    screen, and puts the original title back when another tab is shown (WCAG 2.4.2),
  //  - ends every step with Previous and Next buttons ([data-prev-step], [data-next-step] hold the step id; a step
  //    that already has its own .steps-pager keeps it, and its buttons stay hidden in the page until JavaScript runs),
  //    and shows the toggle that controls the column, which is also hidden until JavaScript runs,
  //  - builds "On this page" into [data-steps-toc] from the current step's .step-box headings (h3), giving
  //    each box an id, and rebuilds it when the step changes,
  //  - on a narrow screen closes the open step list when a step is chosen, so the step shows,
  //  - follows the address: #step or #box-inside-a-step, the Back button, and moves focus to the step's h2
  //    when the person changes step,
  //  - dispatches a bubbling "marin-step-change" event on the nav ({ detail: { id, index, total, name } }).
  // Link text is "1. Name" (a number in the words, never in a shape).
  const STEP_STATE_WORDS = { complete: "Completed", current: "Current", upcoming: "Up next" };
  function marinSteps(nav) {
    if (!nav || nav.dataset.stepsReady) return null;
    const steps = Array.from(nav.querySelectorAll('a[href^="#"]'))
      .map((link) => ({ link, id: decodeURIComponent(link.hash.slice(1)) }))
      .map((step) => ({ ...step, section: document.getElementById(step.id) }))
      .filter((step) => step.section);
    if (!steps.length) return null;
    nav.dataset.stepsReady = "true";

    const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    steps.forEach((step) => {
      if (!step.link.querySelector(".step-name")) {
        const text = step.link.textContent.trim();
        step.link.textContent = "";
        const name = document.createElement("span");
        name.className = "step-name";
        name.textContent = text;
        const state = document.createElement("span");
        state.className = "step-state";
        step.link.append(name, state);
      }
      step.label = step.link.querySelector(".step-name").textContent.trim();
      step.title = step.label.replace(/^\d+\.\s*/, "");
      step.section.querySelectorAll(".step-box").forEach((box) => {
        const heading = box.querySelector("h3");
        if (heading && !box.id) box.id = `${step.id}-${slug(heading.textContent)}`;
      });
    });

    // Previous and Next are part of the layout: every step ends with them unless the page already wrote its own
    // .steps-pager. Next is the one solid button, with the next step's name in lowercase and an arrow after the words;
    // Previous is a quiet icon-only button with the arrow before it, named by aria-label and title. The first step has no
    // Previous and the last has no Next (they are left out, never disabled). The arrows are drawn by the shell and are
    // decoration. Both buttons sit in a named nav (not role=group, whose Pico styles join the buttons), 44 px or more, in the tab order after the step's content.
    steps.forEach((step, index) => {
      if (step.section.querySelector(".steps-pager")) return;
      const pager = document.createElement("nav");
      pager.className = "steps-pager";
      pager.setAttribute("aria-label", "Previous and next step");
      if (index > 0) {
        const name = `Previous: ${steps[index - 1].title.toLowerCase()}`;
        const previous = document.createElement("button");
        previous.type = "button";
        previous.className = "action-button";
        previous.dataset.prevStep = steps[index - 1].id;
        previous.dataset.icon = "arrow-left";
        previous.setAttribute("aria-label", name);
        previous.title = name;
        pager.append(previous);
      }
      if (index < steps.length - 1) {
        const next = document.createElement("button");
        next.type = "button";
        next.className = "primary";
        next.dataset.nextStep = steps[index + 1].id;
        next.dataset.iconEnd = "arrow-right";
        next.textContent = `Next: ${steps[index + 1].title.toLowerCase()}`;
        pager.append(next);
      }
      step.section.append(pager);
    });

    const progress = document.querySelector(".steps-progress");
    let progressText = null;
    let progressBar = null;
    if (progress) {
      progressText = progress.querySelector("p");
      progressBar = progress.querySelector("progress");
      if (!progressText) {
        progressText = document.createElement("p");
        progress.append(progressText);
      }
      if (!progressBar) {
        progressBar = document.createElement("progress");
        progressBar.setAttribute("aria-hidden", "true");
        progress.append(progressBar);
      }
      progressBar.max = steps.length;
      progress.hidden = false;
    }
    document.querySelectorAll("[data-next-step], [data-prev-step]").forEach((button) => { button.hidden = false; });
    // The hidden position the current heading is described by ("Step 2 of 6").
    const position = document.createElement("span");
    position.id = "steps-position";
    position.className = "visually-hidden";
    (progress || nav).append(position);
    const baseTitle = document.title;
    const appName = baseTitle.split(" | ")[0];
    const host = nav.closest("section");
    let currentStep = steps[0];
    let currentIndex = 0;
    function syncTitle() {
      document.title = host && host.hidden ? baseTitle : `${appName}: ${currentStep.title} (step ${currentIndex + 1} of ${steps.length})`;
    }
    const panel = nav.closest(".search-sidebar");
    if (panel && panel.id) document.querySelectorAll(`button[aria-controls="${panel.id}"]`).forEach((button) => { button.hidden = false; });

    const tocHolder = document.querySelector("[data-steps-toc]");
    let tocStep = null;
    function buildToc(step) {
      if (!tocHolder || tocStep === step.id) return;
      tocStep = step.id;
      tocHolder.textContent = "";
      const boxes = Array.from(step.section.querySelectorAll(".step-box[id]"));
      if (boxes.length < 2) return;
      const toc = document.createElement("nav");
      toc.className = "toc steps-toc";
      toc.setAttribute("aria-label", "On this page");
      const title = document.createElement("h2");
      title.textContent = "On this page";
      const list = document.createElement("ul");
      boxes.forEach((box) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = `#${box.id}`;
        link.textContent = box.querySelector("h3").textContent;
        // The step is named after the visible words, so the link still says where it goes out of context.
        const context = document.createElement("span");
        context.className = "visually-hidden";
        context.textContent = ` (${step.label})`;
        link.append(context);
        item.append(link);
        list.append(item);
      });
      toc.append(title, list);
      tocHolder.append(toc);
      marinOnThisPage(toc);
    }

    const indexOf = (id) => steps.findIndex((step) => step.id === id);
    function stepOfHash(hash) {
      if (indexOf(hash) >= 0) return hash;
      const target = hash ? document.getElementById(hash) : null;
      const section = target && target.closest(".step");
      return section && indexOf(section.id) >= 0 ? section.id : steps[0].id;
    }

    function show(id, moveFocus) {
      const current = Math.max(indexOf(id), 0);
      steps.forEach((step, index) => {
        step.section.hidden = index !== current;
        const state = index < current ? "complete" : index === current ? "current" : "upcoming";
        step.link.dataset.stepState = state;
        step.link.querySelector(".step-state").textContent = STEP_STATE_WORDS[state];
        if (state === "current") step.link.setAttribute("aria-current", "step");
        else step.link.removeAttribute("aria-current");
      });
      const step = steps[current];
      currentStep = step;
      currentIndex = current;
      position.textContent = `Step ${current + 1} of ${steps.length}`;
      steps.forEach((other) => {
        const heading = other.section.querySelector(":scope > h2");
        if (!heading) return;
        if (other === step) heading.setAttribute("aria-describedby", position.id);
        else heading.removeAttribute("aria-describedby");
      });
      syncTitle();
      buildToc(step);
      if (progress) {
        progressText.textContent = `Step ${current + 1} of ${steps.length}: ${step.title}`;
        progressBar.value = current + 1;
      }
      nav.dispatchEvent(new CustomEvent("marin-step-change", { bubbles: true, detail: { id: step.id, index: current, total: steps.length, name: step.title } }));
      if (moveFocus) focusHeading(step);
    }

    function focusHeading(step) {
      const heading = step.section.querySelector(":scope > h2");
      if (!heading) return;
      heading.tabIndex = -1;
      heading.focus();
      heading.scrollIntoView({ block: "start" });
    }

    // On a narrow screen the open list sits above the step, so choosing a step closes it and the step is what shows.
    const narrowScreen = window.matchMedia("(max-width: 850px)");
    function closeListOnNarrow() {
      if (!narrowScreen.matches || !panel || !panel.id) return;
      const toggle = document.querySelector(`button[aria-controls="${panel.id}"]`);
      if (toggle && toggle.getAttribute("aria-expanded") === "true") toggle.click();
    }

    function go(id) {
      const url = new URL(window.location.href);
      url.hash = id;
      window.history.pushState(null, "", url);
      show(id, true);
    }

    steps.forEach((step) => {
      step.link.addEventListener("click", (event) => {
        event.preventDefault();
        closeListOnNarrow();
        go(step.id);
      });
    });
    document.querySelectorAll("[data-next-step], [data-prev-step]").forEach((button) => {
      button.addEventListener("click", () => go(button.dataset.nextStep || button.dataset.prevStep));
    });
    // Back and Forward between steps move focus to the heading, like Next and Previous. A hash that names another tab
    // (About, Updates) leaves the step alone.
    window.addEventListener("popstate", () => {
      const hash = window.location.hash.slice(1);
      const target = hash ? document.getElementById(decodeURIComponent(hash)) : null;
      if (hash && indexOf(hash) < 0 && !(target && target.closest(".step"))) return;
      // The browser clears focus right after a history event, so the heading takes it a moment later.
      show(stepOfHash(hash), false);
      const step = currentStep;
      window.setTimeout(() => focusHeading(step), 0);
    });
    // The title follows the tab: it is the step's while the steps are shown and the page's own when another tab is.
    if (host) new MutationObserver(syncTitle).observe(host, { attributes: true, attributeFilter: ["hidden"] });

    const hash = window.location.hash.slice(1);
    show(stepOfHash(hash), false);
    const first = hash ? document.getElementById(decodeURIComponent(hash)) : null;
    if (first && first.classList.contains("step-box")) first.scrollIntoView();
    return { go, show };
  }
  window.marinSteps = marinSteps;
  document.querySelectorAll("nav[data-steps]").forEach(marinSteps);

  // Collapsible filter panels (Marin UI 1.28.0): any button[data-filter-toggle] hides and shows the filter
  // panel it controls (aria-controls) inside its nearest .search-layout. The shell draws the Lucide
  // panel-right-open icon while the panel is open and panel-left-open while it is hidden (unless the button holds
  // its own SVGs marked data-filter-icon="open" and "closed"), sets aria-expanded, data-open on the panel and
  // data-filters ("open" or "closed") on the layout, starts open on wide screens (a choice made there is remembered
  // per app and toggle in this browser) and closed up to 850px, names the button "Filter" (or data-filter-label)
  // plus ", N active" from data-filter-active, and dispatches a bubbling "marin-filters-change" event
  // ({ detail: { open, button, panel } }) so an app can resize anything sized by the results. Hiding the panel
  // never changes a filter. The button has no visible text, so its name is its label.
  function setupFilterToggles(filterToggles) {
  if (filterToggles.length) {
    const narrowFilters = window.matchMedia("(max-width: 850px)");

    function filterStorageKey(button) {
      const app = document.body.dataset.appId || window.location.pathname;
      return `marinos.filters.${app}.${button.dataset.filterToggle || "filters"}`;
    }

    function savedFilterChoice(button) {
      try {
        return window.localStorage.getItem(filterStorageKey(button));
      } catch {
        return null;
      }
    }

    function setFilterPanel(button, open, remember) {
      const layout = button.closest(".search-layout");
      const panel = document.getElementById(button.getAttribute("aria-controls"));
      if (!layout || !panel) return;
      panel.dataset.open = String(open);
      layout.dataset.filters = open ? "open" : "closed";
      button.setAttribute("aria-expanded", String(open));
      // SVG elements have no hidden property, so the attribute is toggled directly.
      button.querySelector('[data-filter-icon="open"]')?.toggleAttribute("hidden", !open);
      button.querySelector('[data-filter-icon="closed"]')?.toggleAttribute("hidden", open);
      if (remember && !narrowFilters.matches) {
        try {
          window.localStorage.setItem(filterStorageKey(button), open ? "open" : "closed");
        } catch {
          // The choice is just not remembered.
        }
      }
      layout.dispatchEvent(new CustomEvent("marin-filters-change", { bubbles: true, detail: { open, button, panel } }));
    }

    function nameFilterToggle(button) {
      const count = Number(button.dataset.filterActive) || 0;
      const base = button.dataset.filterLabel || "Filter";
      const name = count ? `${base}, ${count} active` : base;
      button.setAttribute("aria-label", name);
      button.title = name;
    }

    function applyFilterDefaults() {
      filterToggles.forEach((button) => {
        setFilterPanel(button, !narrowFilters.matches && savedFilterChoice(button) !== "closed", false);
      });
    }

    const filterNames = new MutationObserver((records) => records.forEach((record) => nameFilterToggle(record.target)));
    filterToggles.forEach((button) => {
      if (!button.querySelector("svg")) {
        const open = createLucideIcon("panel-right-open");
        const closed = createLucideIcon("panel-left-open");
        open.dataset.filterIcon = "open";
        closed.dataset.filterIcon = "closed";
        button.append(open, closed);
      }
      nameFilterToggle(button);
      filterNames.observe(button, { attributes: true, attributeFilter: ["data-filter-active", "data-filter-label"] });
      button.addEventListener("click", () => {
        const panel = document.getElementById(button.getAttribute("aria-controls"));
        if (panel) setFilterPanel(button, panel.dataset.open !== "true", true);
      });
      // On a narrow screen the open panel sits over the results: Escape closes it and returns to its button.
      document.getElementById(button.getAttribute("aria-controls"))?.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !narrowFilters.matches || event.defaultPrevented) return;
        setFilterPanel(button, false, true);
        button.focus();
      });
    });
    narrowFilters.addEventListener("change", applyFilterDefaults);
    applyFilterDefaults();
  }
  }
  setupFilterToggles(document.querySelectorAll("button[data-filter-toggle]"));

  // Filter column drawn from filters.json: <div class="search-side" data-filter-column="filters.json"> inside a
  // .search-layout. The file is checked against schemas/filter-panel.schema.json; the shell draws the toggle
  // button, the "Filter" title, the Reset button, the "Search" field and each group, so no app writes the words
  // or the markup. Options come from the app's own data (options.from) or from the file's own list.
  //  - data-filter-name (default: the app id) names the toggle and its saved open/closed choice.
  //  - Choices live in the address (q, and each group's param; a date range uses param-from and param-to).
  //  - The column element gets filterState (search and every group's choice), setCounts(groupId, {value: n}) and
  //    reset(), and dispatches bubbling events: "marin-filter-ready" once drawn and "marin-filter-change"
  //    ({ detail: { state, source } }) when a choice changes (search waits for a pause in typing).
  //  - Options are never disabled, even with a count of 0, so they stay reachable by keyboard and screen reader.
  //  - The toggle's name carries the active count ("Filter, 3 active"). Reset says "Filters reset." through
  //    #app-status-message (or the column's own status line) and leaves focus on the Reset button; the app's own
  //    results status says how many results are left.
  const FILTER_SEARCH_PAUSE = 400;

  async function renderFilterColumn(column) {
    const getJson = async (path) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      return response.json();
    };
    const make = (tag, attributes = {}, children = []) => {
      const node = document.createElement(tag);
      Object.entries(attributes).forEach(([key, value]) => {
        if (value === false || value == null) return;
        if (key === "text") node.textContent = value;
        else node.setAttribute(key, value === true ? "" : value);
      });
      node.append(...children);
      return node;
    };
    const compare = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });

    const config = await getJson(column.dataset.filterColumn);
    const name = column.dataset.filterName || document.body.dataset.appId || "filters";
    const panelId = `${name}-filter-panel`;
    const titleId = `${panelId}-title`;
    const url = new URL(window.location.href);

    async function resolveOptions(spec, groupBy = []) {
      if (spec.app) return [];
      if (spec.values) return spec.values.map((one) => ({ value: String(one.value), label: one.label, count: null, hidden: one.hidden === true }));
      const data = await getJson(spec.from);
      const records = spec.records ? spec.records.split(".").reduce((found, key) => found?.[key], data) : data;
      const found = new Map();
      (Array.isArray(records) ? records : []).forEach((record) => {
        [].concat(record?.[spec.valueField] ?? []).forEach((value) => {
          if (value === "" || value == null) return;
          const key = String(value);
          const label = spec.labelField && !Array.isArray(record[spec.valueField]) ? String(record[spec.labelField] ?? key) : key;
          const parent = spec.parentField && !Array.isArray(record[spec.valueField]) && record[spec.parentField] ? String(record[spec.parentField]) : "";
          const entry = found.get(key) || { value: key, label, count: 0, parent, path: groupBy.map((field) => String(record[field] ?? "Other")) };
          entry.count += 1;
          found.set(key, entry);
        });
      });
      // "order": "data" keeps the choices in the order the file lists them, instead of A to Z.
      return spec.order === "data" ? [...found.values()] : [...found.values()].sort((a, b) => compare(a.label, b.label));
    }

    const groups = await Promise.all(
      config.groups.map(async (group) => ({ ...group, param: group.param || group.id, list: group.options ? await resolveOptions(group.options, group.groupBy) : [] }))
    );

    const latest = (group) => group.list.map((one) => one.value).sort(compare).pop() || "";
    const defaultFor = (group) => {
      if (group.type === "checkbox" || group.type === "nested-checkbox") return [...(group.default || [])];
      if (group.type === "date-range") return { from: "", to: "" };
      if (group.type === "radio" || group.type === "select") return group.default === "latest" ? latest(group) : group.default ?? "";
      return "";
    };
    const isMany = (group) => group.type === "checkbox" || group.type === "nested-checkbox";
    // "address": false in the file keeps every choice out of the address (a table's own filter, say).
    const addressOn = config.address !== false;
    // "fromParam" and "toParam" name a date range's address parameters, for an app whose links already used them.
    const dateParams = (group) => [group.fromParam || `${group.param}-from`, group.toParam || `${group.param}-to`];
    const fromAddress = (group) => {
      const params = url.searchParams;
      if (!addressOn) return defaultFor(group);
      // "separator" reads a list written in one parameter ("a,b"), as an app's older shared links did.
      if (isMany(group)) return params.has(group.param) ? params.getAll(group.param).flatMap((one) => (group.separator ? one.split(group.separator) : [one])).filter(Boolean) : defaultFor(group);
      if (group.type === "date-range") {
        // Only real dates count, and a range written backwards is turned round, as an app's older links expected.
        const [fromKey, toKey] = dateParams(group);
        const day = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value : "");
        const range = { from: day(params.get(fromKey)), to: day(params.get(toKey)) };
        return range.from && range.to && range.from > range.to ? { from: range.to, to: range.from } : range;
      }
      return params.has(group.param) ? params.get(group.param) : defaultFor(group);
    };

    const state = { search: addressOn ? url.searchParams.get("q") || "" : "", groups: {} };
    groups.forEach((group) => {
      state.groups[group.id] = fromAddress(group);
    });

    const isActive = (group) => {
      const value = state.groups[group.id];
      if (group.type === "date-range") return Boolean(value.from || value.to);
      // A hidden choice (a "Report dates" time range) is what the app shows, not something the person chose.
      if (group.list.some((option) => option.hidden && option.value === value)) return false;
      return JSON.stringify(value) !== JSON.stringify(defaultFor(group));
    };
    const activeCount = () => (state.search.trim() ? 1 : 0) + groups.filter(isActive).length;

    const status = document.querySelector("#app-status-message") || make("div", { class: "visually-hidden", role: "status", "aria-live": "polite", "aria-atomic": "true" });
    const announce = (message) => {
      status.textContent = "";
      window.setTimeout(() => {
        status.textContent = message;
      }, 50);
    };

    // The results message. An element marked data-filter-results beside the column (inside the same .search-layout)
    // holds it; without one the column announces it through the status line. The app calls setResults(count) after
    // it has filtered, and the column says "N results." once, or "No results." with a Reset filters button.
    const resultsEl = column.closest(".search-layout")?.querySelector("[data-filter-results]");
    if (resultsEl) {
      resultsEl.setAttribute("role", "status");
      resultsEl.setAttribute("aria-live", "polite");
      resultsEl.setAttribute("aria-atomic", "true");
    }
    let resetPending = false;
    let resetTimer;

    // The toggle button, then the panel.
    const toggle = make("button", { type: "button", id: `${panelId}-toggle`, class: "filter-toggle", "data-filter-toggle": name, "aria-controls": panelId });
    const resetIcon = createLucideIcon("rotate-ccw");
    const resetButton = make("button", { type: "button", class: "action-button", "aria-label": "Reset filters", title: "Reset filters" }, [resetIcon]);
    const header = make("div", { class: "search-panel-header" }, [make("h2", { class: "search-panel-title", id: titleId, text: "Filter" }), resetButton]);

    // The search box is left out when the file has no "search" (a short list that needs none).
    let searchInput = null;
    let searchField = null;
    if (config.search) {
      searchInput = make("input", { type: "search", id: config.search.id, autocomplete: "off" });
      searchInput.value = state.search;
      searchField = make("div", { class: "search-input-field" }, [make("label", { for: config.search.id, text: "Search" }), searchInput]);
    }

    const controls = {};
    const groupCounts = {};
    const disabledGroups = new Set();
    const summaryFor = (group) => {
      const count = state.groups[group.id].length;
      return count ? `${count} selected` : group.allLabel;
    };
    const countNote = (option) => (option.count == null ? [] : [" ", make("span", { class: "search-facet-count", text: `(${option.count})` })]);

    function buildGroup(group) {
      const legendId = `${panelId}-${group.id}-legend`;
      const fieldset = make("fieldset", { class: "search-facet-group", id: `${group.id}-facet` }, [make("legend", { id: legendId, text: group.label })]);
      const controlId = (value) => `${panelId}-${group.id}-${String(value).replace(/[^a-z0-9]+/gi, "-")}`;
      if (isMany(group)) {
        const by = group.groupBy || [];
        const inputs = [];
        const summaries = [];
        const chosen = () => state.groups[group.id];
        // A choice whose parentField names another choice in the same list is listed under that parent (a division
        // under its department). Parent and child are separate checkboxes; choosing one does not choose the other.
        const item = (option, children) => {
          const input = make("input", { type: "checkbox", name: group.id, value: option.value, id: `${panelId}-${group.id}-${inputs.length}` });
          input.checked = chosen().includes(option.value);
          inputs.push(input);
          const under = children.get(option.value) || [];
          return make("li", {}, [
            make("label", {}, [input, make("span", { text: option.label }), ...countNote(option)]),
            ...(under.length ? [make("ul", { class: "search-facet-list search-facet-children" }, under.map((child) => item(child, children)))] : []),
          ]);
        };
        const list = (options) => {
          const ids = new Set(options.map((option) => option.value));
          const children = new Map();
          options.forEach((option) => {
            if (option.parent && option.parent !== option.value && ids.has(option.parent)) children.set(option.parent, [...(children.get(option.parent) || []), option]);
          });
          const placed = new Set();
          const mark = (option) => { placed.add(option.value); (children.get(option.value) || []).forEach(mark); };
          const roots = options.filter((option) => !(option.parent && option.parent !== option.value && ids.has(option.parent)));
          roots.forEach(mark);
          // A loop of parents (a is under b, b is under a) has no top; its choices are listed at the top, not lost.
          const loose = options.filter((option) => !placed.has(option.value));
          loose.forEach((option) => children.delete(option.value));
          return make("ul", { class: "search-facet-list", id: by.length ? null : `${group.id}-options` }, [...roots, ...loose].map((option) => item(option, children)));
        };
        // Nested groups (groupBy): one collapsed group for each value of a field, in the order the data first shows them.
        // A choice whose path is shorter than the depth sits directly in the group above (a facet with only one group).
        const branch = (options, depth, trail = []) => {
          if (depth >= by.length) return list(options);
          const deeper = (option) => option.path.length > depth && option.path[depth] != null;
          const parts = new Map();
          options.filter(deeper).forEach((option) => parts.set(option.path[depth], [...(parts.get(option.path[depth]) || []), option]));
          const wrap = make("div");
          const here = options.filter((option) => !deeper(option));
          if (here.length) wrap.append(list(here));
          parts.forEach((subset, name) => {
            const summary = make("summary", { text: name });
            const key = [...trail, name].join(" / ");
            summaries.push({ summary, name, key, values: new Set(subset.map((option) => option.value)) });
            wrap.append(make("details", { class: "mm-facet-group", open: subset.some((option) => chosen().includes(option.value)) }, [summary, branch(subset, depth + 1, [...trail, name])]));
          });
          return wrap;
        };
        let simpleSummary;
        let body;
        if (by.length) body = branch(group.list, 0);
        else if (group.collapsed === false) body = list(group.list);
        else {
          simpleSummary = make("summary", { id: `${group.id}-summary`, text: summaryFor(group) });
          body = make("details", { class: "mm-facet-group", open: chosen().length > 0 }, [simpleSummary, list(group.list)]);
        }
        fieldset.append(body);
        const refresh = () => {
          if (simpleSummary) simpleSummary.textContent = summaryFor(group);
          summaries.forEach(({ summary, name, key, values }) => {
            const count = chosen().filter((value) => values.has(value)).length;
            const total = (groupCounts[group.id] || {})[key];
            summary.textContent = `${name}${total == null ? "" : ` (${total})`}${count ? ` (${count} selected)` : ""}`;
          });
        };
        refresh();
        fieldset.addEventListener("change", () => {
          state.groups[group.id] = inputs.filter((input) => input.checked).map((input) => input.value);
          refresh();
          changed(group.id);
        });
        controls[group.id] = { list: fieldset, refresh, sync() {
          inputs.forEach((input) => { input.checked = chosen().includes(input.value); });
          refresh();
          // A group holding a choice is open, so a choice set by the app is never hidden; with nothing chosen (Reset) all close.
          fieldset.querySelectorAll("details").forEach((details) => { details.open = Boolean(details.querySelector("input:checked")); });
        } };
      } else if (group.type === "radio") {
        const list = make("ul", { class: "search-facet-list", id: `${group.id}-options` });
        group.list.forEach((option) => {
          const input = make("input", { type: "radio", name: `${panelId}-${group.id}`, value: option.value, id: controlId(option.value) });
          input.checked = state.groups[group.id] === option.value;
          list.append(make("li", { hidden: option.hidden }, [make("label", {}, [input, make("span", { text: option.label }), ...countNote(option)])]));
        });
        fieldset.append(list);
        list.addEventListener("change", (event) => {
          state.groups[group.id] = event.target.value;
          changed(group.id);
        });
        controls[group.id] = { list, sync() { list.querySelectorAll("input").forEach((input) => { input.checked = input.value === state.groups[group.id]; }); } };
      } else if (group.type === "select") {
        const select = make("select", { id: `${panelId}-${group.id}`, "aria-labelledby": legendId }, group.allLabel ? [make("option", { value: "", text: group.allLabel })] : []);
        group.list.forEach((option) => select.append(make("option", { value: option.value, text: option.label, hidden: option.hidden })));
        select.value = state.groups[group.id];
        fieldset.append(select);
        select.addEventListener("change", () => {
          state.groups[group.id] = select.value;
          changed(group.id);
        });
        controls[group.id] = { select, sync() { select.value = state.groups[group.id]; } };
      } else {
        // A To date before the From date is not applied: both fields are marked invalid, tied to a visible message
        // that is announced, and the results stay as they were until the range is fixed.
        const rangeError = make("p", { class: "app-error", id: `${panelId}-${group.id}-error`, role: "alert", hidden: true, text: "The To date must be on or after the From date." });
        const showRange = (bad) => {
          rangeError.hidden = !bad;
          [from.input, to.input].forEach((one) => {
            if (bad) {
              one.setAttribute("aria-invalid", "true");
              one.setAttribute("aria-describedby", rangeError.id);
            } else {
              one.removeAttribute("aria-invalid");
              one.removeAttribute("aria-describedby");
            }
          });
        };
        const field = (edge, text) => {
          const input = make("input", { type: "date", id: `${panelId}-${group.id}-${edge}` });
          input.value = state.groups[group.id][edge];
          input.addEventListener("change", () => {
            const next = { ...state.groups[group.id], [edge]: input.value };
            const bad = Boolean(next.from && next.to && next.from > next.to);
            showRange(bad);
            if (bad) return;
            state.groups[group.id] = next;
            changed(group.id);
          });
          return { input, wrapper: make("div", { class: "search-input-field" }, [make("label", { for: input.id, text }), input]) };
        };
        const from = field("from", "From");
        const to = field("to", "To");
        fieldset.append(from.wrapper, to.wrapper, rangeError);
        controls[group.id] = { sync() { from.input.value = state.groups[group.id].from; to.input.value = state.groups[group.id].to; showRange(false); } };
      }
      // A group whose choices the app supplies has nothing to show until it does, or if there are none.
      if (group.options?.app && group.list.length === 0) fieldset.hidden = true;
      return fieldset;
    }

    const fieldsets = new Map(groups.map((group) => [group.id, buildGroup(group)]));
    const aside = make("aside", { id: panelId, class: "search-sidebar", "aria-labelledby": titleId, "data-open": "false" }, [header, ...(searchField ? [searchField] : []), ...fieldsets.values()]);
    column.replaceChildren(toggle, aside);
    if (!status.isConnected) column.append(status);

    function writeAddress() {
      if (!addressOn) return;
      const next = new URL(window.location.href);
      const keys = ["q", ...groups.flatMap((group) => [group.param, ...dateParams(group)])];
      keys.forEach((key) => next.searchParams.delete(key));
      if (state.search.trim()) next.searchParams.set("q", state.search.trim());
      groups.forEach((group) => {
        const value = state.groups[group.id];
        if (!isActive(group)) return;
        if (isMany(group)) {
          if (value.length && group.separator) next.searchParams.set(group.param, value.join(group.separator));
          else if (value.length) value.forEach((one) => next.searchParams.append(group.param, one));
          else next.searchParams.append(group.param, "");
        } else if (group.type === "date-range") {
          const [fromKey, toKey] = dateParams(group);
          if (value.from) next.searchParams.set(fromKey, value.from);
          if (value.to) next.searchParams.set(toKey, value.to);
        } else next.searchParams.set(group.param, value);
      });
      try {
        window.history.replaceState(window.history.state, "", next.href);
      } catch {
        // The address just is not updated.
      }
    }

    const snapshot = () => JSON.parse(JSON.stringify({ search: state.search, groups: state.groups }));
    function changed(source) {
      toggle.dataset.filterActive = String(activeCount());
      writeAddress();
      column.dispatchEvent(new CustomEvent("marin-filter-change", { bubbles: true, detail: { state: snapshot(), source } }));
    }

    let searchTimer;
    searchInput?.addEventListener("input", () => {
      state.search = searchInput.value;
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => changed("search"), FILTER_SEARCH_PAUSE);
    });
    searchInput?.addEventListener("search", () => {
      window.clearTimeout(searchTimer);
      state.search = searchInput.value;
      changed("search");
    });

    function reset() {
      window.clearTimeout(searchTimer);
      state.search = "";
      if (searchInput) searchInput.value = "";
      groups.forEach((group) => {
        state.groups[group.id] = defaultFor(group);
        controls[group.id].sync();
      });
      // The app's change handler usually calls setResults, which then says "Filters reset. N results." as one
      // message; if it does not within a moment, "Filters reset." is said on its own.
      resetPending = true;
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        if (!resetPending) return;
        resetPending = false;
        announce("Filters reset.");
      }, 600);
      changed("reset");
    }

    function setResults(count, text) {
      const lead = resetPending ? "Filters reset. " : "";
      resetPending = false;
      window.clearTimeout(resetTimer);
      // text may be a string, or a node an app built (a line with some words in another weight).
      const isNode = Boolean(text && typeof text === "object" && text.nodeType);
      const message = lead + (isNode ? text.textContent : text || (count === 0 ? "No results." : `${count} ${count === 1 ? "result" : "results"}.`));
      if (!resultsEl) {
        announce(message);
        return;
      }
      // "Filters reset." is for the ear: it sits in a visually hidden span in front of the app's own words, so the line a
      // sighted person reads stays the app's line.
      const spoken = lead ? [make("span", { class: "visually-hidden", text: lead })] : [];
      if (isNode) resultsEl.replaceChildren(...spoken, text);
      else resultsEl.replaceChildren(...spoken, text || (count === 0 ? "No results." : `${count} ${count === 1 ? "result" : "results"}.`));
      if (count === 0) {
        const again = make("button", { type: "button", class: "action-button", text: "Reset filters" });
        again.addEventListener("click", reset);
        resultsEl.append(" ", again);
      }
    }
    resetButton.addEventListener("click", reset);

    // Counts shown beside each choice. Options are never disabled, so a count of 0 is still reachable.
    function setCounts(groupId, counts) {
      const control = controls[groupId];
      if (!control?.list) return;
      control.list.querySelectorAll("li").forEach((item) => {
        const label = item.querySelector(":scope > label");
        const input = label.querySelector("input");
        let note = label.querySelector(".search-facet-count");
        if (!note) {
          note = make("span", { class: "search-facet-count" });
          label.append(" ", note);
        }
        note.textContent = `(${counts[input.value] ?? 0})`;
      });
    }

    // Matching. The file names the record field each group looks at ("field": "themes", a dot path such as
    // "venue.name"; a list of values counts as each of them) and the fields the search reads ("search.fields").
    // matchesRecord(record) is true when (it is not called matches: that name is the browser's own Element.matches, which
    // selector tools call on every element) the record fits the search and every group that has a choice (OR inside a
    // group, AND across groups); a group with no "field" is the app's own to apply. skip leaves groups out.
    // updateCounts(records) shows beside every choice how many of the records would match if that choice were
    // added, which leaves out its own group so its other choices stay visible.
    const valuesAt = (record, path) => {
      let found = [record];
      String(path).split(".").forEach((key) => {
        found = found.flatMap((one) => (one == null ? [] : [].concat(one).map((item) => item?.[key])))
          .flatMap((item) => (Array.isArray(item) ? item : [item])).filter((item) => item != null && item !== "");
      });
      return found.map((item) => String(item).trim());
    };
    const searchCache = new WeakMap();
    const searchTextOf = (record) => {
      if (!searchCache.has(record)) searchCache.set(record, config.search.fields.map((field) => valuesAt(record, field).join(" ")).join(" ").toLowerCase());
      return searchCache.get(record);
    };
    column.matchesRecord = (record, options = {}) => {
      const skip = options.skip || [];
      const query = state.search.trim().toLowerCase();
      if (query && config.search?.fields?.length) {
        const words = config.search.match === "words" ? query.split(/\s+/) : [query];
        const text = searchTextOf(record);
        if (!words.every((word) => text.includes(word))) return false;
      }
      return groups.every((group) => {
        if (!group.field || skip.includes(group.id)) return true;
        const value = state.groups[group.id];
        if (group.type === "date-range") {
          if (!value.from && !value.to) return true;
          const day = (valuesAt(record, group.field)[0] || "").slice(0, 10);
          return Boolean(day) && !(value.from && day < value.from) && !(value.to && day > value.to);
        }
        const chosen = isMany(group) ? value : value === "" ? [] : [value];
        if (!chosen.length) return true;
        const have = valuesAt(record, group.field);
        return chosen.some((one) => have.includes(one));
      });
    };
    column.filter = (records, options) => records.filter((record) => column.matchesRecord(record, options));
    // options.extra(record) is the app's own test (a time window, a tab), applied to every count; options.skip
    // { groupId: [other group ids] } leaves more groups out of one group's counts.
    column.updateCounts = (records, options = {}) => {
      const extra = options.extra || (() => true);
      groups.forEach((group) => {
        if (!group.field || group.type === "date-range" || !controls[group.id]?.list) return;
        const skip = [group.id, ...((options.skip || {})[group.id] || [])];
        const by = group.groupBy || [];
        const paths = new Map(group.list.map((option) => [option.value, option.path]));
        const counts = {};
        const totals = {};
        by.length && group.list.forEach((option) => {
          for (let depth = 1; depth <= Math.min(option.path.length, by.length); depth += 1) totals[option.path.slice(0, depth).join(" / ")] = 0;
        });
        records.forEach((record) => {
          if (!extra(record) || !column.matchesRecord(record, { skip })) return;
          const values = [...new Set(valuesAt(record, group.field))];
          values.forEach((value) => { counts[value] = (counts[value] || 0) + 1; });
          if (!by.length) return;
          const keys = new Set();
          values.forEach((value) => {
            const path = paths.get(value) || [];
            for (let depth = 1; depth <= Math.min(path.length, by.length); depth += 1) keys.add(path.slice(0, depth).join(" / "));
          });
          keys.forEach((key) => { totals[key] = (totals[key] || 0) + 1; });
        });
        setCounts(group.id, counts);
        if (by.length) column.setGroupCounts(group.id, totals);
      });
    };

    // The pinned title row hides what sits under it, so a field tabbed into view must stop below it
    // (WCAG 2.2 Focus Not Obscured): the panel's scroll padding follows the title row's real height.
    const padForHeader = () => aside.style.setProperty("--filter-header-height", `${header.offsetHeight}px`);
    padForHeader();
    if (window.ResizeObserver) new ResizeObserver(padForHeader).observe(header);

    Object.defineProperty(column, "filterState", { get: snapshot, configurable: true });
    column.setCounts = setCounts;
    column.reset = reset;
    // For a group whose options are {"app": true}: the app supplies the choices once it has them (data it fetched
    // or worked out), as [{ value, label, count?, path?, parent?, hidden? }]. The group is drawn again with what is
    // chosen kept; a chosen value that is not among the new choices is dropped.
    // Counts shown beside a nested group's name, keyed by its path ("Place" or "Place / Districts").
    column.setGroupCounts = (groupId, counts) => {
      groupCounts[groupId] = counts;
      controls[groupId]?.refresh?.();
    };
    // A whole group the current view does not use (a time range while a report sets its own dates). The group stays
    // on screen, dimmed and out of the tab order, and keeps what it holds.
    column.setDisabled = (groupId, disabled) => {
      if (!fieldsets.has(groupId)) return;
      if (disabled) disabledGroups.add(groupId);
      else disabledGroups.delete(groupId);
      fieldsets.get(groupId).disabled = Boolean(disabled);
    };
    column.setOptions = (groupId, options) => {
      const group = groups.find((one) => one.id === groupId);
      if (!group) return;
      group.list = options.map((option) => ({ count: null, path: [], parent: "", hidden: false, ...option, value: String(option.value) }));
      if (isMany(group)) state.groups[groupId] = state.groups[groupId].filter((value) => group.list.some((option) => option.value === value));
      else if (group.type === "radio" || group.type === "select") {
        if (state.groups[groupId] !== "" && !group.list.some((option) => option.value === state.groups[groupId])) state.groups[groupId] = defaultFor(group);
      }
      const fresh = buildGroup(group);
      fresh.disabled = disabledGroups.has(groupId);
      fieldsets.get(groupId).replaceWith(fresh);
      fieldsets.set(groupId, fresh);
      toggle.dataset.filterActive = String(activeCount());
      writeAddress();
    };
    column.setResults = setResults;
    // The app sets a choice itself (for example a hidden "Report dates" choice). It updates the column, the
    // address and the active count, and sends no change, so an app's own change handler cannot loop.
    column.setValue = (groupId, value) => {
      if (!controls[groupId]) return;
      state.groups[groupId] = value;
      controls[groupId].sync();
      toggle.dataset.filterActive = String(activeCount());
      writeAddress();
    };
    toggle.dataset.filterActive = String(activeCount());
    setupFilterToggles([toggle]);
    column.dispatchEvent(new CustomEvent("marin-filter-ready", { bubbles: true, detail: { state: snapshot() } }));
  }

  // A file that will not load shows a short message the person can act on, announced as an alert, with a Retry.
  function drawFilterColumn(column) {
    if (column.dataset.filterDrawn) return;
    column.dataset.filterDrawn = "true";
    renderFilterColumn(column).catch((error) => {
      column.dataset.filterError = error.message;
      console.error(`Filter column: ${error.message}`);
      const alert = document.createElement("div");
      alert.className = "app-alert app-alert--danger";
      alert.setAttribute("role", "alert");
      const text = document.createElement("p");
      text.textContent = "Could not load the filters.";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "action-button";
      retry.textContent = "Retry";
      retry.addEventListener("click", () => {
        column.removeAttribute("data-filter-error");
        column.removeAttribute("data-filter-drawn");
        column.replaceChildren();
        drawFilterColumn(column);
      });
      alert.append(text, retry);
      column.replaceChildren(alert);
    });
  }
  document.querySelectorAll("[data-filter-column]").forEach(drawFilterColumn);
  // A column added to the page later (an app that draws its pages from templates as the address changes) is drawn
  // as it arrives. One that leaves with its page takes its work with it.
  new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType !== 1) return;
      if (node.matches("[data-filter-column]")) drawFilterColumn(node);
      node.querySelectorAll("[data-filter-column]").forEach(drawFilterColumn);
    }));
  }).observe(document.body, { childList: true, subtree: true });

  // Sortable table columns: a <thead> button[data-sort-key="foo"] sorts the
  // tbody's rows by their data-sort-foo attribute. Rows don't need any JS
  // registration — this reads whatever data-sort-* attributes are present.
  document.querySelectorAll("table").forEach((table) => {
    const sortButtons = table.querySelectorAll("thead button[data-sort-key]");
    const tbody = table.querySelector(":scope > tbody");
    if (!sortButtons.length || !tbody) return;

    let activeKey = null;
    let direction = "ascending";

    function applySort(key) {
      direction = activeKey === key && direction === "ascending" ? "descending" : "ascending";
      activeKey = key;

      const rows = Array.from(tbody.children);
      rows.sort((a, b) => {
        const valueA = a.getAttribute(`data-sort-${key}`) ?? "";
        const valueB = b.getAttribute(`data-sort-${key}`) ?? "";
        const result = valueA.localeCompare(valueB, undefined, { numeric: true, sensitivity: "base" });
        return direction === "ascending" ? result : -result;
      });
      tbody.append(...rows);

      sortButtons.forEach((button) => {
        button.closest("th")?.setAttribute("aria-sort", button.dataset.sortKey === key ? direction : "none");
      });
    }

    sortButtons.forEach((button) => {
      button.addEventListener("click", () => applySort(button.dataset.sortKey));
    });
  });

  // ---- Shared copy, download, file reading and text cleaning ----------------------------------
  // Apps call these instead of writing their own, so the same fixes (no page styles in a copied
  // heading, a byte-order mark in a CSV, Windows-1252 files read correctly) reach every app.

  /** Put `html` and `text` on the clipboard through the browser's copy event. Nothing is rendered,
   * so no fonts, sizes, colors or bold weights from this page come along: a CMS pastes plain
   * <h2> and <li> and applies its own look. A text box holds the selection the browser needs to
   * fire the event (Safari and Firefox do not fire it with nothing selected). */
  function copyViaCopyEvent(html, text) {
    const holder = document.createElement("textarea");
    holder.value = text || " ";
    holder.setAttribute("readonly", "");
    holder.setAttribute("aria-hidden", "true");
    holder.tabIndex = -1;
    holder.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    const previousFocus = document.activeElement;
    document.body.appendChild(holder);
    holder.select();
    const onCopy = (event) => {
      if (html != null) event.clipboardData.setData("text/html", html);
      event.clipboardData.setData("text/plain", text ?? "");
      event.preventDefault();
    };
    document.addEventListener("copy", onCopy, { once: true });
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    document.removeEventListener("copy", onCopy);
    document.body.removeChild(holder);
    if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
    return copied;
  }

  /** Copy rich text: HTML for a visual editor, plain text for everything else. Tries the browser's
   * copy event first, because it puts exactly the HTML given on the clipboard (the asynchronous
   * Clipboard API sanitizes it, and an app found a title losing its link that way), then the
   * asynchronous Clipboard API. Resolves true when copied. */
  async function copyRich(text, html) {
    if (copyViaCopyEvent(html, text)) return true;
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([text], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          }),
        ]);
        return true;
      } catch {
        // Neither route worked: the caller shows its manual-copy box.
      }
    }
    return false;
  }

  /** Copy plain text. Resolves true when copied. */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return copyViaCopyEvent(null, text);
    }
  }

  const DOWNLOAD_TYPES = Object.freeze({
    csv: "text/csv", tsv: "text/tab-separated-values", txt: "text/plain", html: "text/html",
    md: "text/markdown", json: "application/json", svg: "image/svg+xml", png: "image/png",
  });

  /** Save a file. `content` is a string, Blob or typed array; `type` defaults from the file name.
   * Text files are UTF-8, and a CSV gets a byte-order mark so Excel reads accents and apostrophes
   * correctly (pass bom: false to leave it off). */
  function downloadFile({ content, name, type, bom } = {}) {
    if (!name) throw new Error("marinDownload needs a file name.");
    const extension = String(name).split(".").pop().toLowerCase();
    const mime = type || DOWNLOAD_TYPES[extension] || "application/octet-stream";
    const isText = typeof content === "string";
    const withBom = isText && bom !== false && (bom === true || mime.startsWith("text/csv") || extension === "csv");
    const parts = withBom && !content.startsWith("﻿") ? ["﻿", content] : [content];
    const blob = content instanceof Blob ? content : new Blob(parts, { type: isText && !/charset=/.test(mime) ? `${mime};charset=utf-8` : mime });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = name;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Decode bytes as text. Valid UTF-8 is read as UTF-8; anything else (a file saved from Excel, where
   * a curly apostrophe is one byte) is read as Windows-1252. A byte-order mark is dropped.
   * Returns { text, encoding }. The text never holds a replacement character made by this step. */
  function decodeText(input) {
    const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
    try {
      return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, ""), encoding: "utf-8" };
    } catch {
      return { text: new TextDecoder("windows-1252").decode(bytes), encoding: "windows-1252" };
    }
  }

  /** Read a File or Blob as text (see decodeText). Resolves { text, encoding }. */
  async function readText(file) {
    return decodeText(await file.arrayBuffer());
  }

  // Text that was read with the wrong encoding shows up as these sequences (UTF-8 bytes read as Windows-1252).
  const MOJIBAKE = Object.freeze([
    [/â€™|â€˜/g, "'"],
    [/â€œ|â€\u009d|â€�/g, '"'],
  ]);

  /** Plain characters for output that goes to a CMS, a URL or a CSV: curly quotes become straight,
   * non-breaking and zero-width characters are normalized or dropped, text read with the wrong
   * encoding is repaired, and a replacement character between two letters becomes an apostrophe
   * (any other is dropped). Opt in: an app that shows text keeps its typographic quotes. */
  function cleanText(value) {
    if (typeof value !== "string") return value;
    let text = value;
    for (const [pattern, plain] of MOJIBAKE) text = text.replace(pattern, plain);
    return text
      .replace(/(\p{L})�(\p{L})/gu, "$1'$2")
      .replace(/�/g, "")
      .replace(/[‘’‚‛′`´]/g, "'")
      .replace(/[“”„″]/g, '"')
      .replace(/…/g, "...")
      .replace(/[   ]/g, " ")
      .replace(/[​‌‍⁠﻿]/g, "");
  }

  // ---- Upload: a Browse files button, drop anywhere on the page, one set of messages ----------------
  const UPLOAD_MESSAGES = Object.freeze({
    type: (accept) => `Unsupported file type. Upload ${accept}.`,
    size: (bytes) => `That file is too large. The limit is ${bytes >= 1048576 ? `${Math.round((bytes / 1048576) * 10) / 10} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`}.`,
    first: (name) => `More than one file was dropped. Using the first file: ${name}.`,
  });

  function acceptList(accept) {
    return accept.map((item) => item.toLowerCase().replace(/^(?!\.)/, "."));
  }

  function joinWords(items) {
    if (items.length <= 1) return items.join("");
    if (items.length === 2) return `${items[0]} or ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, or ${items[items.length - 1]}`;
  }

  /** Wire a file upload.
   *
   *   marinUpload({
   *     button,           // the Browse files button
   *     input,            // the hidden <input type="file">
   *     accept: [".csv", ".xlsx"],   // allowed extensions
   *     maxBytes,         // optional size limit per file
   *     multiple,         // true: pass every file; default false: pass the first
   *     onFile(file),     // called with each accepted file (onFiles(files) once for all of them, if given)
   *     onMessage(text),  // called with a short plain-language message to show in the page's status line
   *     overlay,          // true (default) shows a full-page "Drop a file" layer while dragging
   *   })
   *
   * Drop works anywhere on the page. Returns { open() } to open the file chooser from code. */
  function marinUpload(options) {
    const { button, input, onFile, onFiles, onMessage, accept = [], maxBytes = 0, multiple = false } = options;
    const extensions = acceptList(accept);
    const say = (text) => typeof onMessage === "function" && onMessage(text);
    let overlay = null;
    if (options.overlay !== false) {
      overlay = document.createElement("div");
      overlay.className = "upload-drop-overlay";
      overlay.setAttribute("aria-hidden", "true");
      const inner = document.createElement("div");
      inner.className = "upload-drop-overlay__inner";
      inner.textContent = multiple ? "Drop files to upload" : "Drop a file to upload";
      overlay.append(inner);
      document.body.append(overlay);
    }
    const showOverlay = (on) => overlay && (overlay.dataset.active = on ? "true" : "false");

    function accepted(files) {
      const ok = [];
      for (const file of files) {
        const name = String(file.name || "").toLowerCase();
        if (extensions.length && !extensions.some((ext) => name.endsWith(ext))) {
          say(UPLOAD_MESSAGES.type(joinWords(extensions)));
          continue;
        }
        if (maxBytes && file.size > maxBytes) {
          say(UPLOAD_MESSAGES.size(maxBytes));
          continue;
        }
        ok.push(file);
      }
      return ok;
    }

    function receive(fileList, fromDrop) {
      const files = Array.from(fileList || []);
      if (!files.length) return;
      let chosen = files;
      if (!multiple && files.length > 1) {
        chosen = [files[0]];
        if (fromDrop) say(UPLOAD_MESSAGES.first(files[0].name));
      }
      const good = accepted(chosen);
      if (!good.length) return;
      if (typeof onFiles === "function") onFiles(good);
      if (typeof onFile === "function") good.forEach((file) => onFile(file));
    }

    const open = () => input.click();
    button?.addEventListener("click", open);
    input.addEventListener("change", () => {
      receive(input.files, false);
      input.value = "";
    });

    const hasFiles = (event) => event.dataTransfer && Array.from(event.dataTransfer.types || []).includes("Files");
    window.addEventListener("dragenter", (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      showOverlay(true);
    });
    window.addEventListener("dragover", (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      showOverlay(true);
    });
    window.addEventListener("dragleave", (event) => {
      if (!hasFiles(event)) return;
      if (event.clientX <= 0 || event.clientY <= 0 || event.clientX >= window.innerWidth || event.clientY >= window.innerHeight) showOverlay(false);
    });
    window.addEventListener("drop", (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      showOverlay(false);
      receive(event.dataTransfer.files, true);
    });
    return { open };
  }

  window.marinUpload = marinUpload;

  window.marinCopyRich = copyRich;
  window.marinCopyText = copyText;
  window.marinDownload = downloadFile;
  window.marinDecodeText = decodeText;
  window.marinReadText = readText;
  window.marinCleanText = cleanText;

  // ---- The text, HTML and Markdown of a page or a part of one, and the menus that copy and save them -----
  // Every Copy and Download button offers the same three formats, in the same order: Text, HTML, Markdown. For a page made
  // of ordinary headings, paragraphs, lists, tables and links, marinContentFormats(root) reads them from the page. The
  // output is clean (no classes, styles or scripts), so it pastes into a CMS or Word without the page's look. A page whose
  // content is data (a note, a report) builds its own three strings and passes them to marinFormatMenus.
  const FORMAT_SKIP = ".doc-actions, .doc-updated, .heading-anchor, script, style, nav, [data-no-copy]";

  /** { text, html, markdown } of `root`. `extraSkip` is a selector for parts to leave out (the shell already leaves out
   * .doc-actions, .doc-updated, .heading-anchor, nav, script, style and [data-no-copy]). */
  function contentFormats(root, extraSkip) {
    const SKIP = extraSkip ? `${FORMAT_SKIP}, ${extraSkip}` : FORMAT_SKIP;
    const BLOCKS = new Set(["H1", "H2", "H3", "H4", "H5", "H6", "P", "UL", "OL", "TABLE", "DL", "BLOCKQUOTE", "PRE", "DIV", "SECTION", "ASIDE"]);

    function absolute(href) {
      try {
        return new URL(href, document.baseURI).href;
      } catch {
        return href;
      }
    }

    // A <br> is marked while the text is read, so collapsing spaces keeps it. A paragraph keeps its line breaks; a heading,
    // list item or table cell turns each one into a space.
    function clean(text, keepBreaks = false) {
      const collapsed = text.replace(/\s+/g, " ");
      return (keepBreaks ? collapsed.replace(/ ?\u0001 ?/g, "  \n") : collapsed.replace(/\u0001/g, " ").replace(/\s+/g, " ")).trim();
    }

    // ---- Markdown -------------------------------------------------------------------------------------

    function inline(node) {
      let out = "";
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          out += child.textContent.replace(/\s+/g, " ");
        } else if (child.nodeType === Node.ELEMENT_NODE && !child.matches(SKIP)) {
          const text = inline(child);
          switch (child.tagName) {
            case "STRONG":
            case "B":
              out += text.trim() ? `**${text.trim()}**` : text;
              break;
            case "EM":
            case "I":
              out += text.trim() ? `*${text.trim()}*` : text;
              break;
            case "CODE":
              out += `\`${text}\``;
              break;
            case "A":
              out += child.getAttribute("href") ? `[${text.trim()}](${absolute(child.getAttribute("href"))})` : text;
              break;
            case "BR":
              out += "\u0001";
              break;
            case "INPUT":
              out += child.type === "checkbox" ? (child.checked ? "[x] " : "[ ] ") : "";
              break;
            default:
              out += text;
          }
        }
      });
      return out;
    }

    function listToMarkdown(list, depth) {
      const lines = [];
      let n = 0;
      Array.from(list.children).forEach((item) => {
        if (item.tagName !== "LI") return;
        n += 1;
        const marker = list.tagName === "OL" ? `${n}.` : "-";
        const nested = Array.from(item.children).filter((c) => c.tagName === "UL" || c.tagName === "OL");
        const own = document.createElement("div");
        Array.from(item.childNodes).forEach((c) => {
          if (!nested.includes(c)) own.append(c.cloneNode(true));
        });
        lines.push(`${"  ".repeat(depth)}${marker} ${clean(inline(own))}`);
        nested.forEach((sub) => lines.push(listToMarkdown(sub, depth + 1)));
      });
      return lines.join("\n");
    }

    function tableToMarkdown(table) {
      const rows = Array.from(table.rows).map((row) => Array.from(row.cells).map((cell) => clean(inline(cell)).replace(/\\/g, "\\\\").replace(/\|/g, "\\|")));
      if (!rows.length) return "";
      const width = Math.max(...rows.map((r) => r.length));
      const pad = (r) => Array.from({ length: width }, (_, i) => r[i] ?? "");
      const lines = [`| ${pad(rows[0]).join(" | ")} |`, `| ${Array.from({ length: width }, () => "---").join(" | ")} |`];
      rows.slice(1).forEach((r) => lines.push(`| ${pad(r).join(" | ")} |`));
      return lines.join("\n");
    }

    function blockToMarkdown(el, out) {
      if (el.matches(SKIP)) return;
      const tag = el.tagName;
      if (/^H[1-6]$/.test(tag)) {
        out.push(`${"#".repeat(Number(tag[1]))} ${clean(inline(el))}`);
      } else if (tag === "P") {
        const text = clean(inline(el), true);
        if (text) out.push(text);
      } else if (tag === "UL" || tag === "OL") {
        out.push(listToMarkdown(el, 0));
      } else if (tag === "TABLE") {
        out.push(tableToMarkdown(el));
      } else if (tag === "DL") {
        Array.from(el.children).forEach((c) => {
          if (c.tagName === "DT") out.push(`**${clean(inline(c))}**`);
          else if (c.tagName === "DD") out.push(clean(inline(c)));
        });
      } else if (tag === "BLOCKQUOTE") {
        out.push(clean(inline(el)).replace(/^/, "> "));
      } else {
        // A wrapper (section, div, aside): read what is inside it.
        let loose = document.createElement("p");
        const flush = () => {
          const text = clean(inline(loose), true);
          if (text) out.push(text);
          loose = document.createElement("p");
        };
        Array.from(el.childNodes).forEach((child) => {
          if (child.nodeType === Node.ELEMENT_NODE && BLOCKS.has(child.tagName)) {
            flush();
            blockToMarkdown(child, out);
          } else if (child.nodeType === Node.ELEMENT_NODE && child.matches(SKIP)) {
            // left out
          } else {
            loose.append(child.cloneNode(true));
          }
        });
        flush();
      }
    }

    function toMarkdown() {
      const out = [];
      Array.from(root.children).forEach((child) => blockToMarkdown(child, out));
      return out.filter(Boolean).join("\n\n") + "\n";
    }

    // ---- Text and HTML --------------------------------------------------------------------------------

    // Plain text: the Markdown without its marks. Links keep their address in brackets.
    function toText() {
      return toMarkdown()
        .replace(/^#{1,6} /gm, "")
        .replace(/\[([^\]]*)\]\(([^)]+)\)/g, "$1 ($2)")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/(^|[^*])\*([^*]+)\*/g, "$1$2")
        .replace(/^\| (?:---(?: \| ---)*) \|\n/gm, "")
        .replace(/^\| (.*) \|$/gm, (_, row) => row.split(" | ").join("\t"))
        .replace(/`([^`]+)`/g, "$1");
    }

    const ALLOWED = new Set(["H1", "H2", "H3", "H4", "H5", "H6", "P", "UL", "OL", "LI", "A", "STRONG", "EM", "B", "I", "CODE", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "DL", "DT", "DD", "BR", "BLOCKQUOTE"]);

    function cleanNode(node, into) {
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          into.append(document.createTextNode(child.textContent));
        } else if (child.nodeType === Node.ELEMENT_NODE && !child.matches(SKIP)) {
          if (child.tagName === "INPUT") {
            into.append(document.createTextNode(child.type === "checkbox" ? (child.checked ? "[x] " : "[ ] ") : ""));
          } else if (ALLOWED.has(child.tagName)) {
            const copy = document.createElement(child.tagName);
            if (child.tagName === "A" && child.getAttribute("href")) copy.setAttribute("href", absolute(child.getAttribute("href")));
            if (child.tagName === "TH" && child.getAttribute("scope")) copy.setAttribute("scope", child.getAttribute("scope"));
            cleanNode(child, copy);
            into.append(copy);
          } else {
            cleanNode(child, into);
          }
        }
      });
    }

    function toHtml() {
      const holder = document.createElement("div");
      cleanNode(root, holder);
      return holder.innerHTML
        .replace(/>\s+</g, "><")
        .replace(/ {2,}/g, " ")
        .replace(/\s+<\/(h[1-6]|li|p|td|th|dt|dd)>/g, "</$1>")
        .replace(/<(h[1-6]|li|p|td|th|dt|dd)>\s+/g, "<$1>")
        .trim();
    }


    return { text: toText(), html: toHtml(), markdown: toMarkdown() };
  }

  /** Wire the buttons inside `container`: [data-copy-format="text|html|markdown"] copies and [data-download-format=
   * "text|html|markdown"] saves. `provider` is { text, html, markdown } or a function that returns it. The result goes to
   * the nearest .doc-action-status (or `status`). When a copy fails, `onFail(text)` is called with that format's text so the app can show it in a box to copy by hand. Other formats (a JSON download, for example) are left to the app. */
  function formatMenus(container, provider, { fileName = "page", status, onFail } = {}) {
    const say = (message) => {
      const target = status || container.querySelector(".doc-action-status") || document.querySelector("#app-status-message");
      if (target) target.textContent = message;
    };
    // A page whose content changes (tabs) sets data-file-name as it does, so the file is named for what it holds.
    const nameNow = () => container.dataset.fileName || fileName;
    wireMenus(container);
    container.addEventListener("click", async (event) => {
      const button = event.target instanceof Element ? event.target.closest("[data-copy-format], [data-download-format]") : null;
      if (!button || !container.contains(button)) return;
      const formats = typeof provider === "function" ? provider() : provider;
      const copy = button.dataset.copyFormat;
      const save = button.dataset.downloadFormat;
      const failed = (text) => {
        say("Could not copy.");
        if (typeof onFail === "function") onFail(text);
      };
      if (copy === "text") (await copyRich(formats.text, formats.html)) ? say("Copied rich text.") : failed(formats.text);
      else if (copy === "html") (await copyText(formats.html)) ? say("Copied HTML.") : failed(formats.html);
      else if (copy === "markdown") (await copyText(formats.markdown)) ? say("Copied Markdown.") : failed(formats.markdown);
      else if (save === "text") { downloadFile({ content: formats.text, name: `${nameNow()}.txt` }); say("Text file downloaded."); }
      else if (save === "html") { downloadFile({ content: formats.html, name: `${nameNow()}.html` }); say("HTML file downloaded."); }
      else if (save === "markdown") { downloadFile({ content: formats.markdown, name: `${nameNow()}.md` }); say("Markdown file downloaded."); }
    });
  }

  // Declarative: <div class="doc-actions" data-formats-for="article.content" data-file-name="my-page"> ... buttons ... </div>
  document.querySelectorAll("[data-formats-for]").forEach((container) => {
    formatMenus(container, () => contentFormats(document.querySelector(container.dataset.formatsFor) || document.body, container.dataset.formatsSkip), {
      fileName: container.dataset.fileName || "page",
    });
  });

  window.marinContentFormats = contentFormats;
  window.marinFormatMenus = formatMenus;

  // ---- Reports: the report model and what is made from it (window.marinReports) ------------------------------------------
  // The core is src/reports-core.js, inlined here by scripts/build.py. It has no DOM access. See docs/reports.md.
  // Marin report core: the report model and everything made from it. No DOM access, so it runs in the browser
// (window.marinReports, inlined into marinos.js by scripts/build.py) and in Node tests (tests/reports-core.test.js).
//
// A report is plain data:
//   { schema: '1.0', title, prepared: 'YYYY-MM-DD' or '', filters, sections: [{ type: 'table', title, head, rows, values?, chart? }],
//     sources: [{ label, url }] }
// `rows` are the text as shown. `values` is the same table with raw numbers for CSV; a cell of it may also be an object
//   { value, margin, min, max }   (each a finite number, each optional)
// for a figure with a margin of error or a one-sided bound ("250,000 or more"). The CSV then has a column for each part
// that the table uses, so the margin and the bound are never lost. Everything shown, copied or saved is made from this
// one object. The model is written up in docs/reports.md.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.marinReports = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SCHEMA = '1.0';
  const MAX = { title: 200, text: 300, columns: 12, rows: 500, sections: 10, sources: 10, json: 4000000, chartLabels: 30, chartSeries: 4, image: 400000 };
  const IMAGE = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\r\n?/g, '\n').trim().slice(0, max || MAX.text);
  const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  // Only web and email links are kept; anything else (javascript:, data:, file:) becomes empty.
  const safeUrl = (v) => {
    const text = clean(v, 2000);
    if (!text) return '';
    try { return ['http:', 'https:', 'mailto:'].indexOf(new URL(text).protocol) >= 0 ? text : ''; } catch (e) { return ''; }
  };
  const isIsoDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z'));
  const formatDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? MONTHS[Number(m[2]) - 1] + ' ' + Number(m[3]) + ', ' + m[1] : ''; };

  // Today in Pacific time, as YYYY-MM-DD.
  const pacificToday = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date || new Date());

  const finite = (n) => typeof n === 'number' && Number.isFinite(n);
  // A raw value: a number, text, or { value, margin, min, max } with at least one finite number (anything else is text).
  function normalizeValue(v) {
    if (finite(v)) return v;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const cell = {};
      ['value', 'margin', 'min', 'max'].forEach((k) => { if (finite(v[k])) cell[k] = v[k]; });
      return Object.keys(cell).length ? cell : '';
    }
    return clean(v);
  }

  function normalizeSection(raw, index, errors) {
    if (!raw || typeof raw !== 'object' || raw.type !== 'table') { errors.push('Section ' + (index + 1) + ' is not a table.'); return null; }
    const head = Array.isArray(raw.head) ? raw.head.slice(0, MAX.columns).map((h) => clean(h)) : [];
    if (!head.length) { errors.push('Section ' + (index + 1) + ' has no columns.'); return null; }
    const rows = (Array.isArray(raw.rows) ? raw.rows : []).slice(0, MAX.rows).map((r) => head.map((_, i) => clean(Array.isArray(r) ? r[i] : '')));
    const section = { type: 'table', title: clean(raw.title, MAX.title), head, rows };
    if (Array.isArray(raw.values)) section.values = raw.values.slice(0, MAX.rows).map((r) => head.map((_, i) => normalizeValue(Array.isArray(r) ? r[i] : '')));
    const chart = normalizeChart(raw.chart);
    if (chart) section.chart = chart;
    return section;
  }

  // A chart is part of a table's section: its numbers, a sentence saying what it shows, and the picture the app drew (a PNG).
  // The picture is what the preview, Copy and Download hold; the numbers and the sentence are kept for text and for reading the file.
  function normalizeChart(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const labels = (Array.isArray(raw.labels) ? raw.labels : []).slice(0, MAX.chartLabels).map((l) => clean(l));
    const series = (Array.isArray(raw.series) ? raw.series : []).slice(0, MAX.chartSeries).map((s) => ({
      name: clean(s && s.name), values: labels.map((_, i) => { const v = s && Array.isArray(s.values) ? s.values[i] : 0; return typeof v === 'number' && Number.isFinite(v) ? v : 0; }),
    }));
    if (!labels.length || !series.length) return null;
    const size = (n) => (Number.isInteger(n) && n > 0 && n <= 2000 ? n : 0);
    const image = typeof raw.image === 'string' && raw.image.length <= MAX.image && IMAGE.test(raw.image) ? raw.image : '';
    return { kind: raw.kind === 'columns' ? 'columns' : 'bars', title: clean(raw.title, MAX.title), summary: clean(raw.summary, MAX.text), labels, series, image, width: size(raw.width), height: size(raw.height) };
  }

  // Makes a clean report from any object, or says why it cannot. { report, errors }.
  function create(input) {
    const errors = [];
    const raw = input && typeof input === 'object' ? input : {};
    const sections = (Array.isArray(raw.sections) ? raw.sections : []).slice(0, MAX.sections).map((s, i) => normalizeSection(s, i, errors)).filter(Boolean);
    if (!sections.length) errors.push('The report has no table.');
    const prepared = isIsoDate(clean(raw.prepared, 10)) ? clean(raw.prepared, 10) : '';
    const sources = (Array.isArray(raw.sources) ? raw.sources : []).slice(0, MAX.sources).map((s) => ({ label: clean(s && s.label, MAX.text), url: safeUrl(s && s.url) })).filter((s) => s.label);
    const report = { schema: SCHEMA, title: clean(raw.title, MAX.title) || 'Report', prepared, filters: clean(raw.filters, MAX.text), sections, sources };
    return { report, errors };
  }

  const tableHtml = (s) => '<table border="1" cellpadding="6" cellspacing="0"' + (s.title ? ' aria-label="' + esc(s.title) + '"' : '') + '><thead><tr>' +
    s.head.map((h, i) => '<th scope="col"' + (i ? ' style="text-align:right"' : '') + '>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
    s.rows.map((r) => '<tr>' + r.map((c, i) => (i ? '<td style="text-align:right">' + esc(c) + '</td>' : '<th scope="row">' + esc(c) + '</th>')).join('') + '</tr>').join('') + '</tbody></table>';
  const chartHtml = (s) => {
    const c = s.chart;
    if (!c) return '';
    if (c.image) return '<figure style="margin:1rem 0"><img src="' + esc(c.image) + '" alt="' + esc(c.title + '. ' + c.summary) + '"' + (c.width ? ' width="' + c.width + '" height="' + c.height + '"' : '') + ' style="max-width:100%;height:auto">' + (c.summary ? '<figcaption>' + esc(c.summary) + '</figcaption>' : '') + '</figure>';
    return c.summary ? '<p>' + esc(c.summary) + '</p>' : '';
  };
  const sourceHtml = (r) => (r.sources.length ? '<p>Source: ' + r.sources.map((s) => (s.url ? '<a href="' + esc(s.url) + '">' + esc(s.label) + '</a>' : esc(s.label))).join('; ') + '</p>' : '');

  // The document. Copy, Download and the preview all read this one string. `titleLevel` is the heading level of the title (2 by default).
  function renderHtml(report, options) {
    const h = 'h' + ((options && options.titleLevel) || 2);
    return '<' + h + '>' + esc(report.title) + '</' + h + '>' +
      (report.prepared ? '<p>Prepared ' + esc(formatDate(report.prepared)) + '</p>' : '') +
      (report.filters ? '<p>' + esc(report.filters) + '</p>' : '') +
      report.sections.map((s) => (s.title ? '<h' + (((options && options.titleLevel) || 2) + 1) + '>' + esc(s.title) + '</h' + (((options && options.titleLevel) || 2) + 1) + '>' : '') + chartHtml(s) + tableHtml(s)).join('') + sourceHtml(report);
  }

  function toText(report) {
    const out = [report.title];
    if (report.prepared) out.push('Prepared ' + formatDate(report.prepared));
    if (report.filters) out.push(report.filters);
    report.sections.forEach((s) => { out.push(''); if (s.title) out.push(s.title); if (s.chart && s.chart.summary) out.push('Chart: ' + s.chart.summary); out.push(s.head.join(' | ')); s.rows.forEach((r) => out.push(r.join(' | '))); });
    if (report.sources.length) out.push('', 'Source: ' + report.sources.map((s) => s.label + (s.url ? ' (' + s.url + ')' : '')).join('; '));
    return out.join('\n');
  }

  function toMarkdown(report) {
    const cell = (v) => String(v).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, ' '); // the backslash first, so a value cannot undo the escape of the pipe after it
    const out = ['# ' + report.title];
    if (report.prepared) out.push('', 'Prepared ' + formatDate(report.prepared));
    if (report.filters) out.push('', report.filters);
    report.sections.forEach((s) => {
      out.push('');
      if (s.title) out.push('## ' + s.title, '');
      if (s.chart && s.chart.summary) out.push('Chart: ' + s.chart.summary, '');
      out.push('| ' + s.head.map(cell).join(' | ') + ' |', '| ' + s.head.map((_, i) => (i ? '---:' : '---')).join(' | ') + ' |');
      s.rows.forEach((r) => out.push('| ' + r.map(cell).join(' | ') + ' |'));
    });
    if (report.sources.length) out.push('', 'Source: ' + report.sources.map((s) => (s.url ? '[' + s.label + '](' + s.url + ')' : s.label)).join('; '));
    return out.join('\n') + '\n';
  }

  const STANDALONE_CSS = 'body{font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.5;max-width:60rem;margin:2rem auto;padding:0 1rem;color:#1f1f1f}' +
    'table{border-collapse:collapse;width:100%;margin:1rem 0}th,td{border:1px solid #767676;padding:.4rem .6rem;vertical-align:top}thead th{background:#f0f0f0;text-align:left}' +
    'a{color:#0b4d8a}h1{font-size:1.6rem}h2{font-size:1.25rem}img{max-width:100%;height:auto}figcaption{font-size:.9rem;color:#555}';
  // A page of its own (no scripts, no outside files), for saving or sending.
  function standaloneHtml(report) {
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(report.title) + '</title><style>' + STANDALONE_CSS + '</style></head><body>' +
      renderHtml(report, { titleLevel: 1 }) + '</body></html>\n';
  }

  // The tables as rows for a CSV: raw numbers when a table has them, otherwise the text. A column whose raw values include
  // { value, margin, min, max } cells becomes a column for each part the table uses ("Name", "Name margin of error",
  // "Name lower bound", "Name upper bound"). With more than one table, each starts with its title on a row of its own and
  // a blank row separates them.
  const PARTS = [['value', ''], ['margin', ' margin of error'], ['min', ' lower bound'], ['max', ' upper bound']];
  function tableCsv(s) {
    const body = s.values || s.rows;
    const used = s.head.map((_, i) => (s.values ? PARTS.filter(([key]) => key !== 'value' && body.some((r) => r[i] && typeof r[i] === 'object' && key in r[i])) : []));
    const head = [];
    s.head.forEach((h, i) => { head.push(h); used[i].forEach(([, suffix]) => head.push(h + suffix)); });
    const rows = body.map((r) => {
      const out = [];
      r.forEach((v, i) => {
        const cell = v && typeof v === 'object' ? v : null;
        out.push(cell ? (finite(cell.value) ? cell.value : '') : v);
        used[i].forEach(([key]) => out.push(cell && finite(cell[key]) ? cell[key] : ''));
      });
      return out;
    });
    return [head, ...rows];
  }

  function csvRows(report) {
    const out = [];
    report.sections.forEach((s, i) => {
      if (report.sections.length > 1) { if (i) out.push([]); out.push([s.title || 'Table ' + (i + 1)]); }
      out.push(...tableCsv(s));
    });
    return out;
  }

  const toJson = (report) => JSON.stringify(report, null, 2) + '\n';
  function parseJson(text) {
    if (typeof text !== 'string' || !text.trim()) return { report: null, errors: ['The file is empty.'] };
    if (text.length > MAX.json) return { report: null, errors: ['The file is too large.'] };
    let data;
    try { data = JSON.parse(text); } catch (e) { return { report: null, errors: ['The file is not a report file.'] }; }
    if (!data || typeof data !== 'object' || data.schema !== SCHEMA) return { report: null, errors: ['The file is not a report file this version can open.'] };
    const made = create(data);
    return made.errors.length ? { report: null, errors: made.errors } : made;
  }

  return { create, renderHtml, toText, toMarkdown, standaloneHtml, csvRows, toJson, parseJson, formatDate, pacificToday, SCHEMA };
});

  // ---- Search results that show where the words are -----------------------------------------------------------------
  // A search of document text shows a line of the text under each result with the matched words marked (marinSearchSnippet),
  // and marks the same words on the page the result opens. The words travel in sessionStorage, never in the address
  // (marinSearchRemember on a press, and the highlighter below on arrival). The rules are "Search results that show where the
  // words are" in Marin UI's docs/components.md; the two classes (mark.search-hit, .search-snippet) are in Marin UI's CSS.
  const SEARCH_HIT_KEY = "marin-search-hit";
  const SEARCH_WORD = /[\p{L}\p{N}]+/gu;
  const searchPlain = (text) => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  /** The words of what a person typed, lower case and without accents: what marinSearchSnippet and marinSearchRemember take. */
  function marinSearchWords(text) {
    return searchPlain(text).split(/[^a-z0-9]+/).filter(Boolean);
  }

  const startsAWord = (word, words) => words.some((w) => searchPlain(word).startsWith(w));

  /** A `span.search-snippet` with about a line of `text` around the first word that starts with a typed word, each such word in a
   * `mark.search-hit`, with an ellipsis on a side that continues. `null` when no word of the text starts with one. */
  function marinSearchSnippet(text, words) {
    const source = String(text || "");
    const first = [...source.matchAll(SEARCH_WORD)].find((m) => startsAWord(m[0], words));
    if (!first) return null;
    let start = Math.max(0, first.index - 60);
    if (start) {
      const gap = source.indexOf(" ", start);
      if (gap > -1 && gap < first.index) start = gap + 1;
    }
    let end = Math.min(source.length, start + 170);
    if (end < source.length) {
      const gap = source.lastIndexOf(" ", end);
      if (gap > first.index) end = gap;
    }
    const part = source.slice(start, end);
    const span = Object.assign(document.createElement("span"), { className: "search-snippet" });
    if (start) span.append("\u2026");
    let at = 0;
    for (const m of part.matchAll(SEARCH_WORD)) {
      if (!startsAWord(m[0], words)) continue;
      span.append(part.slice(at, m.index), Object.assign(document.createElement("mark"), { className: "search-hit", textContent: m[0] }));
      at = m.index + m[0].length;
    }
    span.append(part.slice(at));
    if (end < source.length) span.append("\u2026");
    return span;
  }

  /** Keep the typed words for the page `href` opens (call it when a result is pressed). Quietly does nothing without storage. */
  function marinSearchRemember(href, words) {
    try {
      sessionStorage.setItem(SEARCH_HIT_KEY, JSON.stringify({ path: new URL(href, location.href).pathname, terms: words, at: Date.now() }));
    } catch {
      /* no storage: no highlight */
    }
  }

  // On arrival: if the words were kept for this page (and are under two minutes old), mark each word that starts with one inside the
  // page's content ([data-search-highlight], else #start, else #main), scroll to the first mark (or stay at the section the address
  // names), and let Escape clear the marks. Read once; a reload shows none.
  function marinSearchHighlight() {
    let hit = null;
    try {
      hit = JSON.parse(sessionStorage.getItem(SEARCH_HIT_KEY) || "null");
      sessionStorage.removeItem(SEARCH_HIT_KEY);
    } catch {
      return;
    }
    if (!hit || hit.path !== location.pathname || !Array.isArray(hit.terms) || !hit.terms.length || Date.now() - hit.at > 120000) return;
    const root = document.querySelector("[data-search-highlight]") || document.getElementById("start") || document.getElementById("main");
    if (!root) return;
    const skip = "script, style, nav, aside, .doc-actions, .doc-pager, mark, [data-no-copy], search, template";
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && !n.parentElement.closest(skip) && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const marks = [];
    for (const node of nodes) {
      const text = node.nodeValue;
      const found = [...text.matchAll(SEARCH_WORD)].filter((m) => startsAWord(m[0], hit.terms));
      if (!found.length) continue;
      const fragment = document.createDocumentFragment();
      let at = 0;
      for (const m of found) {
        fragment.append(text.slice(at, m.index));
        const mark = Object.assign(document.createElement("mark"), { className: "search-hit", textContent: m[0] });
        marks.push(mark);
        fragment.append(mark);
        at = m.index + m[0].length;
      }
      fragment.append(text.slice(at));
      node.replaceWith(fragment);
    }
    if (!marks.length) return;
    const target = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    (marks.find((m) => target && target.contains(m)) || marks[0]).scrollIntoView({ block: "center" });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      marks.forEach((m) => m.replaceWith(document.createTextNode(m.textContent)));
      root.normalize();
    });
  }

  window.marinSearchWords = marinSearchWords;
  window.marinSearchSnippet = marinSearchSnippet;
  window.marinSearchRemember = marinSearchRemember;
  window.marinSearchHighlight = marinSearchHighlight;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", marinSearchHighlight);
  else marinSearchHighlight();

  // Copy-to-clipboard: any button[data-copy-value] copies that value and
  // shows brief feedback. Announces through #app-status-message if present
  // (the standard app-shell live region), otherwise a page-supplied
  // [data-copy-status] live region, if either exists. A button that also
  // carries [data-copy-html] copies that richer formatting instead (falling
  // back to the plain data-copy-value text if the rich copy fails).
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-copy-value]");
    if (!button) return;
    const value = button.dataset.copyValue;
    const html = button.dataset.copyHtml;
    const status = document.querySelector("#app-status-message, [data-copy-status]");

    const onCopied = () => {
      button.classList.add("is-copied");
      clearTimeout(button.copyResetTimeout);
      button.copyResetTimeout = setTimeout(() => button.classList.remove("is-copied"), 1500);
      if (status) status.textContent = button.dataset.copyAnnounce || `Copied ${value}`;
    };
    const onFailed = () => {
      if (status) status.textContent = `Couldn't copy ${value} — copy it manually`;
    };

    if (html) {
      copyRich(value, html).then((copied) => {
        if (copied) onCopied();
        else copyText(value).then((plain) => (plain ? onCopied() : onFailed()));
      });
      return;
    }

    copyText(value).then((copied) => (copied ? onCopied() : onFailed()));
  });

  // Share: any button[data-action="share"] copies the current page URL and
  // reports through a sibling .doc-action-status inside the same
  // .doc-actions group, if present.
  document.querySelectorAll('[data-action="share"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const status = button.closest(".doc-actions")?.querySelector(".doc-action-status") ?? null;
      const copied = await copyText(window.location.href);
      if (status) status.textContent = copied ? "Link copied" : "Couldn't copy — copy the address bar link instead";
    });
  });

  // Tabs: every [role="tablist"] gets the ARIA tabs keyboard pattern with no
  // per-page JavaScript — one tab in the Tab order at a time (the selected
  // one, or the first if none is selected), Left/Right (Up/Down when
  // aria-orientation="vertical") move between tabs and wrap, Home/End jump to
  // the first/last, and moving to a tab selects it (focus, then click(), so
  // the app's own click handling runs). The Tab-order sync follows
  // aria-selected, however an app sets it. An app that handles these keys
  // itself just calls preventDefault() on them and this stands down. Tablists
  // added after load get the arrow keys but not the Tab-order sync.
  function enabledTabs(tablist) {
    return Array.from(tablist.querySelectorAll('[role="tab"]')).filter(
      (tab) => !tab.disabled && tab.getAttribute("aria-disabled") !== "true"
    );
  }

  function syncTabStops(tablist) {
    const tabs = enabledTabs(tablist);
    if (!tabs.length) return;
    const stop = tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || tabs[0];
    tabs.forEach((tab) => {
      tab.tabIndex = tab === stop ? 0 : -1;
    });
  }

  document.querySelectorAll('[role="tablist"]').forEach((tablist) => {
    syncTabStops(tablist);
    new MutationObserver(() => syncTabStops(tablist)).observe(tablist, {
      attributes: true,
      attributeFilter: ["aria-selected"],
      childList: true,
      subtree: true,
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const current = event.target instanceof Element ? event.target.closest('[role="tab"]') : null;
    const tablist = current && current.closest('[role="tablist"]');
    if (!tablist) return;
    const tabs = enabledTabs(tablist);
    const index = tabs.indexOf(current);
    if (index === -1) return;
    const vertical = tablist.getAttribute("aria-orientation") === "vertical";
    const forward = vertical ? "ArrowDown" : "ArrowRight";
    const back = vertical ? "ArrowUp" : "ArrowLeft";
    let next;
    if (event.key === forward) next = tabs[(index + 1) % tabs.length];
    else if (event.key === back) next = tabs[(index - 1 + tabs.length) % tabs.length];
    else if (event.key === "Home") next = tabs[0];
    else if (event.key === "End") next = tabs[tabs.length - 1];
    else return;
    event.preventDefault();
    next.focus();
    next.click();
  });

  // Tab sections: elements sharing a data-tab-section="name" show together,
  // hidden unless "name" matches the current hash — everything else in the
  // group stays hidden, so a page reads as one section at a time (Help shows
  // only Help, Updates shows only Updates) instead of stacking under
  // whatever's already showing. An unrecognized or empty hash falls back to
  // the first name encountered in the page, so there's no need for an
  // explicit "Home" tab pointing at the default. Pairs automatically with
  // any #app-nav whose links use matching #name hashes — no per-page
  // JavaScript needed.
  const tabSections = document.querySelectorAll("[data-tab-section]");
  if (tabSections.length) {
    const tabNames = [];
    tabSections.forEach((section) => {
      const name = section.dataset.tabSection;
      if (!tabNames.includes(name)) tabNames.push(name);
    });
    const tabNav = document.querySelector("#app-nav");

    function showTabFromHash() {
      const hash = window.location.hash.slice(1);
      // A hash that names an element inside a tab section opens that section
      // and scrolls to the element (for example #tech-marin-ui).
      const target = hash && !tabNames.includes(hash) ? document.getElementById(hash) : null;
      const owner = target ? target.closest("[data-tab-section]") : null;
      const activeName = tabNames.includes(hash) ? hash : owner ? owner.dataset.tabSection : tabNames[0];
      tabSections.forEach((section) => {
        section.hidden = section.dataset.tabSection !== activeName;
      });
      if (owner && !target.hasAttribute("data-subtab")) target.scrollIntoView();
      if (tabNav) {
        tabNav.querySelectorAll('a[href^="#"]').forEach((link) => {
          if (link.getAttribute("href") === `#${activeName}`) link.setAttribute("aria-current", "page");
          else link.removeAttribute("aria-current");
        });
      }
    }

    showTabFromHash();
    window.addEventListener("hashchange", showTabFromHash);
  }

  // Sub-tabs: a [data-subtabs] group inside a tab section holds a [data-subtabs-nav]
  // of links (#panel-id) and [data-subtab] panels. One panel shows at a time: the one
  // the hash names (or contains an element it names), else the first. The nav marks
  // the current link with aria-current, as #app-nav does. A hash on a panel opens its
  // tab section without scrolling to it, so the page stays at the tabs.
  document.querySelectorAll("[data-subtabs]").forEach((group) => {
    const panels = [...group.querySelectorAll("[data-subtab]")];
    const nav = group.querySelector("[data-subtabs-nav]");
    if (!panels.length) return;
    function showSubtab() {
      const target = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null;
      const owner = target ? target.closest("[data-subtab]") : null;
      const active = panels.includes(owner) ? owner : panels[0];
      panels.forEach((panel) => {
        panel.hidden = panel !== active;
      });
      if (nav) {
        nav.querySelectorAll('a[href^="#"]').forEach((link) => {
          const to = document.getElementById(link.getAttribute("href").slice(1));
          // A link to the tab section itself (not to a panel) is the first panel's.
          const current = to && panels.includes(to) ? to === active : active === panels[0];
          if (current) link.setAttribute("aria-current", "page");
          else link.removeAttribute("aria-current");
        });
      }
    }
    showSubtab();
    window.addEventListener("hashchange", showSubtab);
  });

  // Updates: any [data-updates-repo="repo"] section lazy-loads that repo's
  // 10 most recent commits from the GitHub API the first time it becomes
  // visible, and renders them into its own [data-updates-list]. Visibility
  // is detected by watching the section's `hidden` attribute, so it works
  // with whatever tab/hash-routing a page already has (or none, if the
  // section is never hidden) — no per-page JavaScript needed. A bare repo
  // name is assumed to be marincountygov/<repo>; pass "owner/repo" to
  // override. Add [data-app-name="App Name"] on the same section so the
  // status line reads "App Name release notes." once loaded, instead of the
  // generic "Latest commits loaded." — the single description the section
  // needs, not a separate static line plus a loading message.
  document.querySelectorAll("[data-updates-repo]").forEach((section) => {
    const repo = section.dataset.updatesRepo;
    const appName = section.dataset.appName;
    const loadedText = appName ? `${appName} release notes.` : "Latest commits loaded.";
    const status = section.querySelector("[data-updates-status]");
    const list = section.querySelector("[data-updates-list]");
    if (!repo || !list) return;

    const owner = repo.includes("/") ? repo : `marincountygov/${repo}`;
    // GitHub Pages project sites always serve at
    // https://marincountygov.github.io/<repo-name>/, never the org root —
    // strip the owner off "owner/repo" overrides to get the bare repo name.
    const repoName = repo.includes("/") ? repo.split("/")[1] : repo;
    const siteUrl = `https://marincountygov.github.io/${repoName}/`;
    const SPARKLE_EMOJI = "✨"; // ✨
    const POINT_RIGHT_EMOJI = "\u{1F449}"; // 👉
    let loaded = false;

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    // Strips a leading Conventional Commits-style prefix ("fix:", "feat
    // (scope):", "chore:", etc.) and capitalizes what's left, so a title
    // like "fix: stale cache key" reads as "Stale cache key" instead of
    // exposing commit-message convention to a non-technical reader. This
    // is text cleanup, not real plain-language rewriting — a static page
    // has no way to genuinely rewrite arbitrary text at view time.
    const CONVENTIONAL_COMMIT_PREFIX = /^[a-z]+(\([^)]*\))?!?:\s*/i;
    function cleanTitle(rawTitle) {
      const stripped = rawTitle.replace(CONVENTIONAL_COMMIT_PREFIX, "");
      return stripped ? stripped[0].toUpperCase() + stripped.slice(1) : rawTitle;
    }

    async function loadUpdates() {
      if (loaded) return;
      if (status) status.textContent = loadingMessage();
      list.innerHTML = "";
      try {
        // Fetch more than we display: merge-PR commits are filtered out
        // below (they're noise, not a real change), so 15 fetched usually
        // leaves close to 10 real ones to show.
        const response = await fetch(`https://api.github.com/repos/${owner}/commits?per_page=15`, {
          headers: { Accept: "application/vnd.github+json" },
        });
        if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
        const commits = (await response.json()).filter(
          (commit) => !/^Merge pull request #\d+/.test(String(commit?.commit?.message ?? ""))
        );
        if (!Array.isArray(commits) || !commits.length) {
          if (status) status.textContent = "No recent commits found.";
          return;
        }
        loaded = true;
        if (status) status.textContent = loadedText;
        list.innerHTML = commits
          .slice(0, 10)
          .map((commit) => {
            const message = String(commit?.commit?.message ?? "").trim();
            const title = cleanTitle(message.split("\n")[0] || "Untitled commit");
            const rawBodyLines = message
              .split("\n")
              .slice(1)
              .map((line) => line.trim())
              .filter(Boolean);
            const commitDate = commit?.commit?.committer?.date ? new Date(commit.commit.committer.date) : null;
            const date = commitDate
              ? commitDate.toLocaleString([], {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "Date unavailable";
            // Kicker date, same granularity as this project's own news
            // digest header ("Marin Mentions — Sep 25, 2026") — no time,
            // since the kicker line is app + date, not this exact commit's
            // timestamp (that's what the date line under the title is for).
            const kickerDate = commitDate
              ? commitDate.toLocaleString([], { year: "numeric", month: "short", day: "numeric" })
              : "Date unavailable";
            const url = commit?.html_url || `https://github.com/${owner}/commits`;

            // A commit body is either a real bullet list (lines starting
            // with -/*) or a hard-wrapped prose paragraph (this project's
            // own commit convention). Treating every raw line as its own
            // bullet, regardless of style, chopped wrapped sentences into
            // fragments that read as unrelated bullet points — a real
            // bullet's own wrapped continuation line isn't a new item, and
            // a prose paragraph's hard-wrap points usually fall mid-
            // sentence, not at a real boundary. Either way the list should
            // end up one <li> per actual point: for real bullets, that's
            // the bullet itself (with continuation lines merged back in);
            // for prose, it's each full sentence, found by reflowing the
            // wrapped lines back into one block first.
            const hasBullets = rawBodyLines.some((line) => /^[-*]\s+/.test(line));
            const bodyItems = [];
            if (hasBullets) {
              for (const line of rawBodyLines) {
                if (/^[-*]\s+/.test(line)) bodyItems.push(line.replace(/^[-*]\s+/, ""));
                else if (bodyItems.length) bodyItems[bodyItems.length - 1] += ` ${line}`;
                else bodyItems.push(line);
              }
            } else if (rawBodyLines.length) {
              // Split after ./!/? only when followed by whitespace then a
              // capital letter, "(", or "`" — keeps abbreviations ("e.g."),
              // decimals/versions ("1.17.2"), and dotted names ("Node.js")
              // intact (no space follows their periods), while still
              // splitting on genuine sentence boundaries.
              rawBodyLines
                .join(" ")
                .split(/(?<=[.!?])\s+(?=[A-Z(`])/)
                .map((sentence) => sentence.trim())
                .filter(Boolean)
                .forEach((sentence) => bodyItems.push(sentence));
            }
            const body = bodyItems.length
              ? `<ul>${bodyItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
              : "";
            // A commit copied or shared on its own (e.g. pasted into a
            // Slack message) loses the page context that says which app
            // it's about, so the copied text/HTML carries an app-name +
            // date kicker and a link back to the app's own site —
            // copy-only, not shown on the page itself, where that context
            // is already given by the page around the card. The kicker
            // already carries the date, so the copy drops the separate
            // date line the rendered card still shows under the title.
            const kicker = appName ? `${SPARKLE_EMOJI} ${appName} updates — ${kickerDate}` : "";
            const kickerHtml = appName
              ? `${SPARKLE_EMOJI} <b>${escapeHtml(appName)} updates — <i>${escapeHtml(kickerDate)}</i></b>`
              : "";
            const visitText = appName ? `${POINT_RIGHT_EMOJI} Visit ${appName}` : "";
            // Title and the full body content, as plain text - no link
            // markup (the title is never a hyperlink in the copied text,
            // only in the rendered card). A blank line sets the kicker
            // apart from the update itself, which stays single-spaced
            // internally (title/items/visit line).
            const updateBlock = [title, ...bodyItems, visitText && `${visitText}: ${siteUrl}`]
              .filter(Boolean)
              .join("\n");
            const copyText = [kicker, updateBlock].filter(Boolean).join("\n\n");
            // Rich version of the same content, formatted the same way this
            // project's own news-item copy is (bold title, then the
            // content) — so a paste into email/docs keeps that formatting
            // instead of landing as flat text.
            const copyHtml =
              (kickerHtml ? `${kickerHtml}<br><br>` : "") +
              `<b>${escapeHtml(title)}</b>` +
              body +
              // <ul> is already a block element with its own spacing, so no
              // <br> is needed before the visit line when a body list is
              // present (that would double the gap) — only when there's no
              // body list to provide that break itself.
              (visitText
                ? `${bodyItems.length ? "" : "<br>"}${POINT_RIGHT_EMOJI} <b><a href="${escapeHtml(siteUrl)}">Visit ${escapeHtml(appName)}</a></b>`
                : "");
            return (
              `<article class="app-card">` +
              `<h3><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(title)}</a></h3>` +
              `<p class="app-help-text">${escapeHtml(date)}</p>` +
              body +
              `<button type="button" class="copy-button" data-copy-value="${escapeHtml(copyText)}" data-copy-html="${escapeHtml(copyHtml)}" data-copy-announce="Update copied" aria-label="Copy this update">` +
              lucideMarkup("copy", "copy-icon") +
              lucideMarkup("check", "copy-check-icon") +
              `Copy` +
              `</button>` +
              `</article>`
            );
          })
          .join("");
      } catch (error) {
        console.error(error);
        if (status) status.textContent = "Could not load updates right now.";
      }
    }

    if (!section.hidden) loadUpdates();

    new MutationObserver(() => {
      if (!section.hidden) loadUpdates();
    }).observe(section, { attributes: true, attributeFilter: ["hidden"] });
  });

  // Records from another app: [data-record-list], [data-key-numbers] and [data-chart]
  // draw another app's published JSON as the same cards, numbers and charts that app
  // shows, so one app's records can appear on another app's page without a copy of that
  // app's code. Each one loads its file the first time it becomes visible (the `hidden`
  // attribute of the nearest [data-tab-section], or of the element itself, watched the
  // same way as Updates), so a page with many tabs fetches only what is opened.
  //
  // Shared attributes
  //   data-src       required. JSON address; may be on another site. {date:-29} becomes the UTC
  //                  date 29 days ago (YYYY-MM-DD) and {date:0} today.
  //   data-records   optional. Dot path to the array of records (default: the file itself).
  //   data-match     optional. Field to compare, with data-value. An array field matches when it
  //                  contains the value. Without it every record is used.
  //   data-app-name  optional. Names the source in the status lines.
  //   data-noun      optional. What the records are called (default "records").
  // Field names may be dot paths ("place.address.locality"). Values are set as text, never
  // as HTML; only http(s) addresses become links or images.
  const recordFiles = new Map();
  const dayMs = 86400000;
  const pickPath = (value, path) => String(path || "").split(".").filter(Boolean).reduce((found, key) => (found == null ? found : found[key]), value);
  const expandDates = (src) => src.replace(/\{date:(-?\d+)\}/g, (_, offset) => new Date(Date.now() + Number(offset) * dayMs).toISOString().slice(0, 10));
  const isWebAddress = (value) => /^https?:\/\//.test(value);

  // A YYYY-MM-DD value is a long date; a full date and time is the short form the
  // console shows on its cards ("Nov 2, 4:12 PM"), in Pacific time.
  const asText = (value) => {
    if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(", ");
    if (value == null) return "";
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const date = new Date(`${text}T00:00:00Z`);
      if (!Number.isNaN(date.getTime())) return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
      const date = new Date(text);
      if (!Number.isNaN(date.getTime())) return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
    }
    return text;
  };

  // The day a record falls on, in Pacific time, as YYYY-MM-DD.
  const dayOf = (value) => {
    const text = String(value ?? "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  };

  function fetchJson(src) {
    if (!recordFiles.has(src)) {
      recordFiles.set(src, fetch(expandDates(src), { cache: "no-store", credentials: "omit" }).then((response) => {
        if (!response.ok) throw new Error(`${src}: ${response.status}`);
        return response.json();
      }));
      recordFiles.get(src).catch(() => recordFiles.delete(src));
    }
    return recordFiles.get(src);
  }

  async function fetchRecords(el) {
    // data-src may name several files, separated by spaces; their records are joined, and a record
    // found in more than one file (same data-unique field) is kept once. One missing file is skipped.
    const sources = el.dataset.src.split(/\s+/).filter(Boolean);
    const loaded = await Promise.allSettled(sources.map((src) => fetchJson(src)));
    if (loaded.every((one) => one.status === "rejected")) throw loaded[0].reason;
    const lists = loaded.filter((one) => one.status === "fulfilled").map((one) => pickPath(one.value, el.dataset.records));
    if (!lists.every(Array.isArray)) throw new Error(`${el.dataset.src}: no list of records`);
    let records = lists.flat();
    if (el.dataset.unique) {
      const seen = new Set();
      records = records.filter((record) => {
        const key = pickPath(record, el.dataset.unique);
        if (key == null || !seen.has(key)) { seen.add(key); return true; }
        return false;
      });
    }
    if (el.dataset.match) {
      records = records.filter((record) => {
        const found = pickPath(record, el.dataset.match);
        return Array.isArray(found) ? found.includes(el.dataset.value) : found === el.dataset.value;
      });
    }
    if (el.dataset.exclude) {
      // "field=value": drop the records whose field equals the value (or lists it).
      const [field, ...rest] = el.dataset.exclude.split("=");
      const value = rest.join("=");
      records = records.filter((record) => {
        const found = pickPath(record, field);
        return !(Array.isArray(found) ? found.includes(value) : found === value);
      });
    }
    return records;
  }

  // Runs `load` once, the first time the element's tab section is shown.
  function whenShown(el, load) {
    const gates = [el.closest("[data-tab-section]"), el.closest("[data-subtab]")].filter(Boolean);
    if (!gates.length) gates.push(el);
    let started = false;
    const start = () => {
      if (started || gates.some((gate) => gate.hidden)) return;
      started = true;
      load();
    };
    start();
    if (!started) gates.forEach((gate) => new MutationObserver(start).observe(gate, { attributes: true, attributeFilter: ["hidden"] }));
  }

  const statusLine = (name) => {
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.className = "app-help-text";
    status.dataset[name] = "";
    return status;
  };

  // Record lists: the app's result cards.
  //   data-title     required. Field shown as each card's heading.
  //   data-link      optional. Field holding an http(s) address; the heading links to it.
  //   data-link-template optional. Instead of data-link: an address with {field} parts filled from the record.
  //   data-meta      optional. Comma-separated fields shown under the heading, joined by " — ".
  //                  "field:words" adds words after the value ("redirects:visits" reads "5 visits").
  //   data-hidden-path  optional. Dot path to a flag; when true nothing is drawn and
  //                  data-hidden-text is shown (a service that hides small counts).
  //   data-text      optional. Field shown as a short description under the byline.
  //   data-image     optional. Field holding an http(s) address of a picture.
  //   data-badge     optional. Field shown as a badge above the heading.
  //   data-sort      optional. Field to sort by; data-sort-order is "desc" (default) or "asc".
  //   data-limit     optional. Most cards drawn (default 24).
  //   data-empty-text optional. Shown instead of "No {noun} found." when no record is left to draw.
  //   data-src       may name several files separated by spaces; data-unique is the field that makes a record the same
  //                  record when it is in more than one of them (an agency and its divisions).
  //   data-columns   optional. 2 or 3: cards in that many columns on a wide screen (one on a narrow one).
  //   data-group    optional. Field to group by (an array field counts each value). The list then draws one card for each
  //                  value, not one for each record: the value as the heading, how many records it has, and the dates
  //                  they span. data-group-link is the address the heading links to, with {value} replaced by the value
  //                  (a campaign's page of records, filtered); data-group-date is the date field for the span.
  //   data-timeframe optional. Field holding each record's date; the status line then says how far back the
  //                  records go: "(last week)", "(last month)", "(last 3 months)" or "(since Jan 5, 2026)".
  document.querySelectorAll("[data-record-list]").forEach((list) => {
    if (!list.dataset.src || !list.dataset.title) return;
    const appName = list.dataset.appName || "records";
    const noun = list.dataset.noun || "records";
    const limit = Number.parseInt(list.dataset.limit || "24", 10) || 24;
    const status = statusLine("recordListStatus");
    const cards = document.createElement("ul");
    cards.className = "search-results-list";
    if (["2", "3"].includes(list.dataset.columns)) cards.classList.add(`search-results-list--${list.dataset.columns}`);
    cards.setAttribute("aria-label", noun);
    list.replaceChildren(status, cards);

    const field = (record, name) => asText(pickPath(record, name));

    function draw(records) {
      records.slice(0, limit).forEach((record) => {
        const card = document.createElement("li");
        card.className = "app-card mm-card";
        const imageAddress = list.dataset.image ? field(record, list.dataset.image) : "";
        if (isWebAddress(imageAddress)) {
          const image = document.createElement("img");
          image.className = "mm-card__image";
          image.src = imageAddress;
          image.alt = "";
          image.loading = "lazy";
          card.append(image);
        }
        const body = document.createElement("div");
        body.className = "mm-card__body";
        const badge = list.dataset.badge ? field(record, list.dataset.badge) : "";
        if (badge) {
          const row = document.createElement("div");
          row.className = "mm-card__meta";
          const tag = document.createElement("span");
          tag.className = "app-badge";
          tag.textContent = badge.charAt(0).toUpperCase() + badge.slice(1);
          row.append(tag);
          body.append(row);
        }
        const heading = document.createElement("h3");
        heading.className = "mm-card__title";
        // data-link names a field holding the address; data-link-template builds it from fields: "https://x.org/?id={id}".
        const address = list.dataset.linkTemplate
          ? list.dataset.linkTemplate.replace(/\{([^}]+)\}/g, (_, name) => encodeURIComponent(pickPath(record, name) ?? ""))
          : list.dataset.link ? field(record, list.dataset.link) : "";
        if (isWebAddress(address)) {
          const anchor = document.createElement("a");
          anchor.href = address;
          anchor.target = "_blank";
          anchor.rel = "noreferrer";
          anchor.textContent = field(record, list.dataset.title);
          heading.append(anchor);
        } else {
          heading.textContent = field(record, list.dataset.title);
        }
        body.append(heading);
        // "field:words" adds the words after the value ("redirects:visits" reads "5 visits").
        const meta = (list.dataset.meta || "").split(",").map((entry) => {
          const [name, words] = entry.trim().split(":");
          const value = field(record, name);
          return value && words ? `${value} ${words}` : value;
        }).filter(Boolean).join(" — ");
        if (meta) {
          const byline = document.createElement("p");
          byline.className = "mm-card__byline";
          byline.textContent = meta;
          body.append(byline);
        }
        const text = list.dataset.text ? field(record, list.dataset.text) : "";
        if (text) {
          const description = document.createElement("p");
          description.className = "mm-card__text";
          description.textContent = text;
          body.append(description);
        }
        card.append(body);
        cards.append(card);
      });
    }

    whenShown(list, async () => {
      status.textContent = `Loading ${appName}…`;
      try {
        if (list.dataset.hiddenPath && pickPath(await fetchJson(list.dataset.src.split(/\s+/)[0]), list.dataset.hiddenPath) === true) {
          status.textContent = list.dataset.hiddenText || "Too few to show.";
          return;
        }
        let records = await fetchRecords(list);
        if (list.dataset.sort) {
          const direction = list.dataset.sortOrder === "asc" ? 1 : -1;
          records = [...records].sort((a, b) => direction * String(pickPath(a, list.dataset.sort) ?? "").localeCompare(String(pickPath(b, list.dataset.sort) ?? ""), "en", { numeric: true }));
        }
        if (!records.length) {
          status.textContent = list.dataset.emptyText || `No ${noun} found.`;
          return;
        }
        if (list.dataset.group) {
          // One card for each value of the field: its name, how many records it has, and the dates they span.
          const groups = new Map();
          records.forEach((record) => {
            const found = pickPath(record, list.dataset.group);
            (Array.isArray(found) ? found : [found]).filter((value) => value != null && value !== "").forEach((value) => {
              if (!groups.has(String(value))) groups.set(String(value), []);
              groups.get(String(value)).push(record);
            });
          });
          const span = (members) => {
            const days = members.map((record) => dayOf(pickPath(record, list.dataset.groupDate))).filter(Boolean).sort();
            if (!days.length) return { last: "", text: "" };
            const part = (day, withYear) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" });
            const [first, last] = [days[0], days[days.length - 1]];
            const text = first === last ? part(first, true) : first.slice(0, 4) === last.slice(0, 4) ? `${part(first, false)} – ${part(last, true)}` : `${part(first, true)} – ${part(last, true)}`;
            return { last, text };
          };
          const entries = [...groups].map(([value, members]) => ({ value, members, ...span(members) }))
            .sort((a, b) => (b.last || "").localeCompare(a.last || "") || a.value.localeCompare(b.value, "en"));
          entries.slice(0, limit).forEach((entry) => {
            const card = document.createElement("li");
            card.className = "app-card mm-card";
            const body = document.createElement("div");
            body.className = "mm-card__body";
            const heading = document.createElement("h3");
            heading.className = "mm-card__title";
            const address = (list.dataset.groupLink || "").replace("{value}", encodeURIComponent(entry.value));
            if (isWebAddress(address)) {
              const anchor = document.createElement("a");
              anchor.href = address;
              anchor.target = "_blank";
              anchor.rel = "noreferrer";
              anchor.textContent = entry.value;
              heading.append(anchor);
            } else {
              heading.textContent = entry.value;
            }
            const byline = document.createElement("p");
            byline.className = "mm-card__byline";
            const unit = list.dataset.groupNoun || "records";
            byline.textContent = [`${entry.members.length} ${entry.members.length === 1 ? unit.replace(/s$/, "") : unit}`, entry.text].filter(Boolean).join(" — ");
            body.append(heading, byline);
            card.append(body);
            cards.append(card);
          });
          // A count of everything drawn says nothing a person cannot see; only a cut-off list says how much is left out.
          status.textContent = entries.length > limit ? `Showing ${limit} of ${entries.length} ${noun}.` : "";
          return;
        }
        draw(records);
        // How far back the records go, from the oldest one, in Pacific days.
        let span = "";
        if (list.dataset.timeframe) {
          const days = records.map((record) => dayOf(pickPath(record, list.dataset.timeframe))).filter(Boolean).sort();
          if (days.length) {
            const today = dayOf(new Date().toISOString());
            const ago = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${days[0]}T00:00:00Z`)) / dayMs);
            span = ago <= 7 ? "last week" : ago <= 31 ? "last month" : ago <= 93 ? "last 3 months" : `since ${asText(days[0])}`.replace(/(\w+) (\d+), (\d+)/, (_, m, d, y) => `${m.slice(0, 3)} ${d}, ${y}`);
          }
        }
        // A plain count of everything drawn is left out; a cut-off list, or one with a timeframe, says so.
        const counted = records.length > limit ? `Showing ${limit} of ${records.length} ${noun}` : `${records.length} ${noun}`;
        status.textContent = records.length > limit || span ? `${counted}${span ? ` (${span})` : ""}.` : "";
      } catch (error) {
        console.error(error);
        status.textContent = `${appName} could not be loaded right now.`;
      }
    });
  });

  // Key numbers: the app's stat cards. Either numbers a service already added up, or
  // numbers counted from the records.
  //   data-fields       "field:Label,field:Label"; each field is a dot path under data-path
  //                     (default "data") of the service's answer.
  //   data-compute      instead of data-fields, a JSON list counted from the records:
  //                     ["count","Label"], ["count","Label","field","value"] (records where the
  //                     field equals the value), or ["unique","Label","field"] (different values).
  //   data-hidden-path  optional. Dot path to a flag; when true the numbers are withheld and
  //                     data-hidden-text is shown instead (a service that hides small counts).
  document.querySelectorAll("[data-key-numbers]").forEach((box) => {
    if (!box.dataset.src) return;
    const fields = (box.dataset.fields || "")
      .split(",")
      .map((pair) => pair.split(":"))
      .filter(([field, label]) => field && label)
      .map(([field, label]) => [field.trim(), label.trim()]);
    let compute = [];
    try {
      compute = box.dataset.compute ? JSON.parse(box.dataset.compute) : [];
    } catch (error) {
      console.error(error);
    }
    if (!fields.length && !compute.length) return;
    const appName = box.dataset.appName || "numbers";
    const status = statusLine("keyNumbersStatus");
    const grid = document.createElement("div");
    grid.className = "mm-stats-kpis";
    box.replaceChildren(status, grid);

    const add = (label, value) => {
      const card = document.createElement("div");
      card.className = "mm-stats-kpi";
      const name = document.createElement("p");
      name.className = "app-help-text";
      name.textContent = label;
      const number = document.createElement("p");
      number.className = "mm-stats-kpi__value";
      number.textContent = value.toLocaleString("en-US");
      card.append(name, number);
      grid.append(card);
    };

    whenShown(box, async () => {
      status.textContent = `Loading ${appName}…`;
      try {
        if (compute.length) {
          const records = await fetchRecords(box);
          compute.forEach(([kind, label, field, value]) => {
            if (kind === "unique") add(label, new Set(records.map((record) => pickPath(record, field)).filter((v) => v != null && v !== "")).size);
            else add(label, field ? records.filter((record) => pickPath(record, field) === value).length : records.length);
          });
          status.textContent = "";
          return;
        }
        const body = await fetchJson(box.dataset.src);
        if (box.dataset.hiddenPath && pickPath(body, box.dataset.hiddenPath) === true) {
          status.textContent = box.dataset.hiddenText || "Too few to show.";
          return;
        }
        const data = pickPath(body, box.dataset.path || "data");
        if (!data || typeof data !== "object") throw new Error(`${box.dataset.src}: no numbers`);
        fields.forEach(([field, label]) => {
          const value = pickPath(data, field);
          if (typeof value === "number") add(label, value);
        });
        status.textContent = grid.children.length ? "" : `No ${appName} numbers found.`;
      } catch (error) {
        console.error(error);
        status.textContent = `${appName} could not be loaded right now.`;
      }
    });
  });

  // Charts: the app's chart cards, drawn with Chart.js from the page's own copy.
  //   data-chart-lib    required. Address of chart.min.js, loaded when the first chart is shown.
  //   data-chart-title  required. The card's heading.
  //   data-kind         "line" (default; counts per day, or per month) or "bar" (ranked, horizontal).
  //   data-date         line. Field holding each record's date; data-bucket is "day" (default) or "month".
  //   data-group        bar. Field to rank; an array field counts each of its values.
  //   data-sum          optional. Field to add up instead of counting records (rows a service
  //                     already added up by day).
  //   data-top          bar. Most bars drawn (default 10).
  //   data-hidden-path  optional. As for key numbers.
  // Amounts the page already holds (a budget): data-inline names a <script type="application/json"> in the
  // page, { labels: [...], series: [{ name, values: [...] }], format: "currency" | "number", summary: "..." },
  // instead of data-src. Then data-kind is "columns" (vertical), "bars" (horizontal) or "pie" (the first series as shares of a whole), data-stacked stacks
  // the series, and nothing is fetched except Chart.js.
  const chartLoads = new Map();
  const loadChartLib = (src) => {
    if (typeof window.Chart !== "undefined") return Promise.resolve();
    if (!chartLoads.has(src)) {
      chartLoads.set(src, new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`${src}: could not load the chart library`));
        document.head.append(script);
      }));
    }
    return chartLoads.get(src);
  };

  document.querySelectorAll("[data-chart]").forEach((box) => {
    if ((!box.dataset.src && !box.dataset.inline) || !box.dataset.chartLib || !box.dataset.chartTitle) return;
    const appName = box.dataset.appName || "chart";
    const inlineKind = ["columns", "bars", "pie"].includes(box.dataset.kind) ? box.dataset.kind : "";
    const kind = box.dataset.kind === "bar" ? "bar" : "line";
    const card = document.createElement("section");
    card.className = "app-card";
    const heading = document.createElement("h3");
    heading.textContent = box.dataset.chartTitle;
    const status = statusLine("chartStatus");
    const canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", box.dataset.chartTitle);
    canvas.hidden = true;
    card.append(heading, status, canvas);
    box.replaceChildren(card);

    const monthOf = (day) => day.slice(0, 7);
    function tally(records) {
      const sum = (record) => (box.dataset.sum ? Number(pickPath(record, box.dataset.sum)) || 0 : 1);
      const counts = new Map();
      if (kind === "bar") {
        records.forEach((record) => {
          const found = pickPath(record, box.dataset.group);
          (Array.isArray(found) ? found : [found]).filter((v) => v != null && v !== "").forEach((v) => counts.set(String(v), (counts.get(String(v)) || 0) + sum(record)));
        });
        return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, Number.parseInt(box.dataset.top || "10", 10) || 10);
      }
      const byMonth = box.dataset.bucket === "month";
      records.forEach((record) => {
        const day = dayOf(pickPath(record, box.dataset.date));
        if (!day) return;
        const key = byMonth ? monthOf(day) : day;
        counts.set(key, (counts.get(key) || 0) + sum(record));
      });
      const keys = [...counts.keys()].sort();
      if (!keys.length) return [];
      // Keep the quiet days and months on the line, so a gap looks like a gap.
      const filled = [];
      const step = (key) => {
        const [year, month, day] = key.split("-").map(Number);
        const next = byMonth ? new Date(Date.UTC(year, month, 1)) : new Date(Date.UTC(year, month - 1, day + 1));
        return next.toISOString().slice(0, byMonth ? 7 : 10);
      };
      for (let key = keys[0], guard = 0; key <= keys[keys.length - 1] && guard < 800; key = step(key), guard += 1) filled.push([key, counts.get(key) || 0]);
      return filled;
    }

    const labelFor = (key) => {
      if (kind === "bar") return key;
      const date = new Date(`${key.length === 7 ? `${key}-01` : key}T00:00:00Z`);
      return date.toLocaleDateString("en-US", key.length === 7 ? { month: "short", year: "numeric", timeZone: "UTC" } : { month: "short", day: "numeric", timeZone: "UTC" });
    };

    // Colors that stay apart for people who see color differently (Okabe and Ito); the series are also named
    // in the legend, so color is never the only signal.
    const seriesColors = ["#0072B2", "#E69F00", "#009E73", "#D55E00", "#CC79A7", "#56B4E9", "#8c6d1f", "#555555", "#999999"];
    const amountText = (value, format, short) => {
      if (format === "currency") {
        const sign = value < 0 ? "−" : "";
        const abs = Math.abs(value);
        if (short && abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(abs >= 1e8 ? 0 : 1).replace(/\.0$/, "")}M`;
        if (short && abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}K`;
        return `${sign}$${abs.toLocaleString("en-US")}`;
      }
      return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
    };
    async function drawInline() {
      const holder = document.getElementById(box.dataset.inline);
      const spec = holder ? JSON.parse(holder.textContent) : null;
      await loadChartLib(box.dataset.chartLib);
      if (!spec || !Array.isArray(spec.labels) || !spec.labels.length || !Array.isArray(spec.series) || !spec.series.length) {
        status.textContent = box.dataset.emptyText || "Nothing to show yet.";
        return;
      }
      const format = spec.format || "number";
      if (inlineKind === "pie") {
        // One series as shares of a whole: slices from the largest, each named in the legend with its share, and its
        // amount and percentage in the tooltip. A zero or negative value has no slice.
        const slices = spec.labels.map((label, index) => [label, Number(spec.series[0].values[index]) || 0]).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
        const whole = slices.reduce((sum, [, value]) => sum + value, 0);
        if (!slices.length) {
          status.textContent = box.dataset.emptyText || "Nothing to show yet.";
          return;
        }
        const share = (value) => `${((value / whole) * 100).toFixed(value / whole < 0.1 ? 1 : 0)}%`;
        canvas.setAttribute("aria-label", `${box.dataset.chartTitle}. ${spec.summary || `${slices[0][0]} is the largest share, ${share(slices[0][1])} of ${amountText(whole, format)}.`}`);
        window.Chart.defaults.color = getComputedStyle(card).color;
        window.Chart.defaults.borderColor = getComputedStyle(card).borderTopColor;
        const wrapPie = document.createElement("div");
        wrapPie.style.position = "relative";
        // Many slices: the legend goes underneath, in as many rows as it needs, so no name is cut off.
        const many = slices.length > 8;
        wrapPie.style.height = many ? `${300 + slices.length * 14}px` : "320px";
        canvas.replaceWith(wrapPie);
        wrapPie.append(canvas);
        status.hidden = true;
        canvas.hidden = false;
        new window.Chart(canvas, {
          type: "pie",
          data: { labels: slices.map(([label]) => label), datasets: [{ data: slices.map(([, value]) => value), backgroundColor: slices.map((_, index) => seriesColors[index % seriesColors.length]), borderColor: getComputedStyle(card).backgroundColor, borderWidth: 2 }] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true, position: many ? "bottom" : "right", labels: { generateLabels: (chart) => chart.data.labels.map((label, index) => ({ text: `${label}, ${share(chart.data.datasets[0].data[index])}`, fillStyle: chart.data.datasets[0].backgroundColor[index], strokeStyle: chart.data.datasets[0].backgroundColor[index], hidden: false, index })) } },
              tooltip: { callbacks: { label: (item) => `${item.label}: ${amountText(item.parsed, format)} (${share(item.parsed)})` } },
            },
          },
        });
        return;
      }
      const horizontal = inlineKind === "bars";
      const stacked = box.hasAttribute("data-stacked");
      const many = spec.series.length > 1;
      let summary = spec.summary;
      if (!summary) {
        const first = spec.series[0];
        const top = first.values.indexOf(Math.max(...first.values));
        summary = many
          ? `${spec.series.map((one) => `${one.name} totals ${amountText(one.values.reduce((a, b) => a + b, 0), format)}`).join("; ")}.`
          : `Largest: ${spec.labels[top]} at ${amountText(first.values[top], format)}, of ${spec.labels.length} shown.`;
      }
      canvas.setAttribute("aria-label", `${box.dataset.chartTitle}. ${summary}`);
      window.Chart.defaults.color = getComputedStyle(card).color;
      window.Chart.defaults.borderColor = getComputedStyle(card).borderTopColor;
      // Horizontal bars get a row each; the chart's box grows with them.
      const wrap = document.createElement("div");
      wrap.style.position = "relative";
      wrap.style.height = horizontal ? `${Math.max(160, spec.labels.length * (many && !stacked ? 20 * spec.series.length : 28) + 64)}px` : "320px";
      canvas.replaceWith(wrap);
      wrap.append(canvas);
      status.hidden = true;
      canvas.hidden = false;
      const valueAxis = { beginAtZero: true, stacked, ticks: { callback: (value) => amountText(value, format, true) } };
      const labelAxis = { stacked, grid: { display: false } };
      new window.Chart(canvas, {
        type: "bar",
        data: {
          labels: spec.labels,
          datasets: spec.series.map((one, index) => ({ label: one.name, data: one.values, backgroundColor: seriesColors[index % seriesColors.length], borderColor: seriesColors[index % seriesColors.length] })),
        },
        options: {
          indexAxis: horizontal ? "y" : "x",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: many, position: "bottom" },
            tooltip: { callbacks: { label: (item) => `${item.dataset.label}: ${amountText(item.parsed[horizontal ? "x" : "y"], format)}` } },
          },
          scales: horizontal ? { x: valueAxis, y: labelAxis } : { x: labelAxis, y: valueAxis },
        },
      });
    }

    whenShown(box, async () => {
      status.textContent = `Loading ${appName}…`;
      try {
        if (inlineKind) {
          await drawInline();
          return;
        }
        const [body] = await Promise.all([fetchJson(box.dataset.src.split(/\s+/)[0]), loadChartLib(box.dataset.chartLib)]);
        if (box.dataset.hiddenPath && pickPath(body, box.dataset.hiddenPath) === true) {
          // The key numbers beside it already say why; a second card saying it again adds nothing.
          box.hidden = true;
          return;
        }
        const records = await fetchRecords(box);
        const entries = tally(records);
        if (!entries.length) {
          if ("hideEmpty" in box.dataset) {
            box.hidden = true;
            return;
          }
          status.textContent = box.dataset.emptyText || "Nothing to show yet.";
          return;
        }
        const labels = entries.map(([key]) => labelFor(key));
        const values = entries.map(([, count]) => count);
        const peak = values.indexOf(Math.max(...values));
        canvas.setAttribute("aria-label", kind === "bar"
          ? `${box.dataset.chartTitle}. Top: ${labels[0]} with ${values[0]}, of ${labels.length} shown.`
          : `${box.dataset.chartTitle}. ${values.reduce((a, b) => a + b, 0)} total, peaking at ${values[peak]} on ${labels[peak]}.`);
        // Chart.js draws its own text and grid, so give it the page's colors.
        window.Chart.defaults.color = getComputedStyle(card).color;
        window.Chart.defaults.borderColor = getComputedStyle(card).borderTopColor;
        status.hidden = true;
        canvas.hidden = false;
        canvas.style.maxHeight = "320px";
        new window.Chart(canvas, {
          type: kind,
          data: { labels, datasets: [{ data: values, borderColor: "#0777cf", backgroundColor: "#0777cf", tension: 0 }] },
          options: kind === "bar"
            ? { indexAxis: "y", responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { precision: 0 } } } }
            : { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { precision: 0 }, beginAtZero: true } } },
        });
      } catch (error) {
        console.error(error);
        status.textContent = `${appName} could not be loaded right now.`;
      }
    });
  });

  // Security: any [data-security-json="path"] section lazy-loads that path
  // (same-origin, same repo — unlike Updates, there's no cross-repo GitHub
  // API call needed) the first time it becomes visible, and renders its
  // security.json's publicSecurity block only — never the full document,
  // per marin-digital-standards/security/standard.md's public/internal
  // separation. An app with no security.json yet (fetch 404s) gets a plain
  // "not yet published" status instead of an error, since that's the
  // honest, expected state for most apps today.
  document.querySelectorAll("[data-security-json]").forEach((section) => {
    const jsonPath = section.dataset.securityJson;
    const status = section.querySelector("[data-security-status]");
    const content = section.querySelector("[data-security-content]");
    if (!jsonPath || !status || !content) return;

    let loaded = false;

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    // Who the app is for comes from project.audience in the app's own
    // marin.yml, so it can't drift from the manifest. The security profile
    // label is only the fallback when marin.yml can't be read.
    const AUDIENCE_LABELS = {
      staff: "County staff",
      public: "The public",
      developers: "Developers",
    };
    const PROFILE_LABELS = {
      "public-web": "Public web application",
      "public-api": "Public API",
      authenticated: "Authenticated application",
      internal: "For County staff",
      custom: "Custom",
    };

    async function loadSecurity() {
      if (loaded) return;
      status.textContent = loadingMessage();
      try {
        const response = await fetch(jsonPath, { cache: "no-store" });
        if (response.status === 404) {
          loaded = true;
          status.textContent = "No security information has been published for this application yet.";
          return;
        }
        if (!response.ok) throw new Error(`security.json fetch failed: ${response.status}`);
        const config = await response.json();
        const pub = config?.publicSecurity;
        loaded = true;
        if (!pub) {
          status.textContent = "This application's security.json has no public security summary yet.";
          return;
        }
        const manifest = await fetch("marin.yml", { cache: "no-store" })
          .then((res) => (res.ok ? res.text() : ""))
          .catch(() => "");
        const audienceLabel = AUDIENCE_LABELS[manifestProjectScalar(manifest, "audience")];
        const profileLabel = audienceLabel || PROFILE_LABELS[config.profile] || "Not set";
        status.textContent = pub.lastReviewed ? `Last reviewed ${escapeHtml(pub.lastReviewed)}.` : "Review date not recorded.";
        const controlsHtml =
          Array.isArray(pub.controls) && pub.controls.length
            ? `<ul>${pub.controls.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
            : "<p>No controls listed yet.</p>";
        const dataEntries = pub.data && typeof pub.data === "object" ? Object.entries(pub.data) : [];
        const dataHtml = dataEntries.length
          ? `<ul>${dataEntries
              .map(([key, value]) => `<li>${escapeHtml(key)}: ${escapeHtml(String(value))}</li>`)
              .join("")}</ul>`
          : "";
        content.innerHTML =
          `<p><b>${audienceLabel ? "Built for" : "Security profile"}:</b> ${escapeHtml(profileLabel)}</p>` +
          `<h4>Security controls</h4>${controlsHtml}` +
          (dataHtml ? `<h4>Data</h4>${dataHtml}` : "");
      } catch (error) {
        loaded = true;
        console.error(error);
        status.textContent = "Couldn't load security information right now.";
      }
    }

    if (!section.hidden) loadSecurity();

    new MutationObserver(() => {
      if (!section.hidden) loadSecurity();
    }).observe(section, { attributes: true, attributeFilter: ["hidden"] });
  });

  // Builds an accessibility score gauge (see .app-score in app-brand.css) for
  // an integer 0-100 Lighthouse score: a ring, the number, and the band word.
  // Bands match Lighthouse's own. Exposed as window.marinScoreGauge so other
  // scripts (marin-os's score table) draw the identical component.
  function marinScoreGauge(score, { large = false } = {}) {
    const value = Math.max(0, Math.min(100, Math.round(Number(score))));
    const band = value >= 90 ? "good" : value >= 50 ? "needs-improvement" : "poor";
    const label = { good: "Good", "needs-improvement": "Needs improvement", poor: "Poor" }[band];
    const SVG = "http://www.w3.org/2000/svg";
    const svgEl = (name, attrs) => {
      const el = document.createElementNS(SVG, name);
      Object.entries(attrs).forEach(([key, val]) => el.setAttribute(key, val));
      return el;
    };

    const wrapper = document.createElement("span");
    wrapper.className = `app-score${large ? " app-score--large" : ""}`;
    wrapper.dataset.band = band;

    // r = 100 / (2 * PI), so the circumference is exactly 100 and the arc's
    // dash length is simply the score.
    const ring = svgEl("svg", { class: "app-score__ring", viewBox: "0 0 36 36", "aria-hidden": "true", focusable: "false" });
    ring.append(
      svgEl("circle", { class: "app-score__track", cx: 18, cy: 18, r: 15.9155 }),
      svgEl("circle", {
        class: "app-score__arc",
        cx: 18,
        cy: 18,
        r: 15.9155,
        transform: "rotate(-90 18 18)",
        "stroke-dasharray": `${value} 100`,
      })
    );
    const number = svgEl("text", { class: "app-score__number", x: 18, y: 18 });
    number.textContent = String(value);
    ring.append(number);

    const text = document.createElement("span");
    text.className = "app-score__label";
    const hidden = document.createElement("span");
    hidden.className = "visually-hidden";
    hidden.textContent = `Accessibility score ${value} out of 100: `;
    text.append(hidden, document.createTextNode(label));

    wrapper.append(ring, text);
    return wrapper;
  }
  window.marinScoreGauge = marinScoreGauge;

  // Accessibility: any [data-accessibility-scores] section lazy-loads the
  // shared MarinOS Lighthouse results the first time it becomes visible and
  // shows this app's own entry. Automated testing only — never labelled as
  // WCAG conformance. A failed scan is not shown as a low score: the last good
  // result stays visible with its date, or "not available" if there is none.
  document.querySelectorAll("[data-accessibility-scores]").forEach((section) => {
    const status = section.querySelector("[data-accessibility-status]");
    const content = section.querySelector("[data-accessibility-content]");
    if (!status || !content) return;

    const STALE_AFTER_DAYS = 14;
    const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const scoresUrl = isLocal ? "http://localhost:8935/data/lighthouse.json" : LIGHTHOUSE_URL;
    let loaded = false;

    function formatDate(iso) {
      const date = new Date(iso);
      return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    }

    async function resolveAppId() {
      const header = document.querySelector("marin-app-header");
      const direct =
        section.dataset.accessibilityAppId ||
        (header ? normalizedAttribute(header, "app-id") : "") ||
        document.body.dataset.appId ||
        "";
      if (direct) return direct;
      const response = await fetch(CATALOG_URL);
      if (!response.ok) throw new Error(`catalog fetch failed: ${response.status}`);
      const current = window.location.href;
      const match = (await response.json()).find((entry) => {
        const href = safeLinkUrl(entry?.url);
        return href && current.startsWith(href);
      });
      return match ? match.id : "";
    }

    function show(entry) {
      const good =
        entry && entry.status === "success"
          ? { score: entry.score, testedAt: entry.testedAt }
          : (entry && entry.lastSuccess) || null;
      content.replaceChildren();
      if (!good) {
        status.textContent = "An accessibility score isn't available for this application yet.";
        return;
      }
      const scoreLine = document.createElement("p");
      scoreLine.append(marinScoreGauge(good.score, { large: true }));
      const source = document.createElement("p");
      source.className = "app-help-text";
      const notes = [];
      if (entry.status !== "success") notes.push("The latest scan didn't finish, so this is the last successful result.");
      else if (Date.now() - new Date(good.testedAt).getTime() > STALE_AFTER_DAYS * 86400000) notes.push("This result is out of date.");
      source.textContent = ["Google Lighthouse", `Tested ${formatDate(good.testedAt)}`, ...notes].join(". ") + (notes.length ? "" : ".");
      content.append(scoreLine, source);
      // The same test, run live: PageSpeed Insights' own results page for the
      // tested address (mobile, matching how the stored score was produced).
      const tested = entry.url;
      if (tested) {
        const report = document.createElement("p");
        const link = document.createElement("a");
        link.href = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(tested)}&form_factor=mobile`;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = "Lighthouse results";
        report.append(link);
        content.append(report);
      }
      status.textContent = "";
    }

    async function loadScore() {
      if (loaded) return;
      status.textContent = loadingMessage();
      try {
        const [appId, response] = await Promise.all([resolveAppId(), fetch(scoresUrl, { cache: "no-store" })]);
        loaded = true;
        if (response.status === 404) {
          status.textContent = "Accessibility scores haven't been collected yet.";
          return;
        }
        if (!response.ok) throw new Error(`scores fetch failed: ${response.status}`);
        const data = await response.json();
        show(appId && data && data.apps ? data.apps[appId] : null);
      } catch (error) {
        loaded = true;
        console.error(error);
        status.textContent = "Couldn't load the accessibility score right now.";
      }
    }

    if (!section.hidden) loadScore();

    new MutationObserver(() => {
      if (!section.hidden) loadScore();
    }).observe(section, { attributes: true, attributeFilter: ["hidden"] });
  });

  // Tech: any [data-tech-data] section lazy-loads the shared MarinOS tech data
  // the first time it becomes visible and shows this app's own entry. Missing
  // data is never shown as zero, "No", or "none": each part says "Not
  // available", "Not documented" or "Unable to retrieve" instead.
  document.querySelectorAll("[data-tech-data]").forEach((section) => {
    const status = section.querySelector("[data-tech-status]");
    const content = section.querySelector("[data-tech-content]");
    if (!status || !content) return;

    const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const base = isLocal ? "http://localhost:8935/" : MARINOS_URL;
    const ECOSYSTEMS = { npm: "npm", githubactions: "GitHub Actions", pypi: "PyPI", github: "GitHub" };
    // MarinOS nests several apps' Tech details on one page, so the block's
    // headings start at data-tech-heading-level (default 3) instead of fixed h3.
    const level = Math.min(5, Math.max(2, Number(section.dataset.techHeadingLevel) || 3));
    const heading = (text, extra = 0) => el(`h${level + extra}`, text);
    // SPDX id -> readable name ("MIT" -> "MIT License"), as reported by GitHub
    // when the data was collected; unknown ids are shown as they are.
    let licenseNames = {};
    const licenseLabel = (id) => licenseNames[id] || id;
    // Marin App Shell and Marin UI have their own Tech details on MarinOS.
    let componentLinks = {};
    let loaded = false;

    const formatDate = (iso) => {
      const date = new Date(iso);
      return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    };
    const el = (name, text, className) => {
      const node = document.createElement(name);
      if (text !== undefined) node.textContent = text;
      if (className) node.className = className;
      return node;
    };
    const labelled = (label, value) => {
      const p = document.createElement("p");
      p.append(el("strong", `${label}: `), value instanceof Node ? value : document.createTextNode(value));
      return p;
    };
    const note = (text) => el("p", text, "app-help-text");
    const table = (caption, headers, rows) => {
      const wrap = el("div", undefined, "app-table-wrap");
      const t = document.createElement("table");
      t.append(el("caption", caption, "visually-hidden"));
      const head = document.createElement("tr");
      headers.forEach((h) => head.append(Object.assign(el("th", h), { scope: "col" })));
      const thead = document.createElement("thead");
      thead.append(head);
      const tbody = document.createElement("tbody");
      rows.forEach((row) => {
        const tr = document.createElement("tr");
        row.forEach((cell) => {
          const td = document.createElement("td");
          if (cell instanceof Node) td.append(cell);
          else td.textContent = cell;
          tr.append(td);
        });
        tbody.append(tr);
      });
      t.append(thead, tbody);
      wrap.append(t);
      return wrap;
    };

    // Mirrors scripts/tech.js: the root package is the repository itself, and
    // direct dependencies are the ones the root depends on.
    function dependencyRows(doc) {
      const relationships = doc.relationships || [];
      const roots = new Set(relationships.filter((r) => r.relationshipType === "DESCRIBES").map((r) => r.relatedSpdxElement));
      const direct = new Set(
        relationships.filter((r) => r.relationshipType === "DEPENDS_ON" && roots.has(r.spdxElementId)).map((r) => r.relatedSpdxElement)
      );
      return (doc.packages || [])
        .filter((pkg) => !roots.has(pkg.SPDXID))
        .map((pkg) => {
          const purl = (pkg.externalRefs || []).find((ref) => ref.referenceType === "purl");
          const eco = purl && /^pkg:([^/]+)\//.exec(purl.referenceLocator);
          const license = pkg.licenseConcluded || pkg.licenseDeclared;
          return [
            pkg.name,
            pkg.versionInfo || "Not provided",
            direct.has(pkg.SPDXID) ? "Direct" : "Transitive",
            eco ? ECOSYSTEMS[eco[1]] || eco[1] : "Not provided",
            license && license !== "NOASSERTION" && license !== "NONE" ? licenseLabel(license) : "Not provided",
          ];
        })
        .sort((a, b) => (a[2] === b[2] ? a[0].localeCompare(b[0]) : a[2] === "Direct" ? -1 : 1));
    }

    function renderLanguages(entry) {
      const frag = document.createDocumentFragment();
      frag.append(heading("Languages"));
      const langs = entry.languages;
      const data = langs && (langs.status === "success" ? langs : langs.lastSuccess);
      if (data && data.percentages) {
        frag.append(
          table("Languages used in the repository", ["Language", "Usage"], Object.entries(data.percentages).map(([name, pct]) => [name, `${pct.toFixed(1)}%`]))
        );
        frag.append(note(`Calculated from the code in the repository, as reported by GitHub${langs.status === "success" ? "" : ". The latest update failed, so this is the last successful result"}.`));
      } else if (langs && langs.status === "none-detected") {
        frag.append(el("p", "GitHub detected no programming languages in this repository."));
      } else {
        frag.append(el("p", "Unable to retrieve language information."));
      }
      if (entry.repository) {
        const link = el("a", entry.repository);
        link.href = entry.url || `https://github.com/${entry.repository}`;
        link.target = "_blank";
        link.rel = "noreferrer";
        frag.append(labelled("Repository", link));
      }
      if (data && data.primary) frag.append(labelled("Primary language", data.primary));
      if (entry.license) frag.append(labelled("License", licenseLabel(entry.license)));
      if (entry.pushedAt && formatDate(entry.pushedAt)) frag.append(labelled("Last updated", formatDate(entry.pushedAt)));
      return frag;
    }

    async function renderDependencies(entry) {
      const frag = document.createDocumentFragment();
      frag.append(heading("Dependencies"));
      const deps = entry.dependencies;
      if (!deps || deps.status !== "success") {
        frag.append(el("p", deps ? "Unable to retrieve dependency information." : "Not available"));
      } else {
        const total = document.createElement("p");
        total.append(el("strong", `${deps.total} ${deps.total === 1 ? "dependency" : "dependencies"}`));
        frag.append(total);
        if (deps.total === 0) {
          frag.append(el("p", "GitHub's dependency graph found no software dependencies for this application."));
        } else {
          frag.append(el("p", `${deps.direct} direct · ${deps.transitive} transitive`));
        }
        if (deps.sbom && deps.sbom.generated && formatDate(deps.sbom.generated)) {
          frag.append(note(`SBOM generated ${formatDate(deps.sbom.generated)}.`));
        }
        if (deps.total > 0 && deps.sbom && deps.sbom.path) {
          try {
            const response = await fetch(`${base}${deps.sbom.path}`);
            if (!response.ok) throw new Error(`SBOM fetch failed: ${response.status}`);
            frag.append(table("Software dependencies", ["Dependency", "Version", "Relationship", "Ecosystem", "License"], dependencyRows(await response.json())));
          } catch (error) {
            console.error(error);
            frag.append(el("p", "Unable to retrieve the dependency list."));
          }
        }
      }

      frag.append(heading("Bundled components", 1));
      const bundled = entry.bundled;
      if (bundled && bundled.status === "success" && bundled.components.length) {
        frag.append(note("Libraries and assets copied into this application's repository. GitHub's dependency graph does not detect these."));
        frag.append(
          table("Bundled components", ["Component", "Version", "License"], bundled.components.map((c) => {
            let name = c.name;
            if (componentLinks[c.name]) {
              name = el("a", c.name);
              name.href = componentLinks[c.name];
            }
            return [name, c.version || "Not provided", c.license || "Not provided"];
          }))
        );
      } else if (bundled && bundled.status === "none-detected") {
        frag.append(el("p", "None detected."));
      } else {
        frag.append(el("p", bundled ? "Unable to retrieve bundled components." : "Not available"));
      }
      return frag;
    }

    function renderSbom(entry, appId) {
      const frag = document.createDocumentFragment();
      frag.append(heading("Software bill of materials"));
      const sbom = entry.dependencies && entry.dependencies.status === "success" ? entry.dependencies.sbom : null;
      if (!sbom) {
        frag.append(el("p", "Not available"));
        return frag;
      }
      frag.append(
        el("p", "This application's software bill of materials (SBOM) is a machine-readable inventory of its software components and dependencies.")
      );
      frag.append(labelled("Format", sbom.format));
      frag.append(labelled("Version", sbom.version));
      if (sbom.generated && formatDate(sbom.generated)) frag.append(labelled("Generated", formatDate(sbom.generated)));
      frag.append(labelled("Packages", String(sbom.packages)));
      frag.append(labelled("Source", sbom.source));
      const link = el("a", "SBOM file (SPDX JSON)");
      link.href = `${base}${sbom.path}`;
      link.target = "_blank";
      link.rel = "noreferrer";
      const p = document.createElement("p");
      p.append(link);
      frag.append(p);
      return frag;
    }

    function renderServices(entry) {
      const frag = document.createDocumentFragment();
      frag.append(heading("Services used"));
      const sv = entry.services;
      if (sv && sv.status === "documented" && sv.items.length) {
        frag.append(
          table(
            "Outside services this application uses",
            ["Service", "Purpose", "Called from", "Receives visitor data"],
            sv.items.map((s) => [s.name, s.purpose, s.runs === "browser" ? "Visitor's browser" : "Build only", s.visitorData ? "Yes" : "No"])
          )
        );
      } else if (sv && sv.status === "documented") {
        frag.append(el("p", "This application does not use outside services of its own."));
      } else if (sv && sv.status === "unavailable") {
        frag.append(el("p", "Unable to retrieve services."));
      } else {
        frag.append(el("p", "Not documented"));
      }
      frag.append(
        note("Every MarinOS application also reads MarinOS's shared data files and, for its Updates section, GitHub's public API for recent changes.")
      );
      return frag;
    }

    function renderAi(entry) {
      const frag = document.createDocumentFragment();
      frag.append(heading("AI"));
      const ai = entry.ai;
      if (ai && ai.status === "documented" && ai.used === true) {
        frag.append(labelled("Uses AI", "Yes"));
        if (ai.description) frag.append(el("p", ai.description));
        if (ai.provider) frag.append(labelled("Provider", ai.provider));
        if (ai.features && ai.features.length) {
          const label = document.createElement("p");
          label.append(el("strong", "Features:"));
          frag.append(label);
          const list = document.createElement("ul");
          ai.features.forEach((feature) => list.append(el("li", feature)));
          frag.append(list);
        }
      } else if (ai && ai.status === "documented" && ai.used === false) {
        frag.append(labelled("Uses AI", "No"));
        frag.append(el("p", "This application does not currently use AI as part of the deployed service."));
      } else if (ai && ai.status === "unavailable") {
        frag.append(labelled("AI use", "Unable to retrieve"));
      } else {
        frag.append(labelled("AI use", "Not documented"));
        frag.append(el("p", "AI usage has not yet been documented for this application."));
      }
      frag.append(note("AI here means AI functionality in the deployed application, not tools used to build it."));
      return frag;
    }

    async function resolveAppId() {
      const header = document.querySelector("marin-app-header");
      const direct =
        section.dataset.techAppId || (header ? normalizedAttribute(header, "app-id") : "") || document.body.dataset.appId || "";
      if (direct) return direct;
      const response = await fetch(CATALOG_URL);
      if (!response.ok) throw new Error(`catalog fetch failed: ${response.status}`);
      const current = window.location.href;
      const match = (await response.json()).find((item) => {
        const href = safeLinkUrl(item?.url);
        return href && current.startsWith(href);
      });
      return match ? match.id : "";
    }

    async function loadTech() {
      if (loaded) return;
      status.textContent = loadingMessage();
      try {
        const [appId, response] = await Promise.all([resolveAppId(), fetch(isLocal ? `${base}data/tech.json` : TECH_URL, { cache: "no-store" })]);
        loaded = true;
        if (response.status === 404) {
          status.textContent = "Technology information hasn't been collected yet.";
          return;
        }
        if (!response.ok) throw new Error(`tech fetch failed: ${response.status}`);
        const data = await response.json();
        licenseNames = (data && data.licenseNames) || {};
        componentLinks = {};
        Object.entries((data && data.apps) || {}).forEach(([id, item]) => {
          if (item && item.kind === "component" && item.name) componentLinks[item.name] = `${base}#tech-${id}`;
        });
        const entry = appId && data && data.apps ? data.apps[appId] : null;
        if (!entry) {
          status.textContent = "Technology information isn't available for this application yet.";
          return;
        }
        content.replaceChildren(renderLanguages(entry), await renderDependencies(entry), renderSbom(entry, appId), renderServices(entry), renderAi(entry));
        status.textContent = data.generatedAt && formatDate(data.generatedAt) ? `Data collected ${formatDate(data.generatedAt)}.` : "";
      } catch (error) {
        loaded = true;
        console.error(error);
        status.textContent = "Unable to retrieve technology information right now.";
      }
    }

    if (!section.hidden) loadTech();

    new MutationObserver(() => {
      if (!section.hidden) loadTech();
    }).observe(section, { attributes: true, attributeFilter: ["hidden"] });
  });

  // Preserve older initial-page icons that relied on CSS for presentation.
  // New app-owned icons must include the full canonical Lucide attributes.
  document.querySelectorAll(
    ".app-icon svg, .app-card__icon svg, .docs-brand-icon svg, .copy-button svg, .menu-toggle__caret"
  ).forEach(addLucideDefaults);

  // Declarative icons: an element with data-icon="name" gets that bundled Lucide icon before its content, and
  // data-icon-end="name" gets one after it (the "Learn more" arrow). The icon is decoration, so name the button
  // with aria-label (and title). Elements added later, such as buttons an app draws with script, are filled in too.
  // An unknown name is a console warning, never an error, so one typo cannot break a page.
  function applyDeclarativeIcons(root) {
    const found = root.nodeType === 1 && root.matches?.("[data-icon], [data-icon-end]") ? [root] : [];
    root.querySelectorAll?.("[data-icon], [data-icon-end]").forEach((element) => found.push(element));
    found.forEach((element) => {
      [["data-icon", "start"], ["data-icon-end", "end"]].forEach(([attribute, position]) => {
        const name = element.getAttribute(attribute);
        if (!name || element.querySelector(`:scope > svg[data-shell-icon="${position}"]`)) return;
        if (!LUCIDE_ICONS[name]) {
          console.warn(`[Marin App Shell ${SHELL_VERSION}] Unknown icon "${name}".`, element);
          return;
        }
        const icon = createLucideIcon(name);
        icon.setAttribute("data-shell-icon", position);
        if (position === "start") element.prepend(icon);
        else element.append(icon);
      });
    });
  }
  applyDeclarativeIcons(document);
  new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType === 1) applyDeclarativeIcons(node);
    }));
  }).observe(document.documentElement, { childList: true, subtree: true });

  document.documentElement.dataset.marinShellVersion = SHELL_VERSION;
  document.documentElement.dataset.marinUiVersion = MARIN_UI_VERSION;
  window.MarinAppShell = Object.freeze({
    version: SHELL_VERSION,
    marinUiVersion: MARIN_UI_VERSION,
    components: Object.freeze(componentDefinitions.map(([name]) => name)),
    loadingMessage,
    icon: (name, className = "") => lucideMarkup(name, className),
  });
  document.dispatchEvent(
    new CustomEvent("marinos:shell-ready", {
      detail: { version: SHELL_VERSION, marinUiVersion: MARIN_UI_VERSION },
    })
  );
})();
