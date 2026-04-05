# Verification Plan

This repo does not currently have a dedicated unit/integration test runner wired up, so this is the practical verification checklist for the highest-risk flows.

## 1. Roles and Users

- Create a role in Admin Roles and confirm it appears in the Users sidebar.
- Edit a role and confirm the Users sidebar updates without a hard refresh.
- Delete a role and confirm it disappears from the sidebar and access overview.
- Create a user from the role-based Users screen and confirm it persists after reload.
- Edit an existing user and confirm the DB record updates.
- Delete a user and confirm the user and personnel records are removed.

## 2. Fleet and Assets

- Create a vehicle and confirm it appears after reload.
- Edit a vehicle and confirm the details persist after reload.
- Delete a vehicle and confirm it disappears after reload.
- Add and remove vehicle documents and confirm the changes persist.
- Create an aircraft and confirm it appears after reload.
- Edit aircraft core details and confirm they persist after reload.
- Add a maintenance log to an aircraft and confirm it appears after reload.
- Add/remove aircraft documents and confirm persistence after reload.

## 3. Safety and Quality

- Create a safety report and confirm it appears in the report list after reload.
- Add a corrective action plan and confirm it persists after reload.
- Add/edit/remove risk register entries and confirm they persist after reload.
- Update risk matrix settings and confirm they persist after reload.
- Save an audit checklist template and confirm it persists after reload.
- Start an audit, save findings, and finalize it.
- Edit a CAP from the CAP tracker and confirm the change persists.

## 4. Training and Maintenance

- Create/edit/delete an exam topic and confirm the question bank follows it.
- Create an exam and take it end-to-end.
- Save a student progress report and confirm it persists after reload.
- Create a maintenance workpack and task card and confirm sign-off flows work.
- Add a tool to the registry and confirm it persists after reload.

## 5. Operations and Admin

- Save a training route and confirm it persists after reload.
- Create an alert and archive it.
- Open the mass & balance screen and save calculations to a booking.
- Confirm emergency response organizations load from the API.
- Save organization branding/theme settings and confirm they persist.

## 6. What Should Stay Local

- Theme personalization
- Sidebar submenu memory
- Flight planner map visibility settings
- Developer tenant/industry overrides
- Data portability backup/restore

## 7. Sanity Checks

- Hard refresh the app and verify core data survives.
- Open the app in a second tab and verify both tabs show the same DB-backed records.
- Sign out and sign in again to ensure data is still present.
- Confirm no business workflow depends on `localStorage` for source-of-truth records.
