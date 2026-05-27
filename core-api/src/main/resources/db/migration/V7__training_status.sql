ALTER TABLE training_examples
    ADD COLUMN IF NOT EXISTS sent_for_training BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE workspaces
    ADD COLUMN IF NOT EXISTS last_retrained_at TIMESTAMP;