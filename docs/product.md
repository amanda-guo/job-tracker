# Product: job search tracker

See docs/problem.md for why this exists.

## Decisions
- **2026-11-09: Build our own app instead of using or connecting to Notion.**
  Why: I want full control over the user experience, a single data model
  that links effort to opportunities and outcomes, and an ongoing project
  for practising agentic development.
  Means: a hosted database (Supabase) so phone and laptop share data,
  a login, and a one-time import of my Notion history.
- **2026-11-09: Version 1 = opportunities list, quick log, this week's focus, Notion import.**
  Why: covers the core loop (capture fast, see where to focus) with my
  real data from day one. "Enough", indirect investments and insights
  come later, once there's real data to base them on.

## Feature: Opportunities (v1)

### Fields
- Company, role (required); posting link; location; work mode
  (remote / hybrid / on-site)
- Alignment: aligned / somewhat aligned / not aligned
- Source: referral / event connection / recruiter reached out / cold application
- Stage: Interested → Applied → Screening → Interviewing → Final round
  → Offer, or Closed
- Closed reason: rejected / withdrew / declined offer / no response
- Deadline, next step (optional); resume tailored?; notes

### Behaviour
- The date of every stage change is recorded automatically, and can be
  edited (for things logged after they happened).
- Priority order:
  1. Urgent and high value: deadline within 3 days AND either
     - stage is Applied or later, OR
     - stage is Interested, with a referral, and aligned.
  2. Furthest along in the process
  3. Closest deadline
  4. Referral before cold application
  5. Aligned, then somewhat aligned, then not aligned (never hidden)
- An Interested opportunity without a referral is never "urgent", even
  with a close deadline. It sorts by the normal order.
- The list shows why each item is where it is (e.g. "Due in 2 days ·
  referral", "Final round"). No hidden scores.