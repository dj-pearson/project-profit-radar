# Role guards still missing

Updated 2026-09-23 (US-350). Every authenticated route is now wrapped in
`RouteGuard`, and `src/routes/__tests__/routeGuards.test.tsx` fails on any route
that is not. That test checks that a guard exists, not which roles it admits.

These six pages are behind `RouteGuard` (any signed-in company role) but have
no page-level `RoleGuard`, so every company role can open them:

| Page | Route | File |
|------|-------|------|
| DocumentManagement | `/documents` | `src/pages/DocumentManagement.tsx` |
| Materials | `/materials` | `src/pages/Materials.tsx` |
| MaterialTracking | `/material-tracking` | `src/pages/MaterialTracking.tsx` |
| Equipment | `/equipment` | `src/pages/Equipment.tsx` |
| EstimatesHub | `/estimates` | `src/pages/EstimatesHub.tsx` |
| Reports | `/reports` | `src/pages/Reports.tsx` |

Data on each is still limited by RLS to the caller's company. Deciding which
roles each should admit is a product call; wrap the page body in `RoleGuard`
with that list once it's made, and remove the row here.

`client_portal` users are redirected to `/client-portal` from every route not
marked `portalScoped` (currently `/client-portal` and `/profile`).
