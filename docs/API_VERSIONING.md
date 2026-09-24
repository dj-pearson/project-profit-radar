# Edge-function API versioning

US-273. The edge functions at `functions.brikly.net` have no URL version, and the iOS app decodes whatever a function returns. This document is the policy that ties a response shape to the client builds that read it, so the deprecation flow in `CLAUDE.md` ("Backward Compatibility") can be checked rather than argued.

The code is `supabase/functions/_shared/api-version.ts`; its tests are `supabase/functions/_shared/api-version.test.ts`.

## What the server sends

Every response built with `successResponse` / `errorResponse` / `safeErrorResponse` (`_shared/auth-helpers.ts`) carries:

| Where | Name | Value today |
|---|---|---|
| Envelope body | `api_version` | `1` (`API_VERSION`) |
| Header | `X-API-Version` | `1` |
| Header | `X-Min-Supported-Client` | `ios=1.0.0, web=0.0.0` |
| Header | `Access-Control-Expose-Headers` | the two above, so the browser can read them |

All of it is additive. `api_version` is a new top-level key next to `success`, `data`, `error` and `timestamp`; nothing moves. The iOS decoder (`JSONDecoder` with `convertFromSnakeCase`) ignores keys it does not declare, so builds that predate this change are unaffected.

Core functions covered:

- `projects`, `time-tracking`, `generate-invoice`, `process-invoice-payment`: answer through the auth-helpers envelope. The two `projects` responses that do not (`entitlementDeniedResponse` in `_shared/entitlements.ts`, `projectHasFinancialRecordsResponse` in `_shared/project-delete.ts`) stamp themselves, which also covers every other function that uses them.
- `verify-mfa-login` (auth): adds the version headers to its `corsHeaders`, so every response carries them, and `api_version` to each success body. Its error bodies come from `_shared/validation.ts` `createErrorResponse`, which is not an envelope yet (no `success` or `timestamp`), so they carry the headers only.

Any other function that hand-rolls `new Response(JSON.stringify(...))` stamps its responses the same way: spread `apiVersionHeaders()` into the headers and add `api_version: API_VERSION` to the body, or pass the body through `stampEnvelope()`.

`_shared/api-version.ts` also exports `withApiVersion(handler)` / `stampResponse(res)`, which stamp any finished Response (headers always, `api_version` only for a JSON-object body; 204s and non-JSON pass through byte for byte). Do not wrap `serve(...)` with it yet: `check-edge-error-reporting.mjs` and `check-unauthenticated-edge-functions.mjs` locate the handler by the `serve(async (req) =>` shape and report a wrapped one as having no handler. Teach those scripts the shape first.

## What clients send

| Client | Header | Value |
|---|---|---|
| iOS (`Brikly-iOS/Brikly/Services/SupabaseService.swift`, `EdgeFunctionsService.buildRequest`) | `X-Brikly-Client` | `ios/<CFBundleShortVersionString>`, e.g. `ios/1.1.0` |
| Web (`src/integrations/supabase/client.ts`) | `x-client-info` | `brikly-web/<VITE_APP_VERSION>`, or `brikly-web/0.0.0` when that is unset |

The web client uses `x-client-info` instead of `X-Brikly-Client` on purpose. A browser preflights any request header not on the function's `Access-Control-Allow-Headers` list, and eleven functions hand-roll that list. `x-client-info` is already on all of them; a new header would have broken those eleven for the web app on deploy. Native iOS requests are not subject to CORS.

The iOS header only covers calls through `EdgeFunctionsService`. Calls the Supabase Swift SDK makes itself (PostgREST, auth) do not carry it and do not need it: they do not hit edge functions.

## Legacy callers

`getClientInfo(req)` returns `{ legacy: true }` when there is no client header, or when the value is anything it does not recognise (`brikly-mobile`, the supabase-js default `supabase-js-web/2.x`, an unknown platform, a malformed version). **A legacy caller gets exactly the shape it got before US-273.** iOS 1.0.0, the only build in the App Store, sends no header, so it is legacy and stays that way for as long as it is supported.

`clientAtLeast(client, 'ios', '1.3.0')` is false for every legacy caller. That makes the old shape the default: a function has to name a platform and a floor to hand out anything new.

## Changing a response shape

This is the three-release flow from `CLAUDE.md` with the version checks filled in. "A shape" means any field, type or status code an endpoint returns that some supported client reads.

1. **Release N: add, branch by client.** Add the new field or shape. If the old one can stay alongside it, do that and stop here; additive changes need no version check and no `API_VERSION` bump. If the two cannot coexist (a field changes type, a list becomes an object), branch:

   ```ts
   const client = getClientInfo(req);
   const body = clientAtLeast(client, { ios: '1.3.0', web: '0.0.0' }) ? newShape : oldShape;
   ```

   The iOS floor is the first build whose code reads `newShape`; ship that build through a `release/*` train. Web can usually opt in at once (`'0.0.0'`) because it deploys with the server, but remember the ~24h of cached web bundles: only opt web in if the web code in the same deploy reads the new shape.

2. **Release N+1: stop sending the old shape to new clients.** Nothing to do server-side beyond step 1; the branch already does it. Watch App Store Connect until builds below the step-1 floor are gone.

3. **Release N+M: retire the old shape.** Only when `MIN_SUPPORTED_IOS_VERSION` is at or above the step-1 floor:
   - Raise `MIN_SUPPORTED_IOS_VERSION` in `_shared/api-version.ts` (and `MIN_SUPPORTED_WEB_VERSION` if relevant). That changes `X-Min-Supported-Client` on every response.
   - Delete the `oldShape` branch.
   - Bump `API_VERSION` by one, and set `MIN_SUPPORTED_API_VERSION` to the lowest API version any supported client still decodes.

   Because iOS 1.0.0 cannot identify itself, it can never be served a new shape by branch. Retiring anything iOS 1.0.0 reads therefore means raising `MIN_SUPPORTED_IOS_VERSION` above 1.0.0, which needs the force-update gate from `CLAUDE.md` Follow-ups first.

### Mapping API_VERSION to MIN_SUPPORTED_IOS_VERSION

Keep this table in step with the constants; a bump in step 3 adds a row.

| `API_VERSION` | Introduced | `MIN_SUPPORTED_IOS_VERSION` when introduced | What changed |
|---|---|---|---|
| 1 | US-273 | 1.0.0 | Baseline: today's shapes, stamped. No shape retired. |

The rule the table encodes: `API_VERSION` N may only drop a shape once every iOS build at or above `MIN_SUPPORTED_IOS_VERSION` decodes version N. If you cannot show that from App Store Connect, the answer is "not yet".

## What bumps API_VERSION and what does not

Bump (step 3 only): removing or renaming a response field, changing its type, changing the status code for the same outcome, or nesting existing top-level keys under `data`.

Do not bump: adding an optional response field, adding an endpoint, loosening an input schema, adding a header. Those are safe in one release under `CLAUDE.md` and need no version at all.

`API_VERSION` never goes up in the same release that first ships a new shape. It marks the release where the old one stopped being sent.

## Client-side use

- iOS can read `X-Min-Supported-Client` and compare its own `CFBundleShortVersionString` against the `ios=` entry. That comparison is the trigger for the planned force-update screen; nothing reads it yet.
- Web can read both headers through `Access-Control-Expose-Headers`; nothing reads them yet.
