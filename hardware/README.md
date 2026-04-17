# Hardware

Schematic, PCB, enclosure, BOM, and test rigs.

See [`../docs/phase_2_hardware_and_firmware.md`](../docs/phase_2_hardware_and_firmware.md) for the full review and rationale.

## Layout

```
hardware/
├── schematic/     KiCad source
├── pcb/           KiCad PCB layouts + gerber outputs
├── enclosure/     STEP files, Fusion 360 source, SLA print settings
├── bom/           Per-revision BOMs in CSV + vendor mapping
└── test-rigs/     HIL rig designs, fixture schematics
```

## Current State

- MVP: XIAO ESP32-C3 + LSM6DSO32 breakout on a proto-board
- Production target: Raytac MDBT50Q-1MV2 + LSM6DSO32 + BQ25180 + MAX17048 on custom 4-layer PCB

## BOMs

- `bom/mvp_v0.csv` — 100-unit beta batch
- `bom/prod_v1.csv` — 10k/yr production (placeholder)
