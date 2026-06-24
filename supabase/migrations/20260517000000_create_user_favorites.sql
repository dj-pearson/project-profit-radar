-- US-100: per-user "Favorites" for quick navigation.
-- Personal pins (projects, invoices, documents, contacts, ...) surfaced in the
-- sidebar. Recent items are client-side (localStorage); only favorites are
-- persisted server-side so they follow the user across devices.
--
-- Backward-compat: CREATE TABLE + RLS in a single migration is the
-- "always safe" additive path (see CLAUDE.md > Backward Compatibility).

CREATE TABLE IF NOT EXISTS public.user_favorites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id   uuid,
  entity_type  text NOT NULL,
  entity_id    text NOT NULL,
  entity_label text NOT NULL,
  entity_url   text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user
  ON public.user_favorites (user_id, created_at DESC);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- A favorite is private to the user who created it.
CREATE POLICY "Users can view their own favorites"
  ON public.user_favorites
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own favorites"
  ON public.user_favorites
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own favorites"
  ON public.user_favorites
  FOR DELETE
  USING (user_id = auth.uid());
