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

## Offline sync

`OfflineStore` / `SyncEngine` cover daily reports, tasks and job costs. A
queued time entry replayed later goes through the same triggers, so a mutation
captured offline needs no rate on it either.
