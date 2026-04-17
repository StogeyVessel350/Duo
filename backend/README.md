# Backend

Three Go services running on AWS EKS, plus a Python AI-inference service called via gRPC.

See [`../docs/phase_3_backend_architecture.md`](../docs/phase_3_backend_architecture.md) for the full design.

## Services

- **`api/`** — modular monolith. REST API. Consumer app + gym dashboard + admin all consume.
- **`ws/`** — WebSocket service. Long-lived connections. Subscribes to Redis pub/sub.
- **`ingest/`** — telemetry ingest. Validates and produces to Kafka.
- **`../ai-inference/`** — Python, separate deploy cadence, gRPC.

## Local Dev

```bash
cd backend
docker compose up -d  # postgres, redis, kafka, localstack-s3
make api              # runs api service
make ws               # runs ws service
make ingest           # runs ingest service
make test             # run all tests
```

Environment variables live in `.env.example`; copy to `.env` and fill in.

## Layout

```
backend/
├── api/       Main REST API monolith
│   ├── cmd/   Entry points
│   └── internal/
│       ├── auth/
│       ├── device/
│       ├── workout/
│       ├── facility/
│       ├── occupancy/
│       ├── queue/
│       ├── ota/
│       └── telemetry/
├── ws/        WebSocket fanout
├── ingest/    Telemetry ingest
└── common/    Shared packages: db, auth middleware, config, observability
```

## Observability

All services emit OpenTelemetry traces, Prometheus metrics, and structured JSON logs. `common/otel/` provides the setup.
