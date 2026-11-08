---
name: add-metric
description: This skill is used when a user needs to track a new job search metric. When this occurs, a new metric should be added to the dashboard, the weekly check-ins and the target number for this metric can be adjusted week to week.
---

Add a new weekly metric: $ARGUMENTS

## Before you start
- Confirm the metric name and default target; ask if anything is missing

## Every place a metric must be added
1. Visible on the screen: progress dashboard (reflecting all time, weekly and monthly tracking), weekly check-in form (with the ability to adjust the target for this metric week to week), history of weekly check-ins
2. Invisible places in the code: the Review type, the list of metric definitions, the default targets, validation (the number limits), the code that loads saved data

## Don't forget
- Save the new metric to local storage so it persists across sessions
- Add a test for the new metric to ensure it is being tracked correctly and that the weekly check-in form is functioning as expected
- Don't break existing metrics or functionality; ensure that the new metric integrates seamlessly with the current system

## Done when
- Tests for the new metric added
- npm run check passes
- There are no build errors
- A summary of what changed is provided, including any new files created or existing files modified