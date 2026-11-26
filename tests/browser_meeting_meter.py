#!/usr/bin/env python3
"""Browser test of Meeting Meter, served over HTTP from this repository with the County Open Data job-class list mocked.

Checks that the app loads, that the shell header holds no tabs (About and Updates are in the footer), that the estimate follows
the number of attendees, that the summary card fades its edge when idle and comes back on activity (the card colors are set
through the shared card properties), that nothing scrolls sideways at 320 px, and that the page has no errors.

Needs Playwright for Python and Chromium:  python3 -m pip install playwright && python3 -m playwright install chromium
Run:  python3 tests/browser_meeting_meter.py
"""
from __future__ import annotations

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DATA_HOST = "data.marincounty.gov"
JOBS = [
    {"title": "Administrative Services Analyst", "job_class_code": "1001", **{f"hourly_step_{n}": str(40 + n * 2) for n in range(1, 6)}},
    {"title": "Deputy County Counsel", "job_class_code": "1002", **{f"hourly_step_{n}": str(90 + n * 3) for n in range(1, 6)}},
    {"title": "Library Assistant", "job_class_code": "1003", **{f"hourly_step_{n}": str(28 + n) for n in range(1, 6)}},
]


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def wait_until(page, expression, timeout=10000):
    """Poll with evaluate. wait_for_function evaluates a string in the page, which the page's Content Security Policy (no
    unsafe-eval) refuses; evaluate is not affected."""
    waited = 0
    while waited <= timeout:
        if page.evaluate(f"() => Boolean({expression})"):
            return
        page.wait_for_timeout(100)
        waited += 100
    raise AssertionError(f"Timed out waiting for: {expression}")


def money(text):
    return float(text.replace("$", "").replace(",", ""))


def load(page, base):
    page.goto(base)
    wait_until(page, "document.querySelector('#meeting-load-state')?.hidden || getComputedStyle(document.querySelector('#meeting-load-state')).display === 'none'")
    page.wait_for_selector("#meeting-calculator", state="visible")


def surface(page):
    return page.eval_on_selector(".meeting-summary-card", "e => { const c = getComputedStyle(e); return [c.backgroundColor, c.borderTopColor, c.boxShadow]; }")


def run(page, base, scheme):
    load(page, base)
    # The header holds only the app's own tabs: none here, so no About, no Updates and no Menu button. The footer has them.
    require(page.locator("#app-nav a").count() == 0, "The header has no links")
    require(not page.is_visible("#menu-toggle"), "There is no Menu button")
    require(page.locator(".app-footer__nav a").all_text_contents()[:2] == ["About", "Security"], "The footer carries the standard pages")
    require(page.locator("h1").count() == 1 and page.locator("h1").inner_text().startswith("Meeting Meter"), "The app name is the one h1")

    # The estimate follows the number of attendees.
    page.fill("#simple-attendees", "2")
    page.dispatch_event("#simple-attendees", "input")
    first = money(page.inner_text("#meeting-total-cost"))
    require(first > 0, f"A meeting of two people has a cost: {first}")
    page.fill("#simple-attendees", "6")
    page.dispatch_event("#simple-attendees", "input")
    second = money(page.inner_text("#meeting-total-cost"))
    require(second > first, f"More attendees cost more: {first} then {second}")

    # With a person active the card has its surface. The page goes idle only while the live timer runs, and then the card fades
    # its edge through the shared card properties.
    page.check("#meeting-mode-live")
    page.click("#meeting-timer-start")
    require(page.inner_text("#meeting-timer-status") != "", "The live timer shows its status")
    page.evaluate("document.activeElement && document.activeElement.blur()")
    active = surface(page)
    require(active[0] != "rgba(0, 0, 0, 0)" and active[1] != "rgba(0, 0, 0, 0)" and active[2] != "none", f"The summary card has its surface: {active}")
    wait_until(page, "document.body.classList.contains('meeting-idle')", 15000)
    page.wait_for_timeout(900)
    require(surface(page) == ["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)", "none"], f"The idle card fades its edge away: {surface(page)}")
    require(page.eval_on_selector(".meeting-summary-card", "e => e.classList.contains('app-card')"), "The summary card is the shared card")
    page.mouse.move(300, 300)
    page.mouse.move(320, 330)
    wait_until(page, "!document.body.classList.contains('meeting-idle')", 5000)
    page.wait_for_timeout(900)
    require(surface(page) == active, "The card has its surface again after activity")
    page.click("#meeting-timer-pause")

    # Reflow at the narrowest width.
    page.set_viewport_size({"width": 320, "height": 700})
    page.wait_for_timeout(200)
    require(page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "No horizontal scroll at 320 px")
    page.set_viewport_size({"width": 1200, "height": 900})


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}/"
    problems = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        for scheme in ("light", "dark"):
            context = browser.new_context(color_scheme=scheme, viewport={"width": 1200, "height": 900})
            context.route(f"https://{DATA_HOST}/**", lambda route: route.fulfill(status=200, content_type="application/json", body=json.dumps(JOBS)))
            context.route("https://marincountygov.github.io/**", lambda route: route.fulfill(status=200, content_type="application/json", body="[]"))
            # The page's visit counter (the Marin Links tracker) is not under test: answer it locally, with the header a browser needs.
            def tracker(route):
                is_script = route.request.url.split("?")[0].endswith(".js")
                route.fulfill(status=200, content_type="application/javascript" if is_script else "application/json",
                              headers={"access-control-allow-origin": "*"}, body="" if is_script else "{}")
            context.route("https://l.marinhhs.org/**", tracker)
            context.route("https://api.github.com/**", lambda route: route.fulfill(status=200, content_type="application/json", body="[]"))
            page = context.new_page()
            page.on("pageerror", lambda e: problems.append(str(e)))
            page.on("console", lambda m: problems.append(m.text) if m.type == "error" and "ERR_" not in m.text and "Failed to load resource" not in m.text else None)
            run(page, base, scheme)
            context.close()
        browser.close()
    server.shutdown()
    require(not problems, f"Console or page errors: {problems}")
    print("Meeting Meter browser test (light and dark): PASS")


if __name__ == "__main__":
    main()
