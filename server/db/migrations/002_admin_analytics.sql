ALTER TABLE users ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

CREATE INDEX users_created_idx ON users(created_at);
CREATE INDEX readings_created_idx ON readings(created_at);
-- Existing readings_user_created_idx already covers (user_id, created_at).
CREATE INDEX user_sessions_user_login_idx ON user_sessions(user_id, login_time);
-- The composite index also covers lookups on user_id alone.
DROP INDEX user_sessions_user_idx;
CREATE INDEX user_sessions_login_idx ON user_sessions(login_time);
CREATE INDEX feedback_created_idx ON feedback(created_at);
-- Deck/spread rankings filter time first and aggregate all IDs. A time index
-- serves these queries; ID-leading indexes would not narrow the date scan.
