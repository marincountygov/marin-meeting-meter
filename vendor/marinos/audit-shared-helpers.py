#!/usr/bin/env python3
"""List the places an app does its own copy, download, file reading or upload instead of using the shell's helpers.

    python3 vendor/marinos/audit-shared-helpers.py .            # report
    python3 vendor/marinos/audit-shared-helpers.py . --fail     # exit 1 when anything is found

The shell provides marinCopyRich and marinCopyText, marinDownload, marinReadText and marinDecodeText,
marinCleanText, and marinUpload (App Shell 1.21.0). They keep page styles out of copied text, add the
byte-order mark to CSV downloads, read Windows-1252 files correctly and give every upload the same
messages. An app that still carries its own version lists here until it adopts the helper. The report
does not fail a check unless --fail is given.

Some code has a reason to do its own: Marin CSV refuses files that are not UTF-8 rather than guess. Mark
that line, or the line above it, with a comment containing "marin-shared-helpers: allow" and the reason.
No dependencies.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import re
import sys

# Third-party libraries (libs/, lib/, minified files) are not the app's own code.
SKIP_DIRS = {".git", "node_modules", "vendor", "libs", "lib", "tests", "docs", "archive", "__pycache__"}
SUFFIXES = {".js", ".html", ".mjs"}
ALLOW = "marin-shared-helpers: allow"
RULES = (
    ("copy", re.compile(r"execCommand\(\s*['\"]copy['\"]\s*\)|navigator\.clipboard\.(?:write|writeText)\("), "marinCopyRich / marinCopyText"),
    ("download", re.compile(r"URL\.createObjectURL\("), "marinDownload"),
    ("file reading", re.compile(r"\.readAsText\(|\b(?:file|chosen|selected)\.text\(\)|new TextDecoder\("), "marinReadText / marinDecodeText"),
    ("upload", re.compile(r"type=[\"']file[\"']|\.type\s*=\s*[\"']file[\"']"), "marinUpload"),
)


def scan(root: Path) -> list[tuple[str, str, int, str]]:
    findings = []
    uses_upload = False
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix not in SUFFIXES or path.name.endswith(".min.js"):
            continue
        if SKIP_DIRS & set(path.relative_to(root).parts[:-1]):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        lines = text.split("\n")
        uses_upload = uses_upload or "marinUpload" in text
        for kind, pattern, helper in RULES:
            for match in pattern.finditer(text):
                line = text.count("\n", 0, match.start()) + 1
                if any(ALLOW in lines[i] for i in (line - 1, line - 2) if 0 <= i < len(lines)):
                    continue
                findings.append((kind, str(path.relative_to(root)), line, helper))
    # The file input stays in the page when marinUpload is used, so it is only a finding when the helper is not.
    return [f for f in findings if not (f[0] == "upload" and uses_upload)]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("app", nargs="?", default=".", help="the app's folder")
    parser.add_argument("--fail", action="store_true", help="exit 1 when anything is found")
    args = parser.parse_args()
    root = Path(args.app).resolve()
    findings = scan(root)
    if not findings:
        print(f"Shared helpers: {root.name} uses the shell's copy, download, file reading and upload helpers.")
        return 0
    kinds = sorted({k for k, *_ in findings})
    print(f"Shared helpers: {len(findings)} place(s) in {root.name} do their own {', '.join(kinds)}:")
    for kind, file, line, helper in findings:
        print(f"  {file}:{line}: {kind}; use {helper}")
    return 1 if args.fail else 0


if __name__ == "__main__":
    sys.exit(main())
