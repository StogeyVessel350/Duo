# Phase 3 — Backend Architecture, APIs & Database

**Inputs from prior phases:**
- Phase 1 sign-off: modular monolith, AWS us-east-1, Redis-as-truth for occupancy, Postgres audit log.
- Phase 2 sign-off: BLE GATT contract frozen, device firmware will emit hybrid telemetry.
- New decisions from end of Phase 2:
  - Telemetry: events real-time, raw frames batched.
  - Raw retention: forever (S3 Standard → Glacier Deep Archive tiered).
  - OTA: per-gym staged rollouts, tenant-aware from day one.
- Verbal direction: **B2B v2 will use permanent locking cradles on equipment; MVP scope is consumer only**. Data model must accommodate without rewrite.

**Deliverable structure:**
1. Service topology
2. Data model (full ERD)
3. API surface — REST
4. API surface — WebSocket (real-time)
5. Telemetry ingestion pipeline
6. Occupancy & queue service (core B2B differentiator)
7. OTA orchestration service
8. Storage tier strategy
9. Auth, identity, multi-tenancy
10. Observability & SLOs
11. Infrastructure & deployment
12. B2B v2 forward considerations
13. Decisions requiring sign-off
14. Open items before Phase 4

---

## 1. Service Topology

Modular monolith at launch — single deployable, clean module boundaries. Two processes are pulled out from day one because they have different scaling and latency profiles:

```
                        ┌─────────────────────────────┐
     Clients ──TLS──────▶ CloudFront + AWS WAF        │
    (phones,             └──────────┬──────────────────┘
   browsers,                        │
   webhooks)                        ▼
                        ┌─────────────────────────────┐
                        │   ALB / API Gateway         │
                        └─────┬────────┬───────┬──────┘
                              │        │       │
                              ▼        ▼       ▼
                  ┌────────────┐ ┌──────────┐ ┌─────────────┐
                  │  API       │ │  WS      │ │  Ingest     │
                  │ (monolith) │ │  Service │ │  Service    │
                  │   Go       │ │   Go     │ │    Go       │
                  └─────┬──────┘ └────┬─────┘ └──────┬──────┘
                        │             │               │
              ┌─────────┼─────────────┼───────────────┤
              ▼         ▼             ▼               ▼
      ┌─────────┐  ┌─────────┐   ┌─────────┐   ┌────────────┐
      │Postgres │  │ Redis   │   │ Kafka   │   │   S3       │
      │(primary)│  │(pub/sub │   │(event   │   │ Standard + │
      │         │  │ + state)│   │ bus)    │   │ Glacier    │
      └────┬────┘  └─────────┘   └────┬────┘   └────────────┘
           │                          │
           ▼                          ▼
      ┌─────────┐               ┌─────────────┐
      │TimescDB │               │ Stream      │
      │(time-   │               │ Processor   │
      │ series) │               │ (Flink)     │
      └─────────┘               └──────┬──────┘
                                       │
                                       ▼
                                ┌──────────────┐
                                │ AI Inference │
                                │  (Python,    │
                                │   gRPC)      │
                                └──────────────┘

                   Async workers (SQS): OTA orchestration,
                   notifications, commerce webhooks, ELT jobs
```

**Three processes, not one:**

| Process | Why separate | Scaling profile |
|---|---|---|
| **API (monolith)** | Most business logic; boring Go HTTP service | CPU-bound, horizontal scale by pod count |
| **WS Service** | Long-lived connections (minutes to hours), sticky to Redis pub/sub | Memory + connection-count bound; different autoscaler |
| **Ingest Service** | Bursty, write-heavy, back-pressure critical | Network + write IOPS bound; separate circuit breakers |

**AI inference** runs as a Python service called via gRPC from the API monolith. Separate because: different runtime, different deploy cadence, GPU nodes on demand only.

**Background workers** consume SQS queues for async jobs: OTA orchestration ticks, email sending, Stripe webhook processing, ELT triggers. Plain Go workers, horizontally scaled.

### 1.1 Language & Runtime Choices

- **Go** for API, WS, Ingest, workers. Rationale: concurrency model matches workload, low memory footprint, static binary deploys, good BLE/TCP tooling. Team-portable from mobile background.
- **Python** for AI inference and data pipelines. Rationale: ecosystem. Nothing controversial.
- **TypeScript** for web (Next.js) — Phase 6.

Do not let Python creep into the API hot path. That's a frequent failure mode in early startups and it's avoidable by drawing the line here.

---

## 2. Data Model (Full ERD)

Postgres is the source of truth for all transactional data. Timescale holds time-series. Redis holds ephemeral live state. S3 holds blobs (raw IMU archives, firmware images, floor plans).

### 2.1 Tenancy Model

Everything hangs off **`organizations`**. A consumer user is a member of a synthetic "self" organization auto-created on signup. A gym is a regular organization. This means consumer and B2B share one tenancy mechanism — no fork in the codebase.

