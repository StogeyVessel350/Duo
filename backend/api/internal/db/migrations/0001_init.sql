-- 0001_init.sql
-- See docs/phase_3_backend_architecture.md §2 for full data model rationale.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE organizations (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type         TEXT NOT NULL CHECK (type IN ('consumer_self','gym','internal')),
    name         TEXT NOT NULL,
    billing_plan TEXT,
    stripe_customer_id TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ
);

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         CITEXT UNIQUE,
    phone         TEXT,
    password_hash TEXT,
    pii_encrypted BYTEA,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

CREATE TABLE memberships (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role    TEXT NOT NULL CHECK (role IN ('owner','admin','staff','member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, org_id)
);

CREATE TABLE facilities (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id         UUID NOT NULL REFERENCES organizations(id),
    name           TEXT NOT NULL,
    timezone       TEXT NOT NULL DEFAULT 'UTC',
    address        JSONB,
    geo            GEOGRAPHY(POINT),
    floor_plan_url TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON facilities (org_id);

CREATE TABLE machines (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id  UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    external_ref TEXT,
    name         TEXT NOT NULL,
    type         TEXT NOT NULL,
    position_x   NUMERIC,
    position_y   NUMERIC,
    mount_type   TEXT NOT NULL DEFAULT 'none'
                 CHECK (mount_type IN ('none','removable','cradle_unpowered','cradle_powered')),
    mount_serial TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON machines (facility_id);

CREATE TABLE devices (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial              TEXT UNIQUE NOT NULL,
    hw_rev              TEXT,
    mfg_batch           TEXT,
    current_fw_ver      TEXT,
    paired_user_id      UUID REFERENCES users(id),
    assigned_machine_id UUID REFERENCES machines(id),
    class               TEXT NOT NULL DEFAULT 'consumer'
                        CHECK (class IN ('consumer','b2b_fixed')),
    last_seen_at        TIMESTAMPTZ,
    battery_pct         SMALLINT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT one_owner CHECK (
        (paired_user_id IS NOT NULL AND assigned_machine_id IS NULL)
        OR (paired_user_id IS NULL AND assigned_machine_id IS NOT NULL)
        OR (paired_user_id IS NULL AND assigned_machine_id IS NULL)
    )
);

-- More tables to follow in subsequent migrations:
--   exercises, workouts, sets, reps, workout_telemetry_refs,
--   occupancy_events (Timescale hypertable), queue_entries,
--   firmware_images, releases, device_fw_assignments
