# Scoped first contributions — Flow State Machine

Check existing issues first. These are testable ideas, not already assigned jobs or independently verified bugs.

1. **Duplicate action ID mismatch:** add a new synthetic `recordAction` regression showing the same action ID with a changed patch is rejected without mutating the previous journal. Verify `npm test`, preserve compatibility for exact retry reuse.
2. **Rejected transition transparency:** reproduce a fictional missing-field guard in the playground, improve the explanation without adding a journal entry, and check the real staged browser script `tests/browser_playground.py`.
3. **Stale snapshot acceptance:** add a focused test demonstrating `expectedBefore` denies a new stale edit but allows replay recovery of the original exact request ID. Explain the distinction in `docs/RECORD_JOURNALS.md`.

A strong issue includes the exact source commit, minimum original synthetic reproduction, expected and actual behavior, and observable failing test. Do not add real authentication or claim the journal is tamper-proof.
