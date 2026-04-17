# Phase 4 — Consumer Mobile App

**Inputs from prior phases:**
- Phase 1: React Native with native BLE modules, WatermelonDB for local store, on-device inference via CoreML/TFLite.
- Phase 2: BLE GATT contract frozen (see Phase 2 §7); device emits 20 Hz telemetry summaries + async events.
- Phase 3: Hybrid telemetry (events real-time → API, raw → phone → S3 direct), WebSocket for live gym state, JWT auth.
- Scope: consumer app only. Gym operator dashboard is Phase 6 (web). B2B mobile app (for gym staff) is out of scope for MVP.

**Deliverable structure:**
1. Tech stack & rationale
2. App architecture (layers & modules)
3. Screen inventory & top user flows
4. BLE client module
5. Local data store & sync engine
6. Telemetry collection & upload
7. On-device inference
8. Real-time workout UX
9. Gym mode (when at a partner facility)
10. Notifications
11. Offline behavior
12. Deep links & app links
13. Release process
14. Decisions requiring sign-off
15. Open items before Phase 5

---

## 1. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **React Native 0.74+ with New Architecture (Fabric + TurboModules)** | Single codebase, two platforms, team portability. New Architecture matters — old bridge is a non-starter for BLE throughput. |
| Language | **TypeScript 5.4+ (strict)** | Non-negotiable on a product with this many state machines |
| Navigation | **React Navigation 7** | Standard. Stack + bottom tabs + modal presentation |
| State management | **Zustand** for transient UI state, **WatermelonDB** observables for domain state | Redux is overkill. WatermelonDB gives us a reactive DB for free. |
| Local DB | **WatermelonDB** (SQLite-backed, reactive, lazy-loading) | Built for offline-first, scales to 100k+ rows without breaking |
| BLE | **react-native-ble-plx** + **custom native modules** for hot paths | ble-plx for connection/pairing. Native modules for telemetry ingestion to avoid bridge overhead. |
| Networking | **ky** (fetch wrapper) + **TanStack Query v5** for cache/sync | Simple, proven, small |
| Charts / viz | **Victory Native XL** (Skia-based) | GPU-accelerated, fluid 60 fps on live signals |
| ML runtime | **ExecuTorch** (PyTorch) with **Core ML delegate** on iOS / **XNNPACK + NNAPI** on Android | Unified model format across platforms |
| Analytics | **PostHog** (self-hosted) | Events funnel we also own |
| Crash reporting | **Sentry** | Ties into backend trace IDs |
| Push | **Firebase Cloud Messaging** (both platforms) | APNs under the hood on iOS; simpler server side than running both directly |
| Auth tokens | **react-native-keychain** | iOS Keychain + Android Keystore |
| E2E tests | **Maestro** | Declarative, doesn't care if it's RN or native |
| Unit tests | **Vitest** + **React Native Testing Library** | Jest is fine too, Vitest faster |

**Explicitly not chosen:** Expo (we need bare native modules for BLE perf and background handling); Flutter (team velocity); native-native iOS + Android (two codebases for a two-engineer team is a mistake).

---

## 2. App Architecture

Four horizontal layers. Each layer depends only on the layer below. No circular deps, enforced by lint rules.

```
┌──────────────────────────────────────────────────────────┐
│  UI Layer                                                 │
│  Screens · Components · Hooks · Navigation                │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│  Domain Layer                                             │
│  Workout engine · Rep detector · Session state machine ·  │
│  Occupancy controller · Sync orchestrator                 │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│  Data Layer                                               │
│  WatermelonDB models · API clients · Auth store           │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│  Platform Layer                                           │
│  BLE bridge · FS · Keychain · Notifications · Background  │
│  ML runtime · WebSocket · Sensors (location, motion)      │
└──────────────────────────────────────────────────────────┘
```

### 2.1 Module Layout