```
organizations
├── memberships ──────> users
├── facilities
│   ├── floor_plans
│   ├── machines ──────> device_bindings ──> devices
│   │                                            │
│   │                                            ├── device_fw_assignments
│   │                                            ├── device_telemetry_windows
│   │                                            └── occupancy_events (FK machine_id)
│   └── staff_memberships
├── subscriptions ──────> stripe_subscriptions
└── releases (OTA cohorts scoped to this org)

users
├── sessions
├── workouts
│   ├── sets
│   │   └── reps
│   └── workout_telemetry_refs (to S3)
├── personal_records
├── device_pairings ──────> devices
└── occupancy_claims (current, 0 or 1)

devices
├── device_events (pair, unpair, OTA, fault)
└── current assignment to user OR machine (never both, enforced by CHECK)

firmware_images
└── releases
    └── release_rings (which cohorts/orgs/devices get this release)
```

### 2.2 Core Table Definitions

Abbreviated. Full DDL lives in the migration tree, not this doc.

```sql
CREATE TABLE organizations (
    id           UUID PRIMARY KEY,
    type         TEXT NOT NULL CHECK (type IN ('consumer_self','gym','internal')),
    name         TEXT NOT NULL,
    billing_plan TEXT,
    stripe_customer_id TEXT,
    created_at   TIMESTAMPTZ DEFAULT now(),
    deleted_at   TIMESTAMPTZ
);

CREATE TABLE users (
    id           UUID PRIMARY KEY,
    email        CITEXT UNIQUE,
    phone        TEXT,
    password_hash TEXT,
    pii_encrypted BYTEA, -- AES-256-GCM, key from KMS
    created_at   TIMESTAMPTZ DEFAULT now(),
    deleted_at   TIMESTAMPTZ
);

CREATE TABLE memberships (
    user_id UUID REFERENCES users(id),
    org_id  UUID REFERENCES organizations(id),
    role    TEXT CHECK (role IN ('owner','admin','staff','member')),
    PRIMARY KEY (user_id, org_id)
);

CREATE TABLE facilities (
    id        UUID PRIMARY KEY,
    org_id    UUID REFERENCES organizations(id),
    name      TEXT,
    timezone  TEXT,
    address   JSONB,
    geo       GEOGRAPHY(POINT),
    floor_plan_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE machines (
    id            UUID PRIMARY KEY,
    facility_id   UUID REFERENCES facilities(id),
    external_ref  TEXT,
    name          TEXT,
    type          TEXT,    -- 'squat_rack', 'cable_machine', etc.
    position_x    NUMERIC,
    position_y    NUMERIC,
    -- Forward-looking for B2B v2 cradle mount:
    mount_type    TEXT NOT NULL DEFAULT 'none'
                  CHECK (mount_type IN ('none','removable','cradle_unpowered','cradle_powered')),
    mount_serial  TEXT,    -- cradle hw serial for v2, null for now
    created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON machines (facility_id);

CREATE TABLE devices (
    id              UUID PRIMARY KEY,
    serial          TEXT UNIQUE NOT NULL,
    hw_rev          TEXT,
    mfg_batch       TEXT,
    current_fw_ver  TEXT,
    paired_user_id  UUID REFERENCES users(id),
    assigned_machine_id UUID REFERENCES machines(id),
    class           TEXT NOT NULL DEFAULT 'consumer'
                    CHECK (class IN ('consumer','b2b_fixed')),
    last_seen_at    TIMESTAMPTZ,
    battery_pct     SMALLINT,
    CONSTRAINT one_owner CHECK (
        (paired_user_id IS NOT NULL) <> (assigned_machine_id IS NOT NULL)
        OR (paired_user_id IS NULL AND assigned_machine_id IS NULL)
    )
);

CREATE TABLE workouts (
    id          UUID PRIMARY KEY,
    user_id     UUID REFERENCES users(id),
    facility_id UUID REFERENCES facilities(id), -- NULL = not at a partner gym
    started_at  TIMESTAMPTZ NOT NULL,
    ended_at    TIMESTAMPTZ,
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE exercises (   -- catalog, seeded
    id            UUID PRIMARY KEY,
    slug          TEXT UNIQUE,
    name          TEXT,
    muscle_groups TEXT[],
    category      TEXT,
    equipment     TEXT[]
);

CREATE TABLE sets (
    id             UUID PRIMARY KEY,
    workout_id     UUID REFERENCES workouts(id),
    exercise_id    UUID REFERENCES exercises(id),
    index_in_wo    INT,
    weight_kg      NUMERIC(6,2),
    target_reps    INT,
    actual_reps    INT,
    velocity_avg   NUMERIC(6,3),   -- m/s
    velocity_peak  NUMERIC(6,3),
    form_score     NUMERIC(4,2),   -- 0..100, AI output
    rpe            SMALLINT,
    notes          TEXT,
    created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reps (             -- rep-level summary; kept forever
    id            UUID PRIMARY KEY,
    set_id        UUID REFERENCES sets(id),
    index_in_set  INT,
    peak_g        NUMERIC(5,2),
    concentric_ms INT,
    eccentric_ms  INT,
    form_flags    TEXT[]
);

CREATE TABLE workout_telemetry_refs (   -- pointer into S3, raw lives there
    workout_id    UUID REFERENCES workouts(id),
    set_id        UUID REFERENCES sets(id),
    s3_key        TEXT,
    sample_count  INT,
    format_version SMALLINT,
    compressed    BOOLEAN,
    PRIMARY KEY (set_id)
);

CREATE TABLE occupancy_events (  -- append-only, time-series (Timescale hypertable)
    time          TIMESTAMPTZ NOT NULL,
    user_id       UUID,
    machine_id    UUID,
    facility_id   UUID,
    event_type    TEXT NOT NULL,   -- 'claim','release','timeout','staff_release'
    claim_id      UUID,
    source        TEXT             -- 'tap','auto','staff'
);
SELECT create_hypertable('occupancy_events', 'time');
CREATE INDEX ON occupancy_events (user_id, time DESC);
CREATE INDEX ON occupancy_events (machine_id, time DESC);

CREATE TABLE queue_entries (
    id          UUID PRIMARY KEY,
    machine_id  UUID REFERENCES machines(id),
    user_id     UUID REFERENCES users(id),
    position    INT NOT NULL,
    joined_at   TIMESTAMPTZ DEFAULT now(),
    expires_at  TIMESTAMPTZ,
    status      TEXT CHECK (status IN ('waiting','promoted','expired','left')),
    promoted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX one_active_queue_per_user
    ON queue_entries (user_id)
    WHERE status = 'waiting';

CREATE TABLE firmware_images (
    id            UUID PRIMARY KEY,
    version       TEXT UNIQUE,
    hw_rev_min    TEXT,
    hw_rev_max    TEXT,
    s3_key        TEXT,
    sha256        BYTEA,
    ed25519_sig   BYTEA,
    changelog     TEXT,
    uploaded_by   UUID REFERENCES users(id),
    uploaded_at   TIMESTAMPTZ DEFAULT now(),
    status        TEXT CHECK (status IN ('draft','published','recalled'))
);

CREATE TABLE releases (            -- tenant-aware rollouts
    id               UUID PRIMARY KEY,
    firmware_id      UUID REFERENCES firmware_images(id),
    cohort           TEXT NOT NULL CHECK (cohort IN ('canary','ring1','ring2','stable','org_pinned')),
    org_id           UUID REFERENCES organizations(id), -- NULL = global cohort
    rollout_percent  INT,      -- 0..100, only for non-pinned
    rollout_started  TIMESTAMPTZ,
    rollout_paused   BOOLEAN DEFAULT false,
    status           TEXT CHECK (status IN ('planned','active','paused','complete','rolled_back'))
);

CREATE TABLE device_fw_assignments (
    device_id      UUID REFERENCES devices(id),
    release_id     UUID REFERENCES releases(id),
    assigned_at    TIMESTAMPTZ,
    installed_at   TIMESTAMPTZ,
    install_status TEXT CHECK (install_status IN
                    ('assigned','downloading','verifying','installed','failed','rolled_back')),
    error_code     TEXT,
    PRIMARY KEY (device_id, release_id)
);
```

