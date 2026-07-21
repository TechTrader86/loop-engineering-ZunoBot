# PR Babysitter — Opencode

Watch open PRs, surface blockers, and act only on safe, obvious maintenance tasks. opencode works well here because the loop can run headless while still preserving state in `pr-babysitter-state.md`.

## Report-Only (Week 1)

```bash
opencode run \
  "Run PR babysitter triage. Read pr-babysitter-state.md first. List PRs with red CI, stale review, merge conflicts, or unanswered review comments. Do not edit code. Update pr-babysitter-state.md and end with the top 3 human actions." \
  --title "PR babysitter"
```

Keep the first week boring: read GitHub state, update state, notify humans.

## With Small Auto-Fixes (Week 3+)

```bash
FIX_ID="$(date +%Y%m%d%H%M%S)"
WORKTREE="../wt-pr-fix-$FIX_ID"
git worktree add "$WORKTREE" -b "loop/pr-fix-$FIX_ID"
opencode run \
  "Run PR babysitter triage. For PRs authored by us with red CI caused by a clear single-file regression: apply a minimal fix in this worktree and run tests. For review comments, draft a response or patch but do not resolve threads without human approval. Never force-push." \
  --agent implementer \
  --dir "$WORKTREE"
DIFF_FILE="$(mktemp /tmp/pr-fix.XXXXXX.patch)"
git -C "$WORKTREE" diff > "$DIFF_FILE"
opencode run "Review the PR fix diff. APPROVE or REJECT only." --agent verifier --file "$DIFF_FILE"
```

## Idempotency

Before pushing anything, the loop must check whether an open PR or branch already exists for the same intent:

```bash
gh pr list --state open --search "<issue-or-fix-slug>" --json number,title,headRefName,url
```

If a matching PR exists, update state and skip duplicate work.

## Verification Split

| Role | Opencode shape |
|------|----------------|
| Triage | `skills/pr-review-triage/SKILL.md` or `skills/loop-triage/SKILL.md` with PR-focused prompt |
| Implementer | `opencode run "..." --agent implementer --dir <worktree>` scoped to the PR branch |
| Verifier | `opencode run "Verify diff" --agent verifier --file <diff.patch>` |

## Safety (L1 defaults)

- Never force-push without explicit human opt-in.
- Draft PRs by default; humans mark ready for review.
- Do not resolve review threads without approval.
- Security, auth, payments, infra, or public API changes always escalate.
- Max 3 fix attempts per PR before handoff.

## References

- [patterns/pr-babysitter.md](../../patterns/pr-babysitter.md)
- [docs/safety.md](../../docs/safety.md)
- [examples/github-actions/pr-babysitter.yml](../github-actions/pr-babysitter.yml)
