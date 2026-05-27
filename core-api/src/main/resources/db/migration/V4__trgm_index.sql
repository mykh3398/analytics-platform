CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_messages_text_trgm
    ON unified_messages USING gin(text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_messages_workspace_received
    ON unified_messages(workspace_id, received_at DESC);