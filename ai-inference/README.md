# AI Inference Service

Python service. Serves form-score, injury-risk, and recommendation models over gRPC, called by the Go API.

See [`../docs/phase_5_ai_system.md`](../docs/phase_5_ai_system.md) for the model catalog and serving strategy.

## Stack

- Python 3.11+
- FastAPI (HTTP health) + grpcio (primary RPC surface)
- LightGBM + ONNX Runtime for inference
- Models fetched from S3 at startup, registered in Postgres `ml_models` table

## Run locally

```bash
cd ai-inference
uv sync        # or: pip install -e .
uvicorn duo_ai.api:app --reload
```

## Deploy

Containerized. Separate deploy cadence from the main backend. Hot-swap models via SIGHUP, no process restart.

## Layout

```
ai-inference/
├── src/duo_ai/
│   ├── api.py          HTTP health + readiness
│   ├── grpc_server.py  main gRPC surface
│   ├── models/         per-family loader & inference (form, injury, rec)
│   ├── features/       feature extraction utilities
│   └── registry.py     model registry client (Postgres + S3)
├── tests/
├── pyproject.toml
└── proto/              protobuf service definitions
```
