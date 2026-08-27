-- US-309 / real_time_notifications.
--
-- RealtimeNotificationCenter has a delete button, and useSimpleNotifications
-- now issues a real DELETE for it. real_time_notifications has SELECT, INSERT
-- and UPDATE policies (migration 20250919164232) but no DELETE policy, and RLS
-- denies what no policy permits. Without this the delete would affect zero rows
-- and return no error - the client would report "Notification has been deleted"
-- for a row still sitting in the table, which is the exact shape US-309 exists
-- to remove.
--
-- Additive: a new policy that permits strictly less than the existing SELECT
-- policy already allows (your own notifications, and only your own).

CREATE POLICY "Users can delete their own notifications"
ON public.real_time_notifications
FOR DELETE
USING (auth.uid() = recipient_id);
