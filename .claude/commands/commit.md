---
description: "Commit changes"
argument-hint: "[SCOPE]"
---

Follow the `Workflow` to commit changes for given `SCOPE`.

## Variables

SCOPE: $ARGUMENTS

MODIFIED: !`git ls-files --modified`
DIFF: !`git diff HEAD`

## Workflow

1. Analyze `MODIFIED` and `DIFF`. Consider the `SCOPE` when reviewing

2. Use `git add [options]` to stage files for commit. If no `SCOPE` is set, default to `--all`

3. Commit changes with a consice commit message including a list of all tasks completed
* DO NOT include emojis
* DO NOT attribute claude
