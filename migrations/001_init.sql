CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('doctor', 'patient');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS users (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(120)    NOT NULL,
  email           VARCHAR(255)    NOT NULL,
  password_hash   VARCHAR(255)    NOT NULL,
  role            user_role       NOT NULL,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_lower_unique UNIQUE (email)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx
  ON users (LOWER(email));

CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

CREATE TABLE IF NOT EXISTS sessions (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- SHA-256 hex digest of the raw token. 64 hex chars; CHAR(64) is appropriate.
  token_hash      CHAR(64)        NOT NULL,

  expires_at      TIMESTAMPTZ     NOT NULL,
  is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT sessions_token_hash_unique UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slot_status') THEN
    CREATE TYPE slot_status AS ENUM ('available', 'booked', 'cancelled');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE appointment_status AS ENUM ('booked', 'cancelled', 'completed');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS availability_slots (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time      TIMESTAMPTZ     NOT NULL,
  end_time        TIMESTAMPTZ     NOT NULL,
  status          slot_status     NOT NULL DEFAULT 'available',
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT slot_duration_30min
    CHECK (end_time - start_time = INTERVAL '30 minutes'),

  CONSTRAINT slot_end_after_start
    CHECK (end_time > start_time),

  CONSTRAINT slot_no_overlap EXCLUDE USING gist (
    doctor_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  ) WHERE (status <> 'cancelled')
);

CREATE INDEX IF NOT EXISTS slots_doctor_start_idx
  ON availability_slots (doctor_id, start_time);

CREATE INDEX IF NOT EXISTS slots_status_start_idx
  ON availability_slots (status, start_time)
  WHERE status = 'available';

CREATE TABLE IF NOT EXISTS appointments (
  id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id       UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot_id         UUID                NOT NULL REFERENCES availability_slots(id) ON DELETE RESTRICT,
  status          appointment_status  NOT NULL DEFAULT 'booked',
  created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS appointments_active_per_slot_idx
  ON appointments (slot_id)
  WHERE status = 'booked';

CREATE INDEX IF NOT EXISTS appointments_patient_idx
  ON appointments (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS appointments_doctor_idx
  ON appointments (doctor_id, created_at DESC);