---
description: "Consolidate implementation specs into task-specific context, delegate to a claude-code subprocess for implementation"
argument-hint: "[PHASE_DOCUMENT] [TASK_ID]"
---

Follow the `Workflow` to load plan context from `PHASE_DOCUMENT` and delegate `TASK_ID` to subagents for implementation.

## Variables

PHASE_DOCUMENT: $1
TASK_ID: $2

## Workflow

1. SlashCommand(`/prime [PHASE_DOCUMENT] [TASK_ID]`) => `TASK_CONTEXT_FILE`

2. SlashCommand(`/delegate "/implement @[TASK_CONTEXT_FILE]"`) => `TASK_STATUS`

3. If `TASK_STATUS` is successful -> SlashCommand(`/validate [PHASE_DOCUMENT] [TASK_ID]`) => `VALIDATION_REPORT`

4. If `VALIDATION_REPORT` is COMPLETE -> SlashCommand(`/commit --all`)
