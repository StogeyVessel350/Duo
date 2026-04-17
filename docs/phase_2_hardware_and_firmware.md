# Phase 2 — Hardware Review & Firmware Design

**Inputs from Phase 1 sign-off:**
- No BOM cap; optimize for quality. Cost tracked as a column, not a gate.
- Dock bundled with every unit.
- 1-year warranty.
- Phone-tethered check-in (no Wi-Fi, no gateway on the device side).

**Deliverable structure:**
1. Current hardware review (component-by-component)
2. Failure modes
3. Alternatives analysis
4. MVP build vs. Production build (side-by-side)
5. Revised BOM at 1 / 100 / 1k / 10k volumes
6. Firmware architecture
7. BLE GATT contract (frozen jointly with Mobile as of this phase)
8. Power budget
9. Decisions requiring sign-off
10. Open items before Phase 3

---

## 1. Current Hardware Review (Per Half)

### 1.1 MCU — Seeed XIAO ESP32-C3

| Aspect | Assessment |
|---|---|
| BLE 5.0 support | Yes, adequate |
| Wi-Fi radio | **Present but unused — wasted silicon, wasted power, wasted cert effort** |
| Flash / RAM | 4 MB / 400 KB — fine |
| Active current (BLE) | ~18–22 mA — high for a fitness wearable |
| Deep sleep | ~5 µA with RTC wake — acceptable |
| Form factor | 21 × 17.8 mm module — OK for prototype, oversized for production |
| Cert status | Module is FCC/CE certified — good for MVP |
| BLE stack maturity | Espressif's Bluedroid/NimBLE is fine but noticeably less mature than Nordic SoftDevice |
| Unit cost | ~$5 at low volume, ~$4 at 10k |

**Verdict:** Fine for MVP. Suboptimal for production. The Wi-Fi radio is dead weight for our use case, and Nordic's BLE-only parts beat it on power by 3–4× in connected-idle.

### 1.2 IMU — BNO085

| Aspect | Assessment |
|---|---|
| Axes | 9-axis (accel + gyro + **magnetometer**) |
| Onboard fusion | Yes, ARM Cortex-M0+ runs sensor fusion, outputs quaternions |
| Active current | ~3.5 mA |
| Unit cost | $15–25 per unit — **the single most expensive component in the BOM** |
| Fit for gym use | **Magnetometer is actively harmful** — iron plates and cable machines create large local magnetic fields that corrupt heading estimates. The BNO085 will produce confidently wrong orientation data in a gym. |

**Verdict:** Over-specified and wrong-specified. Strength training does not need heading (yaw drift is acceptable for rep counting and form). The magnetometer is a liability, not a feature. A good 6-axis IMU with MCU-side fusion is cheaper, lower-power, and gives us equal or better results in our environment.

### 1.3 Battery — 500 mAh LiPo

| Aspect | Assessment |
|---|---|
| Capacity | 500 mAh — generous for our duty cycle |
| Form | Assumed rectangular pouch — doesn't match the yin-yang half geometry |
| Cycle life | 300–500 cycles to 80% — easily exceeds 1-yr warranty at weekly charging |
| Cost | ~$3 at low volume |

**Verdict:** Oversized. 300 mAh gets us multi-week battery life with the firmware improvements below. For a curved yin-yang half, a custom-shape cell will fit more naturally and use volume better — worth the tooling cost at 10k/yr.

### 1.4 Hall Sensor — KY-003 Module

