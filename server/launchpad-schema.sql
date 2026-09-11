ALTER TABLE users ADD COLUMN IF NOT EXISTS can_review_launchpad BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS launchpad_submissions (
 id SERIAL PRIMARY KEY,
 user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
 user_name TEXT NOT NULL, user_email TEXT NOT NULL, user_entity TEXT,
 answers JSONB NOT NULL,
 status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','successful','rejected')),
 submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS launchpad_owner_idx ON launchpad_submissions (user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS launchpad_filter_idx ON launchpad_submissions (status, user_entity, submitted_at DESC);
CREATE TABLE IF NOT EXISTS launchpad_status_history (
 id SERIAL PRIMARY KEY,
 submission_id INTEGER NOT NULL REFERENCES launchpad_submissions(id) ON DELETE CASCADE,
 status TEXT NOT NULL CHECK (status IN ('submitted','under_review','successful','rejected')),
 changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
 changed_by_name TEXT NOT NULL, changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS launchpad_history_idx ON launchpad_status_history (submission_id, id);

ALTER TABLE launchpad_submissions ADD COLUMN IF NOT EXISTS rejection_comment TEXT;
ALTER TABLE launchpad_status_history ADD COLUMN IF NOT EXISTS rejection_comment TEXT;
