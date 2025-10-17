---
description: "Consolidate implementation specs into task-specific context, delegate to a claude-code subprocess for implementation"
argument-hint: "[PHASE_DOCUMENT] [TASK_ID]"
---

Follow the `Workflow` to load plan context from `PHASE_DOCUMENT` and delegate `TASK_ID` to task-runner subagents for implementation.

## Variables

PHASE_DOCUMENT: $1
TASK_ID: $2

## Workflow

1. @agent-codebase-analyzer Run SlashCommand(`/prime [PHASE_DOCUMENT] [TASK_ID]`) => `TASK_CONTEXT`

2. @agent-delegator Run SlashCommand(`/delegate /implement "[TASK_CONTEXT]"`) => `TASK_STATUS`

3. If `TASK_STATUS` is successful -> @agent-general-purpose Run SlashCommand(`/validate [PHASE_DOCUMENT] [TASK_ID]`) => `VALIDATION_REPORT`