### 2.3 Row-Level Multi-Tenancy

Every table that contains tenant data has a direct or indirect `organization_id`. Middleware sets `SET LOCAL app.current_org = $1` at the start of each request; Postgres RLS policies filter on it.

```sql
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON workouts
    USING (user_id IN (SELECT user_id FROM memberships
                       WHERE org_id = current_setting('app.current_org')::uuid));
```

RLS is defense-in-depth, not the primary enforcement — application code uses scoped repositories. RLS is the net that catches bugs.

---

## 3. API Surface — REST

OpenAPI 3.1. Versioned at `/v1/`. Representative endpoints below; full spec lives in the repo.

### 3.1 Conventions

- Auth: `Authorization: Bearer <jwt>`. JWT contains `user_id`, `active_org_id`, `roles`.
- Errors: RFC 7807 Problem Details. Every error has a stable `type` URI.
- Idempotency: POST endpoints accept `Idempotency-Key` header. Keys retained 24 h.
- Pagination: cursor-based. `?cursor=...&limit=50`. Never offset.
- Rate limits: per-user 100 req/s, per-device 20 req/s. Phone relays device traffic, so device rate-limit is lower.

### 3.2 Identity & Auth

```
POST   /v1/auth/register          { email, password }          → 201 + tokens
POST   /v1/auth/login             { email, password }          → 200 + tokens
POST   /v1/auth/oauth/{provider}  { code }                     → 200 + tokens
POST   /v1/auth/refresh           { refresh_token }            → 200 + tokens
POST   /v1/auth/logout                                         → 204
GET    /v1/me                                                  → User
PATCH  /v1/me                     { name?, phone?, prefs? }    → User
POST   /v1/me/password            { current, new }             → 204
DELETE /v1/me                     { confirm: "DELETE" }        → 202 (GDPR-compliant)
```

### 3.3 Devices

