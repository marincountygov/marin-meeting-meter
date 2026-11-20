#!/usr/bin/env python3
"""Offline regression tests for the security-meta emitter and consistency checks."""
from __future__ import annotations

from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("security_meta", ROOT / "scripts/sync-security-meta.py")
assert SPEC and SPEC.loader
META = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(META)
CONFIG = json.loads((ROOT / "security.json").read_text(encoding="utf-8"))
HTML = (ROOT / "index.html").read_text(encoding="utf-8")


class SecurityMetaTests(unittest.TestCase):
    def test_current_html_and_default_check_are_in_sync(self):
        META.audit_html(HTML, CONFIG)
        self.assertFalse(META.sync(ROOT))

    def test_policy_matches_configuration_exactly(self):
        csp, referrer = META.policies(CONFIG)
        self.assertEqual(csp, "; ".join(" ".join([k, *v]) for k, v in CONFIG["csp"]["directives"].items()))
        self.assertEqual(referrer, "strict-origin-when-cross-origin")
        # Meeting Meter also loads the County's usage-tracking script from this one host.
        self.assertEqual(CONFIG["csp"]["directives"]["script-src"], ["'self'", "https://l.marinhhs.org"])
        self.assertEqual(CONFIG["csp"]["directives"]["style-src"], ["'self'"])

    def test_write_is_idempotent_and_limited_to_the_block(self):
        config = deepcopy(CONFIG)
        config["headers"]["referrerPolicy"]["value"] = "no-referrer"
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "security.json").write_text(json.dumps(config), encoding="utf-8")
            (root / "index.html").write_text(HTML, encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "stale"):
                META.sync(root)
            self.assertEqual((root / "index.html").read_text(), HTML)
            self.assertTrue(META.sync(root, write=True))
            result = (root / "index.html").read_text()
            self.assertEqual(result.split(META.BEGIN)[0], HTML.split(META.BEGIN)[0])
            self.assertEqual(result.split(META.END)[1], HTML.split(META.END)[1])
            self.assertFalse(META.sync(root, write=True))
            self.assertFalse(META.sync(root))

    def test_missing_or_duplicate_markers_fail(self):
        for text in (HTML.replace(META.BEGIN, ""), HTML + META.END):
            with self.subTest(text=text[:40]):
                with self.assertRaisesRegex(ValueError, "one generated"):
                    META.render_html(text, CONFIG)

    def test_duplicate_policies_outside_the_block_fail(self):
        for tag in ('<meta http-equiv="Content-Security-Policy" content="script-src *">',
                    '<meta name="referrer" content="unsafe-url">'):
            with self.subTest(tag=tag):
                with self.assertRaisesRegex(ValueError, "exactly one"):
                    META.render_html(HTML.replace("</head>", tag + "</head>"), CONFIG)

    def test_policy_must_precede_resources(self):
        for tag in ('<script src="early.js"></script>', '<link rel="preload" href="early.css">',
                    '<base href="https://example.invalid/">', '<style>body{}</style>'):
            with self.subTest(tag=tag):
                text = HTML.replace(META.BEGIN, tag + "\n" + META.BEGIN)
                with self.assertRaisesRegex(ValueError, "precede"):
                    META.render_html(text, CONFIG)

    def test_policy_must_be_a_direct_child_of_head(self):
        block = META.generated_block(CONFIG)
        text = HTML.replace(block, "").replace("<body>", "<body>\n" + block)
        with self.assertRaisesRegex(ValueError, "direct children"):
            META.render_html(text, CONFIG)

    def test_unsupported_meta_directives_fail_before_writing(self):
        for directive in ("frame-ancestors", "sandbox", "report-uri", "report-to", "made-up-src"):
            config = deepcopy(CONFIG)
            config["csp"]["directives"][directive] = ["'self'"]
            with self.subTest(directive=directive):
                with self.assertRaises(ValueError):
                    META.render_html(HTML, config)

    def test_header_only_controls_are_not_emitted_as_meta(self):
        for name in META.HEADER_ONLY:
            with self.subTest(name=name):
                text = HTML.replace("</head>", f'<meta http-equiv="{name}" content="test"></head>')
                with self.assertRaisesRegex(ValueError, "header-only"):
                    META.render_html(text, CONFIG)

    def test_invalid_values_fail(self):
        for values in (["'self'; script-src *"], ["bad\nsource"], ["'none'", "'self'"],
                       ["'self'", "'self'"], [], "'self'", [17], ['"quoted"']):
            config = deepcopy(CONFIG)
            config["csp"]["directives"]["script-src"] = values
            with self.subTest(values=values):
                with self.assertRaises(ValueError):
                    META.policies(config)

    def test_wrong_delivery_or_referrer_configuration_fails(self):
        for branch, key, value in (("csp", "deliveryMechanism", "header"),
                                   ("referrer", "status", "not-set"),
                                   ("referrer", "value", "invented-policy")):
            config = deepcopy(CONFIG)
            target = config["csp"] if branch == "csp" else config["headers"]["referrerPolicy"]
            target[key] = value
            with self.subTest(branch=branch, key=key):
                with self.assertRaises(ValueError):
                    META.policies(config)

    def test_duplicate_json_keys_fail(self):
        with self.assertRaisesRegex(ValueError, "Duplicate JSON key"):
            json.loads('{"csp": {}, "csp": {}}', object_pairs_hook=META.unique_object)

    def test_attribute_encoding_round_trips(self):
        config = deepcopy(CONFIG)
        config["csp"]["directives"]["connect-src"] = ["https://example.invalid/?x=1&y=2"]
        result = META.render_html(HTML, config)
        self.assertIn("&amp;y=2", result)
        META.audit_html(result, config)

    def test_check_does_not_claim_header_only_protection(self):
        for control in ("contentTypeOptions", "permissionsPolicy", "frameProtection"):
            self.assertEqual(CONFIG["headers"][control]["status"], "not-achievable")
        self.assertNotIn("frame-ancestors", META.policies(CONFIG)[0])


if __name__ == "__main__":
    unittest.main(verbosity=2)
