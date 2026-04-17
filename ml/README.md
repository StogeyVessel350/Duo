# ML

Training pipelines, feature engineering, labeling, and dataset management.

Serving lives in `../ai-inference/` (separate deployable, consumes models from this pipeline).

See [`../docs/phase_5_ai_system.md`](../docs/phase_5_ai_system.md) for the full design.

## Layout

```
ml/
├── training/            Per-model training entry points
│   ├── form_score/
│   ├── form_cue/        On-device model → ExecuTorch export
│   ├── injury_risk/
│   └── rep_detector/    Learned rep-count model (cloud refinement)
├── feature_engineering/ Per-rep feature extraction from raw IMU
├── labeling_tool/       Internal web tool for coach annotators
├── datasets/
│   ├── raw/             .gitignored; points to S3
│   ├── processed/       .gitignored; points to S3
│   └── manifests/       Immutable snapshot manifests (versioned, committed)
└── serving/             Export + registration helpers
```

## Workflow

```
raw S3  →  labeling tool  →  labeled S3
                                │
                                ▼
                      feature_engineering
                                │
                                ▼
                        training (AWS Batch)
                                │
                                ▼
                       eval on held-out set
                                │
                                ▼
                   registered in ml_models table
                                │
                                ▼
                    canary in ai-inference (5%)
                                │
                                ▼
                          promote to prod
```

Every training run is reproducible: pinned deps, deterministic seed, immutable dataset manifest.
