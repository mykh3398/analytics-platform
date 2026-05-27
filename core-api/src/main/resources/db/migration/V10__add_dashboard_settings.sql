CREATE TABLE dashboard_settings (
    workspace_id BIGINT PRIMARY KEY
);

CREATE TABLE pinned_topics (
    workspace_id BIGINT NOT NULL,
    topic VARCHAR(255) NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES dashboard_settings(workspace_id) ON DELETE CASCADE
);