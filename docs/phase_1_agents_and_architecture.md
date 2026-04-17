# Phase 1 — Agent Breakdown & System Architecture

**Project codename:** `DUO` (two-half, magnetic yin-yang device) — working name, replace when marketing lands.
**Status:** Pre-MVP. ESP32-C3 + BNO085 prototype exists. No firmware, backend, or app yet.
**Phase output:** Organization model + end-to-end architecture. No implementation in this phase.

---

## 1. Agent Breakdown

Ten agents. Single-responsibility. No agent writes code outside its lane; the CEO agent is the only one that brokers cross-lane decisions.

### 1.1 CEO / Orchestrator
**Owns:** phase gating, scope control, priority conflicts, requirement traceability, external interfaces between agents.
**Does not own:** any implementation artifact. The CEO never writes firmware, schemas, or UI.
**Key artifacts:** phase sign-off memos, decision log, risk register, dependency graph.
**Escalation trigger:** any time two agents disagree on an interface (e.g., Firmware wants 50 Hz telemetry, Backend wants 10 Hz), the CEO resolves with a written decision.

### 1.2 Hardware Engineer
**Owns:** schematic, PCB layout, BOM, component sourcing, mechanical integration with enclosure, EMC/RF considerations around the BLE antenna, pogo-pin dock mechanical and electrical design.
**Does not own:** firmware, cloud, enclosure industrial design (that's UX/ID, a sub-role under UX/UI for this project).
**Key artifacts:** BOM (MVP + production), schematic PDF, PCB gerbers, DFM report, cost model at 1/100/1k/10k units, failure-mode table.
**Hard rule:** no component enters the BOM without a datasheet link, second-source candidate, and a lifecycle status (active / NRND / EOL).

### 1.3 Firmware Engineer
**Owns:** embedded application on the MCU, BLE GATT server, IMU driver, Hall sensor handling, power state machine, OTA update mechanism, pairing/security.
**Does not own:** the BLE GATT *contract* in isolation — that's co-owned with Mobile Engineer and frozen by the CEO.
**Key artifacts:** firmware source tree, BLE service/characteristic spec, power budget spreadsheet, boot/runtime state diagram, OTA protocol doc.
**Hard rule:** every non-trivial code path has a power cost annotation (µA × time).

### 1.4 Mobile Engineer
**Owns:** iOS and Android consumer apps, BLE client, local data store, on-device inference runtime, deep links, push notification handling, the check-in UX on the phone side.
**Does not own:** backend APIs (consumes them), ML model training (consumes exported models).
**Key artifacts:** app source, BLE client library, offline sync design, release checklist.

### 1.5 Backend Architect
**Owns:** service topology, API contracts (REST + WebSocket), data models, auth, multi-tenancy (consumer vs. gym operator), observability, SLOs, infra-as-code.
**Does not own:** ML model serving internals (consumes a model-server API from AI/ML), analytics warehouse modeling (co-owned with Data).
**Key artifacts:** OpenAPI specs, ERD, service mesh topology, runbook, capacity model.

### 1.6 AI/ML Engineer
**Owns:** rep detection, form classification, anomaly/injury-risk detection, recommendation engine, on-device vs. cloud inference split, model training pipeline, evaluation datasets.
**Does not own:** raw telemetry ingest (that's Backend), app UX for feedback (that's Mobile + UX).
**Key artifacts:** model cards, training data spec, evaluation report, inference API.
**Hard rule:** every production model ships with a data sheet, a baseline comparison, and a fallback behavior for low-confidence outputs.

### 1.7 Web Engineer
**Owns:** marketing site, e-commerce checkout, account self-serve, gym operator dashboard (web), admin console, SEO, web analytics instrumentation.
**Does not own:** payment provider selection (co-owned with Backend and CEO), design system (UX/UI).
**Key artifacts:** Next.js app, checkout flows, gym dashboard, admin console.

### 1.8 UX/UI Designer
**Owns:** design system (tokens, components, typography), all user flows (consumer onboarding, first-rep, gym owner onboarding, staff dashboard), hardware industrial design direction, motion/illustration language, accessibility.
**Does not own:** copywriting at scale (flag to marketing when that role is added).
**Key artifacts:** Figma library, flow diagrams, prototype links, ID sketches for the enclosure, accessibility audit.

### 1.9 Data/Analytics Engineer
**Owns:** event schema (analytics, not telemetry), ELT pipelines, warehouse modeling, gym-facing analytics dashboards, internal KPI dashboards, experimentation platform.
**Does not own:** real-time occupancy state (that's a backend service — Data consumes a change stream from it).
**Key artifacts:** event catalog, dbt project, warehouse ERD, dashboard inventory.

### 1.10 QA/Test Engineer
**Owns:** test strategy across hardware, firmware, mobile, backend, and web; HIL (hardware-in-the-loop) rigs; regression suites; release gates; bug triage process.
**Does not own:** writing the feature — only the tests and the gates.
**Key artifacts:** test plan per phase, HIL rig spec, automation suite, release checklist, defect taxonomy.

---

## 2. System Architecture (End-to-End)

### 2.1 Context Diagram

```
                    ┌──────────────────────────────────┐
                    │        Gym Facility              │
                    │                                  │
   ┌───────┐  BLE   │   ┌────────┐     ┌────────────┐  │
   │ DUO A │◀──────▶│   │ Member │◀───▶│ Staff iPad │  │
   │ DUO B │        │   │  Phone │     │ (dashboard)│  │
   └───────┘        │   └───┬────┘     └─────┬──────┘  │
       ▲            │       │                │         │
       │ pogo pin   │       │ LTE/Wi-Fi      │ Wi-Fi   │
       ▼            │       ▼                ▼         │
   ┌───────┐        └───────┼────────────────┼─────────┘
   │ Dock  │                │                │
   └───────┘                ▼                ▼
                    ┌──────────────────────────────────┐
                    │         DUO Cloud (AWS)          │
                    │                                  │
                    │  Edge API Gateway ── WebSocket   │
                    │      │                           │
                    │      ├── Identity                │
                    │      ├── Device Mgmt             │
                    │      ├── Telemetry Ingest        │
                    │      ├── Workout                 │
                    │      ├── Occupancy & Queue       │
                    │      ├── Facility                │
                    │      ├── AI Inference            │
                    │      ├── Commerce                │
                    │      └── Notifications           │
                    │                                  │
                    │  Postgres │ Timescale │ Redis    │
                    │  S3 (raw) │ Warehouse │ Kafka    │
                    └──────────────────────────────────┘
                                      ▲
                                      │ HTTPS
                                      │
                    ┌─────────────────┴────────────────┐
                    │  Web (Next.js)                   │
                    │   ├─ duo.com (marketing + store) │
                    │   ├─ app.duo.com (gym dashboard) │
                    │   └─ admin.duo.com (internal)    │
                    └──────────────────────────────────┘
```

### 2.2 Hardware Layer (Per Half)

The hardware is reviewed in detail in Phase 2. This section defines only the *interfaces* the rest of the system depends on.

| Interface | Provided by | Consumed by | Contract |
|---|---|---|---|
| BLE GATT | Firmware | Mobile app | Custom service, see §2.3 |
| IMU stream | IMU → Firmware | Firmware only (not exposed raw over BLE) | 6-axis @ configurable 25/50/100 Hz |
| Hall sensor | HW → Firmware | Firmware only | Digital, interrupt on state change |
| Button | HW → Firmware | Firmware only | Short press / long press / double |
| Charge state | Charger IC → Firmware | Firmware → BLE characteristic | `{state, voltage_mV, percent}` |
| Pairing | Firmware | Mobile | LE Secure Connections, out-of-band via button-press challenge |

**Two-half coordination:** The two halves are *not* peer-to-peer over BLE in v1 (battery and complexity cost). Each half is an independent BLE peripheral. The phone acts as the coordinator, subscribing to both and doing time-sync via local timestamps + a phone-side offset estimator. This is a deliberate decision to be revisited in v2 once volume economics justify an nRF module with concurrent central+peripheral.

### 2.3 Firmware Layer (Preview — full design in Phase 2)

Core structure is a tiny RTOS (FreeRTOS, already on ESP32) with four tasks:

1. **Sensor Task** — pulls from IMU at selected ODR, runs lightweight filter, timestamps each sample.
2. **State Task** — power/session state machine: `IDLE → ATTACHED (hall closed) → ACTIVE (motion detected) → LOGGING → IDLE`.
3. **BLE Task** — GATT server, notifies the phone with windowed summaries + events, accepts config writes.
4. **Housekeeping Task** — battery measurement, fault reporting, OTA window.

**BLE GATT sketch (to be finalized with Mobile):**

```
Service: DUO Primary  (UUID: xxxxxxxx-duo0-0000-0000-000000000001)
  Char: DeviceInfo        [R]          → serial, fw_ver, hw_ver
  Char: Telemetry         [N]          → packed frame, ~20 Hz notify
  Char: SessionControl    [W, R]       → start/stop/tare, config
  Char: Events            [N]          → rep_detected, attach, detach
  Char: Battery           [R, N]
  Char: OTA Control       [W]
  Char: OTA Data          [W no rsp]
```

**Telemetry frame (notify, 20 Hz):** 20-byte frame containing a sequence number, window stats (mean/peak acceleration magnitude, rotation rate peaks per axis), and a dirty-bit indicating whether raw samples within the window are available for later retrieval. Raw samples are buffered in flash and pulled by the phone during cooldown or idle — they do not stream continuously.

### 2.4 Mobile App Layer

**Stack:** React Native (single codebase for iOS + Android) with native BLE modules. Rationale deferred to Phase 4, but the constraint is: BLE state management is written natively per platform because RN libraries are not production-grade for our latency targets.

**Key modules:**

- **BLE Manager** — persistent foreground-service connection on Android, background BLE on iOS with state preservation.
- **Local Store** — SQLite (WatermelonDB) for workouts, sets, reps; survives offline.
- **Sync Engine** — push queue to backend, conflict resolution via server-wins with client-last-write timestamp.
- **On-Device Inference** — CoreML (iOS) / TFLite (Android) for real-time rep counting and form cues. Heavier analysis runs server-side.
- **Check-in Module** — handles the tap-to-claim flow: user taps phone on DUO → BLE RSSI/proximity check → `POST /occupancy/claim` with device ID + facility ID.

**Screens (top-level, full flows in Phase 4):** onboarding, home, workout live, workout detail, history, discover (AI recs), gym map (when inside a partner facility), profile, store.

### 2.5 Backend Architecture

**Topology:** Modular monolith at launch, microservices-ready. Each module has its own data ownership and exposes an internal interface; they can be extracted later without rewriting callers.

**Runtime:** Go (for ingest, occupancy, queue — latency-sensitive) + Python (for AI inference, data pipelines). Postgres for transactional data, TimescaleDB for time-series, Redis for real-time state, Kafka for event bus, S3 for blob and raw sensor archive.

**Service/module catalog:**

| Module | Responsibility | Primary store | Sync? |
|---|---|---|---|
| Identity | users, orgs, auth, OAuth | Postgres | sync |
| Device Mgmt | device registry, ownership, firmware versions | Postgres | sync |
| Telemetry Ingest | accept BLE-relayed frames from phones | Timescale + S3 | async |
| Workout | sessions, sets, reps, PRs | Postgres | sync |
| Facility | gyms, floor plans, machine definitions | Postgres | sync |
| Occupancy | who is on which machine right now | Redis (truth) + Postgres (audit) | sync |
| Queue | per-machine waitlist, priority, expiry | Redis + Postgres | sync |
| AI Inference | form classification, anomaly detection, recs | GPU pool | sync (thin) |
| Commerce | orders, subscriptions, invoices | Postgres + Stripe | sync |
| Notifications | push, email, SMS, in-app | — | async |

**Why Redis-as-truth for occupancy:** sub-100ms read/write, TTL-based auto-release on stale sessions, atomic `SET NX` for single-machine-per-user enforcement, pub/sub for the real-time gym map. Postgres holds the audit log (append-only) for analytics and disputes.

**Core data model sketch (condensed ERD):**

```
users ──< memberships >── organizations (gyms)
  │                            │
  │                            ├──< facilities >── machines
  │                            │                      │
  └──< devices >───────────────┼──< device_bindings >─┤
  │                            │
  └──< workouts >── sets >── reps
  │
  └──< occupancy_events (time-series, append-only)
  │
  └──< queue_entries
```

**Critical invariant — single-machine-per-user:**

```
CLAIM:
  acquired = REDIS.SET "occ:{user_id}" {machine_id}
                        NX EX 7200
  IF NOT acquired: return ConflictError(currently_on=<machine>)
  REDIS.SET "mach:{machine_id}" {user_id} EX 7200
  PUBLISH "facility:{facility_id}" occupancy_changed
  APPEND occupancy_events (user_id, machine_id, "claim", ts)

RELEASE:
  REDIS.DEL "occ:{user_id}"
  REDIS.DEL "mach:{machine_id}"
  PUBLISH "facility:{facility_id}" occupancy_changed
  APPEND occupancy_events (user_id, machine_id, "release", ts)
  QUEUE.promote_next(machine_id)
```

Two Redis keys must stay consistent. Either both exist or neither does. We use a Lua script to make claim/release atomic.

**API surface (preview — full OpenAPI in Phase 3):**

```
POST   /v1/auth/login
POST   /v1/devices/pair
POST   /v1/workouts                        create session
POST   /v1/workouts/{id}/sets
POST   /v1/workouts/{id}/telemetry         batch frames
POST   /v1/occupancy/claim                 { device_id, machine_id }
POST   /v1/occupancy/release
GET    /v1/facilities/{id}/map             floor plan + live state
WS     /v1/facilities/{id}/stream          occupancy_changed, queue_changed
POST   /v1/queue/{machine_id}/join
DELETE /v1/queue/{machine_id}/leave
GET    /v1/recommendations/next_workout
POST   /v1/ai/form/analyze                 workout_id → form report
```

### 2.6 AI/ML Layer

**Four distinct systems, each with its own cadence and deployment:**

1. **Rep detection** — on-device, real-time. Peak-finding on acceleration magnitude with a learned threshold per exercise class. Falls back to classical signal processing when confidence is low.
2. **Form classification** — hybrid. Light on-device classifier gives instant cues ("too fast on eccentric"). Heavy server-side CNN/LSTM runs post-set for detailed form scoring.
3. **Anomaly / injury-risk detection** — server-side. Sequence autoencoder over rep-level features; flags outliers for coach alerts.
4. **Recommendations** — server-side. Hybrid: collaborative filtering (users like you also did X) + rule-based progressions (linear progression on prior lifts) + gym-specific constraints (what's available / not queued).

**Training data pipeline (Phase 5 detail):** raw IMU frames → S3 → labeled via coach annotation tool → feature store → training → model registry → canary → production. Every model has a model card with training data provenance, offline metrics, and expected latency budget.

**Latency budgets (targets):**
- On-device rep detection: <50 ms from sample to UI.
- Server-side form analysis: <5 s from set-end to report.
- Recommendations: <300 ms for the list endpoint.

### 2.7 Business Platform (Gym Dashboard)

This is the feature that makes the product defensible. It is not a "web view of the app."

**Key screens:**

- **Live Floor** — real-time map with per-machine state (free / in-use / queued / flagged), traffic heatmap overlay, peak-hour forecast strip.
- **Queue Manager** — who is waiting, where, for how long; ability for staff to resolve disputes.
- **Alerts Feed** — coaching opportunities (user repeatedly flagged for poor form), equipment misuse (acceleration profile suggests dropped weight), maintenance (usage hours since last service).
- **Member Insights** — retention cohorts, check-in frequency, at-risk members.
- **Facility Analytics** — utilization by machine and hour, bottlenecks, ROI per machine.

**Real-time backbone:** the dashboard subscribes to a per-facility WebSocket channel. The Occupancy module publishes `occupancy_changed` and `queue_changed` events to Redis pub/sub; a lightweight fan-out service pushes them to connected dashboard clients. One-way only — the dashboard writes through the REST API, not the socket.

**Alerts engine:** stream processor (Kafka Streams or Flink, decided in Phase 3) over telemetry frames. Rules are declarative and stored in Postgres so gym operators can tune thresholds without a deploy. Example rule:

```
WHEN rep.eccentric_velocity_cv > 0.4
 AND exercise IN ('squat','deadlift')
 AND load_kg > bodyweight * 1.2
THEN emit CoachingAlert(user, machine, severity='medium')
```

### 2.8 Website & E-Commerce

**Single Next.js monorepo, three deployments:**

- `duo.com` — marketing, blog, store (SSR for SEO, ISR for product pages)
- `app.duo.com` — authenticated gym dashboard (CSR, no SEO needed)
- `admin.duo.com` — internal operations

**Commerce stack:** Stripe for payments and subscriptions, Shippo or EasyPost for fulfillment, Klaviyo for lifecycle email. Orders land in the Commerce module, which owns its own tables and reconciles with Stripe webhooks.

**Business onboarding flow:** lead form → sales-assisted qualification → contract → facility setup wizard (floor plan upload or draw-it-yourself tool, machine catalog, device assignment) → staff invitations → go-live checklist. This is a multi-day process, not a self-serve signup, at least until the product has proven itself with the first ~10 accounts.

### 2.9 Observability, Security, and Ops (Cross-Cutting)

**Observability:** OpenTelemetry across services, Grafana + Tempo + Loki. Every request gets a trace ID that propagates from phone through backend to AI inference. Firmware does not participate in distributed tracing but emits structured logs over BLE in dev builds.

**Security posture:**
- Device-to-cloud: phone is the trust boundary. Devices authenticate to the phone via LE Secure Connections; the phone authenticates to the cloud via OAuth2 + refresh tokens.
- Data at rest: all PII encrypted at column level where sensitive (health metrics), TLS everywhere in transit.
- Multi-tenancy: hard row-level tenancy on `organization_id`; middleware enforces on every query. A gym operator cannot, by construction, read another gym's data.
- Firmware OTA: signed images, rollback slot, refuses to boot on signature failure.

**Ops:** AWS, Terraform for infra, ArgoCD for services, GitHub Actions for CI. Single region (us-east-1) at launch; multi-region deferred until a gym partner demands it.

---

## 3. Cross-Phase Dependency Graph

```
                   ┌──── Phase 2: HW review + Firmware
                   │
 Phase 1  ─────────┼──── Phase 3: Backend (needs BLE contract from P2)
 (this    │        │
  doc)    │        └──── (in parallel once BLE contract is frozen)
          │
          ├──── Phase 4: Mobile (needs P2 BLE + P3 APIs)
          ├──── Phase 5: AI (needs P3 ingest + labeled data)
          ├──── Phase 6: Web (needs P3 APIs; commerce can start earlier)
          └──── Phase 7: Integration + test (pulls all threads)
```

Two critical path items for Phase 2:
1. **Hardware cost/size review** must complete before firmware commits to a peripheral set.
2. **BLE GATT contract** must be frozen *jointly* by Firmware + Mobile before either team goes deep.

---

## 4. Key Decisions Made in Phase 1 (Require Your Sign-Off)

1. **No peer-to-peer between halves in v1.** Phone acts as coordinator. Saves power and complexity. Revisit at v2.
2. **Raw IMU stays on device; only summaries + events stream over BLE.** Raw frames are pulled on demand for deep analysis.
3. **Modular monolith, not microservices, at launch.** Each module has clean boundaries and can be extracted later. Ships faster.
4. **Redis as source of truth for live occupancy, Postgres as audit log.** Latency over durability for the live state; durability over latency for the record.
5. **React Native for mobile with native BLE.** Single team, two platforms, but BLE code is per-platform native.
6. **AWS, single region, us-east-1 at launch.** No multi-cloud, no multi-region, until a customer pays to demand it.
7. **Business onboarding is sales-assisted.** No self-serve gym signup in v1.
8. **Separate web deployments (`duo.com`, `app.duo.com`, `admin.duo.com`)** from a single Next.js codebase.

---

## 5. Open Questions Before Phase 2

These aren't blocking Phase 2 firmware directly, but they shape it:

- **Target unit cost at 10k/year volume?** This drives whether we keep BNO085 (expensive but does fusion onboard) or switch to a raw IMU + MCU-side fusion.
- **Do we need simultaneous concurrent connections to both halves on iOS?** iOS allows it, but connection interval aggregates and affects power.
- **Is the dock a stand-alone SKU or always bundled?** Affects enclosure tooling cost.
- **What's the warranty period?** Drives component derating and connector choice (pogo pins have a real cycle limit).
- **Will gym partners accept a phone-tethered check-in, or do some want the device to work standalone (BLE direct to a facility gateway)?** The latter is v2 but changes the BLE architecture materially if it's a hard requirement.
