#!/usr/bin/env python3
"""List buttons in an app that do not follow the Marin button standard.

    python3 scripts/audit-buttons.py ../marin-reach            # report
    python3 scripts/audit-buttons.py ../marin-reach --fail     # exit 1 when anything is found

Reads the app's own HTML and JavaScript. It skips vendored code, tests, docs, and generated data. A button
passes when it is one of the shell's button kinds (action, copy, filter toggle, tab, chip, sort, menu toggle),
or a solid button that submits a form or is marked primary for the one main action, or content marked
`data-button-kind="content"` (a calendar event, a name that opens its record), or a disclosure (`aria-expanded`). Everything else is listed:
Pico's `secondary` and `outline` buttons, `link-button`, and buttons with no class at all.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SKIP = {"vendor", "node_modules", "tests", "archive", "learning", "packages", "docs", ".git", "build", "dist",
        "feeds", "data", "examples"}
OK_CLASSES = {"action-button", "copy-button", "filter-toggle", "tab-button", "chip-button", "sort-button",
              "menu-toggle", "marinos-menu__toggle"}
LEGACY_CLASSES = {"secondary", "outline", "contrast", "link-button", "mm-tab", "doc-action"}
# A button made in script: `const x = document.createElement("button")`, then x.className = "..." or x.classList.add(...).
CREATED = re.compile(r"(?:const|let|var)\s+(\w+)\s*=\s*[\w.]*createElement\(\s*[\"']button[\"']\s*\)")
PATTERN = re.compile(
    r"<(button|a)\b([^>]*?)>(.*?)</\1>|h\('button',\s*\{([^}]*)\}|h\('a',\s*\{([^}]*role:\s*'button'[^}]*)\}", re.S)


def classify(attrs: str) -> str | None:
    """Return why a button does not pass, or None when it does."""
    if re.search(r"data-button-kind\s*[=:]\s*[\"'](content|menu-item)[\"']|[\"']data-button-kind[\"']\s*:\s*[\"'](content|menu-item)[\"']", attrs):
        return None  # content (a calendar event, a name that opens its record) or an item in a menu panel
    if "aria-expanded" in attrs:
        return None  # a disclosure that opens a panel, not an action
    classes = set((re.search(r"class\s*[=:]\s*[\"']([^\"']*)", attrs) or [None, ""])[1].split())
    kind = (re.search(r"type\s*[=:]\s*[\"']([^\"']*)", attrs) or [None, ""])[1]
    role = (re.search(r"role\s*[=:]\s*[\"']([^\"']*)", attrs) or [None, ""])[1]
    if role in {"tab", "menuitem", "option"} or classes & OK_CLASSES:
        return None
    if classes & LEGACY_CLASSES:
        return "old style: " + ", ".join(sorted(classes & LEGACY_CLASSES))
    if kind == "submit" or "primary" in classes:
        return None
    return "no button class: use .action-button (or .primary for the one main action)"


def created_button_problem(text: str, match: re.Match) -> tuple[str | None, str]:
    """Look in the lines after createElement("button") for the class the script gives it."""
    name = match.group(1)
    window = text[match.end():match.end() + 900]
    given = []
    for found in re.finditer(rf"\b{name}\.className\s*=\s*[\"'`]([^\"'`]*)", window):
        given.append(found.group(1))
    for found in re.finditer(rf"\b{name}\.classList\.add\(([^)]*)\)", window):
        given.append(" ".join(re.findall(r"[\"'`]([^\"'`]*)", found.group(1))))
    if "aria-expanded" in window:
        return None, name  # a disclosure that opens a panel, not an action
    if re.search(r"setAttribute\(\s*[\"']role[\"']\s*,\s*[\"'](option|tab|menuitem)[\"']|aria-haspopup[\"']\s*,\s*[\"']listbox", window):
        return None, name  # a part of a listbox, tab list or menu, which has its own pattern
    fake_attrs = f'class="{" ".join(given)}"' if given else ""
    if re.search(rf"\b{name}\.type\s*=\s*[\"']submit", window):
        fake_attrs += ' type="submit"'
    return classify(fake_attrs), name


def audit(root: Path) -> list[tuple[str, str, str]]:
    found = []
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if SKIP & set(relative.parts) or path.suffix not in {".html", ".js", ".mjs"} or not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        if path.suffix in {".js", ".mjs"}:
            text = re.sub(r"/\*.*?\*/", lambda m: " " * len(m.group(0)), text, flags=re.S)  # block comments
            text = re.sub(r"(?m)^\s*//.*$", "", text)  # whole-line comments
        for match in CREATED.finditer(text):
            problem, name = created_button_problem(text, match)
            if problem:
                found.append((str(relative), problem + " (built in script)", name))
        for match in PATTERN.finditer(text):
            tag = match.group(1)
            attrs = match.group(2) or match.group(4) or match.group(5) or ""
            if tag == "a" and not re.search(r"role\s*[=:]\s*[\"']button", attrs):
                continue
            problem = classify(attrs)
            if problem:
                label = re.sub(r"<[^>]+>", "", match.group(3) or "").strip()[:40] or (re.search(r"id\s*[=:]\s*[\"']([^\"']*)", attrs) or [None, ""])[1]
                found.append((str(relative), problem, label))
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("app", type=Path)
    parser.add_argument("--fail", action="store_true", help="exit 1 when any button is listed")
    args = parser.parse_args()
    found = audit(args.app.expanduser().absolute())
    for relative, problem, label in found:
        print(f"{relative}: {problem}: {label}")
    print(f"{len(found)} button(s) to update in {args.app.name}")
    return 1 if (found and args.fail) else 0


if __name__ == "__main__":
    sys.exit(main())
