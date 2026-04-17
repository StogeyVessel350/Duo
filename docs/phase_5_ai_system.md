# Phase 5 — AI System

**Inputs from prior phases:**
- Phase 2 firmware emits on-device rep events + raw buffer pullable on demand
- Phase 4 mobile runs a bundled on-device form-cue model (~180k params) and a classical rep detector
- Phase 3 backend receives events real-time, raw frames batched via S3 presigned upload
- Raw data retained forever (tiered Standard → Glacier Deep Archive)

**Deliverable structure:**
1. What "AI system" actually means here — scope
2. Data strategy & bootstrap plan
3. Feature engineering & representation
4. Rep detection reconciliation (three tiers)
5. Form classification — live + post-set
6. Anomaly & injury-risk detection
7. Recommendation engine
8. Exercise classification (for later, flagged)
9. Model serving architecture
10. Training pipeline (MLOps)
11. Evaluation & metrics
12. Safety, ethics, failure modes
13. Decisions requiring sign-off
14. Open items before Phase 6

---

## 1. Scope — What "AI" Means in DUO

Four distinct ML systems with different cadences, runtimes, and success criteria. Don't treat them as one thing.

| System | Runs where | Cadence | Criticality | MVP? |
|---|---|---|---|---|
| Rep detection | Firmware + Phone + Cloud | Real-time | High — drives user trust | Yes |
| Form classification (live cues) | Phone (ExecuTorch) | Per-rep, <200 ms | Medium — bad cues > no cues | Yes, v1 quality |
| Form scoring (detailed, post-set) | Cloud | <5 s after set | Medium | Yes, v1 quality |
| Injury-risk / anomaly detection | Cloud | Async, minutes | High — surfaces safety issues | Yes, conservative |
| Recommendations (next workout) | Cloud | <300 ms API | Medium | Yes, rule-based first |
| Exercise auto-detection | Cloud | Async | Low in MVP (user selects) | Deferred |

---

## 2. Data Strategy & Bootstrap

We have no first-party data at Phase 5 kickoff. This section is the plan for that.

### 2.1 Three-Phase Data Bootstrap

**Phase 5a — Public + synthetic (weeks 0–4).** Get a v0.1 model trained and in the app before any user sees it.

- **Public datasets:**
  - MM-Fit (multimodal fitness dataset) — IMU + video for 10 exercises.
  - RecoFit (gyroscope-based exercise recognition).
  - UCI HAR (human activity recognition) — broader context.
  - Kaggle "Barbell Velocity" sets (quality varies, treat as weak supervision).
- **Synthetic generation:** take clean recordings of a single skilled lifter (ourselves or a paid pro) doing each exercise with correct and deliberately incorrect form. Augment by time-warping, noise injection, and rotation perturbation to simulate device orientation variance.
- **Coverage goal:** 10 exercises × 3 form variations × 100 synthetic reps each = 3,000 labeled reps.

**Phase 5b — Internal + friendly beta (weeks 4–12).** ~30 early users we know personally, each producing labeled data.

- Every user has an in-app "Rate this set" prompt after 20% of sets — pulls up form cues for thumbs-up/thumbs-down.
- Dedicated coach-annotator role: we pay a certified S&C coach to label ~500 sets/week from beta data. Annotation tool (web) shows IMU chart + optional video + structured form checklist.
- This is where the first real model comes from.

**Phase 5c — Broader beta (weeks 12–24).** 200–500 users. Active learning — the system preferentially surfaces low-confidence or high-disagreement samples for coach review.

Past Phase 5c, the flywheel is self-sustaining.

### 2.2 Labeling Schema (Form)

A rep gets one of:

```
label = {
  quality: 'good' | 'marginal' | 'poor',
  issues: Set<
    'tempo_too_fast_concentric' |
    'tempo_too_slow_concentric' |
    'eccentric_drop' |
    'partial_rom' |
    'bar_path_drift' |
    'left_right_imbalance' |
    'bounce_out_of_bottom' |
    'valgus_knee'    // visual only, flagged for v2
  >,
  confidence: number // annotator's subjective confidence 0..1
}
```

Issues are sensor-observable only in the MVP label set; valgus knee and similar visual-only issues are recorded for future video work but excluded from model training today.