```
/app
├── /src
│   ├── /ui
│   │   ├── /screens
│   │   ├── /components
│   │   ├── /hooks
│   │   └── /nav
│   ├── /domain
│   │   ├── session.ts       state machine
│   │   ├── rep-detector.ts  on-device rep counting
│   │   ├── occupancy.ts     claim/release controller
│   │   ├── sync.ts          outbound queue orchestrator
│   │   └── ml.ts            form-cue runtime
│   ├── /data
│   │   ├── /db              WatermelonDB schema, models, migrations
│   │   ├── /api             typed REST client (generated from OpenAPI)
│   │   ├── /ws              WebSocket multiplexer
│   │   └── /auth            token storage & refresh
│   └── /platform
│       ├── /ble             native bridge wrappers
│       ├── /notifications
│       ├── /background
│       └── /location
├── /ios                     native modules: BLEIngest, MLBridge
├── /android                 native modules: BleIngest, MlBridge
└── /e2e                     Maestro flows
```

---

## 3. Screen Inventory & Top User Flows

### 3.1 Screens (24 total for MVP)

**Onboarding (5):** Welcome, Sign-up/Login, Permissions (BLE, Motion, Notifications), Device Pair, First Workout Walkthrough.

**Main tab: Home (3):** Home (today, streaks, suggested workout), Workout History, PRs.

**Main tab: Workout (5):** Exercise Library, Plan Session, Live Session, Rest Timer, Session Summary.

**Main tab: Discover (2):** Programs, AI Recommendations.

**Main tab: Gym (3, conditional):** Gym Map (appears only when inside a partner facility), Machine Detail + Queue, Claim Confirmation.

**Main tab: Profile (6):** Profile, Settings, Devices, Subscription, Data & Privacy, Support.

### 3.2 Key Flow 1 — First Workout

```
Home
  │
  ├─▶ "Start Workout"
  │     │
  │     ▼
  │   Pre-session: pick exercise (last, suggested, or search)
  │     │
  │     ▼
  │   Live Session
  │     ├─ Connects to paired device(s) in background
  │     ├─ Shows attach state (hall sensor)
  │     ├─ On first motion → auto-starts set
  │     ├─ Real-time rep count + velocity chart
  │     ├─ On rest detected (no motion 10s) → rest timer overlay
  │     ├─ "End set" gesture / button
  │     └─ Raw buffer pull from device (background)
  │     │
  │     ▼
  │   Session Summary
  │     ├─ Per-set PRs, velocity trends
  │     ├─ Form cues summary (if any)
  │     └─ "Save" → workout persisted, queued for sync
```

### 3.3 Key Flow 2 — At-Gym Check-In

```
User enters partner gym (geofence + BLE beacons detected)
  │
  ▼
App switches to "Gym Mode" (new tab visible: Gym)
  │
  ▼
Gym Map loads via GET /facilities/{id}/map/live
WebSocket connects to facility:{id}
  │
  ▼
User taps machine on map  ─OR─  physically taps phone on DUO
  │
  ▼
Claim attempt: POST /occupancy/claim
  │
  ├─▶ 201 OK
  │     │
  │     ▼
  │   Machine shows "claimed by you"
  │   User starts session as normal
  │
  └─▶ 409 Conflict (someone else is on it)
        │
        ▼
      "Machine occupied. Join queue? Est wait: 6 min"
        │
        ▼
      POST /queue/{machine_id}/join
      Push notification when promoted
```

### 3.4 Key Flow 3 — Pair a New Device

```
Profile → Devices → "+"
  │
  ▼
Enter Pair Mode instructions
  │
  ▼
Scan for advertising DUO (filtered by our manufacturer data)
  │
  ▼
Device found → start LE Secure pairing
  │
  ▼
Numeric comparison: show number on screen, user presses button
on DUO to confirm (button wakes device, enters confirm state)
  │
  ▼
Pairing confirmed → POST /devices/pair with pubkey proof
  │
  ▼
Backend returns device_id, signing_key
  │
  ▼
Device now appears in "My Devices"
```

---

## 4. BLE Client Module

The hardest and most failure-prone part of the app.

### 4.1 Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Domain layer                         │
│              BleManager (TS singleton)                │
│   - connect / disconnect / subscribe to events        │
└──────────────────────┬───────────────────────────────┘
                       │  EventEmitter
                       │
┌──────────────────────▼───────────────────────────────┐
│            platform/ble (TS facade)                   │
└──────────────────────┬───────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
 react-native-ble-plx         native BLEIngest module
 (connection, discovery,      (high-rate notify handlers;
  pairing, characteristics)    decodes frames in native
                               code, batches up, emits
                               to JS every 100 ms)
