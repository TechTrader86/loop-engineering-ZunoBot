# Minimal Loop Starter — Opencode

Clone this into your project root to run a **report-only daily triage loop** (L1 readiness) with opencode.

## Quick Start

1. Scaffold (recommended):

   ```bash
   npx @cobusgreyling/loop-init . --pattern daily-triage --tool opencode
   ```

   Or copy manually:

   ```bash
   cp -r starters/minimal-loop-opencode/skills .
   cp starters/minimal-loop-opencode/AGENTS.md .
   cp starters/minimal-loop-opencode/LOOP.md .
   cp starters/minimal-loop-opencode/STATE.md.example STATE.md
   cp starters/minimal-loop-opencode/opencode.json.example opencode.json
   ```

2. Customize `STATE.md` project name.

3. Start the loop:

   ```bash
   opencode run "Run loop-triage. Read STATE.md first. Append high-priority and watch items. Update Last run timestamp. Do not auto-fix anything in week one." --agent loop-triage
   ```

4. Read `STATE.md` each morning for 1-2 weeks. Tune the triage skill.

5. When triage quality is good, add `minimal-fix` from `templates/SKILL.md.minimal-fix` and enable small auto-wins with a verifier agent in a worktree.

## What's Included

| File | Purpose |
|------|---------|
| `STATE.md.example` | State spine template |
| `skills/loop-triage/SKILL.md` | Triage skill |
| `AGENTS.md` | Always-on project rules for opencode |
| `LOOP.md` | Loop config doc for your team |
| `opencode.json.example` | Example opencode agent definitions |

## Next Steps

- [Loop Design Checklist](../../docs/loop-design-checklist.md)
- [Daily Triage pattern](../../patterns/daily-triage.md)
- [Opencode example](../../examples/opencode/daily-triage.md)
- Run `npx @cobusgreyling/loop-audit .` for readiness score