| Aspect | Assessment |
|---|---|
| What it actually is | An A3144 Hall IC on a breakout PCB with indicator LED, pull-up, and 0.1" header |
| Active current | ~5 mA (dominated by the breakout's indicator LED) |
| Production suitability | **None.** This is a dev-bench part. |

**Verdict:** Replace with a bare low-power Hall IC. Options below.

### 1.5 Button — Momentary Tactile

| Aspect | Assessment |
|---|---|
| Function | Single input for pair/wake/tare |
| Durability concerns | Mechanical part in a sweaty environment — water ingress path |
| Cost | $0.30 |

**Verdict:** Fine for MVP. For production, strongly consider capacitive touch on the enclosure — zero moving parts, perfect IP sealing, better industrial design. The MCU supports it natively (ESP32-C3 has touch pins; nRF52 needs an external controller or uses a simple RC-based GPIO approach).

### 1.6 Charging Path — Pogo Pins + 1N5819 Schottky

| Aspect | Assessment |
|---|---|
| Pogo pins | Good. 10k+ mating cycles typical. Fits 1-yr warranty with generous margin. |
| 1N5819 Schottky | Provides reverse-polarity protection. ~0.3 V drop at 100 mA — wastes ~100 mW during charging. |
| Charging IC | **Not specified. This is a hazard.** A Schottky diode alone is not a Li-ion charger. If the current design is dropping 5V through a diode to a raw cell, it will damage the battery and risks thermal runaway. |

**Verdict:** **Do not ship this.** We must add a proper Li-ion charging IC (CC/CV profile, safety timer, temp sense) before any unit leaves the building with a battery installed.

### 1.7 Summary of Concerns

| Issue | Severity | Phase to fix |
|---|---|---|
| No proper Li-ion charging IC | **Critical / safety** | Immediate (MVP) |
| KY-003 is a dev module | High | MVP |
| BNO085 magnetometer is counter-productive in gyms | High | MVP |
| Wi-Fi radio unused on ESP32-C3 | Medium | Production |
| Oversized battery for form factor | Medium | Production |
| Mechanical button in sweat environment | Medium | Production |
| No fuel gauge — % reporting is voltage estimate | Low | Production |
| No ESD protection on pogo contacts | Medium | MVP |

---

## 2. Failure Modes (Top 10)

Ordered by risk × likelihood. This becomes the input to QA's HIL test plan in Phase 7.

1. **Battery damage from improper charging** — no CC/CV IC. Mitigation: add BQ25180 or MCP73831.
2. **Pogo pin corrosion from sweat** — exposed contacts, humid+salty environment. Mitigation: gold plating (hard gold ≥30 µin), drainage channels in dock, conformal coating elsewhere on PCB.
3. **Magnet demagnetization / misalignment** — yin-yang coupling magnets weaken over time or shift in drop events. Mitigation: N52 neodymium with Ni-Cu-Ni plating, mechanical captive retention, not glue-only.
4. **BLE disconnect during set** — RF interference in crowded gyms (dozens of phones, wearables, heart rate straps all on 2.4 GHz). Mitigation: local flash buffering of raw samples, phone pulls on reconnect.
5. **IMU saturation on heavy drops** — barbell slam can exceed ±16 g. Mitigation: configurable full-scale range, default to ±32 g for gym.
6. **Water ingress through button** — sweat dripping into tactile switch. Mitigation: capacitive touch (production) or IP-rated silicone boot (MVP).
7. **Firmware corruption during OTA power loss** — MCU loses power mid-flash. Mitigation: dual-bank OTA (A/B slots), signed images, fallback to known-good.
8. **Pogo pin PCB pad fracture from drop** — a drop onto the dock-facing surface transmits force directly to pins. Mitigation: compliant gasket between pogo and PCB, reinforced pads, mechanical strain relief.
9. **Cell puffing from overtemperature charging** — charging a cell above 45 °C degrades it rapidly. Mitigation: NTC thermistor on the cell, charger IC reads it and pauses.
10. **Hall sensor false trigger from nearby magnets** — weight machines often have magnetic components. Mitigation: hysteresis in Hall IC (latch-type, not linear), firmware debouncing, require >500 ms stable state before acting.

---

## 3. Alternatives Analysis

### 3.1 MCU Candidates

| Part | BLE | Flash | RAM | Active BLE | Sleep | Cost @ 10k | Cert path | Notes |
|---|---|---|---|---|---|---|---|---|
| ESP32-C3 (XIAO) | 5.0 | 4 MB | 400 KB | ~20 mA | 5 µA | ~$4 | Pre-cert module | MVP incumbent. Wi-Fi wasted. |
| nRF52832 (bare) | 5.0 | 512 KB | 64 KB | ~5 mA | 0.3 µA | ~$3.50 | Full cert needed | Gold-standard BLE stack. |
| nRF52840 (bare) | 5.0 | 1 MB | 256 KB | ~5 mA | 0.4 µA | ~$5 | Full cert needed | Overkill for us unless we want headroom for on-device ML. |
| Raytac MDBT50Q-1MV2 | 5.0 | 1 MB | 256 KB | ~5 mA | 0.4 µA | ~$6 | **Pre-cert FCC/CE/IC/MIC** | nRF52840 in a certified module. Our pick. |
| Raytac MDBT42Q | 5.0 | 512 KB | 64 KB | ~5 mA | 0.3 µA | ~$5 | Pre-cert | nRF52832 version. Cheaper, tighter. |

**Recommendation:**
- **MVP:** keep XIAO ESP32-C3 (it's on the bench, and we want to iterate firmware, not do a PCB spin yet).
- **Production:** **Raytac MDBT50Q-1MV2** (nRF52840). Headroom for on-device ML, BLE-only radio, pre-certified so we avoid a ~$80–150k certification bill on a custom module.

Why not MDBT42Q to save $1? Flash and RAM headroom matters when we start running on-device rep detection and form cues in TFLite Micro. $1 is cheap insurance.

### 3.2 IMU Candidates

| Part | Axes | Noise (accel) | Active | Cost @ 10k | Notes |
|---|---|---|---|---|---|
| BNO085 | 9 + fusion | ~150 µg/√Hz | 3.5 mA | ~$18 | Current. Magnetometer liability. |
| LSM6DSO32 | 6 (±32 g) | ~70 µg/√Hz | 0.55 mA | ~$3 | **Best fit.** ±32 g range survives bar drops. |
| LSM6DSOX | 6 (±16 g) | ~70 µg/√Hz | 0.55 mA | ~$3 | Cheaper but ±16 g will clip. |
| ICM-42688-P | 6 (±16 g) | 70 µg/√Hz | 0.95 mA | ~$5 | Lowest noise. Range is the issue. |
| BMI270 | 6 (±16 g) | ~160 µg/√Hz | 0.69 mA | ~$3 | Low power, noisier, range issue. |

**Recommendation (both MVP and Production):** **LSM6DSO32**. The ±32 g full-scale range is the deciding factor — nothing else in this class survives a bar slam without clipping. Fusion runs on the MCU. Aligns with your prior VeloBar IMU exploration.

### 3.3 Hall Sensor Candidates

| Part | Type | Active | Cost @ 10k | Notes |
|---|---|---|---|---|
| KY-003 (module) | Latch (A3144) | ~5 mA | ~$1.50 | Dev-bench only. |
| AH1887 | Omnipolar | 1.8 µA typ | ~$0.35 | Ultra-low power, auto-sense polarity. |
| DRV5032 | Digital latch | 0.5 µA | ~$0.40 | TI, ultra-low power. |
| MLX92232 | Latch | 1.7 µA | ~$0.60 | Automotive-grade; overkill. |

**Recommendation (both):** **DRV5032** (TI). Sub-microamp is the right budget for a sensor that's always-on for the attach/detach event.

### 3.4 Charging IC Candidates

| Part | I_charge | Features | Cost @ 10k | Notes |
|---|---|---|---|---|
| MCP73831 | up to 500 mA | CC/CV, no temp sense | ~$0.60 | Adequate for MVP. |
| BQ25180 | up to 500 mA | CC/CV + I²C config + temp + input protection + fuel-gauge adjacent | ~$0.85 | **Best fit for production.** |
| MAX77734 | up to 300 mA | PMIC with LDO + fuel gauge integration | ~$1.20 | More integration, more board area saved. |

**Recommendation:** MCP73831 for MVP (simple, proven). **BQ25180 for production** — I²C-configurable charging, proper thermistor input, input over-voltage protection, 20 µA quiescent.

### 3.5 Fuel Gauge (New)

Voltage-only battery percentage estimation is wildly inaccurate under load. Add:

| Part | Method | Accuracy | Cost @ 10k |
|---|---|---|---|
| MAX17048 | ModelGauge (voltage + compensated) | ±1% | ~$0.70 |
| LC709204F | HG-CVR algorithm | ±2% | ~$0.90 |

**Recommendation:** **MAX17048** in production. Not in MVP.

### 3.6 Button → Capacitive Touch (Production)

nRF52840 lacks dedicated touch sensing. Options:

- **TTP223** — 1-channel IC, ~$0.15, cheap and cheerful.
- **AT42QT1010** — Atmel/Microchip single-channel touch, ~$0.50, more robust.
- **Integrated with the MCU** via driven-guard GPIO + RC — free but fussy.

**Recommendation:** **AT42QT1010** for production. MVP keeps the tactile button.

### 3.7 Antenna

For MDBT50Q-1MV2 the antenna is on-module (PCB trace with known performance). No external antenna needed. Saves BOM and the tuning headache.

---

## 4. MVP vs. Production (Side-by-Side)

| Subsystem | MVP (ship to 50–200 beta users) | Production (10k+/yr) |
|---|---|---|
| MCU | XIAO ESP32-C3 module | Raytac MDBT50Q-1MV2 (nRF52840) on custom PCB |
| IMU | LSM6DSO32 | LSM6DSO32 |
| Battery | 300 mAh standard LiPo | 200–300 mAh custom-shape LiPo |
| Hall | DRV5032 bare IC | DRV5032 bare IC |
| Input | Tactile button w/ silicone boot | Capacitive touch (AT42QT1010) |
| Charging | MCP73831 + 1N5819 reverse-polarity | BQ25180 + proper protection |
| Fuel gauge | Voltage estimate only | MAX17048 |
| Charging contacts | Gold-plated pogo pins, 2 contacts | Gold-plated pogo pins, 4 contacts (adds I²C-over-power for factory test) |
| Enclosure | SLA/SLS printed, hand-finished | Injection-molded, two-shot (hard body + TPU gasket) |
| Magnets | N42 neodymium, glued | N52 Ni-Cu-Ni plated, captive retention |
| IP rating target | IPX4 (splash) | IPX5 (sweat-proof in use) |
| Firmware platform | ESP-IDF + FreeRTOS | Zephyr RTOS |
| Cert strategy | Rely on XIAO cert | Rely on Raytac cert + product-level FCC Part 15 Subpart B |

**Why skip production-board design until we've done MVP firmware:** firmware reveals integration surprises (interrupt timing, I²C bus contention, power-rail brown-outs) that should be flushed out on a hackable platform, not on a board whose revisions cost $5k and 3 weeks each.

---

## 5. Revised BOM

Per half, in USD. Parts are current cents on the high side; treat as planning numbers, not quotes.

### 5.1 MVP — qty 100 (beta batch)

| Item | Part | Unit |
|---|---|---|
| MCU module | XIAO ESP32-C3 | 5.00 |
| IMU | LSM6DSO32 | 3.50 |
| Battery | 300 mAh LiPo | 3.00 |
| Hall | DRV5032 | 0.45 |
| Button | Alps SKTD + silicone boot | 0.50 |
| Charger IC | MCP73831 | 0.60 |
| Pogo pins | 2 × spring, gold | 1.50 |
| Schottky | 1N5819 | 0.10 |
| Magnets | N42, 4 × disc | 2.00 |
| PCB | 2-layer, small | 2.00 |
| Passives | R/C/L assortment | 1.00 |
| Connectors | Battery JST | 0.40 |
| Enclosure | SLA printed, post-processed | 6.00 |
| Assembly | Hand + pick-and-place | 5.00 |
| **Per half** | | **~$31** |
| **Per unit (2 halves)** | | **~$62** |
| Dock (MVP) | | ~$12 |
| **Per unit total** | | **~$74** |

### 5.2 Production — qty 10,000/yr

| Item | Part | Unit |
|---|---|---|
| MCU module | Raytac MDBT50Q-1MV2 | 5.80 |
| IMU | LSM6DSO32 | 2.80 |
| Battery | 250 mAh custom curved LiPo | 3.20 |
| Hall | DRV5032 | 0.30 |
| Touch | AT42QT1010 | 0.45 |
| Charger IC | BQ25180 | 0.85 |
| Fuel gauge | MAX17048 | 0.70 |
| Pogo pins | 4 × spring, gold (2 power + 2 I²C) | 1.60 |
| ESD / protection | TVS diodes, ferrites | 0.40 |
| Magnets | N52 Ni-Cu-Ni, 4 × disc | 1.80 |
| PCB | 4-layer, 0.8 mm, ENIG | 1.20 |
| Passives | — | 0.60 |
| Connectors | Battery | 0.35 |
| Enclosure (two-shot mold) | Polycarbonate + TPU gasket | 3.50 |
| Packaging (per half share) | — | 0.80 |
| Assembly & test | Automated SMT + functional test | 2.20 |
| **Per half** | | **~$26.55** |
| **Per unit (2 halves)** | | **~$53.10** |
| Dock (bundled, production) | | ~$9.50 |
| **Per unit total** | | **~$62.60** |

### 5.3 Scale curve

| Volume | Per-unit total BOM | Comment |
|---|---|---|
| 1 (prototype) | ~$180 | Hand-built. Dev board prices. |
| 100 (MVP batch) | ~$74 | SLA-printed enclosure dominates. |
| 1,000 | ~$68 | Transition to low-volume injection mold. |
| 10,000 | ~$63 | Full production. |

Tooling (production enclosure + dock) amortizes over ~3–5k units. Steel tooling investment: ~$40–80k for device halves, ~$15–25k for dock.

### 5.4 Dock BOM (Production, 10k/yr)

| Item | Unit |
|---|---|
| USB-C receptacle | 0.80 |
| Pogo sockets (4) | 1.60 |
| Base PCB | 0.80 |
| LED + driver (charge status) | 0.25 |
| Polyfuse + TVS (input protection) | 0.60 |
| Alignment magnets | 0.90 |
| Enclosure (injection molded) | 2.80 |
| Cable (1 m USB-C, bundled) | 1.50 |
| Packaging share | 0.25 |
| **Total** | **~$9.50** |

---

## 6. Firmware Architecture

Platform: **Zephyr RTOS on nRF52840 (production)**, **ESP-IDF + FreeRTOS on ESP32-C3 (MVP)**. Same application logic, HAL adapter at the bottom.

### 6.1 Task Structure

```
┌─────────────────────────────────────────────┐
│               Application                    │
│                                              │
│  ┌───────────┐  ┌────────┐  ┌────────────┐  │
│  │  Sensor   │  │ State  │  │  BLE Link  │  │
│  │  Task     │→ │  Task  │ →│  Task      │  │
│  │ (100 Hz)  │  │(async) │  │  (async)   │  │
│  └────┬──────┘  └───┬────┘  └──────┬─────┘  │
│       │             │              │         │
│  ┌────▼─────────────▼──────────────▼─────┐  │
│  │      Message Queue / Event Bus         │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌─────────────┐  ┌───────────────────────┐ │
│  │ Housekeeping│  │  OTA Manager          │ │
│  │ (battery,   │  │  (A/B slots)          │ │
│  │  faults)    │  │                       │ │
│  └─────────────┘  └───────────────────────┘ │
│                                              │
└─────────────────────────────────────────────┘
            │                │            │
       ┌────▼────┐      ┌────▼────┐  ┌───▼─────┐
       │  HAL    │      │  BLE    │  │  Flash  │
       │ (I²C,   │      │  Stack  │  │  (log + │
       │  GPIO)  │      │         │  │  OTA)   │
       └─────────┘      └─────────┘  └─────────┘
```

### 6.2 State Machine

```
        ┌────────────┐
        │ DEEP_SLEEP │◀──── 10 min of no activity
        └──────┬─────┘       OR button long-press
               │
     hall / button / motion
               │
               ▼
        ┌─────────────┐
        │ DISCOVERABLE│───── 5 min no connect ───▶ DEEP_SLEEP
        └──────┬──────┘
        phone connects
               │
               ▼
        ┌──────────────┐
        │CONNECTED_IDLE│
        └──────┬───────┘
         hall CLOSE
               │
               ▼
        ┌──────────┐
        │ ATTACHED │◀── hall OPEN ──▶ CONNECTED_IDLE
        └────┬─────┘
        motion > threshold
             │
             ▼
        ┌────────┐
        │ ACTIVE │
        └───┬────┘
        start_session cmd  (or auto-detect)
             │
             ▼
        ┌─────────┐
        │ LOGGING │── stop cmd / idle 90s ──▶ ACTIVE
        └─────────┘

Independent states:
  CHARGING     : entered from any state when Vbus detected
  OTA          : entered on explicit command from phone
  FAULT        : entered on assertion / watchdog / battery over-temp
```

### 6.3 IMU Configuration

- ODR (output data rate): **100 Hz** in ACTIVE/LOGGING, **25 Hz** in ATTACHED, **12.5 Hz + significant-motion interrupt** in CONNECTED_IDLE, **off + wake-on-motion** in DEEP_SLEEP.
- Accel full-scale: **±32 g** (LSM6DSO32).
- Gyro full-scale: **±2000 dps**.
- Internal low-pass filter: 50 Hz cutoff at 100 Hz ODR.
- FIFO: enabled, watermark interrupt at 16 samples (reduces MCU wake rate).

### 6.4 Sensor Fusion

We dropped the BNO085's onboard fusion. Replacement on the MCU:

- **Madgwick filter** or **Mahony filter** — quaternion output from 6-axis. ~10 kB code, ~1 kB RAM. Runs comfortably at 100 Hz on either MCU using <5% CPU.
- Yaw drifts without magnetometer — acceptable for our domain. Rep detection and form analysis care about pitch/roll and acceleration, not heading.

### 6.5 Rep Detection (On-Device, Firmware Side)

The full rep-detection model lives in Phase 5 (AI). Firmware provides:

1. **Acceleration magnitude signal** `|a| - g` computed per sample.
2. **Band-pass filter** (0.2–5 Hz).
3. **Peak detector** with adaptive threshold (EMA of signal envelope) and refractory period (300 ms).
4. **Event emission** on each peak: `{rep_index, peak_g, duration_ms, concentric_ms, eccentric_ms}`.

This gives us a usable rep count without cloud round-trips. AI/ML refines it in Phase 5.

### 6.6 Power Management

Rules:
- If no BLE connection for **5 min**, stop advertising, enter DEEP_SLEEP.
- In DEEP_SLEEP, only **wake-on-motion** (IMU interrupt via SMD pin), **Hall interrupt**, **button**, and **charger-attach** are wake sources.
- In CONNECTED_IDLE, BLE connection interval = **1000 ms**; in ACTIVE/LOGGING, **30 ms** for responsiveness.
- IMU FIFO + watermark batching — MCU sleeps between batches even in ACTIVE.

### 6.7 OTA Strategy

- **Dual-bank (A/B slots)** in flash. Requires 1 MB flash minimum — covered by nRF52840. ESP32-C3 uses native ESP-IDF OTA with two app partitions.
- **Signed images** (Ed25519). Public key in secure boot region.
- **Transport:** phone sends chunks over `OTA Data` characteristic (write-no-response), `OTA Control` for framing (start / chunk / commit / abort).
- **Resume support:** phone can query `ota_offset` and resume after disconnect.
- **Verification:** bootloader checks signature before marking the new slot bootable. Fail → revert.
- **Forced-good period:** after boot from new image, app must post a "health OK" marker within 60 s; otherwise bootloader rolls back next boot.

### 6.8 Security

- **Pairing:** LE Secure Connections with numeric comparison. Button press on device confirms pairing.
- **Bonding:** bonded devices persist across reboots in flash.
- **Characteristics:** all non-advertising characteristics require encryption (permission bit set).
- **Anti-spoofing:** on connect, phone challenges device with a signed nonce using the shared pairing key.
- **Firmware signing:** Ed25519 keypair generated per-product-line. Private key held in a hardware HSM in engineering ops.
- **Debug interfaces:** SWD disabled in production images via APPROTECT (nRF52) / eFuse (ESP32).

---

## 7. BLE GATT Contract (Frozen)

This section is co-authored by Firmware and Mobile Engineer and frozen as of Phase 2. Any change requires CEO approval and a version bump.

**Service UUID (DUO Primary):** `6d756f00-0001-4000-8000-000000000001`

### 7.1 Characteristics

| Char Name | UUID suffix | Properties | Size | Description |
|---|---|---|---|---|
| DeviceInfo | `...0002` | Read | 24 B | `{serial[8], hw_ver[2], fw_ver[4], protocol_ver[1], features[1], reserved[8]}` |
| SessionControl | `...0003` | Write, Read | 8 B | Command frame, see §7.2 |
| Telemetry | `...0004` | Notify | 20 B | Packed sample summary, see §7.3 |
| Events | `...0005` | Notify | 16 B | Discrete events, see §7.4 |
| BatteryState | `...0006` | Read, Notify | 6 B | `{voltage_mV[2], percent[1], charging[1], temp_c[1], reserved[1]}` |
| RawBufferCtl | `...0007` | Write | 12 B | Request raw samples for a window |
| RawBufferData | `...0008` | Notify | up to ATT_MTU | Streamed raw samples in response |
| OTAControl | `...0009` | Write | 8 B | `{cmd[1], chunk_size[2], total_size[4], reserved[1]}` |
| OTAData | `...000A` | Write no response | up to ATT_MTU | Firmware chunks |
| OTAStatus | `...000B` | Notify | 4 B | `{state[1], last_chunk[2], error[1]}` |

ATT_MTU negotiated to 247 B (iOS) or 512 B (Android) where supported.

### 7.2 SessionControl Commands

| Cmd byte | Name | Payload |
|---|---|---|
| 0x01 | START_SESSION | `{exercise_id[1], target_reps[1], ode_rate_hz[1]}` |
| 0x02 | STOP_SESSION | — |
| 0x03 | TARE | — |
| 0x04 | SET_ODR | `{hz[1]}` |
| 0x05 | SET_RANGE | `{accel_g[1], gyro_dps[1]}` |
| 0x06 | ENTER_LOW_POWER | — |
| 0x07 | IDENTIFY | blinks LED / buzzes for pairing confirmation |

### 7.3 Telemetry Frame (20 B, notify @ 20 Hz)

```
offset size  field
  0     1    seq
  1     2    t_offset_ms           (since session start)
  3     2    accel_peak_mg         (window max |a| in mg)
  5     2    accel_rms_mg
  7     2    gyro_peak_x_dps
  9     2    gyro_peak_y_dps
 11     2    gyro_peak_z_dps
 13     1    quaternion_w_i8       (scaled -1..+1)
 14     1    quaternion_x_i8
 15     1    quaternion_y_i8
 16     1    quaternion_z_i8
 17     1    state_byte            (hall, motion, session flags)
 18     2    crc16
```

Windows are 50 ms (i.e., 5 raw samples per frame at 100 Hz ODR). Over-the-wire data rate: ~3.2 kbps uplink per half. Well within BLE throughput.

### 7.4 Events Frame (16 B, notify on event)

```
offset size  field
  0     1    seq
  1     1    event_id
  2     4    timestamp_ms
  6    10    payload (event-specific)

event_id:
  0x01 REP_DETECTED     payload: {rep_num[1], peak_g[2], concentric_ms[2], eccentric_ms[2]}
  0x02 ATTACH           payload: {}
  0x03 DETACH           payload: {}
  0x04 BUTTON_SHORT     payload: {}
  0x05 BUTTON_LONG      payload: {}
  0x06 FAULT            payload: {fault_code[1], detail[2]}
  0x07 MOTION_WAKE      payload: {}
  0x08 CHARGING_STARTED payload: {}
  0x09 CHARGING_DONE    payload: {}
```

### 7.5 Raw Buffer Retrieval

Problem: the phone wants the *raw* samples for a specific set, on demand (for deep form analysis), without streaming raw over BLE continuously.

Flow:
1. Firmware keeps a rolling ring buffer of raw samples in flash (≥30 s at 100 Hz × 12 B/sample ≈ 36 KB).
2. Phone writes to `RawBufferCtl`: `{start_ts[4], end_ts[4], resolution[1], format[1], reserved[2]}`.
3. Firmware notifies `RawBufferData` with packed samples until complete, ends with a 0-length frame.
4. Phone acknowledges receipt; firmware frees the window.

---

## 8. Power Budget

Assumptions: 300 mAh cell, typical user (5 × 1-hour workouts/week).

| State | Current | Hrs/day avg | mAh/day |
|---|---|---|---|
| LOGGING (active workout) | 8.0 mA | 0.71 | 5.7 |
| CONNECTED_IDLE | 1.2 mA | 2.0 | 2.4 |
| ATTACHED (between sets) | 2.5 mA | 0.30 | 0.75 |
| DISCOVERABLE | 0.4 mA | 0.5 | 0.2 |
| DEEP_SLEEP | 5 µA | 20.5 | 0.1 |
| **Total** | | **24.0 hr** | **~9.2 mAh/day** |

**Calendar life between charges:** 300 mAh ÷ 9.2 mAh/day ≈ **32 days.**

Buffer for pessimism (real-world losses, connection drops, BLE scans): **target ≥ 21 days of typical use**. Users charge every 2–3 weeks.

If we shrink to 200 mAh for form-factor reasons: ~21 days — still comfortable.

---

## 9. Decisions Requiring Sign-Off

1. **IMU: drop BNO085, adopt LSM6DSO32 for MVP and production.** No magnetometer. Fusion moves to the MCU via Madgwick filter.
2. **MCU: keep XIAO ESP32-C3 for MVP, migrate to Raytac MDBT50Q-1MV2 (nRF52840) for production.** Pre-certified module saves ~$80–150k in cert work.
3. **Add a proper charging IC now (MCP73831 MVP, BQ25180 production).** Shipping a Schottky-only charging path is a safety issue. This is non-negotiable.
4. **Capacitive touch in production, tactile button in MVP.** Better IP rating, better ID.
5. **300 mAh standard LiPo in MVP, 200–250 mAh custom-shape LiPo in production.** Trade cell tooling cost for enclosure volume efficiency.
6. **4-contact pogo pins in production** (2 power + 2 I²C factory-test), 2-contact in MVP. Small cost, large manufacturing-test benefit.
7. **Zephyr RTOS for production firmware, ESP-IDF for MVP.** Zephyr is better supported long-term and standard in the nRF52 ecosystem.
8. **Dual-bank signed OTA.** A/B slots, Ed25519, 60-s health-check rollback.
9. **BLE GATT contract is frozen per §7.** Any change requires a protocol version bump and compatibility handling on both sides.

---

## 10. Open Items Before Phase 3 (Backend)

These do not block firmware work but do shape backend telemetry ingest:

- **Raw sample retention policy in the cloud.** Do we keep every rep's raw IMU for training forever, or rolling 90 days? Cost implication at 10k users.
- **Does the phone upload telemetry in real-time during workouts, or batch at set-end?** Real-time enables live coaching-from-cloud features but doubles ingest QPS.
- **Multi-tenant key management for OTA.** Do gym operators get staged rollouts (canary to one gym first)? If yes, fleet management needs tenant awareness from day one.

---

## Appendix A — Component Datasheet Index

| Part | Datasheet |
|---|---|
| Raytac MDBT50Q-1MV2 | raytac.com/download/index.php?index_id=43 |
| Nordic nRF52840 | nordicsemi.com/products/nrf52840 |
| ST LSM6DSO32 | st.com/en/mems-and-sensors/lsm6dso32.html |
| TI DRV5032 | ti.com/product/DRV5032 |
| TI BQ25180 | ti.com/product/BQ25180 |
| Microchip MCP73831 | microchip.com/en-us/product/mcp73831 |
| Maxim MAX17048 | analog.com/en/products/max17048.html |
| Microchip AT42QT1010 | microchip.com/en-us/product/AT42QT1010 |

To be confirmed against current availability and pricing when we place first PCB order.
