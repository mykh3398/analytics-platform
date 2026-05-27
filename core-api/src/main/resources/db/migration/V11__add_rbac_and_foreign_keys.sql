DELETE FROM categories WHERE workspace_id NOT IN (SELECT id FROM workspaces);
DELETE FROM channels WHERE workspace_id NOT IN (SELECT id FROM workspaces);
DELETE FROM unified_messages WHERE workspace_id NOT IN (SELECT id FROM workspaces);
DELETE FROM classifications WHERE workspace_id NOT IN (SELECT id FROM workspaces);
DELETE FROM training_examples WHERE workspace_id NOT IN (SELECT id FROM workspaces);

ALTER TABLE categories
    ADD CONSTRAINT fk_categories_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE channels
    ADD CONSTRAINT fk_channels_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE unified_messages
    ADD CONSTRAINT fk_messages_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE classifications
    ADD CONSTRAINT fk_classifications_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE training_examples
    ADD CONSTRAINT fk_training_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;


CREATE TABLE workspace_members (
   user_id BIGINT NOT NULL,
   workspace_id BIGINT NOT NULL,
   role VARCHAR(20) NOT NULL,
   joined_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

   PRIMARY KEY (user_id, workspace_id),
   CONSTRAINT fk_wm_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
   CONSTRAINT fk_wm_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
);


INSERT INTO workspace_members (user_id, workspace_id, role)
SELECT owner_id, id, 'OWNER'
FROM workspaces
WHERE owner_id IS NOT NULL;