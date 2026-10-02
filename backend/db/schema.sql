CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'student'
                CHECK (role IN ('student', 'alumni', 'teacher')),
  cohort        TEXT,
  class_name    TEXT,
  current_city  TEXT,
  job           TEXT,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS locations (
  id            SERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  panorama_url  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS location_photos (
  id            SERIAL PRIMARY KEY,
  location_id   INT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('old', 'current')),
  year          INT
);

CREATE TABLE IF NOT EXISTS location_links (
  id               SERIAL PRIMARY KEY,
  from_location_id INT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  to_location_id   INT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  yaw              DOUBLE PRECISION NOT NULL,
  pitch            DOUBLE PRECISION NOT NULL,
  UNIQUE (from_location_id, to_location_id)
);

CREATE TABLE IF NOT EXISTS memories (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id   INT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  year          INT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_images (
  id            SERIAL PRIMARY KEY,
  memory_id     INT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  url           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memory_tags (
  memory_id     INT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (memory_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id            SERIAL PRIMARY KEY,
  memory_id     INT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS location_likes (
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id   INT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, location_id)
);

CREATE TABLE IF NOT EXISTS memory_likes (
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memory_id     INT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, memory_id)
);

CREATE TABLE IF NOT EXISTS checkins (
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id   INT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_memories_location_status ON memories (location_id, status);
CREATE INDEX IF NOT EXISTS idx_memories_year ON memories (year);
CREATE INDEX IF NOT EXISTS idx_users_cohort_class ON users (cohort, class_name);
CREATE INDEX IF NOT EXISTS idx_comments_memory ON comments (memory_id);
