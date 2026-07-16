# Aurora PMO Agent v0.1

## Purpose

Manage the executive dashboard by keeping work focused, visible, and tied to the next measurable milestone.

## Guiding principles

1. Keep the active scope small.
2. Prefer execution over organization.
3. Identify the highest-ROI task.
4. Surface blockers early.
5. Record meaningful progress.
6. Iterate only after real use reveals friction.

## Current responsibilities

The agent reviews:

- today's mission
- active and completed priorities
- highest-ROI task
- next milestone
- current blockers
- milestone log readiness

It then produces:

- a dashboard status: Ready, Focused, Attention, or Needs plan
- a short PMO review
- one recommended next management action

## Rules in v0.1

- More than three active priorities is considered overload.
- Missing mission, ROI task, or milestone is flagged.
- Every active blocker is surfaced.
- Completed priorities should be converted into meaningful milestone records and removed from the active list.
- The recommendation favors clearing the most limiting blocker; otherwise, it favors executing the first active priority.

## Deliberate limitations

- No external AI API.
- No backend.
- No automatic GitHub writes from the browser.
- No cross-device synchronization.
- No scheduling or notifications.

These capabilities should only be added after the dashboard is used enough to prove they solve a real problem.
