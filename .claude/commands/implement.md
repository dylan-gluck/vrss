---
description: "Implement feature"
argument-hint: [TASK_CONTEXT]
---

Implement the `TASK_CONTEXT` exactly as described. If not enough context was provided, reference the spec SDD

* DO NOT start the dev server, it is already running
* Run Bash(`make logs`) in a background shell when starting task, you can check the logs with BashOutput()
* DO NOT make assumptions. Use `CLI_TOOLS` to identify analyze and validate related code and integrations.
* ALWAYS maintain consistency with the shared `DATA_MODEL` in `SDD`

## Variables

TASK_CONTEXT: $ARGUMENTS

## Workflow

1. Read the `TASK_CONTEXT` in full. Ultrathink about the assignment. Create a TodoWrite with all sub-tasks.

2. Implement each sub-task sequentially. Take your time to analyze `TASK_CONTEXT` and identify all task requirements.

3. Once all sub-tasks have been completed and ACs fulfilled: run tests, format and lint. Fix any errors.

4. Return a summary of work completed (Success/Fail) as `TASK_STATUS`
