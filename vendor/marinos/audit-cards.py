#!/usr/bin/env python3
"""List card CSS an app should not carry.

    python3 vendor/marinos/audit-cards.py .           # report
    python3 vendor/marinos/audit-cards.py . --fail    # exit 1 when anything is found

Marin UI (1.42.0 and later; App Shell 2.7.0 and later) owns the card: the surface (`.app-card`), the list of cards
(`.search-results-list`) and the record card (`.mm-card` and its parts). This reads the app's own CSS (vendored code, tests,
docs and generated data are skipped) and lists:

  - a rule that restyles a shared piece: a selector that ends in `.search-results-list`, `.search-results-list > .app-card`,
    `.search-results-list li`, `.mm-card` or one of its parts (`__select`, `__body`, `__title`, `__text`, `__byline`, `__meta`,
    `__image`). The app adds what is its own in its own classes (`.mm-card__source`, `.mm-card__favicon`) and never sets the size,
    weight, margin or color of the shared parts,
  - a rule that redraws a card's surface: a selector that ends in `.app-card` or in a class whose name ends in `-card` or is
    `card` (`.job-card`, `.logo-card`), that sets `border`, `border-radius`, `background` or `box-shadow`. Use `.app-card` for the
    surface and a class of your own only for what is inside it.

The Learn editor (classes that start with `editor-`) is left out. A rule that must stay is marked by a comment just before it:
`/* audit-cards: exempt (the reason) */`.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SKIP = {"vendor", "node_modules", "tests", "archive", "learning", "packages", "docs", ".git", "build", "dist",
        "feeds", "data", "examples"}
SHARED = re.compile(
    r"^(?:\.search-results-list(?:\s*>\s*(?:\.app-card|li)|\s+li)?"
    r"|\.mm-card(?:__(?:select|body|title|text|byline|meta|image))?)$")
CARD_CLASS = re.compile(r"\.([\w-]*card)$")
SURFACE = re.compile(r"(?:^|[;\s])(border|border-radius|background|background-color|box-shadow)\s*:")
EXEMPT = re.compile(r"/\*\s*audit-cards:\s*exempt[^*]*\*/")
RULE = re.compile(r"([^{}]+)\{([^{}]*)\}")


def source_files(app: Path):
    for path in sorted(app.rglob("*.css")):
        if not SKIP & set(path.relative_to(app).parts[:-1]):
            yield path


def prepare(text: str) -> str:
    """Mark exempt comments, then blank every other comment (keeping line breaks so line numbers stay right)."""
    text = EXEMPT.sub(lambda m: "EXEMPTMARK " + re.sub(r"[^\n]", " ", m.group(0)), text)
    return re.sub(r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), text, flags=re.S)


def last_compound(selector: str) -> str:
    parts = re.split(r"\s*[>+~]\s*|\s+", selector.strip())
    return parts[-1] if parts else ""


def audit(app: Path) -> list[str]:
    problems: list[str] = []
    for path in source_files(app):
        text = prepare(path.read_text(encoding="utf-8", errors="replace"))
        rel = path.relative_to(app).as_posix()
        for match in RULE.finditer(text):
            raw = match.group(1)
            if raw.strip().startswith("@") or "EXEMPTMARK" in raw:
                continue
            line = text.count("\n", 0, match.start(1) + len(raw) - len(raw.lstrip())) + 1
            for selector in (" ".join(part.split()) for part in raw.split(",")):
                if not selector or selector.startswith("@"):
                    continue
                base = re.sub(r"(::?[\w-]+(\([^)]*\))?|\[[^\]]*\])+$", "", selector)  # drop a state or an attribute
                last = last_compound(base)
                if last.startswith(".editor-") or ".editor-" in base:
                    continue
                if SHARED.match(base) or SHARED.match(" ".join(base.split())):
                    problems.append(f"{rel}:{line}: {selector} is shared by Marin UI; remove the app's copy")
                elif SURFACE.search(match.group(2)) and (last == ".app-card" or last.startswith(".app-card.") or (CARD_CLASS.search(last) and "__" not in last)):
                    problems.append(f"{rel}:{line}: {selector} redraws a card's surface; use .app-card, and a class of your own only for what is inside")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("app", type=Path, help="The app's folder")
    parser.add_argument("--fail", action="store_true", help="exit 1 when anything is found")
    args = parser.parse_args()
    problems = audit(args.app.resolve())
    for problem in problems:
        print(problem)
    print(f"Cards: {len(problems)} problem(s).")
    return 1 if problems and args.fail else 0


if __name__ == "__main__":
    sys.exit(main())