```

**Why a native ingest module?** 20 Hz notify from each of two halves = 40 frames/sec crossing the bridge. Plus events. Plus raw-buffer streams when we pull. The JS bridge collapses on this, even with the New Architecture. Native module decodes, buffers, and emits every 100 ms — cutting bridge crossings by 5×.

### 4.2 Connection State Machine (Per Device)

```
     ┌─────────────┐
     │ UNKNOWN     │ initial
     └──────┬──────┘
            │ user has paired device?
            ▼
     ┌──────────────┐
     │ DISCONNECTED │◀─────────────┐
     └──────┬───────┘              │
       auto-reconnect              │
      on foreground                │
            │                      │
            ▼                      │
     ┌─────────────┐               │
     │ SCANNING    │               │
     └──────┬──────┘               │
       device found                │
            │                      │
            ▼                      │
     ┌─────────────┐               │
     │ CONNECTING  │──fail────────▶│
     └──────┬──────┘               │
            │                      │
            ▼                      │
     ┌──────────────────┐          │
     │ DISCOVERING_SVC  │──fail───▶│
     └──────┬───────────┘          │
            │                      │
            ▼                      │
     ┌────────────────┐            │
     │ SUBSCRIBING    │──fail─────▶│
     └──────┬─────────┘            │
            │                      │
            ▼                      │
     ┌──────────┐     disconnect   │
     │  READY   │───event──────────┘
     └──────────┘
