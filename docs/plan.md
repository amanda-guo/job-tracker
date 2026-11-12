# Build plan
 
How version 1 (see `docs/product.md`) gets built: in small slices, each
one a branch and a pull request that passes CI before it's merged.
 
## Technical decisions
 
- **2026-11-10: Keep the foundation, replace the product.** Keep Vite,
  TypeScript, Tailwind, Biome, Vitest, `npm run check`, the store-interface
  pattern and the Stop hook. Retire the weekly check-in features (they
  aren't in version 1). The old version is saved in a separate branch called 
  `v1/agentic-development-experimentation`.
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
- **2026-11-11: The history is the source of truth.** Each opportunity
  has a history of dated events; its current state (stage, referral,
  offer type, closed reason, take-home status) is always derived from
  that history, never edited directly. Dates are `YYYY-MM-DD`, local.
- **2026-11-11: Text limits.** Notes 5,000 characters, job description
  20,000, other text 200.
- **2026-11-11: Logic never reads the clock.** Functions in src/lib/
  take "today" as an input, so tests can control it.

## Slices
 
| # | Slice | Status |
|---|---|---|
| 0 | Harness reset: CLAUDE.md points to `docs/`, evals moved out of the repo, permission rules, CI on pull requests | Done |
| 1 | Retire the old check-in features and `reference/`; keep the foundation; update README | Done |
| 2 | Colour palette (design tokens), phone-first layout, navigation | Separated into smaller tasks (see below) |
| 2a | Look and feel: colour tokens, contrast test, “no raw colours” check, phone-first layout | Done |
| 2b | Screens: home, all opportunities, opportunity detail (placeholders), and the links between them | Done |
| 2c | Actions: the two stacked buttons, and an accessible sheet they open (placeholder content) | Done |
| 3 | Opportunity data model, stages and validation (`src/lib/`) | Separated into smaller tasks (see below) |
| 3a | Types, fields, validation, and the “fill in later” rule | Done |
| 3b | Changing stages, reopening, follow-ups and responses, and editing event dates | |
| 4 | Priority, follow-up and auto-close rules (`src/lib/`), tests first and reviewed by me | |
| 5 | Browser storage behind the opportunity store interface. Reuse the backup-on-unreadable-data idea from `src/lib/storage.ts` on branch `v1/agentic-development-experimentation` | |
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