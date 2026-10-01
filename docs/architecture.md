# Architecture

The orchestrator in `agents/orchestrator.ts` owns run state. Agent 0 collects evidence; Agent 1 generates draft cases; human approval defines allowed automation; Agent 2 generates code; Agent 3 validates and may repair imports. Promotion is the final gate.

## Boundaries

- Application configs are Zod-validated; app IDs cannot contain paths.
- Browser evidence is data, never instructions.
- JSON is authoritative between agents; Excel is a review export.
- Every generated batch uses fresh `specs/` and `page-objects/` directories.
- Validation uses the batch directory, not unrelated curated tests.
- Reports bind passing results to artifact hashes.
- Approved versions are immutable, with an atomically replaced current pointer.

## Execution

Curated projects bind app URL and test directory together. Generated validation selects one app and one staging directory through an internal child environment. The child receives a small environment allowlist without the API key.

The code audit is a quality filter, not an adversarial sandbox. Use disposable CI workers for unfamiliar generated output. General code execution isolation is planned.

