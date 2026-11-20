#!/usr/bin/env python3
"""Read-only starter/integrity checks. Uses only the Python standard library."""
from __future__ import annotations

import ast
from collections import Counter
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "vendor/marinos"
COMPONENTS = (
    "marin-os-banner", "marin-app-header", "marin-app-info",
    "marin-app-footer", "marin-app-feedback",
)
LEGACY = (
    "BRAND_VERSION", "shared/app-brand.css", "shared/app-shell.js",
    "vendor/pico.min.css",
)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


class Document(HTMLParser):
    """Collect source elements, attributes, and nesting without executing HTML."""

    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input",
            "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self, text: str) -> None:
        super().__init__(convert_charrefs=True)
        self.elements: list[tuple[str, dict[str, str | None], tuple[str, ...]]] = []
        self.stack: list[str] = []
        self.feed(text)
        self.close()
        require(not self.stack, f"Unclosed HTML elements: {self.stack}")

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        require(len(attrs) == len(dict(attrs)), f"Duplicate attributes on <{tag}>")
        self.elements.append((tag, dict(attrs), tuple(self.stack)))
        if tag not in self.VOID:
            self.stack.append(tag)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        require(bool(self.stack) and self.stack[-1] == tag, f"Unexpected closing </{tag}>")
        self.stack.pop()

    def nodes(self, tag: str) -> list[dict[str, str | None]]:
        return [attrs for name, attrs, _ in self.elements if name == tag]


def platform_shell(text: str) -> str:
    """Check the starter's simple platform block; this is not a YAML parser.

    Requiring a plain, two-space mapping avoids a YAML package dependency.
    Fail on alternative structures instead of guessing what they mean.
    """
    blocks: list[list[str]] = []
    current: list[str] | None = None
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if re.fullmatch(r"platform:\s*(?:#.*)?", line):
            current = []
            blocks.append(current)
        elif line and not line[0].isspace():
            current = None
        elif current is not None:
            current.append(line)
    require(len(blocks) == 1, "marin.yml must have one plain platform mapping")
    require(len(blocks[0]) == 1, "platform must contain only the pinned shell entry")
    match = re.fullmatch(r"  shell:\s+([\"']?)(\d+\.\d+\.\d+)\1\s*(?:#.*)?", blocks[0][0])
    require(match is not None, "Use platform: followed by a two-space shell: x.y.z entry")
    return match.group(2)  # type: ignore[union-attr]