```
POST   /v1/devices/pair
       Request:  { pairing_blob, proof, hw_info }
       Response: { device_id, signing_key }

GET    /v1/devices                                             → [Device]
GET    /v1/devices/{id}                                        → Device
DELETE /v1/devices/{id}                                        → 204   (unpair)

POST   /v1/devices/{id}/firmware/check
       Request:  { current_fw_ver, battery_pct }
       Response: { update_available, release_id, download_url?, sha256?, size? }

POST   /v1/devices/{id}/firmware/report
       Request:  { release_id, state, error_code? }
       Response: 204
```

### 3.4 Workouts

```
POST   /v1/workouts                { facility_id?, exercise_plan? }
                                   Idempotency-Key: <uuid>     → Workout

POST   /v1/workouts/{id}/sets      { exercise_id, weight_kg, target_reps }
                                                               → Set
PATCH  /v1/workouts/{id}/sets/{set_id}  { actual_reps, rpe, notes }
                                                               → Set
POST   /v1/workouts/{id}/end                                   → Workout (finalized)

GET    /v1/workouts                ?from=&to=&limit=           → [Workout]
GET    /v1/workouts/{id}                                       → Workout (with sets/reps)
```

### 3.5 Telemetry

```
POST   /v1/telemetry/events
       Request:  { device_id, batch: [{ ts, type, payload }] }
       Response: { accepted: n }
       Notes:    Real-time path. Events only (reps, attach, detach, faults).

POST   /v1/telemetry/raw
       Request:  multipart/form-data
                 - metadata (json): { device_id, set_id, window: [t0,t1], format }
                 - payload  (bin) : compressed IMU frames
       Response: { s3_key, sample_count }
       Notes:    Batch path. Raw frames, run after set-end on Wi-Fi if possible.
```

### 3.6 Occupancy & Queue (B2B)

```
POST   /v1/occupancy/claim
       Request:  { device_id, machine_id, facility_id }
       Response: 201 { claim_id, machine_id, claimed_at, expires_at }
                 409 { type, currently_on: { machine_id, since } }
                 404 { type, detail } -- device not associated with facility

POST   /v1/occupancy/release
       Request:  { claim_id }
       Response: 204

GET    /v1/occupancy/current                                   → Claim | null

POST   /v1/queue/{machine_id}/join                             → QueueEntry
DELETE /v1/queue/{machine_id}/leave                            → 204
GET    /v1/queue/{machine_id}                                  → { entries, est_wait_s }

GET    /v1/facilities/{id}/map/live                            → LiveMapState
```

### 3.7 Recommendations & AI

```
GET    /v1/recommendations/next_workout
       ?facility_id=&goal=                                     → WorkoutPlan

POST   /v1/ai/form/analyze
       Request:  { set_id }  (server fetches raw via telemetry_refs)
       Response: { status: 'queued', job_id }

GET    /v1/ai/form/analyze/{job_id}                            → FormReport | { status: 'pending' }
```

### 3.8 Gym Operator (B2B)

```
GET    /v1/orgs/{id}/facilities                                → [Facility]
POST   /v1/orgs/{id}/facilities                                → Facility
POST   /v1/facilities/{id}/machines                            → Machine
GET    /v1/facilities/{id}/analytics
       ?metric=utilization&from=&to=&bucket=hour               → TimeSeries
GET    /v1/facilities/{id}/alerts                              → [Alert]
POST   /v1/alerts/{id}/acknowledge                             → 204
GET    /v1/facilities/{id}/devices                             → [Device]
POST   /v1/facilities/{id}/firmware/releases
       Request: { firmware_id, cohort, rollout_percent }       → Release
```

---

## 4. API Surface — WebSocket (Real-Time)

One endpoint. Multiplexed channels. WS service is sticky-less; it subscribes to Redis pub/sub per channel.

```
GET /v1/ws
Protocol: JSON messages

Client → Server:
  { "op": "subscribe",   "channel": "facility:{id}"        }
  { "op": "subscribe",   "channel": "workout:{id}"         }
  { "op": "unsubscribe", "channel": "..." }
  { "op": "ping" }

Server → Client:
  { "op": "event", "channel": "facility:{id}",
    "type": "occupancy_changed",
    "data": { machine_id, state, user_id? } }

  { "op": "event", "channel": "facility:{id}",
    "type": "queue_changed",
    "data": { machine_id, entries } }

  { "op": "event", "channel": "facility:{id}",
    "type": "alert_raised",
    "data": { alert_id, severity, machine_id, user_id, kind } }

  { "op": "event", "channel": "workout:{id}",
    "type": "rep_scored",
    "data": { set_id, rep_index, form_cues } }

  { "op": "pong" }
  { "op": "error", "code": "...", "detail": "..." }
```

**Backpressure:** server-side buffer per connection is 256 messages. Overflow disconnects with code `slow_consumer`. Clients reconnect and re-read state via REST.

---

## 5. Telemetry Ingestion Pipeline

Hybrid model, per Phase 2 decision.

### 5.1 Real-Time Events Path

