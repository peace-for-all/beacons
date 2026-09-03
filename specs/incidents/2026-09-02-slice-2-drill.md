# Slice 2 incident rehearsal — 2026-09-02

Operator: `codex-research`  
Incident owner: `project-owner`
Scope: synthetic fixtures only; no supported route was changed.

## Rehearsed incidents

| Incident | Trigger | Expected containment | Result |
|---|---|---|---|
| False open | A synthetic published Serbia route is discovered unsafe | One withdrawal creates a new release, records rollback, preserves evidence, and derives `withdrawn` / `not_verified` | Passed |
| Primary source unavailable | All primary support for an otherwise supported claim becomes unreachable | Evidence becomes `unavailable` and blocking | Passed |
| Mistranslation | RU and EN render different structured values | A gate claim cannot become supported when deterministic parity validation fails | Passed |
| Bad deployment / invalid operation | Withdrawal names a nonexistent route | Operation aborts before mutation; prior catalog remains byte-equivalent | Passed |

The executable rehearsal is [`tests/incidents.test.mjs`](../../tests/incidents.test.mjs). These drills validate containment mechanics; they do not substitute for the two real weekly monitoring cycles required to exit Milestone 2.
