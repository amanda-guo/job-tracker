# Job Search Tracker

A personal, phone-first job search tracker. It keeps track of my
opportunities, gives me a quick way to log what happened, and shows a focus
for the week. The goal is to put my energy where it matters most, know when
I've done enough for the week, and learn what actually works. It should
lower stress, never add to it.

Version 1 covers opportunities, a quick log, this week's focus and a
one-time import from Notion.

**Status:** being rebuilt in small slices. The old weekly check-in app is
saved on the `v1/agentic-development-experimentation` branch.

## Docs

- [`docs/problem.md`](docs/problem.md): why the app exists
- [`docs/product.md`](docs/product.md): what it does, decisions and UX
  guidelines
- [`docs/plan.md`](docs/plan.md): the build plan, slices and technical
  decisions
- [`CLAUDE.md`](CLAUDE.md): the working brief for Claude Code

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

## Project layout

```
src/
  components/   UI only
  lib/          Data logic, types and rules, with tests next to the code
docs/           Problem, product and build plan
.claude/        Claude Code settings and hooks
CLAUDE.md       Project brief for the agent
```

**Built with:** React 19, TypeScript, Vite, Tailwind CSS v4, Vitest and Biome.