### 2.3 Data Governance

- **Consent:** users opt in at signup to use their data for model training. Opt-out = data still recorded for their own analytics, excluded from training sets.
- **De-identification:** training pipelines strip user_id, device_id, facility_id, and timestamps coarser than second-of-day before data reaches the model.
- **Right to delete:** deletion removes the user from *future* training runs and from the evaluation set. We do not retrain historical models (impractical, honestly communicated).
- **Export:** GDPR data export returns raw IMU zstd + JSON manifest.

---

## 3. Feature Engineering & Representation

### 3.1 Raw Signal

From the LSM6DSO32 at 100 Hz per half: `[ax, ay, az, gx, gy, gz]` → 6 channels × 100 Hz × N seconds per set.

### 3.2 Per-Sample Features (Derived Upstream)

Computed in the phone / edge before being fed to models:

- **Gravity-compensated acceleration** `|a| - g` (the signal that drives rep detection)
- **Orientation quaternion** from Madgwick filter
- **Angular velocity magnitude** `|ω|`
- **Jerk** (numerical derivative of accel) — useful for identifying bounces and drops
- **Bilateral difference** (left half − right half) — asymmetry indicator

### 3.3 Per-Rep Feature Vector (~40 features)

The post-set form-scoring model consumes a per-rep feature vector rather than raw samples. Features include:

```
duration_total_ms
duration_concentric_ms
duration_eccentric_ms
tempo_ratio_ecc_conc
peak_accel_concentric
peak_accel_eccentric
peak_velocity_concentric
peak_velocity_eccentric
mean_velocity_concentric
mean_velocity_eccentric
range_of_motion_estimate     // from double-integrated accel, crude
bar_path_deviation_rms       // perpendicular-to-gravity drift
smoothness_score             // inverse of jerk RMS
left_right_peak_diff
left_right_timing_diff_ms
...
```

This is a tractable, interpretable feature space. Good for a gradient-boosted model, good for explainability to the user ("your eccentric on rep 5 was 40% faster than rep 1 — control it").

### 3.4 Window Representation (for Live Model)

The on-device live model operates on rolling 640 ms windows of raw 6-channel data at 100 Hz → tensor shape `[64, 6]`. One tensor per rep, classified.

---

## 4. Rep Detection Reconciliation

Three independent systems count reps:

| Source | Method | Latency | Accuracy expectation |
|---|---|---|---|
| Firmware | Peak-detect on `|a|-g` in device MCU | <200 ms | ~92% on clean exercises |
| Phone | Same algorithm on incoming BLE data | <50 ms from receive | ~92% (matches firmware) |
| Cloud | Learned model on raw buffer post-set | Post-set | ~98% target |

**Display truth:** the phone shows the firmware count live (fastest, matches physical sensation). If the cloud recount disagrees after set-end, the app silently corrects the count in the workout summary — no user-facing flicker mid-set.

**Per-rep correction logic:**
```
if |firmware_count - cloud_count| <= 1:
    trust firmware, no UI change
elif |firmware_count - cloud_count| <= 3:
    update silently in summary, mark rep list with a small "refined" indicator
else:
    flag as low-quality data, surface in "review this set" UI
```

---

## 5. Form Classification

Two models, two deployment targets.

### 5.1 Live On-Device Cue Model

**Input:** `[64, 6]` tensor per rep (640 ms window, 6 channels).
**Output:** 8-class softmax + confidence.
**Architecture:** tiny 1D CNN — three conv blocks (32, 64, 64 filters) + global average pool + dense. ~180k params.
**Runtime:** ExecuTorch with Core ML delegate (iOS) / XNNPACK (Android).
**Inference budget:** <5 ms per rep on iPhone 12 / Pixel 6. Well within our <200 ms end-to-end budget.

**Training:**
- Loss: focal loss (class imbalance — most reps are "no issue")
- Augmentation: time-warp ±10%, gaussian noise σ=0.02g, rotation matrix perturbation ±5°
- Per-exercise models vs. single multi-exercise model: **single model**, conditioned by an embedding of the exercise ID (4-dim lookup). Shipping 20 separate models is an engineering burden we don't need.

**Fallback behavior:** if max softmax confidence < 0.6, suppress the cue. "Silent" is always better than "wrong" for form feedback.

