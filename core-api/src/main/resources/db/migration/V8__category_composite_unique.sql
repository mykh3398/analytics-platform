ALTER TABLE categories
DROP CONSTRAINT IF EXISTS uq_categories_name;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_categories_workspace_name') THEN
ALTER TABLE categories
    ADD CONSTRAINT uq_categories_workspace_name UNIQUE (workspace_id, name);
END IF;
END;
$$;