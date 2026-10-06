(() => {
  "use strict";

  if (window.MarinAppShell?.version) {
    console.warn(`Marin App Shell ${window.MarinAppShell.version} is already loaded.`);
    return;
  }

  const SHELL_VERSION = "1.5.0";
  const MARIN_UI_VERSION = "1.19.0";
  const MARINOS_URL = "https://marincountygov.github.io/marin-os/";
  const MARINOS_STATUS_URL = `${MARINOS_URL}#status`;
  const CATALOG_URL = `${MARINOS_URL}catalog.json`;
  // Google Lighthouse accessibility results for every MarinOS app, written
  // by marin-os's scripts/lighthouse.js. One shared file, keyed by catalog id.
  const LIGHTHOUSE_URL = `${MARINOS_URL}data/lighthouse.json`;
  const WCAG_URL = "https://www.w3.org/TR/WCAG22/";
  const FEEDBACK_URL = "https://form.asana.com/?k=qVUT83d5DBmlDiIyi-WAyQ&d=23133298259496";
  const SECURITY_STANDARD_URL =
    "https://github.com/marincountygov/marin-digital-standards/blob/main/security/standard.md";

  const STANDARD_LINKS = Object.freeze({
    about: "About",
    security: "Security",
    accessibility: "Accessibility",
    updates: "Updates",
  });
  const MARINOS_STATUS_LABELS = Object.freeze({ alpha: "Alpha", beta: "Beta", live: "Live" });

  // Generated from the hash-locked vendor/icons/lucide/*.svg at build time.
  const LUCIDE_ICONS = Object.freeze({"check": "<path d=\"M20 6 9 17l-5-5\"/>", "chevron-down": "<path d=\"m6 9 6 6 6-6\"/>", "copy": "<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\"/><path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\"/>", "layout-grid": "<rect width=\"7\" height=\"7\" x=\"3\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"7\" x=\"14\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"7\" x=\"14\" y=\"14\" rx=\"1\"/><rect width=\"7\" height=\"7\" x=\"3\" y=\"14\" rx=\"1\"/>"});
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

  function manifestProjectStatus(source) {
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

      const match = line.trim().match(/^status\s*:\s*(?:"([^"]*)"|'([^']*)'|([^#]*?))\s*(?:#.*)?$/);
      if (!match) continue;
      const value = (match[1] ?? match[2] ?? match[3] ?? "").trim().toLowerCase();
      return MARINOS_STATUS_LABELS[value] ? value : "";
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
      const standardLinks = parseTokenList(this.getAttribute("standard-links"), "about updates");

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
      menuToggle.className = "app-menu-toggle secondary";
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
        updates: cloneTemplate(this, "template[data-updates-intro]"),
      };
      const appName = normalizedAttribute(this, "app-name", "This application");
      const repo = normalizedAttribute(this, "repo");
      const securityJson = normalizedAttribute(this, "security-src", "security.json");
      const securityStandardUrl = normalizedAttribute(this, "security-standard-url", SECURITY_STANDARD_URL);
      const securityContactUrl = normalizedAttribute(this, "security-contact-url", ".well-known/security.txt");
      const sectionKeys = parseTokenList(
        this.getAttribute("sections"),
        "about security accessibility updates"
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
          status.innerHTML = "Loading security information&hellip;";
          const content = document.createElement("div");
          content.dataset.securityContent = "";

          const technicalHeading = document.createElement("h3");
          technicalHeading.textContent = "Technical information";
          const technicalList = document.createElement("ul");
          [
            [securityJson, "security.json"],
            [securityContactUrl, "security.txt"],
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
          standardParagraph.append(document.createTextNode(`${appName} targets `));
          const wcagLink = document.createElement("a");
          wcagLink.href = WCAG_URL;
          wcagLink.textContent = "WCAG 2.2 Level AA";
          standardParagraph.append(wcagLink, document.createTextNode("."));
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
          status.innerHTML = "Loading accessibility score&hellip;";
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

        if (key === "updates") {
          if (templates.updates) section.append(templates.updates);
          const status = document.createElement("p");
          status.className = "app-help-text";
          status.dataset.updatesStatus = "";
          status.setAttribute("role", "status");
          status.setAttribute("aria-live", "polite");
          status.setAttribute("aria-atomic", "true");
          status.innerHTML = repo ? "Loading recent commits&hellip;" : "Updates are not configured for this application.";
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
      const requestedLinks = parseTokenList(this.getAttribute("links"), "about security accessibility updates").filter(
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
      this.replaceChildren(link);
      this.dataset.rendered = "true";
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

  document.querySelectorAll(".menu").forEach((menu) => {
    const toggle = menu.querySelector(":scope > .menu-toggle");
    const panel = menu.querySelector(":scope > .menu-panel");
    if (!toggle || !panel) return;

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
  });

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
      const links = entries
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

  const toc = document.querySelector(".docs-toc, .toc");
  const tocLinks = toc
    ? Array.from(toc.querySelectorAll('a[href^="#"]')).filter((link) => link.hash.length > 1)
    : [];
  const tocTargets = tocLinks
    .map((link) => ({ link, target: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
    .filter((item) => item.target);

  let scrollScheduled = false;

  function updateCurrentSection() {
    scrollScheduled = false;
    if (!tocTargets.length) return;

    const threshold = Math.max(96, window.innerHeight * 0.28);
    let current = tocTargets[0];

    tocTargets.forEach((item) => {
      if (item.target.offsetParent === null) return;
      if (item.target.getBoundingClientRect().top <= threshold) current = item;
    });

    tocTargets.forEach((item) => {
      if (item === current) item.link.setAttribute("aria-current", "location");
      else item.link.removeAttribute("aria-current");
    });
  }

  function scheduleCurrentSectionUpdate() {
    if (scrollScheduled) return;
    scrollScheduled = true;
    window.requestAnimationFrame(updateCurrentSection);
  }

  if (tocTargets.length) {
    window.addEventListener("scroll", scheduleCurrentSectionUpdate, { passive: true });
    window.addEventListener("resize", scheduleCurrentSectionUpdate);
    window.addEventListener("hashchange", scheduleCurrentSectionUpdate);
    updateCurrentSection();
  }

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

  /** Render html into a hidden contenteditable element, select it, and let
   * the browser's native execCommand("copy") capture both clipboard
   * flavors from the real selection. Kept only as a fallback for browsers
   * without the async Clipboard API's multi-flavor write() below — its
   * plain-text flavor is the browser's own derivation from the selected
   * DOM (visible text only, e.g. a link's href is dropped), not the exact
   * `text` a caller asked for, which write() gives explicit control over. */
  function copyRichTextViaExecCommand(html) {
    const temp = document.createElement("div");
    temp.contentEditable = "true";
    temp.style.position = "fixed";
    temp.style.left = "-9999px";
    temp.innerHTML = html;
    document.body.appendChild(temp);
    const range = document.createRange();
    range.selectNodeContents(temp);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const copied = document.execCommand("copy");
    selection.removeAllRanges();
    document.body.removeChild(temp);
    return copied;
  }

  /** Write both clipboard flavors explicitly so a plain-text paste gets
   * exactly `text` (e.g. a link's URL, spelled out, not just its visible
   * label) and a rich-text paste gets exactly `html`. Falls back to the
   * execCommand technique above, then to plain writeText(text), for
   * browsers without ClipboardItem/clipboard.write support. */
  async function copyRich(text, html) {
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
        // Fall through to the older technique below (older browser, or a
        // permissions/user-gesture rejection ClipboardItem hit but
        // execCommand might not).
      }
    }
    try {
      if (copyRichTextViaExecCommand(html)) return true;
    } catch {
      // Fall through to plain-text writeText in the caller.
    }
    return false;
  }

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
        else navigator.clipboard.writeText(value).then(onCopied).catch(onFailed);
      });
      return;
    }

    navigator.clipboard.writeText(value).then(onCopied).catch(onFailed);
  });

  // Share: any button[data-action="share"] copies the current page URL and
  // reports through a sibling .doc-action-status inside the same
  // .doc-actions group, if present.
  document.querySelectorAll('[data-action="share"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const status = button.closest(".doc-actions")?.querySelector(".doc-action-status") ?? null;
      try {
        await navigator.clipboard.writeText(window.location.href);
        if (status) status.textContent = "Link copied";
      } catch {
        if (status) status.textContent = "Couldn't copy — copy the address bar link instead";
      }
    });
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
      const activeName = tabNames.includes(hash) ? hash : tabNames[0];
      tabSections.forEach((section) => {
        section.hidden = section.dataset.tabSection !== activeName;
      });
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
      if (status) status.textContent = "Loading latest commits...";
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

    const PROFILE_LABELS = {
      "public-web": "Public web application",
      "public-api": "Public API",
      authenticated: "Authenticated application",
      internal: "For County staff",
      custom: "Custom",
    };

    async function loadSecurity() {
      if (loaded) return;
      status.textContent = "Loading security information...";
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
        const profileLabel = pub.profile || PROFILE_LABELS[config.profile] || "Not set";
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
          `<p><b>Security profile:</b> ${escapeHtml(profileLabel)}</p>` +
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
      status.textContent = "Loading accessibility score...";
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

  // Preserve older initial-page icons that relied on CSS for presentation.
  // New app-owned icons must include the full canonical Lucide attributes.
  document.querySelectorAll(
    ".app-icon svg, .app-card__icon svg, .docs-brand-icon svg, .copy-button svg, .menu-toggle__caret"
  ).forEach(addLucideDefaults);

  document.documentElement.dataset.marinShellVersion = SHELL_VERSION;
  document.documentElement.dataset.marinUiVersion = MARIN_UI_VERSION;
  window.MarinAppShell = Object.freeze({
    version: SHELL_VERSION,
    marinUiVersion: MARIN_UI_VERSION,
    components: Object.freeze(componentDefinitions.map(([name]) => name)),
  });
  document.dispatchEvent(
    new CustomEvent("marinos:shell-ready", {
      detail: { version: SHELL_VERSION, marinUiVersion: MARIN_UI_VERSION },
    })
  );
})();
