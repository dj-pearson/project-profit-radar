# Information architecture

**Status:** the decision. `HierarchicalNavigationConfig.ts` is being brought to
this shape; `scripts/check-ia-coverage.mjs` fails when a routed contractor page
is not listed here. Written for US-331.

## Why this exists

The sidebar taught an area model built for the administrator. A contractor's day
is estimate, schedule, time, cost, invoice, and the navigation never said so.
Concretely, before this document:

- The desktop sidebar had **no schedule entry at all**. Crew Scheduling sat
  under People; the Gantt was reachable only from the mobile PM nav, the command
  palette, and a project hub tab.
- Thirteen routed pages were linked from nowhere.
- `NavigationConfig.dashboardAreas` was a third navigation tree, rendered by two
  hub pages and nothing else.
- Five financial landing pages competed: `/financial`, `/financial-hub`,
  `/finance-hub`, `/financial-overview`, `/executive-dashboard`.
- `/workflows` was declared twice; the losing declaration pointed at a 504-line
  page with zero database calls.
- Equipment appeared in the sidebar twice, under two different areas.

## The five homes

Every page a contractor uses has exactly one home. Admin and root-admin surfaces
are separate and are not listed here.

### Sell — winning the work

| Page | Route |
|---|---|
| Leads | `/crm/leads`, `/crm/leads/:id` |
| Pipeline | `/crm/pipeline`, `/crm/opportunities` |
| Customers | `/crm/contacts`, `/customers/:contactId` |
| Estimates | `/estimates` |
| Public estimate (customer-facing, unauthenticated) | `/estimate/:token` |
| Bid levelling | `/bid-leveling` |
| Campaigns and marketing | `/crm/campaigns`, `/email-marketing` |
| CRM analytics and lead intelligence | `/crm/analytics`, `/crm/lead-intelligence` |
| CRM workflows | `/crm/workflows`, `/crm/workflows/builder`, `/crm/workflows/builder/:id` |

### Build — running the job

| Page | Route |
|---|---|
| Projects list | `/projects`, `/projects-hub` |
| Project hub (23 sections; see below) | `/projects/:projectId` |
| New project | `/create-project` |
| **Schedule** (company-wide) | `/schedule-management` |
| Project Gantt | `/project-schedule` |
| Schedule import | `/schedule-import` |
| Schedule builder | `/schedule-builder` |
| Calendar | `/calendar`, `/project-calendar` |
| Crew scheduling and presence | `/crew-scheduling`, `/crew-presence`, `/crew-checkin`, `/geofence-map` |
| Daily reports | `/daily-reports`, `/daily-report-templates` |
| Time | `/time-tracking`, `/time-tracking/reports`, `/timesheets` |
| Tasks | `/my-tasks`, `/projects/:projectId/tasks/new` |
| Change orders | `/change-orders` |
| Punch list | `/punch-list` |
| Subcontractors and vendors | `/subcontractors`, `/vendors`, `/trade-handoff` |
| RFIs and submittals | `/rfis`, `/submittals` |
| Safety and compliance | `/safety`, `/compliance-audit`, `/permit-management` |
| Warranty | `/warranty-management` |
| Service dispatch | `/service-dispatch` |
| Documents | `/documents`, `/document-templates` |
| Communication | `/communication`, `/collaboration`, `/smart-client-updates` |
| Client portal | `/client-portal`, `/client-selections` |

### Bill — getting paid

| Page | Route |
|---|---|
| Invoices | `/invoices` |
| AR ageing | `/invoices/aging` |
| Payments | `/payment-center` |
| Financial landing | `/financial-hub` |

### Cost — knowing what it cost

| Page | Route |
|---|---|
| Job costing | `/job-costing` |
| Expenses | `/expenses` |
| Purchase orders | `/purchase-orders`, `/purchase-orders/new`, `/purchase-orders/:id/edit` |
| Materials | `/materials`, `/material-tracking`, `/material-orchestration` |
| Accounting | `/finance/hub` and every `/finance/*` page |
| Reports and exports | `/reports`, `/export-center`, `/executive-dashboard` |
| Financial dashboard | `/financial` |

