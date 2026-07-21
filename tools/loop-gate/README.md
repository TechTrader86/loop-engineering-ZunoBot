# loop-gate

Mechanical enforcement of static safety policy — the code behind `docs/safety.md`'s Path Denylist and Auto-Merge Policy, and `LOOP.md`'s *"No auto-merge on main except trivial dependency patches"* / *"Denylist... without human review"* rules. Nothing evaluated a proposed change against that prose before; `loop-gate` does.

Deliberately has **no knowledge of run history**. Stagnation, repeated failures, and token/daily budgets already belong to [`loop-context`](../loop-context)'s circuit breaker — `loop-gate` only looks at *what* is being proposed (which paths, what action type), not *how the run has behaved so far*. Chain the two:

```bash
loop-context --check --ledger run.json ...            || exit 2   # run-history based
loop-gate check --action auto-merge --paths a.ts,b.ts  || exit 2   # policy based
do-the-merge
```

## Install & Run

```bash
npx @cobusgreyling/loop-gate check --action auto-merge --paths docs/guide.md
```

**From this repo:**

```bash
cd tools/loop-gate
npm install
npm test
```

## Usage

```bash
loop-gate check --action <commit|merge|auto-merge> --paths <f1,f2,...> [--gate-file gate.yaml] [--json]
```

| Flag | Default | Meaning |
|------|---------|---------|
| `--action <commit\|merge\|auto-merge>` | required | What the loop is about to do |
| `--paths <f1,f2,...>` | required | Comma-separated changed file paths |
| `--gate-file <path>` | `gate.yaml` (cwd) | Policy file to evaluate against |
| `--json` | off | Machine-readable decision output |

Exit codes: `0` allowed · `2` escalate · `1` error (bad flags, missing/invalid config).

## Policy file

`gate.yaml` is the machine-readable twin of `docs/safety.md` — see [`templates/gate.yaml.template`](../../templates/gate.yaml.template) to scaffold your own, or this repo's own dogfood [`gate.yaml`](../../gate.yaml):

```yaml
version: 1
denylist:
  - ".env"
  - "**/secrets/**"
  - "auth/**"
maxFiles: 10
autoMergeAllowlist:
  - "docs/**"
  - "**/*.md"
```

Checked in order (first match wins, same "most specific trigger first" convention `loop-context`'s circuit breaker uses):

1. **`denylist`** — any changed path matching a glob here escalates, regardless of `--action`.
2. **`maxFiles`** — more changed paths than this escalates (matches `docs/safety.md`'s "Changes touching >N files" human gate).
3. **`autoMergeAllowlist`** — only checked when `--action auto-merge`; every changed path must match one of these globs, or it escalates.

Glob matching is via [`minimatch`](https://www.npmjs.com/package/minimatch) (the same semantics `.gitignore`-style globs use — `**` matches across path segments).

## What this does not do

- Does not read a run ledger, and never will — that keeps it decoupled from `loop-context` at the source level, the same way `loop-worktree` and `loop-context` stay independent while still being paired by convention in a control script.
- Does not produce its own escalation summary format — fold its JSON decision into whatever your control script already assembles from `loop-context --inject` when escalating to a human.
- Does not enforce anything by itself — like `loop-worktree`'s locks, this is advisory: a control script that skips calling `loop-gate` is not physically blocked. The mechanism is only as good as the scripts that call it.

See [docs/safety.md](../../docs/safety.md) for the policy this codifies, and [docs/primitives.md](../../docs/primitives.md) for where safety gates fit in the Five Building Blocks + Memory model.
