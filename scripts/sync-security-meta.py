#!/usr/bin/env python3
"""Check or regenerate the starter's static CSP/referrer meta tags.

No dependencies or network access. This validates the supported emission format,
not the complete MarinOS schema or every browser's CSP source-expression grammar.
"""
from __future__ import annotations

import argparse
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
BEGIN = "    <!-- BEGIN generated security meta: python3 scripts/sync-security-meta.py --write -->"
END = "    <!-- END generated security meta -->"
SOURCE_DIRECTIVES = {
    "default-src", "script-src", "script-src-elem", "script-src-attr", "style-src",
    "style-src-elem", "style-src-attr", "img-src", "font-src", "connect-src",
    "object-src", "base-uri", "form-action", "child-src", "frame-src", "media-src",
    "manifest-src", "worker-src",
}
UNSUPPORTED_META = {"frame-ancestors", "sandbox", "report-uri"}
REFERRER_POLICIES = {
    "no-referrer", "no-referrer-when-downgrade", "origin", "origin-when-cross-origin",
    "same-origin", "strict-origin", "strict-origin-when-cross-origin", "unsafe-url",
}
HEADER_ONLY = {
    "content-security-policy-report-only", "x-frame-options", "x-content-type-options",
    "permissions-policy", "strict-transport-security", "referrer-policy",
}
RESOURCE_TAGS = {
    "base", "link", "script", "style", "img", "iframe", "object", "embed",
    "audio", "video", "source", "input",
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def unique_object(pairs: list[tuple[str, object]]) -> dict:
    result: dict = {}
    for key, value in pairs:
        require(key not in result, f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def policies(config: dict) -> tuple[str, str]:
    csp = config["csp"]
    require(csp["deliveryMechanism"] == "meta", "This emitter requires CSP deliveryMechanism: meta")
    directives = csp["directives"]
    require(isinstance(directives, dict) and bool(directives), "CSP directives must be a nonempty object")
    parts = []
    for name, values in directives.items():
        require(name not in UNSUPPORTED_META, f"{name} cannot be enforced through meta-delivered CSP")
        require(name in SOURCE_DIRECTIVES or name == "upgrade-insecure-requests",
                f"Unsupported directive for this emitter: {name}; review before extending it")
        require(isinstance(values, list), f"{name} must be an array")
        if name == "upgrade-insecure-requests":
            require(values == [], "upgrade-insecure-requests takes no source values")
        else:
            require(bool(values), f"{name} must have explicit sources (use 'none' to deny)")
        for token in values:
            require(isinstance(token, str) and bool(token)
                    and not re.search(r'[\s\x00-\x1f\x7f;,<>\"]', token),
                    f"Invalid source token for {name}: {token!r}")
        require(len(values) == len(set(values)), f"Duplicate source values in {name}")
        require("'none'" not in values or values == ["'none'"], f"'none' must stand alone in {name}")
        parts.append(" ".join([name, *values]))
    referrer = config["headers"]["referrerPolicy"]
    require(referrer["status"] == "enabled-via-meta", "Referrer policy must be enabled-via-meta")
    require(referrer["value"] in REFERRER_POLICIES, "Unrecognized referrer-policy value")
    return "; ".join(parts), referrer["value"]


def generated_block(config: dict) -> str:
    csp, referrer = policies(config)
    # Attribute delimiters are double quotes; single-quoted CSP keywords stay readable.
    attribute = lambda value: escape(value, quote=False).replace('"', "&quot;")
    return "\n".join((BEGIN,
        f'    <meta http-equiv="Content-Security-Policy" content="{attribute(csp)}">',
        f'    <meta name="referrer" content="{attribute(referrer)}">', END))


class Document(HTMLParser):
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
            "meta", "param", "source", "track", "wbr"}

    def __init__(self, text: str) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.nodes: list[tuple[str, dict, tuple, tuple]] = []
        self.feed(text)
        self.close()

    def handle_starttag(self, tag, attrs):
        require(len(attrs) == len(dict(attrs)), f"Duplicate attributes on <{tag}>")
        self.nodes.append((tag, dict(attrs), tuple(self.stack), self.getpos()))
        if tag not in self.VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in self.stack:
            del self.stack[len(self.stack) - 1 - self.stack[::-1].index(tag):]

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID:
            self.handle_endtag(tag)


def audit_html(text: str, config: dict) -> None:
    expected_csp, expected_referrer = policies(config)
    doc = Document(text)
    require(sum(tag == "head" for tag, _, _, _ in doc.nodes) == 1, "Expected one document head")
    metas = [node for node in doc.nodes if node[0] == "meta"]
    csp = [node for node in metas if (node[1].get("http-equiv") or "").lower() == "content-security-policy"]
    referrer = [node for node in metas if (node[1].get("name") or "").lower() == "referrer"]
    require(len(csp) == 1, "Expected exactly one static Content-Security-Policy meta tag")
    require(len(referrer) == 1, "Expected exactly one static referrer meta tag")
    for node, value in ((csp[0], expected_csp), (referrer[0], expected_referrer)):
        require(node[2] == ("html", "head"), "Security meta tags must be direct children of head")
        require(node[1].get("content") == value, "HTML security policy differs from security.json")
    require(any("charset" in node[1] and node[3] < csp[0][3] for node in metas),
            "Keep the charset declaration before the security meta block")
    last_policy = max(csp[0][3], referrer[0][3])
    for tag, attrs, _, position in doc.nodes:
        if tag in RESOURCE_TAGS:
            require(position > last_policy, "Security meta tags must precede all resource-loading elements")
        if tag == "meta":
            require((attrs.get("http-equiv") or "").lower() not in HEADER_ONLY,
                    "Do not use meta http-equiv for header-only controls; use name=referrer for referrer policy")


def render_html(text: str, config: dict) -> str:
    require(text.count(BEGIN) == 1 and text.count(END) == 1,
            "Expected one generated security meta block; do not add duplicate policies")
    start = text.index(BEGIN)
    end = text.index(END)
    require(start < end, "Security meta block markers are out of order")
    result = text[:start] + generated_block(config) + text[end + len(END):]
    # Audit before writing, including any duplicate/out-of-place tags outside the block.
    audit_html(result, config)
    return result


def sync(root: Path, *, write: bool = False) -> bool:
    config = json.loads((root / "security.json").read_text(encoding="utf-8"), object_pairs_hook=unique_object)
    target = root / "index.html"
    original = target.read_text(encoding="utf-8")
    rendered = render_html(original, config)
    changed = rendered != original
    if not write:
        require(not changed, "Security meta tags are stale. Run python3 scripts/sync-security-meta.py --write")
    elif changed:
        target.write_text(rendered, encoding="utf-8")
    return changed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="Read-only consistency check (the default)")
    mode.add_argument("--write", action="store_true", help="Regenerate only the marked block in index.html")
    args = parser.parse_args()
    changed = sync(ROOT, write=args.write)
    print("Security meta tags: updated" if changed else "Security meta tags: PASS (in sync)")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
