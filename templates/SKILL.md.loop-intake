---
name: loop-intake
description: >
  Clarify an ambiguous goal or work item BEFORE the loop acts on it. Runs at the
  front of a run when the assigned task is underspecified. Ask one question at a
  time, push for exact values, and escalate instead of guessing.
user_invocable: true
---

# Loop Intake - Clarify Before You Act

Autonomous loops waste attempts (and budget) when they guess at a vague goal.
This skill runs FIRST, before triage or any action skill, whenever the item the
loop is about to work on is not specific enough to verify "done".

## When to run

Run intake when the goal or work item is missing any of:

- a single, testable definition of done
- the exact scope (which repo / branch / paths / tickets)
- concrete values a fix would depend on (error text, thresholds, versions)

If the goal is already specific and verifiable, skip intake and proceed.

## How to clarify (one question at a time)

1. Read the current state file and the item (issue, PR, request) in full. Do NOT
   re-ask anything already answered there.
2. Ask the SINGLE most decision-blocking question. Wait for the answer.
3. Push for an exact value. "It should be fast" becomes "What p95 latency, in
   ms?". "Add a limit" becomes "How many per minute?". Re-ask once if the answer
   is still vague.
4. Stop as soon as the goal is verifiable. Do not interrogate for its own sake.

Ask in behavior terms, not implementation: what the system must do, what the user
sees, which values matter. Not: which function, table, or endpoint.

## When an answer stays vague

Do not guess. Record it and move on:

- Write the gap as an open question in the state file: `- [ ] OQ: <question>`.
- Mark the item `needs-human` (escalate per the loop's handoff rule).
- If NO blocking question can be resolved, escalate the whole item and stop.
  Acting on a guess burns attempts the circuit breaker should not have to catch.

## Output

Append a short, sharpened goal to the state file (or the item):

```
Goal (clarified): <one testable sentence>
Done when: <verifiable condition>
Open questions: <N> (needs-human) - <list>
```

Hand back to triage or the action skill only if "Done when" is now verifiable.

## Interaction with other skills

- Runs BEFORE `loop-triage` / `issue-triage` and any action skill.
- Feeds `loop-verifier`: the "Done when" line becomes the verifier's check.
- Pairs with `loop-guard` (circuit breaker): intake prevents wasted attempts on a
  goal that was never well defined; the breaker catches the ones that slip through.
- Respects `loop-constraints`: never ask for, or act on, denylisted scope.

## Default behavior

Report-only in week one: propose the clarified goal and open questions, but let a
human confirm before the loop acts on the sharpened goal.
