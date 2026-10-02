# Data contracts

Schemas live in `shared/schemas` and inferred TypeScript types are used at agent boundaries.

## Test cases v1.0

Cases have unique IDs, feature/scenario, positive/negative/edge/accessibility type, critical/high/medium/low priority, precondition arrays, sequential numbered steps, expected result, automation feasibility and draft/approved/rejected review status. Confidence is between 0 and 1. Evidence IDs, selector evidence, requirement source and behavior source preserve provenance.

Agent 1 additionally requires provenance fields and forces draft status. Newly generated cases cannot claim approved-baseline provenance.

## Canonical storage and review

`test-cases.json` is authoritative. Excel exports every field, JSON-encoding structured fields so steps and evidence are preserved. The Review Status column is explicit. Reordering Excel columns cannot alter selection because no agent reads Excel.

Review JSON directly. There is currently no Excel-to-JSON approval importer and no cryptographic reviewer identity.

## Other contracts

App config validates URLs, names, output hints, credentials and exploration limits. Legacy output paths remain configuration compatibility fields; orchestration writes to run directories.

Generated code contains nonempty pageObjects/specFiles arrays, flat filenames, nonempty source and case-insensitively unique names.

Exploration contains pages, observations, screenshots and stop-limit metadata. Validation reports contain gate statuses, diagnostics, failure classification, repairs and final result. Manifests contain model, prompt/input hashes, counts, artifact paths and optional usage.

Imported exploration is validated against the application and every page origin. Screenshot references must be flat PNG files under the source artifact's screenshots directory; traversal, symlinks, missing files, invalid signatures and files over 20 MB fail import. Images are copied into the new run and references rewritten.

Agent 1 and imported cases use the same provenance validator. Evidence IDs and selector mappings must exist and agree. Observed behavior needs evidence, requirement claims need supplied requirements, and inferred behavior remains labeled. Agent 1 stamps the application and a screenshot-location-independent exploration hash; supplied provenance fields must match. This checks evidence references, not the semantic truth of an arbitrary expected result.

Promotion sets its approved artifact pointer before serializing either manifest. The complete version (code, manifest, cases) is built in a unique hidden sibling directory under the application's approved directory and published with one directory rename, so a partially written version is never visible under its final name. Any failure removes the staging directory, removes an unpublished renamed version, restores the previous manifest pointer and rethrows; the same run ID can then be retried. Approved versions remain immutable; current.json is replaced only after the version exists, using a unique same-directory temporary file, fsync and native rename replacement. Node/libuv supports replacing files on Windows and Linux. Failed replacement retains the previous pointer and removes temporary files; readers never see a partially written pointer.

Operator-supplied `--cases`, `--exploration`, `--requirements` and `--code-dir` paths are resolved beneath the current repository checkout and must be regular files or directories with no symlink in their path. Absolute paths, traversal and special files such as `/proc/self/environ` are rejected before anything is read or copied into the run directory, so uploaded run artifacts cannot republish host content. Requirements text is limited to 1 MiB.

When resuming reviewed Agent 1 cases, pass their original evidence with `--cases path/test-cases.json --exploration path/exploration.json` and keep its sibling screenshots directory. A fresh exploration has a different fingerprint and is intentionally not interchangeable. Requirement-backed cases also need `--requirements path/requirements.txt`. The manual workflow exposes these optional repository-relative inputs for approved-cases mode.

Evidence pages now require `screenshotSha256`. Agent 0 hashes the captured PNG; imports verify the bytes before copying. The exploration fingerprint ignores the screenshot's location but includes its content digest. Evidence-backed cases require this exploration fingerprint; requirement-backed cases require a matching `requirementsHash` over the exact supplied text. Committed baselines without evidence references remain supported. Older evidence without image digests must be recollected and reviewed; missing provenance is never silently reconstructed as reviewed evidence.
