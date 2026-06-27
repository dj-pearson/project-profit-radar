-- US-108: Digital signature capture for daily reports and change orders.
--
-- Stores the captured signature as a base64 PNG data URL. Nullable text column
-- with no default — ALTER TABLE ADD COLUMN (nullable) is the "always safe"
-- additive path (see CLAUDE.md > Backward Compatibility); existing rows and
-- older clients are unaffected.

ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS signature text;

ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS signature text;
