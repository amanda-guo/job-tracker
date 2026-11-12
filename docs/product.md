# Product: job search tracker
 
See `docs/problem.md` for why this exists. This file describes what the
app does and what "good" looks like. When something here is unclear or
missing, ask rather than guess.
 
## Decisions
 
- **2026-11-09: Build our own app instead of using or connecting to Notion.**
  Why: full control over the user experience, one data model that links
  effort to opportunities and outcomes, and an ongoing project for
  practising agentic development.
  Means: a hosted database (Supabase) so phone and laptop share data,
  a login, and a one-time import of my Notion history.
- **2026-11-09: Version 1 = opportunities, quick log, this week's focus,
  Notion import.**
  Why: covers the core loop (capture fast, see where to focus) with real
  data from day one. "Enough", indirect investments and insights come
  later, once there's real data to base them on.
- **2026-11-10: Priority updates live**, not locked for the week.
- **2026-11-10: Deleting asks for confirmation.**
- **2026-11-10: Applications with no change for 6 weeks close
  automatically as "no response".** Applies to all applications, not
  only imported ones.
- **2026-11-10: "Technical difficulties" is not a stage.** Problems with
  an application are recorded in notes.
- **2026-11-10: Editable stages and preset values come in version 1.1.**
  Version 1 ships with the default lists below.
- **2026-11-10: "Followed up" does not reset the 6-week auto-close.**
  Only a response does, and I record that myself ("Got a response" or a
  stage change).
- **2026-11-10: Weeks start on Monday.**
## Version 1 scope
 
In: opportunities, quick log, this week's focus, Notion import.
 
Out (later versions): "enough" for the week, indirect investments
(upskilling, side projects, LinkedIn), insights and suggestions, editable
stages and presets (v1.1), calendar or scheduling, notifications, AI
features, more than one user.
 
## Feature: Opportunities
 
### Fields
- **Company, role** (required)
- Posting link, location, work mode (remote / hybrid / on-site)
- **Alignment:** aligned / somewhat aligned / not aligned
- **Source** (how I found it): event connection / recruiter reached out /
  job posting / my network
- **Referral:** none / requested / referred
- **Stage** (in order): Interested → Applied → Take-home assignment →
  HR screen → Technical / other rounds → Final round → Offer → Closed
- **Take-home status** (when stage is Take-home assignment): received /
  submitted. While received, the deadline is the take-home's due date.
- **Offer type** (when stage is Offer): verbal / written
- **Closed reason** (when stage is Closed): rejected / withdrew /
  declined offer / accepted / no response. Marked "closed automatically"
  when the 6-week rule closed it.
- Deadline, next step (optional)
- Resume tailored: yes / somewhat / no
- Job description (optional, pasted text)
- **Links:** any number of labelled links (e.g. Notion pages with coffee
  chat notes)
- Notes, date added
### Behaviour
- The date of every stage change is recorded automatically, and can be
  edited (for things logged after they happened).
- Priority order:
  1. Urgent and high value: deadline within 3 days AND either
     - stage is Applied or later, OR
     - stage is Interested, referral is "referred", and aligned or
       somewhat aligned.
     Within this group, at the same stage, aligned comes before somewhat
     aligned (even if the somewhat-aligned deadline is closer).
  2. Furthest along in the process (stage order above)
  3. Closest deadline
  4. Referral "referred" before others
  5. Aligned, then somewhat aligned, then not aligned
- An Interested opportunity without a referral is never urgent, even with
  a close deadline. Neither is a not-aligned one. A referral that is only
  "requested" never makes an opportunity urgent.
