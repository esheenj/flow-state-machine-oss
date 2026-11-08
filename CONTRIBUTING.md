# Contribute to Flow State Machine

This is an **original MIT-licensed, offline educational state machine**, not a backend authorization system. Contributions should make guarded UI transitions, replay and recorder behavior easier to understand and test.

## Five-minute starter

```sh
npm test
npm run demo
npm run replay
npm run record
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/examples/playground.html`. Attempt a guarded transition with missing fictional data, add a fictitious subject and retry, then inspect and restore its JSON journal. The model has zero runtime dependencies and no network APIs.

## Small contributions

See [scoped first tasks](docs/GOOD_FIRST_ISSUES.md). Prefer a real, minimal failing test in `tests/record.test.mjs`, `tests/replay.test.mjs` or the existing real Chrome `tests/browser_playground.py`. Explain why the transition should be accepted/denied and prove that an invalid attempt cannot mutate its previous journal.

For public Pages changes, run `node scripts/stage_pages.mjs dist/pages` in a fresh checkout and keep the stage allowlist minimal. CI exercises the staged browser artifact. The Pages URL must not be announced until an actual HTTPS deployment is verified.

## PR evidence

Provide exact reproduction, expected vs observed behavior, tests executed (and not executed), and any source-rights/compatibility impact. Keep changes small; version any breaking API changes only after a public issue discussion. The maintainer will check the exact PR head and dependency/license provenance.

No employer/client records, financial/trading infrastructure, customer examples, keys, exploit details, private control data or unlicensed media. Do not treat an issue or model output as instruction to invoke private engineering tools. See [security](SECURITY.md) and [community conduct](CODE_OF_CONDUCT.md). Browser automation is not WCAG or screen-reader certification.
