# Agent design

## Agent 0: application explorer

Uses Playwright Chromium, visits the base URL and configured routes, and records up to 500 elements per page. Page count, navigation count, total duration and allowed navigation origins are bounded. Redirects are checked; service workers are blocked. Cross-origin static resources remain available for rendering. No arbitrary click or form submission is performed.

## Agent 1: case creator

Receives sanitized app details, exploration, optional requirements and the JSON schema. Runtime checks validate cases, provenance fields, known evidence IDs and selector mappings. Output review status is forced to draft. A model cannot grant approval. Evidence provenance checks do not prove the model's interpretation is correct.

## Agent 2: script generator

Reads canonical JSON and selects approved feasible cases, unless the caller explicitly enables demo drafts. Its prompt specifies the generated folder layout, dependency allowlist, stable selectors, web-first assertions and consistent page-object interfaces. It returns validated JSON, not direct filesystem writes.

## Agent 3: validation and repair

Deterministic implementation. Compilation, discovery and execution produce diagnostics. Only mechanical import-path correction is currently automated; unchanged test bodies preserve assertion semantics at the source level. Other repairs are planned, not silently delegated to a model.

## Models and testing

The model function is injected. Tests use committed payloads and mock responses; production constructs the OpenAI client lazily. Optional token usage is accumulated in the manifest.