```

Reconnect strategy: exponential backoff, capped at 30 s. After 10 failed attempts, stop retrying and surface a banner to the user.

### 4.3 Two-Half Coordination

Each half is an independent peripheral. The app maintains two connection instances, keyed by `deviceHalf: 'left' | 'right'`. Samples from both are timestamp-aligned in the Session module (phone monotonic clock + half's sequence number + offset estimator).

**Simultaneous connection feasibility:**
- iOS: 2 concurrent connections is fine, but aggregate connection interval matters. Each half at 30 ms → aggregate ~60 ms. Acceptable for real-time UX.
- Android: no hard limit, varies by chip. Test on low-end (Pixel 4a era) hardware.

### 4.4 Background Handling

| Platform | Strategy |
|---|---|
| **iOS** | Background BLE central with state preservation + restoration. System wakes the app on designated BLE events (e.g., first byte of a notify). Background Mode: `bluetooth-central`. |
| **Android** | Foreground Service with a persistent notification ("Workout in progress — DUO connected") during active sessions. Regular background BLE otherwise, subject to Doze. |

**What about passive tracking when the app isn't open?** Not for MVP. Users open the app to train. We can add "ambient mode" in v2.

---

## 5. Local Data Store & Sync Engine

### 5.1 WatermelonDB Schema

```ts
// schema.ts
const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'workouts',
      columns: [
        { name: 'server_id',    type: 'string', isOptional: true, isIndexed: true },
        { name: 'started_at',   type: 'number' },
        { name: 'ended_at',     type: 'number', isOptional: true },
        { name: 'facility_id',  type: 'string', isOptional: true },
        { name: 'notes',        type: 'string', isOptional: true },
        { name: 'sync_state',   type: 'string' }, // 'local' | 'syncing' | 'synced' | 'conflict'
        { name: 'created_at',   type: 'number' },
        { name: 'updated_at',   type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sets',
      columns: [
        { name: 'workout_id',   type: 'string', isIndexed: true },
        { name: 'server_id',    type: 'string', isOptional: true },
        { name: 'exercise_id',  type: 'string' },
        { name: 'index_in_wo',  type: 'number' },
        { name: 'weight_kg',    type: 'number' },
        { name: 'target_reps',  type: 'number', isOptional: true },
        { name: 'actual_reps',  type: 'number', isOptional: true },
        { name: 'velocity_avg', type: 'number', isOptional: true },
        { name: 'form_score',   type: 'number', isOptional: true },
        { name: 'sync_state',   type: 'string' },
      ],
    }),
    tableSchema({
      name: 'reps',
      columns: [
        { name: 'set_id',        type: 'string', isIndexed: true },
        { name: 'index_in_set',  type: 'number' },
        { name: 'peak_g',        type: 'number' },
        { name: 'concentric_ms', type: 'number' },
        { name: 'eccentric_ms',  type: 'number' },
        { name: 'form_flags',    type: 'string' }, // JSON array
      ],
    }),
    tableSchema({
      name: 'raw_uploads',
      columns: [
        { name: 'set_id',       type: 'string', isIndexed: true },
        { name: 'file_path',    type: 'string' },
        { name: 'sample_count', type: 'number' },
        { name: 'upload_state', type: 'string' }, // 'pending' | 'uploading' | 'uploaded' | 'failed'
        { name: 'attempts',     type: 'number' },
        { name: 's3_key',       type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'pending_events',
      columns: [
        { name: 'kind',        type: 'string' },
        { name: 'payload',     type: 'string' }, // JSON
        { name: 'created_at',  type: 'number' },
        { name: 'attempts',    type: 'number' },
        { name: 'next_try_at', type: 'number' },
      ],
    }),
    // exercises is a read-only catalog, synced from server on startup
    tableSchema({
      name: 'exercises',
      columns: [
        { name: 'server_id',     type: 'string', isIndexed: true },
        { name: 'slug',          type: 'string' },
        { name: 'name',          type: 'string' },
        { name: 'muscle_groups', type: 'string' }, // JSON array
        { name: 'category',      type: 'string' },
      ],
    }),
  ],
});
```

### 5.2 Sync Engine

Two queues driven by `pending_events` and `raw_uploads` tables:

1. **Event queue** — small JSON payloads sent to `/v1/telemetry/events`. Flushes every 2 s or on app foreground. Drained even offline → queued for later.
2. **Raw upload queue** — zstd-compressed IMU files sent to S3 via presigned URL, then pointer POSTed to `/v1/telemetry/raw`. Only runs on Wi-Fi by default (setting: "upload on cellular too").

Conflict resolution: server-wins with client-last-write-timestamp. When a conflict is detected (unlikely for workouts, more likely for profile edits), we surface a banner and preserve the user's local copy in a "conflicts" section of the profile for manual merge. MVP rarely hits this in practice.

---

## 6. Telemetry Collection & Upload

### 6.1 In-Session Flow

```
During a set:
  │
  ├─ BLE notify (Telemetry char) → native ingest module
  │        │
  │        ▼
  │    Decode + timestamp align
  │        │
  │        ├─▶ Ring buffer (in memory) for live UI
  │        ├─▶ Rep detector runs on incoming samples
  │        └─▶ Event queue writes rep events as they happen
  │
  ├─ BLE notify (Events char) → event queue immediately
  │
  └─ On "set ended":
        │
        ▼
      1. Set → WatermelonDB (local first)
      2. Request raw buffer from device (Phase 2 §7.5)
      3. Raw bytes written to file, zstd-compressed
      4. Entry added to raw_uploads queue
      5. Sync engine picks up on Wi-Fi