```
Phone ──POST /v1/telemetry/events──▶ Ingest Service
                                          │
                                          ▼
                                     Validate + auth
                                          │
                                          ▼
                              Kafka topic "device.events"
                                          │
                  ┌───────────────────────┼────────────────────┐
                  ▼                       ▼                    ▼
            Flink stream            Postgres writer       WS fan-out
            (alert rules)           (reps, events)        (Redis pub/sub)
```

- **Latency target: 250 ms** from phone POST to WS notification for "rep_scored" on the gym dashboard.
- Ingest writes to Kafka, returns 202 with offset. Downstream consumers process async.
- Kafka partitioned on `user_id` → ordering per user, parallelism across the fleet.
- Events are validated against a JSON Schema registry. Unknown `type` is rejected, not stored.

### 5.2 Batched Raw Path

```
Phone ──POST /v1/telemetry/raw──▶ Ingest Service
                                        │
                                        ▼
                                   Validate + auth
                                        │
                                        ▼
                              Presigned S3 upload
                              (bucket: raw-telemetry,
                               key: {org}/{user}/{workout}/{set}.bin.zst)
                                        │
                                        ▼
                         Write pointer in workout_telemetry_refs
                                        │
                                        ▼
                      Emit "raw_uploaded" event on Kafka
                                        │
                                        ▼
                      Lifecycle policy:
                        - Standard         (0–30 days)
                        - Intelligent-Tier (30–180 days)
                        - Glacier Deep     (180+ days)
```

- **Compression:** zstd at level 6. Typical ratio on IMU data: 3–4×.
- **Upload strategy:** phone obtains a presigned URL, uploads directly to S3, then calls `/telemetry/raw` to register the pointer. Keeps our ingest servers out of the bulk data path.
- **Deduplication:** `set_id` + `device_id` + `window` hash is the S3 key suffix. Re-uploads are idempotent.

### 5.3 Backpressure & Reliability

- Phone keeps a local queue (WatermelonDB) of unsent events and raw windows. Retries with exponential backoff on 5xx.
- Server returns `429` with `Retry-After` when overloaded; phone honors it.
- Kafka producer acks = `all`. Loss tolerance: **zero** for events, **tolerant of seconds of delay**.

---

## 6. Occupancy & Queue Service

This is the most product-critical service. Gym operators are paying for this to work.

### 6.1 Claim Semantics

Hard rules:

1. A user can have **at most one active claim**. Second claim → 409.
2. A machine can have **at most one active claim**. Second user's attempt → 409 + queue-join suggestion.
3. Claims **auto-release** after an idle timeout (no telemetry received for N seconds).
4. All state changes are **logged to `occupancy_events`** for audit.

### 6.2 Atomic Claim with Redis + Lua

Redis is the truth for *current* state. Postgres is the audit log. The claim operation is a Lua script so both keys (user and machine) update atomically.

```lua
-- claim.lua
-- KEYS[1] = occ:user:{user_id}
-- KEYS[2] = occ:mach:{machine_id}
-- ARGV[1] = claim_id
-- ARGV[2] = user_id
-- ARGV[3] = machine_id
-- ARGV[4] = ttl_seconds

if redis.call('EXISTS', KEYS[1]) == 1 then
  return {'conflict_user', redis.call('HGET', KEYS[1], 'machine_id')}
end
if redis.call('EXISTS', KEYS[2]) == 1 then
  return {'conflict_machine', redis.call('HGET', KEYS[2], 'user_id')}
end

redis.call('HSET',   KEYS[1], 'machine_id', ARGV[3], 'claim_id', ARGV[1])
redis.call('EXPIRE', KEYS[1], ARGV[4])
redis.call('HSET',   KEYS[2], 'user_id',    ARGV[2], 'claim_id', ARGV[1])
redis.call('EXPIRE', KEYS[2], ARGV[4])

redis.call('PUBLISH', 'facility:' .. ARGV[5], ...)
return {'ok', ARGV[1]}
```

After the script returns ok, the Go handler:
1. Writes an `occupancy_events` row with `event_type='claim'` (async, best-effort durable via outbox pattern).
2. Removes the user from any queue entry for that machine.
3. Responds 201 to the phone.

### 6.3 Idle Timeout & Release

Two timeout paths:

- **Hard TTL** in Redis (2 hours default, configurable per facility). If the key expires, a Redis keyspace notification triggers a `staff_release` event.
- **Soft idle timeout** — Flink stream watches `device.events` for `rep_detected` or `motion` events. If none received for 5 minutes (configurable), the stream processor emits a `timeout_release` command which the occupancy service executes.

**Why not rely on the phone to release?** Phones die, get disconnected, users walk off mid-set. The stream processor is the safety net. The phone *attempts* a release on session-end; the timeout catches the rest.

### 6.4 Queue

FIFO per machine, with two escape hatches:

- User leaves the queue explicitly → position shifts others up.
- Queue entry expires if the user is not physically near the machine when promoted (phone GPS + BLE proximity check) — they were "ghost queued."

Promotion flow when a release happens:

