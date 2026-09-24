# Feature flags and kill switches

Brikly ships by branch promotion, so switching off a misbehaving integration used to take a revert, a build and a redeploy. A feature flag turns it off with one SQL statement instead, with no deploy, and the change is in the audit trail. This is for runtime switches only; it is not an experimentation or gradual-rollout system.

## How it fits together

- **Registry (code):** `supabase/functions/_shared/feature-flags.ts`, mirrored for the web app in `src/lib/featureFlags.ts`. A flag exists only if it is registered here. Each entry names its owner, the date it was added, a `removeBy` date, its `default` (answer with no row) and its `onReadError` (answer when the table can't be read), plus a `safeSide` sentence saying why that side is safe. `feature-flags.test.ts` fails if the two files drift or a flag passes its `removeBy` date.
- **Overrides (database):** `public.feature_flags`, created by `supabase/migrations/20260924160000_feature_flags.sql`. Signed-in users can read the global rows and their own company's rows; nobody but the service role can write. Every insert, update and delete writes an `audit_logs` row (`resource_type = 'feature_flag'`, risk `high`).
- **Enforcement:** edge functions call `isFlagEnabled(client, key, companyId)` and return `featureDisabledResponse(key, corsHeaders)` (503, standard envelope, `feature_flag` field) when it is off. The web app reads the same rows through `useFeatureFlag(key)` only to explain and disable the control; the edge function is what refuses.

Resolution for a flag and a company, first match wins:

1. a **global** row (`company_id IS NULL`) with `enabled = false`: off everywhere. This is the kill switch, and no company row overrides it.
2. a row for **that company**.
3. a **global** row with `enabled = true`.
4. the registry `default`.

Web clients cache the answer for a minute, so a flip reaches open browsers within about a minute. Edge functions read it on every request.

## Registered flags

| Key | Gates | Default | On read error | Why that side |
|---|---|---|---|---|
| `quickbooks.sync` | `quickbooks-sync` edge function; Quick Sync / Full Sync in Settings > Integrations | on | on | Customers already depend on sync, and if the flag table can't be read the sync can't write its own rows either, so failing closed would only add an outage. |
| `entitlements.plan_features` | `quickbooks-sync` (needs Professional), API key creation in `api-management` (needs Enterprise), and the project limit on `api-management` POST /api/projects | off | off | Starter companies sync with QuickBooks today. Off means "not enforced", so a failed read never takes a working integration away. |
| `entitlements.trial_expiry` | Read-only mode for an expired trial or a suspended company: `projects` create/update, `invite-team-member`, `quickbooks-sync`, `api-management` project writes, and uploads (storage.objects insert policy) | off | off | Read-only stops a company working. Only the owner deciding to enforce it should switch it on, never a failed read. |
| `entitlements.storage_quota` | Uploads once a company has used its plan's storage (storage.objects insert policy, via `storage_upload_allowed`) | off | off | Nobody has been held to a storage limit before, so companies may already be over. |

A new money path (a billing flow nobody relies on yet) should normally be registered with `default: false, onReadError: false`: it stays dark until switched on, and a failed read keeps it dark.

## Entitlement enforcement (US-335)

The three `entitlements.*` flags are the other way round from `quickbooks.sync`: **on means enforced**. Each one refuses something a customer can do today, so each ships dark and the owner turns it on after looking at who it would affect. The server returns the refusal as a 403 in the standard envelope with a `code` (`feature_not_in_plan`, `account_read_only`, `plan_limit_reached`, `storage_quota_exceeded`) and an `entitlement` object naming the plan and the upgrade path; uploads refused by the storage policy come back as the usual storage RLS error.

Always on, not flagged (these existed before or refuse nothing a real client does): the project limit in the `projects` function and the seat limit in `invite-team-member` (US-199; client_portal invitees no longer need a free seat); a user token can no longer change `companies.subscription_status`, `trial_end_date` or `stripe_subscription_id` (nothing shipped writes them); `process-dunning` and `failed-payment-recovery` now set the company to `suspended` after the last failed retry, like `stripe-webhook` does on cancel; `trial-management` now moves an unconverted trial from `grace_period` to `suspended` (it only ever looked at `trial` rows, so that step never ran).

Owner steps, in this order:

1. Apply `supabase/migrations/20260924170000_entitlement_enforcement.sql`, then `npm run db:types`.
2. Resolve the Professional project limit first: the marketing copy in `SubscriptionChange.tsx` and `TrialConversion.tsx` says 25, the enforced limit in `supabase/functions/_shared/tiers.ts` is 50.
3. See who each flag would affect before turning it on:

```sql
-- entitlements.plan_features: Starter/Professional companies using QuickBooks sync or holding API keys.
SELECT c.id, c.name, c.subscription_tier FROM public.companies c
WHERE c.subscription_tier = 'starter' AND EXISTS (SELECT 1 FROM public.quickbooks_integrations q WHERE q.company_id = c.id AND q.is_connected);
SELECT c.id, c.name, c.subscription_tier FROM public.companies c
WHERE c.subscription_tier <> 'enterprise' AND EXISTS (SELECT 1 FROM public.api_keys k WHERE k.company_id = c.id AND k.is_active);

-- entitlements.trial_expiry: companies that would go read-only today.
SELECT c.id, c.name, c.subscription_status, c.trial_end_date FROM public.companies c
WHERE c.subscription_status = 'suspended'
   OR (c.subscription_status = 'trial' AND c.stripe_subscription_id IS NULL
       AND c.trial_end_date < now() - interval '7 days');

-- entitlements.storage_quota: usage against plan, largest first.
SELECT c.id, c.name, c.subscription_tier,
       round(public.company_storage_used_bytes(c.id) / 1073741824.0, 2) AS used_gb,
       public.tier_storage_limit_gb(c.subscription_tier::text) AS limit_gb
FROM public.companies c ORDER BY 4 DESC LIMIT 50;
```

4. Exempt anyone you have decided to grandfather with a company row (`enabled = false`), then turn the flag on globally with the INSERT below (`enabled = true`). Or go the other way: turn it on for one company first, watch, then globally.
5. Before turning on `entitlements.storage_quota` for a large install, consider an index on `storage.objects (owner)`; the usage sum runs on every upload while the flag is on.

## Flipping a flag

Run these in the Supabase dashboard SQL editor for the production project. The editor runs as a privileged role, which the table requires; the web app cannot do this. Always fill `reason` (the table rejects a blank one) and `changed_by`.

Kill a feature for every company:

```sql
INSERT INTO public.feature_flags (flag_key, company_id, enabled, reason, changed_by)
VALUES ('quickbooks.sync', NULL, false, 'Duplicate expenses on import, see incident 2026-10-01', 'you@brikly.net')
ON CONFLICT (flag_key) WHERE company_id IS NULL
DO UPDATE SET enabled = EXCLUDED.enabled, reason = EXCLUDED.reason, changed_by = EXCLUDED.changed_by;
```

Turn it back on: run the same statement with `true` and a new reason, or delete the global row to fall back to the default.

```sql
DELETE FROM public.feature_flags WHERE flag_key = 'quickbooks.sync' AND company_id IS NULL;
```

Switch it off (or on) for one company:

```sql
INSERT INTO public.feature_flags (flag_key, company_id, enabled, reason, changed_by)
VALUES ('quickbooks.sync', '<company uuid>', false, 'Their realm returns malformed Purchase rows', 'you@brikly.net')
ON CONFLICT (flag_key, company_id) WHERE company_id IS NOT NULL
DO UPDATE SET enabled = EXCLUDED.enabled, reason = EXCLUDED.reason, changed_by = EXCLUDED.changed_by;
```

See what is set and who changed it:

```sql
SELECT flag_key, company_id, enabled, reason, changed_by, updated_at FROM public.feature_flags ORDER BY flag_key, company_id NULLS FIRST;

SELECT created_at, action_type, resource_name, description, old_values, new_values
FROM public.audit_logs WHERE resource_type = 'feature_flag' ORDER BY created_at DESC LIMIT 20;
```

## Lifecycle

A flag is a branch in the code, and one nobody removes is a dead branch forever. The rules:

1. **Adding.** Register it in both files in the same PR as the code it gates, with an owner, a `removeBy` date no more than a year out, and a `safeSide` sentence. Add a row to the table above. Gate the edge function (the enforcement); gate the web control only to explain it.
2. **Using.** Flip with the SQL above. Put the reason in `reason`, not in chat.
3. **Retiring.** By `removeBy`, either delete the flag (code in both files, the gate, the row in this doc, then `DELETE FROM public.feature_flags WHERE flag_key = '...'`), or push `removeBy` out in a reviewed PR that says why the switch is still needed. A permanent operational kill switch such as `quickbooks.sync` is allowed to live on, but only by someone renewing it on purpose. The unit test fails once the date passes, so CI makes the decision happen.
4. **Never** reuse a retired key for a different feature: an old row for it would silently apply.

## Before the migration is applied

Until `20260924160000_feature_flags.sql` is applied, every read fails and each flag takes its `onReadError`. For `quickbooks.sync` that is "on", so nothing changes for customers, but the switch can't be flipped either. After applying, regenerate types (`npm run db:types`) and remove `feature_flags` from both baselines in `scripts/check-live-schema-tables.mjs`.
