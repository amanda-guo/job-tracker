# Build plan
 
How version 1 (see `docs/product.md`) gets built: in small slices, each
one a branch and a pull request that passes CI before it's merged.
 
## Technical decisions
 
- **2026-11-10: Keep the foundation, replace the product.** Keep Vite,
  TypeScript, Tailwind, Biome, Vitest, `npm run check`, the store-interface
  pattern and the Stop hook. Retire the weekly check-in features (they
  aren't in version 1). The old version is tagged `old-checkin-app`.
- **2026-11-10: Browser storage first, Supabase in slice 9.** Screens are
  built against a storage interface, so switching to Supabase only swaps
  what's behind it.
- **2026-11-10: Approved libraries.**
  - React Router: moving between screens
  - Testing Library (with what it needs to run, e.g. jsdom): testing
    screen behaviour
  - Playwright: one end-to-end test of the quick log at phone size
  - Supabase client: from slice 9
  Anything else: ask first.
## Slices
 
| # | Slice | Status |
|---|---|---|
| 0 | Harness reset: CLAUDE.md points to `docs/`, evals moved out of the repo, permission rules, CI on pull requests | In progress |
| 1 | Retire the old check-in features and `reference/`; keep the foundation; update README | |
| 2 | Colour palette (design tokens), phone-first layout, navigation | |
| 3 | Opportunity data model, stages and validation (`src/lib/`) | |
| 4 | Priority, follow-up and auto-close rules (`src/lib/`), tests first and reviewed by me | |
| 5 | Browser storage behind the opportunity store interface | |
| 6 | Opportunities list, detail, edit, delete with confirmation | |
| 7 | Quick log | |
| 8 | This week's focus | |
| 9 | Supabase: tables, access rules, login | |
| 10 | Notion import script | |
| 11 | Deploy, then test on my phone | |
 
## How each slice runs
 
1. Branch from `main`, e.g. `slice-3-opportunity-model`.
2. Plan first (plan mode), checked against `docs/product.md`.
3. Tests first for anything in `src/lib/`; I review them before
   implementation.
4. Build, then `npm run check` (the Stop hook enforces it).
5. Open a pull request. CI must pass.
6. Review with the checklist: matches the spec? unexpected files changed?
   tests weakened? assumptions listed? Then merge.
7. Update the status column above.