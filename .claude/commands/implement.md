---
description: "Implement feature"
argument-hint: [TASK_CONTEXT_FILE]
---

Implement the feature defined in `TASK_CONTEXT_FILE` exactly as described. If not enough context was provided, reference the spec `SDD` or `DATA-MODEL` documents.

## Variables

TASK_CONTEXT_FILE: $ARGUMENTS

## Workflow

1. Read the `TASK_CONTEXT_FILE` in full. Ultrathink about the assignment and identify all task requirements. Create a TodoWrite with all sub-tasks.

2. Complete each sub-task sequentially in the order they were written.

3. Once all tasks have been completed and ACs fulfilled: run tests, format and lint. Fix any errors.

4. Return a summary of work completed (Success/Fail) as `TASK_STATUS`
