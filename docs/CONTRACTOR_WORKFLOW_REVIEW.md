# Contractor workflow review

Date: 2026-09-03. Scope: the Brikly web app (`src/`), edge functions and migrations, with the native iOS app (`Brikly-iOS/`) noted where it matters. Purpose: walk the platform the way a small contractor runs a job, find where the chain breaks, and turn the breaks into `prd.json` stories (US-317 to US-335) without duplicating the 94 that are already open.

Every claim below was checked against the file named. Line numbers are as of this date.

## The workflow a contractor actually runs

1. **Sell.** A lead comes in. Someone visits the site, builds an estimate from a price book, sends a proposal, the customer signs, pays a deposit.
2. **Build.** The accepted estimate becomes a job with a budget by cost code and a schedule. Crews are assigned, clock in, file a daily report with photos. Materials and subs are ordered against the budget. Changes are priced, approved by the customer, and move the contract and the schedule.
3. **Bill.** Progress invoices come off the contract value (schedule of values), retainage is withheld, the customer pays online, the office sees what is outstanding.
4. **Cost.** Labor hours, purchase orders, receipts, vendor bills and sub payments land on the job by cost code. Budget vs actual, WIP and job profit read from that. QuickBooks gets the same numbers.
5. **Close.** Punch list, final invoice, warranty, handover, project marked complete. Then the customer becomes the next lead.

Brikly has a screen for nearly every box. What it does not have is the arrows.

## Where the chain breaks

| Hop | State | The break | Story |
|---|---|---|---|
| Sign up, create company | Broken | `/setup` updates a company with `.eq('id', undefined)`; the only wizard that inserts one is dead code. New accounts have no tenant. | US-317 |
| Invite the team | Broken | `invite-team-member` generates a password and never sends or returns it. | US-320 |
| Lead to opportunity | Works | `useCRM.ts:1400-1440`. | |
| Opportunity to deal | Broken | Inserts five columns `deals` does not have. `leads` has no `company_id`. | US-276 (amended) |
| Takeoff | Missing | `VisualTakeoff.tsx` is unrouted and stateless. | US-038 (reopened) |
| Estimate with price book | Works | `estimates`, `estimate_line_items`, `line_item_library`, versions. Cost code is fetched but never saved on the line. | US-318 |
| Send proposal | Missing | "Send to Client" sets `status='sent'`. No email, PDF, or `estimate_communications` row. | US-325 |
| Customer accepts, signs | Missing | `ESignature.tsx` is a mock nothing routes; nothing writes `document_signatures`. | US-325, US-041 (reopened) |
| Deposit | Missing | No concept. | US-325 |
| Estimate to project with budget | Broken | Inserts columns `projects` lacks, reads a child table as a column, writes the wrong shape to `job_costs`, swallows the error, toasts success. `project_budgets` is inserted by nothing anywhere. | US-318 |
| One customer record | Missing | Contact, estimate, project, invoice and portal access each carry their own name and email. | US-326 |
| Schedule | Partial | The real Gantt (`/project-schedule`) is not in the sidebar. Two other schedule pages draw projects, not tasks. Tasks have no assignee, crew gets no notification. | US-329 |
| Clock in with GPS | Works | Geofence enforced on the web time clock. | |
| Hours become labor cost | Broken | No rate on `time_entries`; `$65` hardcoded; a manual Sync button upserting on a unique key that does not exist; WIP filters `job_costs` by a column it lacks. | US-321 |
| Daily report with photos | Partial | Photos are a JSON column with no storage upload; four `daily_report_*_items` tables have no readers; crew hours are an integer, not the day's time entries. | US-330 |
| POs, expenses, bills to job cost | Broken | All capture a cost code, none post to `job_costs`. Two screens define job profit differently. | US-322 |
| Change order approved | Broken | Flags flip; contract value, budget lines and end date do not move. The PM's role can set the customer's approval. | US-323 |
| Progress billing and retainage | Broken | Both managers hardcode a `$100,000` contract; prior billings found by `notes ILIKE`. The `payment_applications` migration is invalid DDL. | US-327 |
| Customer pays online | Broken | Pay button requires `stripe_invoice_id`, which nothing writes. No `checkout.session.completed` handler, so a payment would not be recorded. Manual payments bypass `invoice_payments`. | US-324 |
| Client portal | Unreachable | Neither portal page is routed. The invite link points at `/portal/:token`, which no route answers. Three access models, none wired. | US-319, US-316 |
| QuickBooks | Partial | Expenses and payments import into shadow tables nothing reads. Push is invoices only. | US-333 |
| Financial statements | Partial | Nothing auto-posts to the ledger; date ranges are decorative. | US-334 |
| Project status, closeout | Missing | Status is hardcoded `planning` and no screen changes it. `ProjectCloseout.tsx` is a mock nothing routes. | US-328, US-048 (reopened) |
| Navigation | Wrong shape | Five hubs built around admin areas. No schedule entry. Thirteen core pages routed but unlinked. Five financial landing pages. | US-331 |
| Company settings | Partial | Two settings pages; no tax rates, numbering, licence or default terms. New companies get a chart of accounts but no cost codes. | US-332, US-317 |
| Plan enforcement | Partial | Projects and seats enforced; storage and features are not; trial never starts. | US-335 |