### 5.2 Post-Set Cloud Form Scoring

**Input:** full raw rep sequences + per-rep engineered features for the whole set.
**Output:** 0–100 form score + per-rep issue list + two coaching bullets.
**Architecture:** gradient-boosted trees (LightGBM) on per-rep features + a small transformer on raw samples for "full-set rhythm" features. Ensemble average.
**Latency target:** <5 s P95 from set-end to report available in app.

**Why GBDT not end-to-end deep learning?**
- Training data will be scarce for a long time.
- Features are interpretable — we can tell the user *why* their score is what it is, which matters for product quality.
- Deployment is cheap (CPU inference, no GPU required at our scale).

Ensemble with a transformer head over raw samples is the upgrade path when we have 100k+ labeled sets.

### 5.3 Coaching Output

Raw scores are useless to users. The model's output is translated to human-readable cues by a deterministic renderer (not an LLM):

```
if score.issues.contains('tempo_too_fast_concentric') and confidence > 0.75:
    cue = "Slow the lift. Target 1.5–2 s on the way up."
```

Renderer lives in a versioned config file — ML and product own it jointly. This is *not* a case where we'd use an LLM at inference; latency, cost, and unpredictability aren't worth it for a small vocabulary of cues.

---

## 6. Anomaly & Injury-Risk Detection

Different from form scoring: form says "your technique on this rep was suboptimal." Injury risk says "your pattern over weeks suggests you're about to get hurt."

### 6.1 Signals We Monitor

- **Volume ramp:** week-over-week total-volume change > 30% on a lift is a known risk marker.
- **Velocity degradation mid-set:** >40% velocity drop from rep 1 to last rep on a planned rep range implies fatigue-driven poor technique.
- **Asymmetry trend:** left-right imbalance growing monotonically over 4+ sessions.
- **Range-of-motion collapse:** ROM estimate shrinking rep-over-rep within a set.
- **Unusual rep signature:** learned autoencoder flags reps that don't resemble any prior rep of that exercise — could be equipment failure, could be dangerous form.

### 6.2 Architecture

- Per-rep feature vectors flow into a Timescale time-series table.
- Scheduled batch job (hourly) computes rolling windows per user and runs an **isolation forest** plus **threshold rules** over the feature trajectories.
- Flagged patterns create `alerts` rows — surfaced in the consumer app (polite phrasing: "worth paying attention to") and in the gym dashboard (actionable for staff).

### 6.3 False Positive Management

Injury-risk alerts are *high-cost if wrong*. Users who get spammed with false warnings stop trusting the app. Conservative thresholds:

- Require at least 2 of 5 signals to co-fire before an alert.
- Suppress alerts within 7 days of a previous one on the same lift.
- Allow users to dismiss + mark as "false alarm" — signal fed back into model training.

**Alerts never block workouts.** They're informational. The user decides.

---

## 7. Recommendation Engine

### 7.1 What We're Recommending

1. **Next workout** (today / this session) — exercise selection + target sets/reps/weight.
2. **Next exercise within a workout** — when the user finishes one exercise and the app suggests the next.
3. **Weight progression** — how much to add/subtract from last time on a given lift.
4. **Program-level recommendations** (linear, 5/3/1, PPL) based on user goals.

### 7.2 Architecture — Hybrid, Not Pure ML

| Layer | Approach | Why |
|---|---|---|
| Weight progression | Rule-based (linear progression / RIR targets) + velocity-based fallback | Proven, explainable, works with N=10 workouts |
| Exercise selection within a workout | Content-based filtering on exercise metadata + user preferences | Reliable from day one |
| Workout selection (full session) | Collaborative filtering (matrix factorization on user-exercise preferences) + rules | Collaborative filtering alone fails cold-start; rules cover that |
| Program selection | Survey-driven + rule mapping | Users describe goals; we match to programs |

A pure ML recommender needs tens of thousands of users to outperform well-designed rules. We start with rules and layer ML in as data accumulates.

### 7.3 Weight Progression — Concrete Example

