"""Real Chrome integration QA for the zero-build public UI playground.

Starts a loopback-only Python static server and ChromeDriver. Exercises actual
WebDriver keyboard and click controls against the public ESM implementation.
No Selenium, Playwright, external service, stored screenshot or user data.
"""
from __future__ import annotations

import functools
import http.server
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.request

ROOT = Path(os.environ.get("FLOW_PLAYGROUND_ROOT", Path(__file__).resolve().parents[1])).resolve()


def verify(value: bool, label: str):
    if value is not True:
        raise AssertionError(label)


class QuietServer(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class Chrome:
    def __init__(self):
        candidate = os.environ.get("CHROMEWEBDRIVER")
        self.executable = shutil.which("chromedriver")
        if not self.executable and candidate:
            path = Path(candidate) / "chromedriver"
            if path.is_file():
                self.executable = str(path)
        if not self.executable:
            raise RuntimeError("CHROMEDRIVER_NOT_AVAILABLE")
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        self.base = f"http://127.0.0.1:{port}"
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        self.proc = subprocess.Popen(
            [self.executable, f"--port={port}", "--allowed-ips=127.0.0.1"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        self.session = None

    def request(self, method, path, body=None):
        payload = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base + path, data=payload, method=method,
                                     headers={"Content-Type": "application/json"})
        try:
            with self.opener.open(req, timeout=20) as response:
                data = json.load(response)
        except urllib.error.HTTPError as exc:
            raise RuntimeError(f"DRIVER_HTTP_{exc.code}") from exc
        if not isinstance(data, dict) or "value" not in data:
            raise RuntimeError("DRIVER_INVALID_RESPONSE")
        result = data["value"]
        if isinstance(result, dict) and result.get("error"):
            raise RuntimeError("DRIVER_" + str(result["error"]).upper().replace(" ", "_"))
        return result

    def start(self):
        for _ in range(80):
            if self.proc.poll() is not None:
                raise RuntimeError("DRIVER_EXITED")
            try:
                if self.request("GET", "/status").get("ready"):
                    break
            except (urllib.error.URLError, TimeoutError, OSError):
                pass
            time.sleep(0.2)
        else:
            raise RuntimeError("DRIVER_START_TIMEOUT")
        data = self.request("POST", "/session", {
            "capabilities": {"alwaysMatch": {
                "browserName": "chrome",
                "goog:chromeOptions": {"args": [
                    "--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
                    "--disable-background-networking", "--no-first-run"
                ]},
            }}
        })
        self.session = data["sessionId"]
        return data["capabilities"].get("browserVersion", "UNKNOWN")

    def cmd(self, method, tail, body=None):
        return self.request(method, f"/session/{self.session}/{tail}", body)

    def js(self, script, args=None):
        return self.cmd("POST", "execute/sync", {"script": script, "args": args or []})

    def find(self, selector):
        result = self.cmd("POST", "element", {"using": "css selector", "value": selector})
        return result["element-6066-11e4-a52e-4f735466cecf"]

    def click(self, selector):
        return self.cmd("POST", f"element/{self.find(selector)}/click", {})

    def type(self, selector, text):
        return self.cmd("POST", f"element/{self.find(selector)}/value",
                        {"text": text, "value": list(text)})

    def key(self, value):
        return self.cmd("POST", "actions", {"actions": [{
            "type": "key", "id": "key_1",
            "actions": [{"type": "keyDown", "value": value},
                        {"type": "keyUp", "value": value}]
        }]})

    def viewport(self, width, height):
        return self.cmd("POST", "window/rect", {"width": width, "height": height})

    def close(self):
        if self.session:
            try:
                self.cmd("DELETE", "", None)
            except (RuntimeError, OSError):
                pass
        self.proc.terminate()
        try:
            self.proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.proc.kill()
            self.proc.wait(timeout=5)


def state(driver):
    return driver.js("""
        const $ = id => document.getElementById(id);
        return {state:$('state').textContent,ops:Number($('operations').textContent),
          transitions:Number($('transitions').textContent),
          status:$('status').textContent,kind:$('status').dataset.kind,
          journal:$('journal').value,hash:location.hash,
          external:performance.getEntriesByType('resource').some(
            item => !item.name.startsWith(location.origin + '/'))};
    """)


def run():
    handler = functools.partial(QuietServer, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    driver = Chrome()
    try:
        chrome_version = driver.start()
        url = f"http://127.0.0.1:{server.server_port}/examples/playground.html"
        driver.cmd("POST", "url", {"url": url})
        for _ in range(50):
            if "Start by saving" in state(driver)["status"]:
                break
            time.sleep(0.2)
        else:
            raise AssertionError("PUBLIC_MODULE_DID_NOT_LOAD")
        baseline = state(driver)
        verify(baseline["state"] == "new" and baseline["ops"] == 0
               and baseline["transitions"] == 0
               and baseline["external"] is False, "LOADED_WITHOUT_EXTERNAL_REQUESTS")
        verify(driver.js("""
            return document.querySelectorAll('main').length === 1 &&
                   document.querySelectorAll('h1').length === 1 &&
                   !!document.querySelector('[role="status"][aria-live="polite"]') &&
                   document.querySelector('meta[http-equiv="Content-Security-Policy"]')
                       .content.includes("connect-src 'none'");
        """) is True, "ACCESSIBLE_LANDMARKS_AND_CSP")

        # Test a real keyboard focus and Enter navigation to the main landmark.
        driver.key("\ue004")
        focus = driver.js("""
            return {tag:document.activeElement.tagName,
                    label:document.activeElement.textContent,
                    top:document.activeElement.getBoundingClientRect().top};
        """)
        verify(focus["tag"] == "A" and "Skip to interactive" in focus["label"]
               and 0 <= focus["top"] <= 36, "KEYBOARD_SKIP_VISIBLE")
        driver.key("\ue007")
        verify(state(driver)["hash"] == "#main", "KEYBOARD_SKIP_DESTINATION")

        driver.click("#send")
        denied = state(driver)
        verify(denied["ops"] == 0 and denied["transitions"] == 0
               and denied["kind"] == "error" and "GUARD_FAILED" in denied["status"],
               "DENIED_EVENT_NOT_RECORDED")
        driver.type("#subject", "Fictional community repair request")
        driver.click("#save-subject")
        verify(state(driver)["ops"] == 1, "SUBJECT_EDIT_RECORDED")
        driver.click("#send")
        mid = state(driver)
        verify(mid["state"] == "triage" and mid["ops"] == 2
               and mid["transitions"] == 1, "GUARDED_SEND_ACCEPTED")
        driver.click("#approve-event")
        still = state(driver)
        verify(still["kind"] == "error" and still["ops"] == 2
               and "GUARD_FAILED" in still["status"], "EARLY_APPROVAL_REJECTED")
        driver.click("#approved")
        driver.click("#save-approved")
        verify(state(driver)["ops"] == 3, "APPROVAL_EDIT_RECORDED")
        driver.click("#approve-event")
        finished = state(driver)
        verify(finished["state"] == "resolved" and finished["ops"] == 4
               and finished["transitions"] == 2, "ACCEPTED_JOURNEY_RECORDED")
        stored = json.loads(finished["journal"])
        verify([entry["id"] for entry in stored["actions"]]
               == ["op_2", "op_3", "op_5", "op_6"], "UNIQUE_BOUNDED_EVENT_IDS")

        driver.click("#reset")
        verify(state(driver)["ops"] == 0 and state(driver)["state"] == "new",
               "RESET_CLEARS_CURRENT_STATE")
        driver.type("#restore-input", json.dumps(stored, separators=(",", ":")))
        driver.click("#restore")
        restored = state(driver)
        verify(restored["state"] == "resolved" and restored["ops"] == 4
               and "Restored:" in restored["status"], "JSON_RESTORE_REPLAYED_GUARDS")

        driver.click("#reset")
        driver.type("#restore-input", '<script>alert("bad")</script>')
        driver.click("#restore")
        verify(state(driver)["kind"] == "error" and state(driver)["ops"] == 0
               and driver.js("return document.querySelectorAll('script:not([type=module])').length") == 0,
               "INVALID_PASTE_INERT_AND_REJECTED")

        for width, height in ((375, 812), (1440, 900)):
            driver.viewport(width, height)
            dims = driver.js("""
                return {inner:innerWidth,scroll:document.documentElement.scrollWidth,
                        visible:document.querySelector('main').getBoundingClientRect().width>0};
            """)
            verify(dims["scroll"] <= dims["inner"] + 1 and dims["visible"] is True,
                   f"NO_HORIZONTAL_OVERFLOW_{width}")
        theme_bg = []
        for scheme in ("light", "dark"):
            driver.cmd("POST", "goog/cdp/execute", {
                "cmd": "Emulation.setEmulatedMedia",
                "params": {"features": [{"name": "prefers-color-scheme", "value": scheme}]},
            })
            values = driver.js("""
                return {match:matchMedia('(prefers-color-scheme: '+arguments[0]+')').matches,
                        background:getComputedStyle(document.body).backgroundColor};
            """, [scheme])
            verify(values["match"] is True and bool(values["background"]),
                   "THEME_" + scheme)
            theme_bg.append(values["background"])
        verify(theme_bg[0] != theme_bg[1], "LIGHT_DARK_BACKGROUND")
        # Exercise the independent staged Journey Map Studio with original fictional data.
        driver.cmd("POST", "url", {"url": f"http://127.0.0.1:{server.server_port}/journey.html"})
        for _ in range(50):
            loaded=driver.js("return document.getElementById('status')?.textContent || '';")
            if str(loaded).startswith("Mapped "):
                break
            time.sleep(0.2)
        else:
            raise AssertionError("JOURNEY_MAP_MODULE_NOT_READY")
        initial=driver.js("""
            return {
              status:document.querySelector('#status').textContent,
              effort:document.querySelector('#effort').textContent,
              cards:document.querySelectorAll('#steps li').length,
              flags:[...document.querySelectorAll('#steps li p:last-child')].map(x=>x.textContent),
              resources:performance.getEntriesByType('resource').some(x=>!x.name.startsWith(location.origin+'/'))
            };
        """)
        verify("4 illustrative friction signals" in initial["status"]
               and initial["effort"] == "2.33 / 5 average effort"
               and initial["cards"] == 3 and initial["resources"] is False,
               "JOURNEY_MAP_FICTIONAL_PATH")
        injected=driver.js("""
            const el=document.getElementById('input');
            const fixture=JSON.parse(el.value);
            fixture[0].label='<img src=x onerror=alert(1)>';
            el.value=JSON.stringify(fixture);
            document.getElementById('map').click();
            return document.querySelectorAll('#steps img').length;
        """)
        verify(injected==0,"JOURNEY_MAP_UNTRUSTED_TEXT_INERT")
        invalid=driver.js("""
            document.getElementById('input').value='[{"id":"bad","stage":"invalid"}]';
            document.getElementById('map').click();
            return {
              status:document.getElementById('status').textContent,
              hidden:document.getElementById('summary').hidden,
              count:document.querySelectorAll('#steps li').length
            };
        """)
        verify(invalid["status"].startswith("Rejected:") and invalid["hidden"] is True
               and invalid["count"]==0,"JOURNEY_MAP_INVALID_REJECTED")
        driver.click("#reset")
        verify(driver.js("return document.activeElement.id;")=="input","JOURNEY_MAP_RESET_FOCUS")
        driver.viewport(320,720)
        verify(driver.js("return document.documentElement.scrollWidth<=innerWidth;") is True,
               "JOURNEY_MAP_320_LAYOUT")
        verify(driver.js("""
            return document.querySelector('meta[http-equiv="Content-Security-Policy"]')
              .content.includes("connect-src 'none'");
        """) is True,"JOURNEY_MAP_OFFLINE_CSP")
        # Exercise the independent staged Service Blueprint Studio using fictional data.
        driver.cmd("POST", "url", {"url": f"http://127.0.0.1:{server.server_port}/blueprint.html"})
        for _ in range(50):
            loaded=driver.js("return document.getElementById('status')?.textContent || '';")
            if str(loaded).startswith("3 fictional service"):
                break
            time.sleep(0.2)
        else:
            raise AssertionError("BLUEPRINT_MODULE_NOT_READY")
        baseline=driver.js("""
            return {
              status:document.querySelector('#status').textContent,
              wait:document.querySelector('#wait').textContent,
              cards:document.querySelectorAll('#rows li').length,
              html:document.querySelectorAll('#rows img').length,
              resources:performance.getEntriesByType('resource').some(x=>!x.name.startsWith(location.origin+'/'))
            };
        """)
        verify("3 illustrative flags" in baseline["status"] and baseline["cards"]==3
               and "38 minutes" in baseline["wait"] and baseline["html"]==0
               and baseline["resources"] is False,"BLUEPRINT_FICTIONAL_BASELINE")
        injection=driver.js("""
            const el=document.querySelector('#input');
            const x=JSON.parse(el.value);
            x[0].frontstage='<img src=x onerror=alert(1)>';
            el.value=JSON.stringify(x);
            document.querySelector('#map').click();
            return {
              imgs:document.querySelectorAll('#rows img').length,
              text:document.querySelector('#rows li').textContent
            };
        """)
        verify(injection["imgs"]==0 and '<img src=x onerror=alert(1)>' in injection["text"],
               "BLUEPRINT_UNTRUSTED_TEXT_INERT")
        bad=driver.js("""
            document.querySelector('#input').value='[{"id":"bad","frontstage":"unknown"}]';
            document.querySelector('#map').click();
            return {
              status:document.querySelector('#status').textContent,
              hidden:document.querySelector('#output').hidden,
              count:document.querySelectorAll('#rows li').length
            };
        """)
        verify(bad["status"].startswith("Rejected:") and bad["hidden"] is True
               and bad["count"]==0,"BLUEPRINT_INVALID_REJECTED")
        driver.click("#reset")
        verify(driver.js("return document.activeElement.id;")=="input","BLUEPRINT_RESET_FOCUS")
        driver.viewport(320,720)
        verify(driver.js("return document.documentElement.scrollWidth<=innerWidth;") is True,
               "BLUEPRINT_320_LAYOUT")
        verify(driver.js("""
            return document.querySelector('meta[http-equiv="Content-Security-Policy"]')
              .content.includes("connect-src 'none'");
        """) is True,"BLUEPRINT_OFFLINE_CSP")
        return {
            "schema": "flow-browser-smoke.v1",
            "state": "PASSED",
            "browser": "Google Chrome",
            "browser_version": chrome_version,
            "checks": [
                "module_import_without_node_builtins",
                "keyboard_skip_link",
                "denied_guard_has_no_journal_entry",
                "accepted_journal_actions_and_transitions",
                "restore_from_json",
                "invalid_json_is_inert",
                "responsive_375_and_1440",
                "computed_light_and_dark_themes",
                "no_external_resources",
                "journey_map_fictional_flags_inert_text_rejection_mobile",
                "service_blueprint_fictional_handoff_inert_text_rejection_mobile",
            ],
            "screen_reader_tested": False,
            "wcag_certified": False,
            "server": "loopback-only-temporary",
        }
    finally:
        driver.close()
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    try:
        print(json.dumps(run(), indent=2, sort_keys=True))
    except (AssertionError, RuntimeError, OSError, TimeoutError) as exc:
        print(json.dumps({"schema": "flow-browser-smoke.v1",
                          "state": "FAILED", "error": str(exc)[:160]},
                         sort_keys=True))
        raise SystemExit(1)