```

### 6.2 Upload Implementation

```ts
async function uploadRawSet(setId: string, localPath: string) {
  // 1. Request presigned URL
  const meta = { device_id, set_id: setId, window, format: 1 };
  const { upload_url, s3_key } = await api.post('/v1/telemetry/raw/presign', meta);

  // 2. PUT the file to S3 directly
  await fetch(upload_url, {
    method: 'PUT',
    body: await RNFetchBlob.fs.readFile(localPath, 'base64'),
    headers: { 'Content-Type': 'application/octet-stream' },
  });

  // 3. Confirm on our side
  await api.post('/v1/telemetry/raw', {
    s3_key, set_id: setId, sample_count,
  });

  // 4. Clean up
  await RNFetchBlob.fs.unlink(localPath);
}
```

---

## 7. On-Device Inference

### 7.1 What Runs Where

| Feature | Runs on | Latency budget |
|---|---|---|
| Rep counting | Phone (native, not ML — peak detection on IMU signal) | <50 ms |
| Live form cues ("tempo too fast", "uneven depth") | Phone (ExecuTorch model, 200 kB) | <200 ms per rep |
| Post-set form scoring (detailed) | Cloud | <5 s after set end |
| Injury-risk flagging | Cloud | Async, surfaces in session summary |

### 7.2 Rep Counting (Signal-Processing, Not ML)

Lives in `domain/rep-detector.ts`, but the hot loop is in a native module to avoid bridge overhead. Algorithm:

1. Compute `|a| - g` per sample.
2. Band-pass 0.2–5 Hz (Butterworth IIR, order 2).
3. Adaptive threshold via exponential moving average of envelope.
4. Peak detection with 300 ms refractory.
5. Classify peak as concentric or eccentric by sign of the subsequent trough.
6. Emit `rep_detected` event with durations.

Note: this is duplicated by the firmware (Phase 2 §6.5). Both run. Phone trusts firmware's rep count in the live UI (it's earlier in the pipeline) but records the phone-side count as a check. AI refines post-hoc.

### 7.3 Form-Cue Model

- Input: 64-sample window (640 ms at 100 Hz) × 6 channels (accel xyz + gyro xyz).
- Output: 8-class classification (no-issue, tempo-fast, tempo-slow, depth-shallow, range-partial, bar-path-drift, imbalance-left, imbalance-right) + confidence.
- Model: small 1D CNN, ~180k parameters. Trained on labeled data from Phase 5.
- Runtime: ExecuTorch with Core ML delegate on iOS, XNNPACK on Android.
- Fallback: if confidence < 0.6, say nothing. Don't give bad advice.

MVP ships with a first-generation model trained on public datasets + whatever we can record ourselves in beta. Real model quality comes in Phase 5.

---

## 8. Real-Time Workout UX

### 8.1 Live Session Screen

Core layout:

```
┌────────────────────────────────────────┐
│  [Exercise Name]          [End Set ✕]  │
│  ──────────────────────────────────────│
│                                        │
│                                        │
│           [ Rep Count ]                │
│              12                        │
│                                        │
│  ──────────────────────────────────────│
│  Velocity (m/s):                       │
│  ▁▂▃▇█▇▃▁▁▂▃▇█▇▃▁▁▂▃▇█   (live chart) │
│  ──────────────────────────────────────│
│  Last rep:  0.82 m/s · 1.1 s eccentric │
│  Avg:       0.78 m/s                   │
│  ──────────────────────────────────────│
│  Form cues:  • Keep tempo steady       │
│              (if any, else hidden)     │
│                                        │
│  ───────── Devices ─────────           │
│  ●○ Left  (82%)   ○● Right  (78%)      │
└────────────────────────────────────────┘
```

Rendering: chart uses Skia via Victory Native XL, updates at 60 fps driven by Reanimated shared values. No React re-renders in the hot path.

### 8.2 Attach / Detach UX

Hall sensor transitions drive subtle UI affordances:
- **Detached → attached:** haptic tap (`Haptics.impactAsync('light')`), "Ready" badge fades in.
- **Attached → detached mid-set:** set is auto-ended after 10 s of no re-attach, with an undo toast.

### 8.3 Rest Timer

- Auto-start when motion stops for 10 s *and* set was in progress.
- Smart suggestion based on exercise category (compound: 3 min; isolation: 90 s).
- Background audio cue at 0 s ("rest complete") even if app is backgrounded — uses `expo-av` equivalent; iOS requires `audio` background mode for this.

---

## 9. Gym Mode

Only active when the app detects the user is inside a partner facility.

### 9.1 Detection

Tiered, in order of reliability:

1. **Wi-Fi SSID match** — facility provides an SSID pattern in its profile. If phone is connected to a matching SSID → facility detected. Most reliable, no permissions.
2. **BLE beacons** — facility can deploy inexpensive BLE beacons advertising a facility-scoped UUID. Picked up passively.
3. **Geofence** — CLLocationManager / FusedLocationProvider. Requires location permission (requested at Gym Mode onboarding, skippable). Coarse.

Facility detection is not exclusive-OR — any positive signal triggers Gym Mode.

### 9.2 Check-In UX

**Tap-to-check-in (primary):**
1. User holds phone near a DUO on equipment.
2. App detects BLE proximity (RSSI > -60 dBm) to a known DUO.
3. App fetches the `(device_id → machine_id)` mapping from server cache.
4. Shows "Claim [Machine Name]?" sheet with Confirm button.
5. Confirm → `POST /occupancy/claim`.

**Map-tap fallback:**
1. User opens Gym tab → sees live map.
2. Taps an available machine.
3. Shows "Walk to [Machine Name] and confirm" sheet.
4. Phone must verify proximity via BLE RSSI before confirm is allowed.

**Anti-ghost-queuing:**
- Joining a queue requires being in Gym Mode.
- Promotion grace period (60 s, per Phase 3) additionally verifies BLE proximity to the machine before the promotion completes.

### 9.3 Live Map

- Loaded via `GET /v1/facilities/{id}/map/live` (snapshot).
- Subscribed via WS channel `facility:{id}` (deltas).
- Rendered with Skia canvas — 100+ machines draw at 60 fps without breaking.
- Machine states: free (green), occupied (red with user icon if self), queued (amber with count), out-of-service (gray).
- Tap any machine → detail sheet (queue, users, machine history).

---

## 10. Notifications

FCM for both platforms (APNs under the hood for iOS).

### 10.1 Notification Categories

| Category | Trigger | Channel | Priority |
|---|---|---|---|
| Queue promoted | You're next on a machine | gym-urgent | HIGH |
| Workout reminder | Daily schedule | reminders | DEFAULT |
| PR achieved | Post-set detection | achievements | DEFAULT |
| Device battery low | <20% at end of session | device | DEFAULT |
| Firmware update available | OTA release matched | device | LOW |
| Form feedback ready | Cloud analysis complete | workout | DEFAULT |
| Gym: alert (staff-only) | Out of MVP scope | — | — |

### 10.2 Implementation

- Registration: on first grant, token posted to `/v1/me/devices/push`. Stored per-user per-device.
- Delivery: backend worker consumes `notifications` SQS queue, sends via FCM HTTP v1 API.
- Deduplication: event ID in FCM payload → app dedupes against local cache on receipt.
- Deep-link payload: every notification carries a `link` field; tapping opens the relevant screen.

---

## 11. Offline Behavior

**Guarantee: 7 days fully offline.** A user can train daily for a week on a boat and everything works.

What works offline:
- Full workout recording (BLE is peer-to-peer with the device; phone is the local server).
- Rep counting, live velocity, local form cues (models are bundled).
- History browsing, PR review.
- Exercise library browsing.

What doesn't work offline:
- Gym mode (obviously; no server, no live map).
- AI form analysis (cloud-only).
- Workout recommendations (uses server-side models).
- Firmware update check and download.

**Visible UX:** top-of-screen "Offline" banner on long-lived connectivity loss. No popups, no blockers. Sync resumes silently on reconnect.

---

## 12. Deep Links & App Links

- iOS: Universal Links on `app.duo.com/*`.
- Android: App Links on `app.duo.com/*`.
- Fallback scheme: `duo://...` for push payloads and in-app navigation.

Route table:

```
duo://workout/start?exercise=squat         start new session
duo://workout/{id}                         open workout detail
duo://device/pair                          pair flow
duo://gym/{facility_id}                    switch active facility
duo://gym/{facility_id}/machine/{id}       machine detail
duo://profile/subscription                 upgrade prompt
duo://ota                                  firmware update flow
```

Marketing email + web (Phase 6) can link directly into any of these.

---

## 13. Release Process

### 13.1 Build Pipeline

- GitHub Actions: unit tests → type check → build iOS + Android → Maestro E2E → upload to TestFlight + Play Internal.
- Versioning: semver. Build number auto-incremented from PR merge count.
- OTA (JS-only) updates via **EAS Update** or self-hosted CodePush equivalent — *not* for native module changes, only JS bundle fixes.

### 13.2 Staged Rollout

- Beta: TestFlight + Play Internal Testing, 50–200 users. 2 weeks minimum.
- GA: Play staged rollout at 5% → 25% → 100% over 7 days. iOS doesn't support staged rollouts at the same granularity — we rely on phased release + monitoring.
- Crash rate gate: any release with crash-free-users < 99.5% at 5% rollout is halted.

### 13.3 Store Listing & Permissions

Permissions requested, justified in-app before system prompt:

| Permission | Purpose | When requested |
|---|---|---|
| Bluetooth | Connect to DUO | Onboarding |
| Motion & Fitness (iOS) / Activity Recognition (Android) | Auxiliary rep detection | Optional, deferred |
| Location (While Using) | Detect partner gym entry | Gym Mode onboarding, skippable |
| Notifications | Queue promotion, PRs, device alerts | After first workout |
| Camera | Exercise library videos / future form-check feature | Only if feature invoked |

Minimum supported: iOS 16, Android 10 (API 29). Rationale: BLE background behavior, ML runtime support, keychain stability.

---

## 14. Decisions Requiring Sign-Off

1. **React Native (bare, New Architecture) with TypeScript.** Not Expo, not native-native, not Flutter.
2. **Native BLE ingest module for the hot path.** JS bridge can't carry 20 Hz × 2 devices + events + raw pulls. Decode and batch in native code.
3. **WatermelonDB for local persistence.** Offline-first, reactive, scales.
4. **Zustand + TanStack Query** for state and server cache. No Redux.
5. **ExecuTorch for on-device ML** (Core ML delegate iOS, XNNPACK Android). Unified format.
6. **FCM for push on both platforms.**
7. **7-day offline guarantee** for consumer functionality.
8. **Gym Mode detection is tiered**: Wi-Fi SSID → BLE beacon → geofence. Any hit activates it.
9. **Minimum supported: iOS 16, Android 10.**
10. **Native module for BLE ingest is Objective-C++ (iOS) and Kotlin (Android)** — not written in JSI directly to avoid JSI churn.

---

## 15. Open Items Before Phase 5 (AI)

These don't block Phase 4 implementation, but Phase 5 will answer:

- **Initial training data strategy.** No real user data exists yet. Do we bootstrap from public datasets (MM-Fit, RecoFit), synthetic data from motion-capture of known-good reps, or gated beta with paid coach annotation? Answer drives Phase 5 timeline.
- **On-device model update cadence.** Bundled with the app (infrequent) or OTA'd separately (live-updated, adds infra)? Bundled is simpler, OTA'd lets us react to bad models without an app release.
- **Exercise detection, not just rep counting.** Should the model auto-detect which exercise the user is doing (from IMU signature), or does the user always select? Auto-detect is magical but error-prone; explicit selection is reliable. MVP: explicit. Future: auto-detect with confirmation.
- **Cloud form-scoring latency.** Target is <5 s post-set. If the AI team wants to use larger models, this needs revisiting.

---

## Appendix A — Representative Session State Machine (TypeScript)

```ts
import { createMachine } from 'xstate';

export const sessionMachine = createMachine({
  id: 'session',
  initial: 'idle',
  context: { workoutId: null as string | null, currentSetId: null as string | null },
  states: {
    idle: {
      on: { START_WORKOUT: 'ready' },
    },
    ready: {
      on: {
        DEVICE_ATTACHED: 'armed',
        END_WORKOUT:     'finalizing',
      },
    },
    armed: {
      on: {
        MOTION_DETECTED:  'setActive',
        DEVICE_DETACHED:  'ready',
        END_WORKOUT:      'finalizing',
      },
    },
    setActive: {
      on: {
        REP_DETECTED:    { actions: 'recordRep' },
        MOTION_IDLE_10S: 'resting',
        END_SET:         'setFinalizing',
        DEVICE_DETACHED: 'disconnected',
      },
    },
    resting: {
      after: { 180000: 'armed' },  // 3 min default
      on: {
        MOTION_DETECTED: 'setActive',
        END_WORKOUT:     'finalizing',
      },
    },
    setFinalizing: {
      invoke: {
        src: 'pullRawBuffer',
        onDone: 'armed',
        onError: 'armed', // best-effort; don't block user
      },
    },
    disconnected: {
      on: {
        RECONNECT:       'armed',
        END_WORKOUT:     'finalizing',
      },
      after: { 600000: 'finalizing' }, // 10 min disconnect = auto-end
    },
    finalizing: {
      invoke: { src: 'uploadWorkout', onDone: 'idle' },
    },
  },
});
```