```python
def next_weight(user, exercise, last_sets):
    target_reps = exercise.rep_range.target
    last = last_sets[-1]

    # Velocity-based adjustment (if we have VBT data)
    if last.velocity_avg and exercise.velocity_target:
        if last.velocity_avg > exercise.velocity_target * 1.10:
            return last.weight_kg + progression_increment(exercise)
        elif last.velocity_avg < exercise.velocity_target * 0.90:
            return last.weight_kg - deload_increment(exercise)

    # Fallback: rep-based linear progression
    if last.actual_reps >= target_reps + 2 and last.form_score > 75:
        return last.weight_kg + progression_increment(exercise)
    elif last.actual_reps < target_reps - 2 or last.form_score < 50:
        return last.weight_kg - deload_increment(exercise)

    return last.weight_kg  # stay the course
```

Boring, transparent, correct most of the time. Ideal v1.

### 7.4 Gym-Aware Routing

When the user is at a partner facility:
- Queue-aware: if their top-recommended exercise is on a machine with a 10+ minute queue, suggest an equivalent substitute that's free.
- Availability-aware: filters out machines that are occupied/queued.
- Pull the live state from the occupancy service before finalizing the recommendation.

This is a real differentiator — a traditional trainer app doesn't know the bench is full.

---

## 8. Exercise Auto-Detection (Deferred)

Explicit exercise selection in MVP. Auto-detection is flagged for v2.

When it ships:
- Per-exercise "fingerprint" model — trained on labeled data accumulated through MVP.
- Runs on the first 2–3 reps of a set → classifier output → app asks "Is this Back Squat?" with Yes/No buttons.
- User correction is a label, fed back into training.

This is magical when it works and confidence-destroying when it misfires. We don't ship it until we're confident.

---

## 9. Model Serving Architecture

### 9.1 On-Device (Live Form Cue)

- Model bundled with app binary (v1 approach, per Phase 4 decision).
- When we want OTA model updates (v2+): models hosted in S3, signed, phone fetches on app launch if newer version available. Simple scheme — no separate MLOps platform needed.
- Versioning: `model_id = "form-cue-v{semver}"`. Every prediction emits `model_id` to analytics so we can compare versions in production.

### 9.2 Cloud — AI Inference Service

Python service behind gRPC, called by the Go API monolith.

```
                 ┌──────────────────┐
 API (Go) ──────▶│ AI Inference Svc │──▶ Model Registry (S3)
                 │   (Python)       │        │
                 │                  │        └─ form-score-v1.2.lgbm
                 │  LightGBM        │        └─ form-score-v1.2.onnx
                 │  ONNX Runtime    │        └─ inj-risk-v0.9.pkl
                 │  numpy/pandas    │        └─ rec-v0.5.json (rules)
                 └──────────────────┘
```

- Models loaded into process memory on startup; hot-swap on SIGHUP.
- Concurrency: async Python (FastAPI + asyncio). LightGBM inference is fast enough that we don't need batching below ~100 req/s.
- Autoscaling: scale on request queue depth, not CPU.

### 9.3 Batch Jobs

Injury-risk scan, recommendation pre-computation, and model training runs happen as batch jobs:

- **Orchestrator:** Airflow (or Prefect — lighter, we evaluate in Phase 7 infra).
- **Compute:** AWS Batch for heavy training; regular K8s CronJobs for light hourly scans.
- **Storage:** training artifacts written to S3, registered in model registry via a simple Postgres table.

### 9.4 Model Registry (Simple)

```sql
CREATE TABLE ml_models (
    id              UUID PRIMARY KEY,
    family          TEXT NOT NULL,      -- 'form-cue', 'form-score', 'inj-risk', 'rec'
    version         TEXT NOT NULL,
    artifact_s3_key TEXT NOT NULL,
    sha256          BYTEA,
    trained_at      TIMESTAMPTZ,
    training_run_id UUID,
    metrics         JSONB,              -- accuracy, AUC, etc.
    status          TEXT CHECK (status IN ('canary','prod','retired','failed'))
);
```

One row per (family, version). The inference service fetches the `prod` row per family on startup. `canary` rows receive a shadow percentage of traffic for comparison.

---

## 10. Training Pipeline (MLOps)

### 10.1 Flow

