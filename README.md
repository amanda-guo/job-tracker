# Job Search Tracker

A small web app for tracking a job search week by week. Each week you log a
check-in: how many conversations, warm outreach messages, coffee chats,
referral asks, tailored applications, practice sessions and events you did,
plus hours spent, energy level, your biggest win, your next focus and any
change of plan. A dashboard shows how you're doing against your targets.

It's a standalone React app with no server or account. Check-ins are saved in
the browser's `localStorage`.

## Who it's for

I built it for myself, as a job seeker who wants to:

- **Stay on track** with the activities that actually lead to jobs, using
  weekly targets for each one.
- **Protect leisure time.** The targets work as a ceiling as well as a goal,
  so hitting them means the week's job search is done.
- **Stay flexible.** No two weeks are alike, so targets can be changed for
  each check-in instead of being fixed.
- **See progress two ways:** totals and progress bars on the dashboard, and a
  per-week history of every check-in.

## Features

- **Weekly check-in form:** one check-in per week, each with its own targets.
  Opening a week that already has a check-in loads it for editing.
- **Dashboard:** progress against targets for all time, a chosen week or a
  chosen month, plus a bar chart of any metric over time.
- **Check-in history:** every week at a glance, with edit and delete.
- **Keyboard shortcuts:** `Alt+D` dashboard, `Alt+N` new check-in, `Alt+H`
  history.
- **Careful storage:** saved data is checked when it's loaded, and anything
  that can't be read is backed up instead of being overwritten.

## Agentic development practices

The app was rebuilt from an older version (kept in `reference/`) mostly by
Claude Code. These are the practices used to keep the agent on track and its
work checkable.

### 1. A project brief for the agent: `CLAUDE.md`

[`CLAUDE.md`](CLAUDE.md) gives the agent the context a new teammate would
need:

- what the app is and who it's for
- the current goal
- where things live
- how to run and check it
- house rules: `reference/` is read-only, keep data logic out of components,
  every data-logic change needs a test, no new libraries without asking
- what "done" means: `npm run check` passes, the build succeeds, and the agent
  gives a short, specific summary of what it *didn't* do

### 2. A codebase the agent can verify

- **One command for "done":** `npm run check` runs the type-checker (`tsc`),
  the linter and formatter (Biome), and the tests (Vitest).
- **Testable logic:** data logic lives in plain functions in `src/lib/`, with
  tests next to the code. The UI is in `src/components/`.
- **Swappable storage:** components only talk to a `ReviewStore` interface
  (`src/lib/storage.ts`). That keeps them independent of `localStorage`, and
  lets tests use an in-memory store.

### 3. Hooks that enforce the rules: `.claude/hooks/`

Hooks are configured in [`.claude/settings.json`](.claude/settings.json).
Claude Code runs them automatically, so they don't depend on the agent
remembering the rules.

- **`guard-reference.sh` (PreToolUse on Edit/Write):** blocks any edit to
  `reference/` and tells the agent why.
- **`check-done.sh` (Stop):** when files have changed, runs `npm run check`
  before the agent is allowed to finish. If the check fails, it sends the
  agent back with the error output. A loop guard makes sure it only does this
  once, so a check the agent can't fix doesn't keep it running forever.

### 4. A skill for a repeated task: `.claude/skills/add-metric/`

Adding a metric touches a lot of places, and missing one is easy.
[`SKILL.md`](.claude/skills/add-metric/SKILL.md) lists every place a metric
must go:

- the parts you can see: dashboard, check-in form, history
- the parts you can't: the type, the metric list, the default targets,
  validation, and loading saved data

It also says what the work must not break, and what "done" means. It was
tested by adding the "Coffee chats" metric. Run it with `/add-metric <name>`.

### 5. Evals with answer keys: `EVALS.md`

[`EVALS.md`](EVALS.md) defines three tasks, each with a fixed prompt and a
checklist of pass criteria written *before* the task is run:

- adding a metric
- week-over-week change
- CSV export

The criteria cover the edge cases that usually go wrong, such as no previous
week, skipped weeks, and commas or quotes in CSV text. Each attempt lives on
its own branch so they can be compared. The `eval/task-*` branches were run
with the harness. The `no-harness` branch runs the same kind of task with the
harness removed.

## Running it locally

**You'll need:** Node.js 20.19+ or 22.12+ (required by Vite 8) and npm. The
Claude Code hooks also need [`jq`](https://jqlang.org/) (`brew install jq`).

```bash
npm install     # install dependencies
npm run dev     # start the dev server, then open the URL it prints
```

| Command | What it does |
| --- | --- |
| `npm run check` | Typecheck, lint and test: the "done" check |
| `npm run typecheck` | Type-check with `tsc` |
| `npm run lint` | Biome lint and format check (`npx biome check --write .` fixes) |
| `npm run test` | Run the Vitest tests once (`npx vitest` for watch mode) |
| `npm run build` | Build the production bundle into `dist/` |
| `npm run preview` | Serve the production build locally |

Check-ins are stored in your browser under the key `job-tracker:reviews:v1`.
Clearing site data, or switching browsers, starts you fresh.

## Project layout

```
src/
  components/   UI: Tracker (page), Dashboard, CheckInForm, CheckInHistory
  lib/          Data logic and tests: review types, validation, storage, dashboard math
reference/      The original app, kept as a read-only blueprint
.claude/        Claude Code hooks, settings and the add-metric skill
CLAUDE.md       Project brief for the agent
EVALS.md        Eval tasks and answer keys
```

**Built with:** React 19, TypeScript, Vite, Tailwind CSS v4, Vitest and Biome.
