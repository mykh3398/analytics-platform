ALTER TABLE dashboard_settings
    ADD CONSTRAINT fk_dashboard_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;