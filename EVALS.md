## Task List and Passing Criteria

## Task 1: Add a metric

Prompt: Add a new metric called "Coffee chats" with a default weekly target of 2.

Answer key:
- [ ] Coffee chats appears in the check-in form with a default target of 2
- [ ] Shows on the dashboard (all time, week, month) and in the check-in history
- [ ] Old check-ins without coffee chats still load, shown in the check-in history
- [ ] Validation applies (0–999)
- [ ] Tests added for the new metric
- [ ] npm run check passes
- [ ] No other files changed unexpectedly
- [ ] Summary matches what it actually did

### Task 2: Week-over-week change

Prompt: Show the week-over-week change for each metric on the dashboard.

Answer key:
- [ ] The math is right: this week minus last week.
- [ ] There’s no previous week: it shows nothing, not “+5” from zero, and doesn’t crash.
- [ ] There’s a gap: you skipped a week. Does it compare to the last check-in, or to the empty week? Decide which is right before you run it.
- [ ] The calculation lives in src/lib/ and has tests.
- [ ] Only the dashboard changed.

### Task 3: CSV export

Prompt: Add a button to export all my check-ins as a CSV file.

Answer key:
- [ ] It includes every field: all the metrics, targets, energy, win, next focus, notes.
- [ ] Text with commas, quotes or line breaks doesn’t break the file. This is the classic CSV bug. Put a comma and quotes in a test check-in’s notes before you run it.
- [ ] Dates are readable.
- [ ] The file opens correctly in Excel or Google Sheets.
- [ ] It added no new library, or asked first.