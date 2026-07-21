# Daily Triage — Opencode

Same pattern as Grok and Claude Code; **scheduling runs from cron/systemd** and each tick invokes `opencode run` instead of a TUI `/loop`.

## Prerequisites

1. [Opencode CLI](https://opencode.ai) installed and authenticated against your preferred provider.
2. `STATE.md` at the repo root — copy from `starters/minimal-loop-opencode/STATE.md.example`.
3. `loop-triage` skill — copy `templates/SKILL.md.loop-triage` to `skills/loop-triage/SKILL.md`.

```bash
mkdir -p skills/loop-triage
cp templates/SKILL.md.loop-triage skills/loop-triage/SKILL.md
cp starters/minimal-loop-opencode/STATE.md.example STATE.md
```

## Report-Only (Week 1)

Use cron or a systemd timer to run a fresh opencode session each morning. The prompt forces the run to read `STATE.md` first so state carries across sessions.

```bash
opencode run \
  "Run the loop-triage skill. Read STATE.md first. Append high-priority items under High Priority and Watch List. Update Last run timestamp. Do not edit source code. End with a 5-line summary." \
  --title "Daily triage — repo:${PWD##*/}"
```

The report-only stance is enforced by `AGENTS.md` and the prompt: no source-code edits in week one.

Faster cadence during active periods:

```cron
0 */2 * * * cd /repo && opencode run "Run loop-triage. Report obvious small wins only. Update STATE.md. No code changes."
```

## With Small Auto-Fixes (Week 3+)

Create named `implementer` and `verifier` agents in `opencode.json`, isolate each implementer in a `git worktree`, and pass the worktree path with `--dir`:

```bash
FIX_ID="$(date +%Y%m%d%H%M%S)"
WORKTREE="../wt-small-fix-$FIX_ID"
git worktree add "$WORKTREE" -b "loop/small-fix-$FIX_ID"
opencode run \
  "Run loop-triage. For one high-priority single-file bugfix: implement the minimal fix, run tests, and write a summary plus diff path. Escalate ambiguous or denylisted paths." \
  --agent implementer \
  --dir "$WORKTREE"
DIFF_FILE="$(mktemp /tmp/loop-diff.XXXXXX.patch)"
git -C "$WORKTREE" diff > "$DIFF_FILE"
opencode run "Review this diff against project rules and tests. APPROVE or REJECT only." \
  --agent verifier \
  --file "$DIFF_FILE"
```

The verifier sees only the diff; the implementer works only inside the worktree. This preserves the same **maker/checker split** Claude Code expresses with `isolation: worktree`.

## Goal Mode Alternative

For a one-shot "get main green" session, drive opencode with the [Goal Engineering](https://github.com/cobusgreyling/goal-engineering) `/goal` skill. opencode is goal-friendly: hand it the goal, the stop condition, and the verifier prompt and let the verifier decide when to stop.

```bash
opencode run "Goal: all tests on main pass and lint is clean. Stop when tests pass and write the evidence."
DIFF_FILE="$(mktemp /tmp/goal-diff.XXXXXX.patch)"
git diff > "$DIFF_FILE"
opencode run "Verify the goal is complete. APPROVE only if tests pass and the diff is minimal." \
  --agent verifier \
  --file "$DIFF_FILE"
```

## Skills Setup

Copy from `templates/SKILL.md.loop-triage` to `skills/loop-triage/SKILL.md` (the `skills/` dir is auto-discovered by opencode at the repo root):

```bash
mkdir -p skills/loop-triage
cp templates/SKILL.md.loop-triage skills/loop-triage/SKILL.md
```

Create named verifier/implementer agents when you graduate to L2. The starter's `opencode.json.example` already includes both names; copy it to `opencode.json` or add this shape manually:

```json
{
  "agent": {
    "implementer": {
      "description": "Implement minimal scoped fixes in an isolated worktree.",
      "mode": "subagent",
      "prompt": "Implement only the requested minimal fix. Stay within the supplied worktree and run documented tests."
    },
    "verifier": {
      "description": "Review diffs and test evidence; APPROVE or REJECT only.",
      "mode": "subagent",
      "prompt": "Review the supplied diff against project rules and tests. Do not edit files. APPROVE or REJECT only."
    }
  }
}
```

## Sub-agents

Opencode exposes named agents through `opencode agent`. Keep each agent's role text aligned with the same maker/checker contract used by the other examples:

```text
Verifier: review code changes against project skills and tests. Always REJECT or APPROVE.
```

Invoke one role per run with `--agent verifier` or `--agent implementer` (see Week 3+ example). Use explicit git worktrees for any implementer that will edit code.

## State Conventions

The default spine is `STATE.md` at the repo root. Use `STATE.md.example` for the template (gitignored live state). For pattern-specific state, follow the [state conventions in primitives-matrix.md](../../docs/primitives-matrix.md).

## Safety (L1 defaults)

- Week one: report-only prompt + `AGENTS.md` safety rules; no source-code edits.
- One worktree per fix attempt; discard after verifier REJECT.
- Never push without a draft PR and explicit human review on denylisted paths (`docs/safety.md`).
- Token budget: set `loop-pause-all` in `STATE.md` if a run exceeds the daily cap.

## Operations

```bash
crontab -l
systemctl --user list-timers
opencode session list
opencode export <sessionID> > loop-session.json
```

Pause: disable the cron/systemd timer or set `loop-pause-all` in `STATE.md` and teach the skill to stop acting.

Audit readiness: `npx @cobusgreyling/loop-audit . --suggest`.

## When to pick opencode over a TUI agent

- You want **scheduling without a TUI** — cron/systemd can call `opencode run` in CI, in tmux, and on a headless box.
- You want to keep your **state and skills in plain files** (`STATE.md`, `skills/`) that survive a host change.
- You're already running **systemd timers** or **cron** for unrelated work — fold opencode loops into the same scheduler.

## References

- Peter Steinberger — design loops, not one-off prompts ([sources](../../resources/sources.md))
- [primitives-matrix.md](../../docs/primitives-matrix.md) — opencode column
- [patterns/daily-triage.md](../../patterns/daily-triage.md)
- [docs/safety.md](../../docs/safety.md)
