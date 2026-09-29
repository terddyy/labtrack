-- Add an operator-managed status for equipment that remains in inventory but
-- must not be offered for borrowing.
-- Forward-only: removing a PostgreSQL enum value is not a safe in-place rollback.
-- Recovery uses the pre-migration schema backup or a new forward migration.
alter type public.asset_status add value if not exists 'stationary' after 'available';
