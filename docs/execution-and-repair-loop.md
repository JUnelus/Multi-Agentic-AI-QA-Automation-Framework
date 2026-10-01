# Execution and repair loop

Each initial candidate runs schema/static audit, compilation, discovery and execution in order. Later gates remain not-run when an earlier gate fails.

Categories: GENERATOR_ERROR, IMPORT_ERROR, PAGE_OBJECT_CONTRACT_ERROR, SELECTOR_ERROR, ASSERTION_ERROR, TEST_DATA_ERROR, ENVIRONMENT_ERROR, POSSIBLE_PRODUCT_DEFECT, UNKNOWN. The classifier currently uses a conservative subset; unsupported or unclear cases remain UNKNOWN. Execution assertion failures become POSSIBLE_PRODUCT_DEFECT.

The repair loop allows 0 to 3 attempts and stores each under `repair/attempt-N`. A mechanical import correction is considered only for generator/import failures, and only if the target page object exists. If no supported edit exists, the loop stops immediately. No test or assertion body is rewritten.

Each candidate is revalidated. The final report retains initial typecheck status, attempt count, defect candidates, final gates and artifact hash. Failed runs never promote.

Broad semantic repair, selector replacements, helper-method edits, and model-generated patches are planned. They require evidence and a mechanism that proves approved expectations remain intact.

