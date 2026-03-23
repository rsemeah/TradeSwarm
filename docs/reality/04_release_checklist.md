# Release Checklist (Reality-based)

A release recommendation requires all of the following:

- [ ] Boot Gate PASS evidence committed.
- [ ] State Gate PASS evidence committed.
- [ ] Determinism Gate PASS evidence committed.
- [ ] Math Gate PASS evidence committed.
- [ ] Replay Gate PASS evidence committed.
- [ ] Degradation Gate PASS evidence committed.
- [ ] Abuse Gate PASS evidence committed.
- [ ] Expectancy Gate PASS evidence committed.
- [ ] `pnpm lint` passing output captured.
- [ ] `pnpm typecheck` passing output captured.
- [ ] `pnpm build` passing output captured.

If any item has no committed evidence, release is **FAIL**.
