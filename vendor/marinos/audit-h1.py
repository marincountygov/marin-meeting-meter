#!/usr/bin/env python3
"""List an app's own CSS that sets the size of an h1.

    python3 vendor/marinos/audit-h1.py .           # report
    python3 vendor/marinos/audit-h1.py . --fail    # exit 1 when anything is found

An h1 has one of two sizes, set by Marin UI (App Shell 2.6.0 and later): the app title (`.app-title`, drawn by
the shell) and the page title (`.page-title`, `.doc-title` or `.hero h1`). An app does not write `font-size` on an h1,
except to set it to one of the two tokens (`var(--app-h1-app)` or `var(--app-h1-page)`).
This reads the app's own CSS (vendored code, tests, docs and generated data are skipped) and lists a rule that sets
`font-size` and whose selector is an `h1` or a class used on an `<h1>` in the app's HTML or JavaScript.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SKIP = {"vendor", "node_modules", "tests", "archive", "learning", "packages", "docs", ".git", "build", "dist",
        "feeds", "data", "examples"}
H1_TAG = re.compile(r"<h1\b([^>]*)>", re.I)
H1_JS = re.compile(r"""h\(\s*['"]h1['"]\s*,\s*\{([^}]*)\}|createElement\(\s*['"]h1['"]\s*\)""")
CLASS = re.compile(r"""class(?:Name)?\s*[:=]\s*["']([^"']*)["']""")
TOKENS = {"var(--app-h1-app)", "var(--app-h1-page)"}
FONT_SIZE = re.compile(r"(?:^|[;\s])font-size\s*:\s*([^;]+)")
RULE = re.compile(r"([^{}]+)\{([^{}]*)\}")
H1_SELECTOR = re.compile(r"(^|[\s,>+~(])h1(?![\w-])")


def source_files(app: Path, suffixes: set[str]):
    for path in sorted(app.rglob("*")):
        if path.is_file() and path.suffix in suffixes and not SKIP & set(path.relative_to(app).parts[:-1]):
            yield path


def strip_css_comments(text: str) -> str:
    return re.sub(r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), text, flags=re.S)


def h1_classes(app: Path) -> set[str]:
    found: set[str] = set()
    for path in source_files(app, {".html", ".js"}):
        text = path.read_text(encoding="utf-8", errors="replace")
        for match in H1_TAG.finditer(text):
            for cls in CLASS.finditer(match.group(0)):
                found.update(cls.group(1).split())
        for match in H1_JS.finditer(text):
            for cls in CLASS.finditer(match.group(0)):
                found.update(cls.group(1).split())
    return found


def audit(app: Path) -> list[str]:
    classes = h1_classes(app)
    problems: list[str] = []
    for path in source_files(app, {".css"}):
        text = strip_css_comments(path.read_text(encoding="utf-8", errors="replace"))
        rel = path.relative_to(app).as_posix()
        for match in RULE.finditer(text):
            selectors, body = match.group(1).strip(), match.group(2)
            sizes = FONT_SIZE.findall(body)
            if not sizes or selectors.startswith("@") or all(size.strip() in TOKENS for size in sizes):
                continue
            for selector in (part.strip() for part in selectors.split(",")):
                last = selector.split()[-1] if selector.split() else ""
                on_h1 = bool(H1_SELECTOR.search(selector)) and last.split(".")[0].split("#")[0].split(":")[0] == "h1"
                on_class = any(f".{cls}" == last.split(":")[0] or last.split(":")[0].endswith(f".{cls}") for cls in classes)
                if on_h1 or on_class:
                    line = text.count("\n", 0, match.start(1) + len(match.group(1)) - len(match.group(1).lstrip())) + 1
                    problems.append(f"{rel}:{line}: {selector} sets an h1 size; use the app title or the page title (.page-title) instead")
                    break
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("app", type=Path, help="The app's folder")
    parser.add_argument("--fail", action="store_true", help="exit 1 when anything is found")
    args = parser.parse_args()
    problems = audit(args.app.resolve())
    for problem in problems:
        print(problem)
    print(f"h1 sizes: {len(problems)} problem(s).")
    return 1 if problems and args.fail else 0


if __name__ == "__main__":
    sys.exit(main())
