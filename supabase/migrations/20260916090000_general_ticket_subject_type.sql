-- New enum values cannot be used in the transaction that adds them, so this runs on its own
-- before 20260916090100_general_ticket_threads.sql.
alter type public.thread_subject_type add value if not exists 'general';