def main() -> None:
    manifest = json.loads((VENDOR / "manifest.json").read_text(encoding="utf-8"))
    require(manifest.get("schema") == 1, "Unexpected shell manifest schema")
    require(manifest.get("installPath") == "vendor/marinos", "Unexpected shell install path")
    version = platform_shell((ROOT / "marin.yml").read_text(encoding="utf-8"))
    require(version == manifest.get("shellVersion"), "platform.shell does not match the installed shell")
    files = manifest.get("files")
    require(isinstance(files, dict) and bool(files), "Shell manifest file map is empty")
    actual = {p.relative_to(VENDOR).as_posix() for p in VENDOR.rglob("*")
              if p.is_file() and p != VENDOR / "manifest.json"}
    require(actual == set(files), "Vendored file set differs from the shell manifest")
    for relative, expected in files.items():
        path = (VENDOR / relative).resolve()
        require(VENDOR.resolve() in path.parents, f"Invalid manifest path: {relative}")
        content = path.read_bytes()
        require(len(content) == expected["bytes"], f"Shell byte count differs: {relative}")
        require(hashlib.sha256(content).hexdigest() == expected["sha256"],
                f"Shell SHA-256 differs: {relative}; reinstall an unmodified release")
    for font_path in manifest.get("fontPathContract", []):
        path = (VENDOR / font_path).resolve()
        require(ROOT.resolve() in path.parents and path.is_file(), f"Missing local font: {font_path}")
    print(f"Vendored shell {version}: version and file hashes PASS")

    # The shell installer owns the Lucide icons at vendor/icons/lucide/ (see the
    # manifest's companionIcons). They must be present and unmodified.
    icons = manifest.get("companionIcons")
    require(isinstance(icons, dict) and bool(icons), "Shell manifest lists no companion icons")
    require(all(path.startswith("vendor/icons/lucide/") for path in icons),
            "Companion icons must live in vendor/icons/lucide/")
    for relative, expected in icons.items():
        path = (ROOT / relative).resolve()
        require(ROOT.resolve() in path.parents and path.is_file(), f"Missing shell icon: {relative}")
        content = path.read_bytes()
        require(len(content) == expected["bytes"] and hashlib.sha256(content).hexdigest() == expected["sha256"],
                f"Shell icon differs from the manifest: {relative}; reinstall an unmodified release")
    on_disk = {p.relative_to(ROOT).as_posix() for p in (ROOT / "vendor/icons").rglob("*") if p.is_file()}
    require(on_disk == set(icons), f"Unexpected files in vendor/icons: {sorted(on_disk - set(icons))}")
    print(f"Shell icons: {len(icons)} files in vendor/icons/lucide PASS")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    doc = Document(html)
    for component in COMPONENTS:
        require(len(doc.nodes(component)) == 1, f"Expected one <{component}>")
    require([tag for tag, _, _ in doc.elements if tag in COMPONENTS] == list(COMPONENTS),
            "Shell components are out of order")
    main_nodes = doc.nodes("main")
    require(len(main_nodes) == 1 and main_nodes[0].get("id") == "main", "Expected main#main")
    ids = [attrs["id"] for _, attrs, _ in doc.elements if attrs.get("id")]
    require(all(count == 1 for count in Counter(ids).values()), "Duplicate source IDs found")
    require(not set(ids).intersection({"about", "security", "accessibility", "tech", "updates",
                                      "app-nav", "menu-toggle", "app-status-message"}),
            "Do not hand-author shell-owned IDs")
    sections = [(attrs, parents) for _, attrs, parents in doc.elements if "data-tab-section" in attrs]
    require(bool(sections) and sections[0][0].get("id") == "start"
            and sections[0][0].get("data-tab-section") == "start", "The first route must be #start")
    require("main" in sections[0][1], "#start must be inside main#main")
    require("hidden" not in sections[0][0], "The default workflow must not start hidden")
    info = doc.nodes("marin-app-info")[0]
    require(bool(info.get("repo")), "Set marin-app-info repo (APP_REPO is the starter placeholder)")
    require(any(tag == "marin-app-info" and "main" in parents for tag, _, parents in doc.elements),
            "marin-app-info must be inside main#main")
    app_name = doc.nodes("marin-app-header")[0].get("app-name")
    require(bool(app_name) and info.get("app-name") == app_name
            and doc.nodes("marin-app-footer")[0].get("app-name") == app_name,
            "App names must agree across the header, info, and footer")
    for key in ("data-about", "data-accessibility"):
        require(sum(tag == "template" and key in attrs and "marin-app-info" in parents
                    for tag, attrs, parents in doc.elements) == 1, f"Expected one {key} content template")
    # The header icon is inline SVG (the shell inlines its own Lucide icons), and the
    # favicon is a data: URI, so neither depends on a file path that can break.
    require(any(tag == "svg" and "template" in parents and "marin-app-header" in parents
                for tag, _, parents in doc.elements), "The header needs an inline <template data-icon> SVG")
    require(any(attrs.get("rel") == "icon" and str(attrs.get("href", "")).startswith("data:image/svg+xml")
                for attrs in doc.nodes("link")), "Keep the inline SVG favicon")
    require(bool(doc.nodes("noscript")), "Keep a JavaScript-disabled message")

    styles = [attrs.get("href") for attrs in doc.nodes("link") if attrs.get("rel") == "stylesheet"]
    require(styles[:2] == ["vendor/marinos/marinos.css", "assets/app.css"], "Incorrect stylesheet order")
    scripts = doc.nodes("script")
    sources = [attrs.get("src") for attrs in scripts]
    require(sources.count("vendor/marinos/marinos.js") == 1 and sources.count("assets/app.js") == 1,
            "Load one shell script and one application script")
    require(sources.index("vendor/marinos/marinos.js") < sources.index("assets/app.js"),
            "The shell must load before the app")
    for attrs in scripts:
        require("defer" in attrs and "async" not in attrs, "Keep ordered deferred scripts")
    for relative in styles + sources + [info.get("security-src", "security.json")]:
        if relative and not re.match(r"(?:[a-z]+:|//)", relative, re.I):
            require((ROOT / relative).is_file(), f"Missing local resource: {relative}")
    for relative in LEGACY:
        require(not (ROOT / relative).exists(), f"Legacy runtime asset remains: {relative}")
    css = (ROOT / "assets/app.css").read_text(encoding="utf-8")
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    require(not re.search(r"\.(?:app-header|app-footer|marinos-banner)(?:\b|__)", css),
            "Application CSS must not restyle shell-owned layout")
    require((ROOT / ".nojekyll").is_file(), "Keep .nojekyll for the existing Pages setup")
    require((ROOT / ".well-known/security.txt").is_file(), "Keep the app's security contact file")
    json.loads((ROOT / "security.json").read_text(encoding="utf-8"))
    require(re.fullmatch(r"\d+\.\d+\.\d+", (ROOT / "TEMPLATE_VERSION").read_text().strip()) is not None,
            "TEMPLATE_VERSION must be a release version")
    for path in (ROOT / "tests").glob("*.py"):
        ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    print("Template structure, resources, and Python syntax: PASS")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError, SyntaxError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
