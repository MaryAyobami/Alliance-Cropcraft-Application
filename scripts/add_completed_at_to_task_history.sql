-- Add completed_at column to task_history table
ALTER TABLE task_history ADD COLUMN completed_at TIMESTAMP;

-- Backfill completed_at from completion_date if needed
UPDATE task_history SET completed_at = completion_date WHERE completed_at IS NULL;
