---
description: "Consolidate implementation specs into optimied task-specific context that can be handed off to a coding agent"
argument-hint: "[PHASE_DOCUMENT] [TASK_ID]"
---

@agent-context-prime

Follow the `Workflow` to create a hyper-optimized `TASK_CONTEXT` for a coding agent

## Variables

PHASE_DOCUMENT: $1
TASK_ID: $2

`TASK_CONTEXT` Template:
```
TASK: [Specific task from PHASE_DOCUMENT]
CONTEXT: [Relevant BRD/PRD/SDD excerpts]
SDD_REQUIREMENTS: [Exact SDD sections and line numbers for this task]
DATA_MODEL: [Exact SDD sections and line numbers for this task]
SUCCESS: [Task completion criteria + specification compliance]
```

## Workflow

1. Read `PHASE_DOCUMENT` in full. If `TASK_ID` is specified, only fetch context for that task.

2. Determine the `SPEC_DIR` from the `PHASE_DOCUMENT` path. (Eg: `docs/specs/001-vrss-social-platform`)

3. Analyze the `SPEC_DIR` and collect all relevant info for `TASK_ID` in `PHASE_DOCUMENT`. Expected output is `TASK_CONTEXT` with clear consolidated task context including all relevant files & line numbers.
