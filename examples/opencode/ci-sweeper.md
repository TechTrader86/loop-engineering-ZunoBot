# CI Sweeper — Opencode

React to failing CI with minimal fixes and short cadences. opencode shines at 5–15 minute loops because the CLI doesn't depend on a TUI session.

## Prerequisites

```bash
mkdir -p skills/ci-triage
cp templates/SKILL.md.loop-triage skills/ci-triage/SKILL.md   # same triage body
mkdir -p skills/minimal-fix
cp templates/SKILL.md.minimal-fix skills/minimal-fix/SKILL.md
mkdir -p skills/loop-verifier
cp templates/SKILL.md.verifier skills/loop-verifier/SKILL.md
```

Plus a fresh state file at the root:

```bash
cp starters/minimal-loop-opencode/STATE.md.example ci-sweeper-state.md
```

## Cadence: cron (recommended for CI sweeper)

CI sweeper tolerates nothing wasted between runs. A system cron at 5-minute resolution is the canonical schedule; pair it with a wrapper script that throws context to the agent:

```cron
*/5 * * * * cd /repo && /usr/local/bin/opencode-run-ci.sh >> /var/log/ci-sweeper.log 2>&1
```

`opencode-run-ci.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
opencode run \
  "Run skills/ci-triage/SKILL.md. Classify each failing check. For clear single-file regressions, create a git worktree, run the implementer agent with --dir <worktree>, then run verifier with the diff as --file. Update ci-sweeper-state.md. For infra or security-test failures, escalate to a human with full context. Max 3 attempts per item." \
  --title "CI sweeper"
```

Use [loop-cost](https://github.com/cobusgreyling/loop-engineering/blob/main/tools/loop-cost) before choosing a cadence; encode the daily cap in `LOOP.md` and `AGENTS.md` as a hard stop.

## Cadence: shell loop

If you'd rather keep the loop fully in the CLI, run a long-lived shell loop instead of editing crontab:

```bash
while true; do
  opencode run "Run skills/ci-triage/SKILL.md. Fix only clear regressions in a worktree with verifier. Max 3 attempts. Escalate infra and security test failures."
  sleep 300
done
```

Same primitive, different scheduler.

## Webhook variant (post-deploy)

```bash
# .github/workflows/ci-sweeper-webhook.yml can post to a small opencode bridge:
curl -X POST http://opencode-bridge:8080/hooks/agent \
  -H "Authorization: Bearer ${OPENCODE_HOOK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"message":"Run ci-triage. Inspect recent CI failures. No fixes in report-only mode."}'
```

Keep hook endpoints on loopback or a trusted tailnet (see [docs/safety.md](../../docs/safety.md)).

## Verification split

| Role | Opencode shape |
|------|----------------|
| Triage | `skills/ci-triage/SKILL.md` (or alias to `loop-triage`) named in the `opencode run` message |
| Implementer | `opencode run "..." --agent implementer --dir <worktree>` |
| Verifier | `opencode run "Verify diff" --agent verifier --file <diff.patch>` |

Discard the worktree after verifier REJECT; merge or PR on APPROVE.

## Safety (L1 defaults)

- Dispatch into a worktree per attempt — never edit the main working tree.
- Max 3 fix attempts per item; escalate after to a human with full context.
- Infra / security / payments test failures: do not auto-fix; flag and stop.
- Budget cap documented in `LOOP.md` and enforced by the prompt (`loop-pause-all` stops action).

## References

- [patterns/ci-sweeper.md](../../patterns/ci-sweeper.md)
- [templates/SKILL.md.loop-triage](../../templates/SKILL.md.loop-triage)
- [tools/loop-cost](../../tools/loop-cost) — cadence-to-cost mapping