```
1. RELEASE event fires
2. LPOP waiting entries for {machine_id} from Redis sorted set
3. Notify next-in-line via push + WS
4. Give them 60 s grace period (their entry is 'promoted')
5. If they claim within 60 s, queue collapses
6. If not, their entry → 'expired', next user up
```

### 6.5 Live Map State

The gym dashboard gets a full snapshot via `GET /v1/facilities/{id}/map/live`, then subscribes to `facility:{id}` on the WS for deltas. The snapshot is read from Redis (not Postgres) so it's always consistent with the live state.

### 6.6 Forward Compatibility with B2B v2 Cradle

Three things about the B2B cradle that affect occupancy design today:

1. **Claim becomes deterministic.** In the cradle model, a device is bound to a specific machine (`devices.assigned_machine_id` is set). The "tap your phone to the device" check-in can skip the machine-disambiguation step because the device *is* the machine. The API handles this by inferring `machine_id` from `device_id` when not provided.

2. **Device identity vs. user identity.** In consumer mode, device is bound to a user. In cradle mode, device is bound to a machine, and the user's identity comes from the phone. The `devices.class` column (`consumer` vs `b2b_fixed`) distinguishes. Claim flow branches on this.

3. **"Tap to check-in" becomes the native interaction.** Phone BLE-connects to the cradled device → server knows (device_id → machine_id) → claim is automatic. No manual machine-picking in the UI. Architected for now; shipped in v2.

The data model already supports this via `machines.mount_type` and `devices.class`. No migration needed to turn on B2B v2.

---

## 7. OTA Orchestration

Tenant-aware from day one, per the Phase 2 sign-off.

### 7.1 Concepts