### Company — setting it up

| Page | Route |
|---|---|
| Team | `/team`, `/people-hub` |
| Equipment | `/equipment` (**one entry**; `/equipment-qr-labels` sits under it, `/equipment-management` redirects to it) |
| Company settings | `/company-settings`, `/user-settings`, `/security-settings`, `/settings/custom-domain` |
| Subscription | `/subscription-settings`, `/upgrade` |
| Integrations | `/integrations`, `/quickbooks-routing` |
| Workflows | `/workflows`, `/workflow-management` |
| Operations hub | `/operations-hub` |
| Profile and support | `/profile`, `/support`, `/tools` |

## The project hub

`src/components/project/projectSections.ts` is the single list. The header tab
bar renders the subset flagged `inTabBar`; the sub-sidebar renders all of them
grouped. `ProjectContent`'s `contentMap` must implement every id, and
`projectSections.test.ts` fails if it does not.

Before this, three lists disagreed: `ProjectContent` implemented 23 sections,
the sub-sidebar listed 22 (no `procurement`, so that screen was reachable from
nothing), and the tab bar showed 10, three of them captioned against a different
section than they opened — `estimates` said "Financials", `tasks` said "Team".

## Decisions taken

- **`/financial-overview` and `/finance-hub` redirect.** The first was linked
  from nothing; the second duplicated `/finance/hub` exactly.
- **`/financial` and `/executive-dashboard` are kept.** They have 12 and 1
  inbound links and are distinct pages. Collapsing them is a product decision,
  not a routing cleanup, and is not taken here.
- **The `/workflows` duplicate is removed**, along with the mock page it pointed
  at. The surviving route was always the one that rendered.
- **`/equipment-management` redirects to `/equipment`** (US-372). Its schedule
  view is the Gantt already in Equipment's Assignments tab, and its edit dialog
  never wrote a row. The page, `EquipmentEditForm` and the orphaned
  `EquipmentTracking` are deleted; the sidebar has one Equipment entry.
- **The four schedule pages stay, for now** (US-372, recorded here rather than
  resolved). `/schedule-management` is the company-wide schedule and the one
  the sidebar should name; `/project-schedule` is the per-project Gantt and
  belongs under the project hub; `/project-calendar` is a month grid of calendar
  events (not `schedule_board` rows) and is the first candidate to become a view
  of `/schedule-management`; `/crew-scheduling` is
  dispatch, a different job that happens to share the word. Merging them
  changes what people see, so it is a product call, not a routing cleanup.
- **`/communication` is the one communication page** (US-313).
  `src/pages/CommunicationPage.tsx` renders `components/communication/CommunicationHub`,
  whose Messages tab is the working chat. The second, unrouted
  `src/pages/CommunicationHub.tsx` (445 lines, read project messages directly)
  was deleted in US-372 rather than routed: it duplicated the Messages tab and
  nothing linked to it. The hub's RFIs tab lists the same `rfis` rows as `/rfis`
  filtered to the picked project, and its Meetings tab is `project_calendar_events`
  rows of type `meeting`, the table `/calendar` writes, so there is no separate
  meeting store.
- **`/workflows` and `/workflow-management` are not duplicates** despite the
  names. `/workflows` (WorkflowAutomation) is rule-based automation and reads
  the database; `/workflow-management` is a tab shell over change orders, QC,
  RFIs/submittals and the client portal, each of which has its own page. The
  second should be retired into those pages with a redirect, not merged into
  the first. Left to the US-331 follow-up.
- **Three FinanceHub tiles are removed** rather than routed: bank accounts, bank
  reconciliation and credit memos have tables but no pages. A tile that 404s is
  worse than no tile. Bank reconciliation in particular is an unbuilt feature,
  not a missing route.

## Still to do

- `HierarchicalNavigationConfig.ts` is not yet generated from this document, and
  `NavigationConfig.dashboardAreas` still exists as a third tree behind
  `/operations-hub` and `/admin-hub`.
- The mobile contextual nav on `/projects/*` still links to global pages and
  drops the project id.
- The US-315 orphan list has not been re-triaged against this mapping.
