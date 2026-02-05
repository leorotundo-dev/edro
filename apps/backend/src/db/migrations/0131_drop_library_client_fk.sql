-- Drop foreign key on library_items.client_id that references a table
-- the client_id may not always exist in (was created by old migration)
ALTER TABLE library_items DROP CONSTRAINT IF EXISTS library_items_client_id_fkey;
ALTER TABLE library_items DROP CONSTRAINT IF EXISTS library_items_tenant_id_fkey;
