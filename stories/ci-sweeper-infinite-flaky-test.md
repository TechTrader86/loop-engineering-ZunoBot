# CI Sweeper — The Infinite Flaky Test Loop

## Setup
- **Pattern:** CI Sweeper
- **Tool + Cadence:** GitHub Actions (triggered on every failed `main` build)

## What Worked
The CI Sweeper successfully detected the CI failure on `main` and immediately proposed a valid code change to increase the test timeout in our `e2e/third-party/` directory.

## What Broke
The underlying issue was a flaky third-party API, not just a simple timeout. 
When the sweeper opened its fix PR, the CI ran against that PR and failed again due to the exact same flake. The sweeper then spawned *another* loop to fix its own fix. It ended up proposing 30+ iterative PRs over the weekend, just inflating `setTimeout` values endlessly. We had to manually disable the GitHub Actions workflow to stop it.

## Metrics
- ~30 automated PRs created over a single weekend.
- Unnecessary token spend and CI compute wasted on ghost-chasing.

## Lesson
Never let a CI Sweeper auto-trigger on flaky tests without a hard daily run limit. We added a denylist in `LOOP.md` for `e2e/third-party/` and a strict budget cap of 3 automated fix attempts per day across the repository.
