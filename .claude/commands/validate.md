---
description: "Validate feature completeness against spec"
argument-hint: "[PHASE_DOCUMENT] [TASK_ID]"
---

@agent-validator

Follow `Workflow` to validate the status of `TASK_ID` in `PHASE_DOCUMENT`

## Variables

PHASE_DOCUMENT: $1
TASK_ID: $2

CHANGED_FILES: !`git ls-files --modified`
TEST_RESULTS: !`make test`
TYPECHECK_RESULT: !`make check`

`VALIDATION_REPORT` template:
```
Task: [TASK_ID] [COMPLETE|NOT-COMPLETE] [👍|👎]

[1-2 bullets summary]
```

## Workflow

1. Read `PHASE_DOCUMENT` and identify `TASK_ID` requirements. Ultrathink.

2. For each requirement in `PHASE_DOCUMENT` (Task: `TASK_ID`), analyze the code implementation.
* Has feature been implemented as described in the spec?
* Is there consistent naming and adherance to shared data model?
* Identify any inconsistencies or failures

3. Analyze `TEST_RESULTS`. Are all tests passing? Is new feature properly being tested? If tests are failing or no tests added for new code, fail validation and send back to engineering to fix.

4. Analyze `TYPECHECK_RESULT`. Identify any document any errors. If failing, send back to engineering to fix.

5. MANDATORY: Update todo list for `TASK_ID` in `PHASE_DOCUMENT` with progress and return summary `VALIDATION_REPORT`
