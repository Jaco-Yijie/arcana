CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash TEXT NOT NULL,
  username VARCHAR(80) NOT NULL,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled'))
);

CREATE TABLE readings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_session_id VARCHAR(100) NOT NULL,
  deck_id VARCHAR(80) NOT NULL,
  spread_type VARCHAR(80) NOT NULL,
  question TEXT NOT NULL,
  cards JSONB NOT NULL CHECK (jsonb_typeof(cards) = 'array'),
  interpretation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_session_id),
  UNIQUE (id, user_id)
);
CREATE INDEX readings_user_created_idx ON readings (user_id, created_at DESC, id DESC);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  device VARCHAR(512),
  ip INET,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX user_sessions_user_idx ON user_sessions (user_id);

CREATE TABLE feedback (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reading_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '' CHECK (length(comment) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (reading_id, user_id) REFERENCES readings(id, user_id) ON DELETE CASCADE,
  UNIQUE (user_id, reading_id)
);
