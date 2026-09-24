# Transactional email delivery (US-253)

## Decision: Amazon SES, one sender

Brikly sends all edge-function email through Amazon SES, on the `brikly.net` identity, via `supabase/functions/_shared/ses-email-service.ts`.

Before US-253, two providers shipped. SES (SMTP through denomailer) carried sign-up and password-reset codes, invites, invoices, estimates, usage alerts and the generic `send-email`. Resend carried the other nine: `failed-payment-recovery`, `process-funnel-queue`, `send-booking-confirmation`, `send-notification`, `send-payment-reminder`, `send-renewal-notification`, `send-safety-notification`, `send-support-notification` and `trial-management`. `send-seo-notification` called SendGrid.

SES won for three reasons. It already carried the mail that cannot fail (auth codes, invites, invoices). It sends from the one domain we verify. And five of the Resend senders were using `notifications@resend.dev`, `safety@brikly.dev` or `notifications@brikly.app`, which `brikly.net` SPF and DKIM do not cover, so those were likely landing in spam or bouncing. Every converted sender now sends from a `@brikly.net` address.

`RESEND_API_KEY` and `FROM_EMAIL` are no longer read and can be deleted from the Supabase secrets once this is deployed.

## What a send does

`sendEmail()` keeps its old signature and `{ success, messageId?, error? }` result, so no caller's HTTP response changed shape. The logic lives in `_shared/email-delivery.ts` (pure, tested under vitest in `email-delivery.test.ts`):

1. **Idempotency.** Each send claims a key in `public.email_deliveries` (unique). Callers with a natural occasion pass one built by `emailIdempotencyKey()`: the scheduled payment reminder row, the funnel queue item, subscriber + renewal stage + renewal date, company + trial stage + trial end, booking id, incident id, and the dunning failure + attempt. A rerun finds the key already `sent` and returns the stored messageId without sending. One-off sends get a random key.
2. **Retry.** Up to 3 attempts with exponential backoff and full jitter (0.5s, 1s), honouring `Retry-After` up to 5s. Retried: HTTP 408/429/5xx, SMTP 4xx, dropped connections. Not retried: HTTP 4xx, SMTP 5xx, missing credentials.
3. **Ledger.** The row ends as `sent` (with `provider_message_id`), `failed` (permanent refusal), `dead_letter` (retries exhausted) or `suppressed` (the recipient opted out of a non-transactional category, via `_shared/email-consent.ts`). A `failed` or `dead_letter` key is retried on its next send; a `sending` row older than 15 minutes is taken over.
4. **Alerting.** Every `failed` and `dead_letter` send, and any ledger write that fails, goes to Sentry through `captureException` with the function name, company, template and idempotency key.

The ledger never blocks a send. If the table is missing or a write fails, the email still goes and the gap is reported.

## Transports

| Transport | When | MessageId |
|---|---|---|
| `ses-api` (SES v2 `SendEmail`, SigV4-signed fetch) | `AWS_SES_ACCESS_KEY_ID` and `AWS_SES_SECRET_ACCESS_KEY` set | Yes |
| `ses-smtp` (denomailer, the old path) | Only the `AMAZON_SMTP_*` secrets set | No, denomailer does not return one |

Until the API keys are set, sends are retried and logged but the ledger has no SES MessageId.

## Owner steps

1. **Apply the migration** `supabase/migrations/20260924220000_email_deliveries.sql`, regenerate `src/integrations/supabase/types.ts`, then remove `email_deliveries` from `EDGE_BASELINE` in `scripts/check-live-schema-tables.mjs`.
2. **SES API credentials.** Create an IAM user (or role) allowed only `ses:SendEmail` and `ses:SendRawEmail` on the `brikly.net` identity. Store its keys as the Supabase secrets `AWS_SES_ACCESS_KEY_ID` and `AWS_SES_SECRET_ACCESS_KEY`. Set `AWS_SES_REGION` if the identity is not in the region `AMAZON_SMTP_ENDPOINT` names.
3. **DNS for `brikly.net`.** In SES, confirm the domain identity is verified with Easy DKIM (three CNAMEs). SPF: the root TXT record includes `include:amazonses.com`. Set a custom MAIL FROM domain (for example `mail.brikly.net`, with its MX and SPF records) so SPF aligns for DMARC. Publish DMARC, starting at `v=DMARC1; p=none; rua=mailto:<a mailbox you read>` and tightening once reports are clean. Remove any Resend DKIM and SPF records once Resend is retired.
4. **Bounces and complaints.** Create an SES configuration set with an event destination (SNS topic or EventBridge) for Bounce, Complaint, Delivery and Reject, and set its name as `AWS_SES_CONFIGURATION_SET`. Each event carries the SES MessageId and the `idempotency_key` message tag, both of which are on the `email_deliveries` row. A webhook function to write those events back to the row is follow-up work; until it exists, account-level suppression in SES keeps hard-bounced addresses from being retried.
5. **Production access.** Confirm the SES account is out of the sandbox in the sending region, or every send to an unverified address is refused (`failed`, not retried).
6. **Delete `RESEND_API_KEY` and `FROM_EMAIL`** from the Supabase secrets after deploy.

## Monitoring

What failed in the last day:

```sql
SELECT created_at, source_function, template, status, attempts, last_status_code, last_error
FROM public.email_deliveries
WHERE status IN ('failed', 'dead_letter') AND created_at > now() - interval '1 day'
ORDER BY created_at DESC;
```

Company admins can read their own company's rows through RLS. Platform mail with no company (sign-up and reset codes) is visible to the service role only.

## Not converted

- `send-scheduled-emails` still has a stub sender that logs and reports success; its templates are placeholders. Wiring it to SES would mail placeholder copy to real users, so it needs templates first.
- `workflow-execution`'s `send_email` action is a stub too. Making it real would let any workflow author send Brikly-branded mail to arbitrary addresses; it needs recipient scoping first.
