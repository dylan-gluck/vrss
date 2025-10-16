**Dev Server Rules**: Start dev servers ONCE per session from root via `turbo run dev --parallel` (ports: API=3000, Web=5173). NEVER start from subdirectories (apps/api/, apps/web/) or when ports occupied. Check `lsof -i :3000` and `lsof -i :5173` before spawning. Use `BashOutput(bash_id)` to monitor existing servers, never spawn duplicates.

**Coordination**: Maintain `.claude/ACTIVE_PROCESSES.md` registry with active bash_ids. When delegating to subagents, pass dev server bash_id in CONTEXT and add "EXCLUDE: Do NOT start new dev server instances" to prevent conflicts.

**Commands**: Type-check via `turbo run type-check` (cached), tests via `turbo run test` (Vitest for web, Bun Test for API, Playwright for E2E), lint via `turbo run lint` (cached). Add `:watch` suffix for continuous modes. See `docs/patterns/` and `docs/domain/agent-bash-coordination.md` for details.

**For subagent delegation, include:**
`CONTEXT: Dev servers running at bash_id: ${devBashId} (.claude/AGENT_SYSTEM_PROMPT.md)`
