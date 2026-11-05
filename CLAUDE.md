# Job search tracker

## What the app is and who it’s for

This app is a job search tracker for myself to track different activities related to finding employment such as warm outreaches to people, referrals, tailored applications, events, etc. It is meant to show a week by week breakdown on the metrics I have set for myself to stay on track towards applying to jobs and set a boundary for myself so I can protect my leisure time. Since each week will vary in terms of activities, I also have the ability to change the targets for each week to reflect that so the metrics are not rigid when each week is fluid. I also have both a graphical and week by week view of the progress I'm making on hitting these targets.

## The goal right now

We're rebuilding the app from the files in reference/ as a standalone app that saves to the browser

## Structure of the app

Look at the files in reference/ for reference to how this app should look and function (e.g. skim tracker.tsx and WeeklyReviews.ts for the features and fields)

## How to run it and how to check it

To run the application, use the following commands:

- `npm install` to install node modules and dependencies
- `npm run dev` to run the development server locally

To run automated checks from the command line run:

- `npm run check` to run all three checks below (this is what “done” requires)
- `npm run typecheck` to type-check the TypeScript (`tsc --noEmit` against tsconfig.app.json and tsconfig.node.json)
- `npm run lint` to run Biome (lint + formatting + import order); `npx biome check --write .` auto-fixes
- `npm run test` to run the Vitest tests once (`npx vitest` for watch mode)
- `npm run build` to build the production bundle

Tooling: Tailwind CSS v4 (via `@tailwindcss/vite`, imported in src/index.css), Vitest (tests live next to code as `src/**/*.test.ts(x)`), Biome (config in biome.json; ignores reference/, Markdown, and SVGs).

## Where things live

- Data logic in src/lib/
- UI in src/components/
- Image files in src/assets/
- Fields and functionalities for the job tracker in reference/

## Rules

- reference/ is read-only, look but don’t edit
- Keep data logic out of components
- Every change to data logic needs a test
- Don’t add libraries without asking

## What “done” means

- `npm run check` passes
- There are no build errors
- You’ve said what you didn’t do (make this a concise summary and be specific about the files or places in either the UI or the data that further action needs to be taken on)
