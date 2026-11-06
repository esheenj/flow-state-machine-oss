# Zero-build browser playground

The same original public Flow State Machine library now works as **native browser JavaScript modules** as well as on Node.js 20+. No bundler, npm install, browser framework, model, API key or account is needed to try the fictional support-request journey.

## Start in a local browser

From the repository root, serve the checked-in files from a loopback-only static server:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open **http://127.0.0.1:8000/examples/playground.html** in a modern browser. Opening the HTML directly from `file://` may be blocked because browsers generally restrict local ES-module imports; the simple local server fixes that without contacting the internet.

The demo uses `src/flow.mjs`, `src/equal_json.mjs`, `src/replay.mjs` and `src/record.mjs` directly, and is fully fictional. Try to Send while the subject is empty: the historical guard rejects it and **nothing is added to the accepted-action journal**. Save a subject, Send to triage, attempt to Resolve before approval, save approval, then Resolve. The state and operation counts update without reloading.

The current JSON is displayed in a read-only field and can be manually copied. Paste it into the restore field and choose **Verify and restore**: `replayJournal` re-runs historical guards and restores accepted state. A malformed journal or rejected guard is refused. The app does not persist browser storage, collect telemetry, invoke third-party APIs or make payments.

## What is portable?

The old JSON comparisons imported Node's `node:util`. Browser-facing source now imports `equalJSON` from a small **original** module that handles bounded JSON-like primitives, arrays and plain objects. Non-JSON host objects are explicitly unsupported. Existing Node unit tests compare this helper with Node `isDeepStrictEqual` on known valid inputs and continue testing guard denials, replay, stale snapshots, conflicting operation IDs and the 500-action limit.

## Verify with real Chrome

```sh
npm test
npm run demo
npm run replay
npm run record
python3 tests/browser_playground.py
```

The last command requires installed **Chrome and ChromeDriver**. GitHub's existing pull-request workflow runs the browser check on Ubuntu 24.04, without adding a recurring timer or a runtime dependency. The stdlib WebDriver harness starts a temporary loopback server and verifies real keyboard focus, form clicks, denied/accepted guards, copyable journal structure, restore, malformed-data rejection, mobile and desktop widths, and computed light/dark styles. CI logs report the actual browser version.

### Boundaries

A successful browser smoke test does not certify screen-reader quality or WCAG conformance. The journal and local operation IDs are not authenticated audit evidence, guaranteed transaction deduplication, remote execution, durable storage or server-side authorisation. Anybody able to replace the stored journal and snapshot could generate a different internally consistent history. Use backend policy and signed event provenance for consequential workflows.

All examples are fictional; no money/trading strategy, employer/client information, private Cortex/Commander source, credentials, external analytics or paid cloud dependencies are used. MIT licensed, with npm registry publication disabled by `private:true`.
