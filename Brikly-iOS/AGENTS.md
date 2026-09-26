# Brikly-iOS

The canonical, shipping iOS app. Owns the `com.brikly.app` bundle identifier
and is the App Store submission surface. `mobile-app/` (Expo) and the Capacitor
wrapper are not; see the repo root `CLAUDE.md`.

Build and run: `npm run ios:open` / `ios:build` / `ios:test` from the repo root,
or open `Brikly.xcodeproj` in Xcode.

## Backend contracts this app has to honour

The web app and iOS write the same tables. Where a column is filled by a
database trigger rather than by the caller, iOS should leave it out rather than
guess a value.

### Time entries (US-321)

Clocking in and out writes `time_entries`. The shape iOS must send:

| Column | Who fills it | Notes |
|---|---|---|
| `project_id` | client | required |
| `cost_code_id` | client | **required in practice.** An entry approved with no cost code posts no labor cost at all: there is nothing to compare against a budget line. The web time clock now refuses to start without one. |
| `user_id`, `start_time`, `end_time`, `total_hours` | client | as before |
| `company_id` | trigger | `trg_time_entry_company_id` fills it from the project. Sending it is harmless; omitting it is correct. |
| `hourly_rate`, `burden_rate`, `labor_cost` | server | resolved at approval by `resolve_labor_rate()` and frozen on the row. **Never compute cost on the device.** A rate that differs between clients produces job costs nobody can reconcile, which is exactly what the old hardcoded $65 did on web. |
| `is_geofence_verified`, `geofence_distance_meters`, `gps_*` | client | unchanged |

Approving an entry (setting `approval_status` to `approved`) posts the labor
into `job_costs` through a trigger, and un-approving removes that posting. iOS
does not need to write `job_costs` for labor, and should not.

Offer the cost code list the way the web clock does: the project's own budget
lines first (`project_budgets` for that project), then the rest of
`cost_codes`. Those are the codes the job is actually expected to spend
against.

### Projects

`site_id` is filled by `trg_project_site_id` from the project's company
(US-317). Do not send it.

### Time clock (iOS)

`TimeClockViewModel` follows `MobileTimeClock.tsx`: project and cost code
required, a GPS fix required, clock-in refused outside the project geofence
(`geofence_radius_meters`, default 100 m). `total_hours` excludes break time,
the same as the web timer. `site_id` is sent from the project when it has one
(some environments still have `time_entries.site_id NOT NULL` with no trigger,
US-275).

Two `UserDefaults` keys hold an in-progress shift. They are on-device storage
contracts; don't rename them:

- `brikly.timeClock.pendingClockIn`: a `NewTimeEntry` for a clock-in made
  offline. It is not queued; it is written as one complete row at clock-out.
- `brikly.timeClock.breakStartedAt`: the `Date` a running break started.

### Change orders

iOS goes through the `change-orders` edge function (list / create / approve),
never `change_orders` directly. `approve` reads camelCase keys (`orderId`,
`approvalType`), so that call passes `snakeCaseKeys: false` to
`EdgeFunctionsService.invoke`. Only `admin`, `project_manager` and
`root_admin` see create/approve; the function enforces the same list. The
client's approval comes from the client portal only.

### Other project records

RFIs, punch list, safety incidents, expenses and submittals are plain
PostgREST writes through `RecordService`, with the web pages' payloads and
status values (`RFIs.tsx`, `PunchList.tsx`, `SafetyIncidentForm.tsx`,
`ExpenseTracker.tsx`, `Submittals.tsx`). Notifications read
`real_time_notifications` (missing from the generated `types.ts`, but present
in migrations).

### Crew check-in

Check-in calls `verify_crew_gps_checkin(p_assignment_id, p_latitude,
p_longitude, p_accuracy)`; the server measures the distance and sets
`gps_checkin_verified`, `is_onsite` and `status`. The device never decides
whether someone is on site. Check-out is the same direct update web makes
(`gps_checkout_*`, `is_onsite = false`, `status = completed`). Both need a
connection. Migration `20260926000000` fixed the RPC, which read columns that
don't exist and failed on every call before it.

### Photos

`photo_attachments` is the photo record (US-330); files go to the private
`project-documents` bucket at `<projectId>/photos/<uuid>.jpg`, or
`<projectId>/daily-reports/...` when attached to a report. The bucket
policies key on the first path segment being a project id. `source` has a
CHECK constraint: `daily_report`, `punch_list`, `progress`, `safety`,
`other`. A photo attached to a daily report is also appended to
`daily_reports.photos` (dual write, same as web). Images are downscaled to a
2048 px long edge before upload. Upload needs a connection.

## Offline sync

`OfflineStore` / `SyncEngine` cover daily reports, tasks and job costs with
typed replays. Time entries, safety incidents, expenses and punch list items
are queued as JSON and replayed into their table by
`SyncEngine.genericTables`; the DTOs carry explicit snake_case keys so the
payload goes to PostgREST unchanged. A queued time entry replayed later goes
through the same triggers, so a mutation captured offline needs no rate on it
either. RFIs, submittals and change orders need a connection.
