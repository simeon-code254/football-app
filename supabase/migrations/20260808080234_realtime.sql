-- Enables Realtime (used by the Messages thread and the notification bell
-- badge on both dashboards) for the two tables that need live updates.

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