- Not-aligned opportunities are never hidden. They sort to the bottom.
- Every list shows why each item is where it is (e.g. "Due in 2 days ·
  referred", "Final round"). No hidden scores.
- Applied with no response for 6 weeks: closes automatically as
  "no response", labelled "closed automatically", and can be reopened.
  The clock resets only on a stage change or "Got a response", never on
  "Followed up". Any opportunity can be closed manually at any time.
## Feature: Quick log
 
- On Home, "Log an update" and "Add an opportunity" are stacked,
  labelled buttons pinned to the bottom of the screen. All opportunities
  is a backlog view and doesn't show them.
- Quick actions:
  - **New opportunity:** only company and role required; the rest can be
    filled in later.
  - **Update:** pick an opportunity (open ones first, with search), then
    change its stage or referral status. Date defaults to today, editable.
  - **Add a note, next step or link.**
  - **Followed up:** records the date and resets that opportunity's
    follow-up clock (not the 6-week auto-close).
  - **Got a response:** records a reply that doesn't change the stage
    (e.g. "still reviewing"). Resets both the follow-up clock and the
    6-week auto-close.
- No scheduling: stages say which round, not when it happens.
- Speed targets: update in under 15 seconds; new opportunity in under 30.
- Opportunities missing details go to a "fill in later" list.
## Feature: This week's focus
 
- The home screen, headed by the current week, starting Monday
  (e.g. "Week of Nov 9").
- Shows the top 3 opportunities by priority, each with why it's there and
  its next step. The list updates immediately as things change.
- "Worth a follow-up": opportunities whose follow-up falls due this week
  (or earlier and still open). Defaults:
  - Referral requested: 7 days
  - Applied, no response: 14 days
  - Take-home submitted: 10 days
  - After an interview round (HR screen, technical / other, final): 7 days
  - Verbal offer, waiting for written: 5 days
- A small "fill in later" count when entries are missing details.
- No targets or activity counts in v1.
## Feature: Notion import (one-time)
 
A one-time script that loads my Notion CSV export. Not a screen in the app.
 
### Column mapping
- "Role @ Company (Location)" → split into role, company, location.
  Location may be missing.
- "Date Applied" → date of the Applied stage. May be missing; leave blank.
- "Job Posting" → posting link. If it says "Internal Job Posting", take
  the link from "Notes" instead.
- "Notes" → notes (kept whole).
- "Referral?" Yes → referred; No or blank → none (unless the stage says
  "Referral Reach Out", which means requested).
- "Tailored Resume + Cover Letter" Yes / Somewhat / No → resume tailored.
- "Follow-Up Date" → dropped (always empty).
- Source and alignment → left blank.
### Stage mapping
"Application Stage" lists every stage reached, in no order. Use the
furthest stage reached; any closing value wins.
 
| Notion stage(s) | New stage |
|---|---|
| LinkedIn Recruiter Reach Out | Interested (source: recruiter reached out) |
| Referral Reach Out | Interested (referral: requested) |
| Online App Submitted, Internal App Submitted, Initial Prescreen Submitted | Applied |
| OA Given, OA 2 Given | Take-home assignment (received) |
| OA Taken, OA 2 Taken | Take-home assignment (submitted) |
| Talking to Recruiter or Hiring Manager, Initial Hiring Manager Chat | HR screen |
| Interview Round 1, Interview Round 2 | Technical / other rounds |
| Final Round Interview | Final round |
| Verbal Offer Given / Written Offer Given | Offer (verbal / written) |
| Rejected / Declined / Accepted | Closed: rejected / declined offer / accepted |
| Technical Difficulties | No stage; add "Notion: technical difficulties" to notes |
 
### Rules
- The 6-week "no response" rule applies to imported applications too.
- Only open imported opportunities go to "fill in later". Closed ones
  never do.
## UX guidelines (what good looks like)
 
1. **Lower stress, never add to it.** No red, no "overdue", no streaks, no
   guilt language. Say "Worth a follow-up", not "Overdue". Say
   "Fill in later (3)", not "3 incomplete entries".
2. **Explain, don't score.** Anything ranked or flagged shows why, in
   plain words.
3. **Capture in seconds.** Phone first. Large tap targets. Only company
   and role are ever required. Sensible defaults (today's date).
4. **Forgiving.** Everything can be edited later, including dates.
   Catching up on old updates is normal, not a failure.
5. **Calm and focused.** Show the few things that matter (top 3, a short
   follow-up list), not everything at once.
6. **Honest.** Never imply more certainty than the data supports.
7. **Actions say what they do.** Navigation (where am I) and actions
   (do something) look different. Every button has a text label that
   says where it leads or what it does. No bare icons or "+".

## Non-functional requirements
 
- Works in phone and laptop browsers. Phone first. Can be added to the
  home screen.
- Single user, login required. All data is private: every database table
  only allows access to the logged-in user. Never open access.
- Weeks and dates use my time zone (America/Toronto).
- Accessible: readable contrast, labelled controls, works with keyboard.

## Screens and navigation (v1)
- **Home** (this week's focus): the top 3, "Worth a follow-up", and a
  "See all opportunities" link. Two stacked actions at the bottom:
  "Log an update" (primary) and "Add an opportunity" (secondary).
- **All opportunities:** the full list in priority order.
- **Opportunity detail:** the full entry (every field, stage history
  with dates, notes, links), with edit and delete.
- Tapping any opportunity, on any list, including a follow-up item,
  opens its detail. Back returns to where you came from.
- "Log an update" and "Add an opportunity" open as sheets over the
  current screen, each titled with what it does.
- Visual: palette B (soft slate, blue accent), system font, light mode
  only in v1 (dark mode later).
- All opportunities shows closed opportunities in their own "Closed"
  list, separate from open ones. Any closed opportunity can be moved
  back to any stage.

## Data rules
- Only company and role are required. Everything else can be blank
  ("not set"), e.g. after a quick add or the Notion import.
- Fill in later: an open opportunity missing alignment, source,
  posting link or job description.
- Every change (stage, referral, take-home submitted, offer verbal to
  written, followed up, got a response) is a dated event in the
  opportunity's history. The current state always follows the history.
- Creating an opportunity records its starting stage as the first
  event, dated today unless I choose a date.
- Any stage can move to any other stage, including out of Closed.
  When moving out of Closed, the stage before closing is suggested.
- Changing stage clears fields that belong to the old stage (offer type,
  take-home status, closed reason).
- Any event can be undone (removed from the history), after
  confirmation. The current state updates to match. An opportunity's
  only stage event can't be removed.
- Event dates can't be in the future, and must stay in order (no
  earlier than the event before, no later than the event after). If an
  edit breaks this, it isn't saved, and a calm message explains why and
  how to fix it. Deadlines can be in the future.
- Links: the URL is required and starts with http:// or https://. The
  label is optional; without one, the URL is shown.

## Open questions
 
None right now. Add new ones here as they come up, rather than letting
an agent guess.