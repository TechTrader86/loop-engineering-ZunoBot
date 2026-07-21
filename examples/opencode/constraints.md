# Constraints — Opencode

Binding rules the loop must never break. The `loop-constraints` skill reads `loop-constraints.md` at the start of every run.

## Quick start

```bash
# Append a rule (the loop runs once to read + persist, then every subsequent run enforces)
opencode run \
  "Append this rule to loop-constraints.md verbatim: 'Don't push before telling me. Always run tests first.'"
```

Or just edit `loop-constraints.md` directly. Comments are allowed; the loop reads every line below the header as a binding rule.

## Before every loop run

Make every scheduled run invoke constraints **before** triage. The skill itself reads `loop-constraints.md` and bakes the rules into the agent's context before any action runs:

```bash
opencode run "Run skills/loop-constraints/SKILL.md. Then run skills/loop-triage/SKILL.md. Update STATE.md. No auto-fix in week one."
```

## How it works

1. `loop-constraints.md` lives at the repo root.
2. `loop-constraints` skill lives at `skills/loop-constraints/SKILL.md` (copy from `templates/SKILL.md.loop-constraints`).
3. Every loop run starts with the constraints skill — it reads the file, loads rules, outputs them at the top of the prompt.
4. Triage then runs **inside the same context** with the rules baked in.

## Scaffold automatically

```bash
npx @cobusgreyling/loop-init . --pattern daily-triage --tool opencode
```

`loop-init` copies `loop-constraints.md` and `skills/loop-constraints/SKILL.md` into the repo root layout opencode expects.

Manual copy still works:

```bash
mkdir -p skills/loop-constraints
cp templates/SKILL.md.loop-constraints skills/loop-constraints/SKILL.md
cp templates/loop-constraints.md loop-constraints.md
```

## Safety

Constraints are *binding*. If a rule can be misinterpreted, rewrite it — the loop will not second-guess, the human will.

## References

- [templates/loop-constraints.md](../../templates/loop-constraints.md) — default constraint set
- [templates/SKILL.md.loop-constraints](../../templates/SKILL.md.loop-constraints) — constraints skill template
- [docs/safety.md](../../docs/safety.md)
