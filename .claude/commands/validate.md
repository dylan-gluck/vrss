---
description: "Validate feature completeness against spec"
argument-hint: "[PHASE_DOCUMENT] [TASK_ID]"
---

Follow `Workflow` to validate the status of `TASK_ID` in `PHASE_DOCUMENT`

## Variables

PHASE_DOCUMENT: $1
TASK_ID: $2

`VALIDATION_REPORT` template:
```
Task: [TASK_ID] [COMPLETE|NOT-COMPLETE] [👍|👎]

[1-2 bullets summary]
```

## Workflow

1. Read `PHASE_DOCUMENT` and identify `TASK_ID` requirements. Ultrathink.
2. Analyze implementation completeness and quality.
3. Run all tests. Run typecheck.
4. Update `PHASE_DOCUMENT` with progress and return summary `VALIDATION_REPORT`
