# DUO

Dual-sensor fitness hardware + software ecosystem. Two magnetic halves that attach to gym equipment, track motion via IMU, and pair with a consumer app plus a business platform for gyms.

## Repository Layout

```
duo/
├── docs/          Phase-gate design documents. Read these first.
├── firmware/      Embedded code: MVP (ESP32-C3) and production (nRF52840)
├── hardware/      Schematic, PCB, enclosure, BOM, test-rigs
├── mobile/        React Native consumer app (iOS + Android)
├── backend/       Go services: API, WebSocket, Ingest
├── ai-inference/  Python model serving
├── ml/            Training pipelines, feature engineering, labeling
├── web/           Next.js monorepo: marketing, dashboard, admin
├── infra/         Terraform + Helm
├── .github/       CI workflows
└── scripts/       Operational tooling
```

## Phase Documents

Design decisions are captured in `/docs` and are authoritative. Read in order:

1. [`phase_1_agents_and_architecture.md`](docs/phase_1_agents_and_architecture.md) — org model and end-to-end architecture
2. [`phase_2_hardware_and_firmware.md`](docs/phase_2_hardware_and_firmware.md) — hardware review, firmware design, BLE GATT
3. [`phase_3_backend_architecture.md`](docs/phase_3_backend_architecture.md) — APIs, data model, services
4. [`phase_4_mobile_app.md`](docs/phase_4_mobile_app.md) — consumer app
5. [`phase_5_ai_system.md`](docs/phase_5_ai_system.md) — ML systems
6. `phase_6_website_and_business_dashboard.md` — web + e-commerce + gym dashboard (forthcoming)
7. `phase_7_integration_and_testing.md` — integration + QA (forthcoming)

## Quick Start — Local Dev

Each subsystem has its own README with setup instructions.

- `firmware/mvp/README.md`
- `mobile/README.md`
- `backend/README.md`
- `web/README.md`

## Status

Pre-MVP. Firmware prototype exists on breadboard. No production artifacts yet.

## License

Proprietary. See LICENSE.