```
Raw telemetry S3 ──▶ Labeling tool ──▶ Labeled S3
                          │                  │
                          │                  ▼
                          │          Feature engineering job
                          │          (computes per-rep features,
                          │           writes to Feature Store)
                          │                  │
                          │                  ▼
                          │           Training run (AWS Batch)
                          │                  │
                          │                  ▼
                          │           Eval on held-out set
                          │                  │
                          │                  ├─ metrics to model registry
                          │                  │
                          │                  ▼
                          │           Canary deployment
                          │                  │
                          │                  ▼
                          │           Shadow eval in prod (1 wk)
                          │                  │
                          │                  ▼
                          │           Promote to prod or rollback
                          │
                          └─ new labels feed next training iteration
```

### 10.2 Feature Store

Not a "platform" in the Feast/Tecton sense. Just a Postgres table + S3 Parquet per training run.

```
feature_store_reps:  (rep_id, exercise_id, feature_vector_json, label_json, as_of_ts)
```

The simplicity is the point. We aren't Uber.

### 10.3 Reproducibility

- Every training run has a deterministic seed, pinned dependencies (lockfile), and an immutable dataset snapshot.
- Run record: `{git_sha, dataset_snapshot_id, hyperparams, metrics, artifact_s3_key}`.
- Re-running against the same snapshot + same code + same seed produces identical models.

### 10.4 Dataset Snapshots

Cutting a training snapshot = copying a manifest (list of rep_ids + labels) to S3, immutable. Training reads from the manifest, never from the live tables. This means:
- Training is reproducible after users delete their data.
- The retraining cadence is controlled — we don't accidentally retrain on partial mid-migration data.

---

## 11. Evaluation & Metrics

### 11.1 Offline Metrics (Per Model)

| Model | Primary | Secondary |
|---|---|---|
| Rep detection | F1 on rep boundary detection (±50 ms tolerance) | Precision, recall, MAE of count |
| Live form cue | Macro-F1 across issue classes | Per-class precision at 0.6 confidence threshold |
| Form score | Pearson correlation with expert-rated score | MAE, Spearman rank |
| Injury risk | Precision@K for K=10 per week | False positive rate per 100 user-weeks |
| Recommendations | NDCG@5 on held-out user sessions | User acceptance rate (online) |

### 11.2 Online Metrics (Product)

- Fraction of reps with cue shown (should be 15–30% — too high = noise, too low = undertriggered)
- User dismissal rate on cues (rising dismissal → model degrading, investigate)
- Adherence delta on recommended workouts vs. user-chosen
- Post-session survey: "Was the form feedback useful?" on a subset of sessions

### 11.3 Model Release Gate

A new model reaches production only if:
1. Offline metrics >= current production on a held-out set.
2. Canary (5% traffic) for ≥7 days shows no regression on online metrics.
3. No increase in support tickets tagged "bad form feedback".

---

## 12. Safety, Ethics & Failure Modes

### 12.1 Known Failure Modes

| Mode | Likelihood | Mitigation |
|---|---|---|
| Model suggests user push weight that injures them | Real | Progression increments are capped (+5% per session max); RPE and form score must both support progression |
| False injury-risk alert scares user | Real | Conservative thresholds, require multi-signal consensus, dismissible |
| Miscounted reps demotivates user | Common | Silent cloud correction, never flicker mid-set |
| Form cue model trained on skinny/male-skewed data misfires for others | Real | Active monitoring for performance stratified by self-reported body type; remediation backlog |
| Autoencoder flags legitimate exercise variation as anomaly | Possible | Cold-start period — don't alert until 10+ reps of that exercise are in the user's history |

### 12.2 Explicit Non-Goals

- **No diagnosis.** We never tell users they *have* an injury. We say "pattern worth paying attention to — consider deloading."
- **No medical advice.** The app's language is carefully non-clinical.
- **No pressure.** No streaks that break on missed days in a punishing way. No "you're behind your goal" alarms.

### 12.3 Fairness Monitoring

Quarterly review of model performance stratified by:
- Self-reported body type
- Self-reported gender
- Experience level (beginner / intermediate / advanced)
- Device hand dominance (if we capture it)

Any stratum with >10% performance delta vs. the majority gets flagged as a training-data gap to close.

---

## 13. Decisions Requiring Sign-Off