## What is built well and should not be rebuilt

- **Estimating**: line items, markup, versions, a template library and a line-item library (`20251115000002`). The gap is one missing column write.
- **Schedule engine**: `scheduleService.ts` with dependency cascade, baselines and critical path (US-223, US-234). The gap is nav and assignment.
- **Time clock**: geofence-enforced clock in/out, auto clock, timesheet approval. The gap is the rate.
- **Change orders**: dual approval with a portal component that writes back. The gap is what approval does.
- **Invoices and payments schema**: `invoice_payments` plus a trigger that recomputes the invoice. The gap is that two writers bypass it.
- **AP**: bills, bill lines, bill payments, vendors, with a status trigger. The gap is posting to the job.
- **Team invite function**: RBAC, seat limit, audit. The gap is the email.
- **Project hub**: 23 sections implemented for one project. The gap is that the sidebar does not send anyone there.
- **Client portal components**: overview, timeline, gallery, budget, CO approval, selections. The gap is a route and an invite.

## Competing implementations to collapse

Each of these has a canonical winner named in the story that owns it.

- Budgets: `projects.budget`, `projects.total_budget`, `projects.contract_value`, `project_budgets`, `budget_line_items`, `budget_tracking` (US-327).
- Time: `time_entries`, `task_time_entries`, crew check-in, QuickTimeEntry (US-321).
- Schedules: `schedule_tasks`, `tasks`, the presentational `ScheduleManagement` set (US-329).
- Expenses: `expenses` (two components with the same name), `project_expenses`, `quickbooks_expenses` (US-322, US-333).
- PO lines: `purchase_order_items`, `purchase_order_line_items` (US-322).
- Payments: `invoice_payments`, the nonexistent `payments`, `bill_payments`, `subcontractor_payments`, `contractor_payments`, `quickbooks_payments` (US-322, US-324, US-333).
- Retention: invoice columns, `retention_items`, `retention_tracking` (US-327).
- Change orders: two table definitions (US-323).
- Projects: three table definitions (US-328).
- Client access: `client_portal_access`, `client_portal_users`, the `client_portal` role (US-319).
- CRM pipeline: `leads`, `opportunities`, `deals`, three activity tables (US-276).
- Settings: `CompanySettings`, `CompanyAdminSettings` (US-332).
- Financial landings: `/financial`, `/financial-hub`, `/finance-hub`, `/financial-overview`, `/executive-dashboard` (US-331).
- Role guards: `RouteGuard`, `ROUTE_ACCESS`, `RoleGuard`/`SecureRoute` (US-302).

## Order of work

The P1 set is the spine. Each one is a place where a user does something, sees a success message, and nothing durable happens.

1. US-317 tenant creation. Without it a fresh account cannot reproduce anything else.
2. US-320 invite email, then US-319 client portal route and invite.
3. US-318 estimate to budget.
4. US-321 labor cost and US-322 purchases to job cost. Together they make every existing job-costing screen show a real number.
5. US-323 change orders move the contract.
6. US-324 customer payment.

Then the P2 set in roughly this order: US-327 (contract value and SOV), US-325 (proposal, acceptance, deposit), US-326 (one customer), US-329 (schedule drives crew), US-330 (daily report as record), US-328 (status and closeout), US-332 (settings), US-333 (QuickBooks mapping), US-331 (navigation, once the pages it needs to point at exist). US-334 and US-335 are P3.

## Existing stories touched

Reopened, because the page the story delivered is an unrouted mock on the current tree: US-038, US-041, US-044, US-046, US-048. Each note names the new story that delivers it.

Amended: US-313 (an `rfis` table exists; reuse it), US-315 (which orphans matter), US-316 (US-319 is its product surface), US-302 (raised to P2; `RouteGuard` enforces nothing), US-276 (raised to P2; `leads` tenancy and the broken deal conversion), US-176, US-107, US-229, US-227, US-311, US-309 (cross-references).

`prd-additions.json` at the repo root is a stale copy of US-235 to US-285 with every `passes` false; `prd.json` is the record.

## What the iOS app covers

Projects, tasks, daily reports, job costs and documents, with offline sync for the first three. Time tracking, photos, change orders, punch list, schedule and purchasing are web only and already have stories (US-176 to US-179, US-194). US-321 and US-330 settle the column shapes those stories should target.