- **Firmware Image** — an immutable signed binary with a version. Lives in S3.
- **Release** — a plan to roll out a firmware image to a cohort. Can be paused, resumed, rolled back.
- **Cohort** — a set of devices. Built-in cohorts: `canary` (internal QA), `ring1`, `ring2`, `stable`. Custom cohorts: `org_pinned` (a specific gym's fleet).
- **Device FW Assignment** — the per-device record of which release it's being moved to.

### 7.2 The "What Version Should I Run?" Query

When a phone calls `POST /devices/{id}/firmware/check`, the OTA service answers:

```
for device d:
  1. If d is in an org-pinned release → return that release
  2. Else, find the most recent release whose cohort matches d's cohort
     AND the release has rolled out to d (based on rollout_percent)
  3. If d.current_fw_ver >= release.version → no update needed
  4. Else return update available
```

Rollout percent is deterministic by hashing `device_id` into [0, 100); devices whose hash < rollout_percent receive the update. This means a given device is either "in" or "out" of a release — no flapping.

### 7.3 Canary & Rollback Flow

```
Build firmware v1.2.3
      │
      ▼
Sign (Ed25519), upload to S3
      │
      ▼
Create release (cohort=canary, rollout_percent=100, org_id=internal_qa)
      │
      ▼
Internal QA devices update. Health metrics watched:
  - install success rate
  - boot health-check pass rate
  - post-install crash rate
  - battery life deviation
      │
      ▼
After 48 h green → create release (cohort=ring1, rollout_percent=5)
      │
      ▼
Gradually increase rollout_percent: 5 → 25 → 100 (each step 48 h)
      │
      ▼
Promote to cohort=stable, rollout_percent=100
      │
      ▼
If health degrades at any step → pause release, optionally roll back
      (roll back = new release with older firmware version)
```

Per-gym pin: a B2B customer in a regulated setting can say "pin our fleet at v1.2.2". An `org_pinned` release on their org overrides the cohort lookup.

### 7.4 Device-Side State Machine

Firmware side (covered in Phase 2 §6.7):
- Phone pushes `OTAControl: START`, streams chunks
- Device verifies signature, flashes B slot
- Device reboots, bootloader picks B
- App reports health OK within 60 s → B becomes permanent
- No health OK → bootloader reverts to A

Server records `device_fw_assignments.install_status` at each step:
`assigned → downloading → verifying → installed`, or `failed` with error code.

---

## 8. Storage Tier Strategy

| Tier | Store | What lives here | Retention |
|---|---|---|---|
| **Hot / Transactional** | Postgres (RDS Aurora) | Users, orgs, devices, workouts, sets, reps, releases, assignments | Forever |
| **Hot / Time-Series** | TimescaleDB (self-hosted or Timescale Cloud) | `occupancy_events` hypertable, per-rep aggregates | 90 days hot, then compressed chunks |
| **Live / Ephemeral** | Redis (ElastiCache) | Live occupancy, queues, WS pub/sub, rate-limit buckets | TTL-bounded |
| **Blob / Warm** | S3 Standard | Firmware images, floor plans, recent raw telemetry (≤30 days), form-analysis artifacts | Lifecycle-managed |
| **Blob / Cold** | S3 Glacier Deep Archive | Raw telemetry >180 days | Forever |
| **Event Bus** | Kafka (MSK) | `device.events`, `ota.events`, `commerce.events` | 7 days retention |
| **Warehouse** | Redshift or Snowflake | ELT from Postgres CDC + S3 → dim/fact model for analytics | Forever |

### 8.1 Raw Telemetry Storage Math

Per user per day (active): ~10 MB raw, ~2.5 MB compressed (zstd).
At 10k daily-active users: **25 GB/day compressed**.

Monthly cost at 10k DAU:
- S3 Standard (first 30 days): 750 GB × $0.023 = ~$17/mo
- S3 Intelligent-Tier (30–180 days): 3.75 TB × ~$0.015 avg = ~$56/mo
- Glacier Deep Archive (180+ days): accumulating; 10 TB × $0.00099 = ~$10/mo per TB
- **Year-1 storage total: ~$200–400/mo at 10k DAU. Trivial.**

The "keep forever" decision costs ~$3–5k/year at 10k DAU and ~$30–50k/year at 100k DAU. A fraction of the ML model value it preserves.

### 8.2 Postgres Sizing

Transactional data is small. The table with the most rows is `reps`:
- Average user: 10 sets × 10 reps × 3 workouts/week = 300 rows/week
- 10k users × 52 weeks = 156M rows/year
- At ~100 B/row (narrow table, small indexes) = ~16 GB/year

Aurora handles this without breaking a sweat. No sharding needed before 100k+ active users.

---

## 9. Auth, Identity & Multi-Tenancy

### 9.1 Auth

- Password + email, with Argon2id hashing (memory=64 MB, iterations=3, parallelism=4).
- OAuth via Apple, Google, and Stripe-Connect-for-B2B.
- JWT access tokens (15 min), refresh tokens (30 days), rotated on each use.
- Refresh tokens hashed in DB. Revocation is immediate (blacklist or rotate the user's JWT secret).

### 9.2 Device Auth

- On pairing, device generates an Ed25519 keypair. Public key uploaded to server with a proof-of-possession (server challenge signed by device).
- On subsequent API calls (rare — phone usually acts on behalf), device includes a signed nonce.
- Phone authentication dominates in practice: the phone authenticates itself with JWT and vouches for the device via the pairing relation.

### 9.3 Multi-Tenancy Enforcement

Three layers, defense-in-depth:

1. **Application layer.** Repository methods take `org_id` explicitly. Every query is scoped. Code review enforces this.
2. **Postgres RLS.** Session variable `app.current_org` is set per request; policies filter.
3. **Audit log.** Every access to another org's data would be an RLS policy violation and a logged error, paged immediately.

Consumer users have their "self" org. A user can belong to multiple orgs (e.g., both consumer-self and a gym where they work out). The JWT includes `active_org_id`; switching is explicit via `PATCH /v1/me/active_org`.

---

## 10. Observability & SLOs

### 10.1 Stack

- **Tracing:** OpenTelemetry SDK in Go + Python, backends on Tempo (self-hosted) or Jaeger.
- **Metrics:** Prometheus (scraped by VictoriaMetrics for long retention), dashboards in Grafana.
- **Logs:** structured JSON logs, shipped to Loki or OpenSearch.
- **Alerting:** Alertmanager → PagerDuty → on-call rotation.
- **Error tracking:** Sentry (ties into trace ID for fast root-cause).

### 10.2 SLOs

| Service | SLO | Error budget |
|---|---|---|
| API availability | 99.9% monthly | 43 min/month |
| API p95 latency | < 300 ms | budget burn alert at 50% |
| Ingest p99 latency | < 1 s | budget burn alert at 50% |
| WS event delivery | 99.5%, < 500 ms p95 | 3.6 h/month |
| Occupancy claim correctness | 100% | none — any double-claim is a sev-1 |
| OTA install success | > 98% | per-release alert |

### 10.3 Must-Have Dashboards

- **"Gym operator view"** per-facility: active users, live occupancy, alert rate. Shown internally, also embedded in the gym dashboard product.
- **API golden signals**: rate, errors, duration, saturation per route.
- **Fleet view**: device count by firmware version, check-in freshness distribution, battery distribution.
- **Ingest health**: events/sec, Kafka consumer lag, raw upload success rate.

---

## 11. Infrastructure & Deployment

### 11.1 Stack

- **Cloud:** AWS us-east-1.
- **Compute:** EKS (Kubernetes). Nodes on Graviton where possible for cost.
- **IaC:** Terraform for infra, Helm for app deploys, Argo CD for GitOps.
- **CI:** GitHub Actions. Build + unit test on every PR; integration tests on merge; deploy on tag.
- **Secrets:** AWS Secrets Manager, synced to Kubernetes via External Secrets Operator.
- **Postgres:** Aurora Postgres 16, multi-AZ.
- **Redis:** ElastiCache, cluster mode off (we don't need sharding yet), multi-AZ with automatic failover.
- **Kafka:** MSK Serverless (lower ops burden at our scale).
- **CDN:** CloudFront in front of Next.js (Phase 6) and static assets.

### 11.2 Environments

- `dev` — shared developer playground, redeployed on every merge to `main`.
- `staging` — mirrors production, gated by integration test suite.
- `prod` — immutable; deploys via tag + ArgoCD sync.

### 11.3 Data Management

- Backups: Aurora automated backup, 30-day PITR. Daily logical dumps to S3 with 1-year retention.
- Disaster recovery: cross-region S3 replication for critical buckets (firmware images, raw telemetry). RTO: 4 h. RPO: 5 min. Real multi-region failover is out of scope until a B2B customer pays for it (per Phase 1).

---

## 12. B2B v2 Forward Considerations (Captured, Not Built)

From today's scope addition:

- **Permanent locking cradle on equipment.** Mechanical housing that mounts to barbells, cable-machine handles, pin selectors. Opens/locks to allow sensor removal for charging. Staff key/app-controlled unlock.
- **"Incredibly long" battery life.** Two paths:
  - *Powered cradle* — sensor trickle-charges while docked. Battery becomes a buffer, not a lifetime. Cleanest experience, requires cradle wiring.
  - *Unpowered cradle* — sensor runs on internal battery for months. Requires a larger cell (1,500–3,000 mAh), aggressive duty cycling, and probably dropping continuous BLE advertising in favor of proximity-triggered wake.

Design decisions already made to keep v2 unblocked:
- `devices.class` column (`consumer` vs `b2b_fixed`) exists now.
- `machines.mount_type` enum already covers `cradle_powered` and `cradle_unpowered`.
- Claim flow already supports device→machine binding (skips machine disambiguation).
- BLE GATT characteristics are a superset usable by both device classes.
- OTA orchestration is tenant-aware and supports pinning — gym operators can gate B2B-class firmware separately from consumer.

**v2 hardware workstream (not built yet):**
- Cradle PCB with pogo-pin power interface, lock solenoid, anti-tamper switch.
- Possibly a bigger sensor (2–3× battery capacity) in the B2B SKU.
- Secure unlock protocol (staff phone → facility backend → cradle via BLE).

---

## 13. Decisions Requiring Sign-Off

1. **Modular monolith in Go for the main API.** Three processes split out: API, WebSocket, Ingest. Python only for AI inference and data pipelines.
2. **Postgres (Aurora) + TimescaleDB + Redis + S3 + Kafka.** One relational source of truth; time-series for telemetry audit; Redis for live state; S3 for blobs; Kafka for event bus.
3. **Row-level multi-tenancy with RLS as the defense-in-depth net.** Application code is the primary enforcement.
4. **Ingest is a separate service from day one.** Kafka in the middle. Ingest writes, stream processors and Postgres writers read.
5. **Occupancy claim is atomic via a Redis Lua script; audit is async via outbox pattern to Postgres.** Two sources of truth for different purposes.
6. **Soft idle timeout via stream processor as safety net for orphaned claims** — not relying on the phone.
7. **OTA releases are first-class entities, separate from firmware images**, with cohort + percent rollout + per-org pinning.
8. **Raw telemetry uploads go direct from phone to S3 via presigned URL**, not through our API servers.
9. **Data model accommodates B2B v2 cradle mode today** (via `devices.class` and `machines.mount_type`) with no migration required to turn it on.

---

## 14. Open Items Before Phase 4 (Mobile)

These don't block the Phase 3 design but do shape mobile:

- **Push notification provider.** FCM for both platforms (via APNs under the hood for iOS) vs. split native. Recommend FCM.
- **Offline-first scope.** How much should the consumer app function with no connectivity for multi-day gym trips? Worth defining the "completely offline for 7 days" guarantee explicitly.
- **Phone proximity detection for queue anti-ghosting.** BLE RSSI is unreliable at scale. Do we use phone GPS (needs permission, drains battery), UWB (iPhone 11+ and recent Android only), or trust Wi-Fi SSID as a proxy for "inside the gym"?
- **Deep link structure.** Needed early so marketing (email, web) can route users into specific app screens consistently.

---

## Appendix A — Representative OpenAPI Snippet

```yaml
openapi: 3.1.0
info:
  title: DUO API
  version: 1.0.0

paths:
  /v1/occupancy/claim:
    post:
      operationId: claimMachine
      security: [ { bearerAuth: [] } ]
      parameters:
        - in: header
          name: Idempotency-Key
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [device_id, machine_id, facility_id]
              properties:
                device_id:   { type: string, format: uuid }
                machine_id:  { type: string, format: uuid }
                facility_id: { type: string, format: uuid }
      responses:
        '201':
          description: Claim created
          content:
            application/json:
              schema:
                type: object
                properties:
                  claim_id:    { type: string, format: uuid }
                  machine_id:  { type: string, format: uuid }
                  claimed_at:  { type: string, format: date-time }
                  expires_at:  { type: string, format: date-time }
        '409':
          description: Conflict
          content:
            application/problem+json:
              schema:
                type: object
                properties:
                  type:   { type: string, format: uri }
                  title:  { type: string }
                  detail: { type: string }
                  currently_on:
                    type: object
                    properties:
                      machine_id: { type: string, format: uuid }
                      since:      { type: string, format: date-time }

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```