1. **Three-phase data bootstrap** (public → internal beta → broader beta). ~4-week timeline to first trained model.
2. **Single multi-exercise live form model** with exercise-embedding conditioning. Not per-exercise models.
3. **GBDT (LightGBM) for cloud form scoring.** Interpretable, data-efficient. Transformer ensemble later.
4. **Rule-based recommendations first**, collaborative filtering as data permits. No pure-ML recommender at launch.
5. **Exercise auto-detection deferred to v2.** Users select explicitly for MVP.
6. **Injury-risk alerts are multi-signal consensus**, conservative thresholds, dismissible. Never blocking.
7. **Model OTA deferred; v1 ships bundled with app.** Post-MVP: S3-hosted signed models fetched on launch.
8. **Feature store is just Postgres + S3 Parquet.** No Feast/Tecton until we're past 100k users.
9. **Fairness monitoring quarterly, stratified**, with triage backlog for gaps.
10. **Labeling costs real money.** Budget ~$30–50k for Phase 5b coach annotation work (500 sets/wk × ~$2/set × 12 weeks).

---

## 14. Open Items Before Phase 6 (Website & Business Dashboard)

Phase 6 is the web front end — marketing + store + gym operator dashboard + internal admin. Questions that matter for that phase:

- **Marketing CMS approach.** Markdown-in-repo (content commits via PR) vs. headless CMS (Sanity, Contentful). Affects content velocity.
- **Payment acceptance scope at launch.** Cards only, or Apple/Google Pay day one, or full (including Klarna/Affirm for the $400+ retail)?
- **Gym dashboard sold on self-serve or gated by sales call?** Phase 1 decision was sales-assisted onboarding; worth confirming the pricing page route reflects that (no self-signup button).
- **Internationalization at launch?** English-only US launch vs. planning ahead with i18n scaffolding.

---

## Appendix A — Representative LightGBM Training Config

```yaml
model: form_score_v1.3
family: form-score
train_data: s3://duo-ml/snapshots/form-2026-04-15/train.parquet
val_data:   s3://duo-ml/snapshots/form-2026-04-15/val.parquet

features:
  - duration_concentric_ms
  - duration_eccentric_ms
  - tempo_ratio_ecc_conc
  - peak_velocity_concentric
  - mean_velocity_concentric
  - range_of_motion_estimate
  - bar_path_deviation_rms
  - smoothness_score
  - left_right_peak_diff
  - exercise_id   # categorical

target: form_score_expert   # 0..100

params:
  objective: regression
  metric: mae
  num_leaves: 63
  learning_rate: 0.05
  feature_fraction: 0.9
  bagging_fraction: 0.8
  bagging_freq: 5
  min_data_in_leaf: 50

train:
  num_rounds: 2000
  early_stopping: 50

seed: 42
```

## Appendix B — Representative On-Device Live Model (PyTorch)

```python
import torch
import torch.nn as nn

class FormCueNet(nn.Module):
    def __init__(self, num_exercises=20, num_classes=8):
        super().__init__()
        self.exercise_emb = nn.Embedding(num_exercises, 4)
        self.conv1 = nn.Conv1d(6, 32, kernel_size=7, padding=3)
        self.conv2 = nn.Conv1d(32, 64, kernel_size=5, padding=2)
        self.conv3 = nn.Conv1d(64, 64, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm1d(32)
        self.bn2 = nn.BatchNorm1d(64)
        self.bn3 = nn.BatchNorm1d(64)
        self.pool = nn.AdaptiveAvgPool1d(1)
        self.head = nn.Sequential(
            nn.Linear(64 + 4, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, num_classes),
        )

    def forward(self, x, exercise_id):
        # x: [B, 6, 64]
        h = torch.relu(self.bn1(self.conv1(x)))
        h = torch.relu(self.bn2(self.conv2(h)))
        h = torch.relu(self.bn3(self.conv3(h)))
        h = self.pool(h).squeeze(-1)      # [B, 64]
        e = self.exercise_emb(exercise_id) # [B, 4]
        return self.head(torch.cat([h, e], dim=-1))
```

Parameter count: ~48k (smaller than the earlier 180k estimate once we tune — leaves more budget for quantization).
Export path: PyTorch → ExecuTorch → Core ML delegate (iOS) / XNNPACK (Android).
