"""Take parts out of a page's HTML for a browser test fixture.

The page is read with Python's HTML parser, not matched with regular expressions, so a tag written in capitals or with
a space in its end tag (`</SCRIPT >`) is handled the same way as any other.
"""
from __future__ import annotations

from html.parser import HTMLParser

WHAT = {"scripts", "csp", "stylesheets", "links"}


class _Remover(HTMLParser):
    def __init__(self, what: set[str]) -> None:
        super().__init__(convert_charrefs=False)
        self.what = what
        self.out: list[str] = []
        self.skipping = False

    def _removed(self, tag: str, attrs) -> bool:
        values = {name: (value or "").strip().lower() for name, value in attrs}
        if tag == "script":
            return "scripts" in self.what
        if tag == "meta":
            return "csp" in self.what and values.get("http-equiv") == "content-security-policy"
        if tag == "link":
            return "links" in self.what or ("stylesheets" in self.what and "stylesheet" in values.get("rel", "").split())
        return False

    def handle_starttag(self, tag, attrs):
        if self._removed(tag, attrs):
            self.skipping = tag == "script"
            return
        self.out.append(self.get_starttag_text())

    def handle_startendtag(self, tag, attrs):
        if not self._removed(tag, attrs):
            self.out.append(self.get_starttag_text())

    def handle_endtag(self, tag):
        if self.skipping and tag == "script":
            self.skipping = False
            return
        self.out.append(f"</{tag}>")

    def handle_data(self, data):
        if not self.skipping:
            self.out.append(data)

    def handle_entityref(self, name):
        self.out.append(f"&{name};")

    def handle_charref(self, name):
        self.out.append(f"&#{name};")

    def handle_comment(self, data):
        self.out.append(f"<!--{data}-->")

    def handle_decl(self, decl):
        self.out.append(f"<!{decl}>")

    def handle_pi(self, data):
        self.out.append(f"<?{data}>")

    def unknown_decl(self, data):
        self.out.append(f"<![{data}]>")


def remove_from_html(html: str, *what: str) -> str:
    """Return `html` without: "scripts" (script elements), "csp" (the Content-Security-Policy meta tag),
    "stylesheets" (link elements that load a stylesheet) and "links" (every link element)."""
    unknown = set(what) - WHAT
    if unknown:
        raise ValueError(f"Unknown parts to remove: {sorted(unknown)}")
    remover = _Remover(set(what))
    remover.feed(html)
    remover.close()
    return "".join(remover.out)
