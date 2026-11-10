# Job search tracker
 
A personal job search tracker: opportunities, a quick log, and a weekly
focus. Phone first.
 
## Read before changing anything
- `docs/product.md`: what the app does, decisions, UX guidelines. The
  source of truth for behaviour.
- `docs/plan.md`: the build plan (slices), technical decisions, approved
  libraries.
- `docs/problem.md`: why the app exists (background).
If the spec doesn't cover something, ask. Don't guess. Don't edit `docs/`:
product decisions are mine.
 
## How we work
- Start every task with a plan, and check it against `docs/product.md`
  before writing code.
- Work in small slices. If a task touches more than ~5 files, stop and
  propose smaller slices.
- For logic in `src/lib/`: write the tests first, from the rules in
  `docs/product.md`, and show them to me before implementing.
- Only add libraries listed as approved in `docs/plan.md`. Ask for anything
  else.
## Commands
- `npm run dev`: dev server
- `npm run check`: typecheck, lint and tests (must pass before done)
- `npm run build`: production build
- `npx biome check --write .`: auto-fix formatting
## Where things live
- `src/lib/`: data logic, types and rules (no React). Tests next to the
  code as `*.test.ts`.
- `src/components/`: UI only. Keep data logic out of components.
- `docs/`: product and plan. Read-only for agents.
## Rules
- Every change to logic in `src/lib/` needs a test.
- Dates: weeks start on Monday, in my local time zone (America/Toronto).
  Never mix UTC and local dates.
- Follow the UX guidelines in `docs/product.md`: calm tone, no red, no
  "overdue", always show why something is ranked or flagged.
## What "done" means
- `npm run check` passes (the Stop hook enforces this).
- A short summary: what changed, what you didn't do, and every assumption
  you made.