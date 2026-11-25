#!/usr/bin/env python3
"""Check that an app's steps come from the shell's steps layout, not from markup and script the app wrote itself.

    python3 vendor/marinos/audit-steps.py .           # report
    python3 vendor/marinos/audit-steps.py . --fail    # exit 1 when anything is found

An app whose whole workflow is a sequence of steps marks up `nav[data-steps]` and the shell does the rest: one
step at a time, the state words, the progress line, "On this page", the page title, and the Previous and Next
buttons. This lists, in the app's own HTML and JavaScript (vendored code, tests, docs and data are skipped):

  - a step list in the filter column (`data-filter-label="Steps"`) or a nav whose class ends in `steps` that is
    not `nav[data-steps]`,
  - hand-written `data-next-step` or `data-prev-step` buttons in an app that uses the layout (the shell ends every
    step with them),
  - script in an app that uses the layout that sets `aria-current` to `step` itself.

A short flow inside one feature (a report builder's row of tab buttons) is not the steps layout and is not listed.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SKIP = {"vendor", "node_modules", "tests", "archive", "learning", "packages", "docs", ".git", "build", "dist",
        "feeds", "data", "examples"}
TAG = re.compile(r"<(nav|ol)\b([^>]*)>", re.S | re.I)
CLASS = re.compile(r"class\s*=\s*[\"']([^\"']*)[\"']")


def source_files(app: Path):
    for path in sorted(app.rglob("*")):
        if path.is_file() and path.suffix in {".html", ".js"} and not SKIP & set(path.relative_to(app).parts[:-1]):
            yield path


def without_comments(text: str, suffix: str) -> str:
    """Blank out comments, keeping line breaks so line numbers stay right."""
    pattern = r"<!--.*?-->" if suffix == ".html" else r"/\*.*?\*/|(?<![:\"'\\])//[^\n]*"
    return re.sub(pattern, lambda match: re.sub(r"[^\n]", " ", match.group(0)), text, flags=re.S)


def line_of(text: str, index: int) -> int:
    return text.count("\n", 0, index) + 1


def audit(app: Path) -> list[str]:
    files = {path: without_comments(path.read_text(encoding="utf-8", errors="replace"), path.suffix) for path in source_files(app)}
    uses_layout = any("data-steps" in text for text in files.values())
    problems: list[str] = []
    for path, text in files.items():
        rel = path.relative_to(app).as_posix()
        if not uses_layout:
            for match in re.finditer(r"data-filter-label\s*=\s*[\"']Steps[\"']", text):
                problems.append(f"{rel}:{line_of(text, match.start())}: a list of steps in the filter column; mark it up as nav[data-steps] so the shell runs it")
        for match in TAG.finditer(text):
            attributes = match.group(2)
            if "data-steps" in attributes:
                continue
            found = CLASS.search(attributes)
            if found and any(token.endswith("steps") for token in found.group(1).split()):
                problems.append(f"{rel}:{line_of(text, match.start())}: a hand-written step list; use nav.steps[data-steps]")
        if not uses_layout:
            continue
        for match in re.finditer(r"data-(?:next|prev)-step\b", text):
            problems.append(f"{rel}:{line_of(text, match.start())}: the shell ends every step with Previous and Next; remove the hand-written button")
        if path.suffix == ".js":
            for match in re.finditer(r"aria-current[\"']?\s*[,:=]\s*[\"']step[\"']", text):
                problems.append(f"{rel}:{line_of(text, match.start())}: the shell marks the current step; remove the app's own aria-current=step code")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("app", type=Path, help="The app's folder")
    parser.add_argument("--fail", action="store_true", help="exit 1 when anything is found")
    args = parser.parse_args()
    problems = audit(args.app.resolve())
    for problem in problems:
        print(problem)
    print(f"Steps: {len(problems)} problem(s).")
    return 1 if problems and args.fail else 0


if __name__ == "__main__":
    sys.exit(main())
