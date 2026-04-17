# Firmware

Two firmware trees reflecting the hardware migration path defined in Phase 2:

- **`mvp/`** — ESP32-C3 (Seeed XIAO module), ESP-IDF + FreeRTOS. Used for pre-MVP and beta builds.
- **`prod/`** — nRF52840 (Raytac MDBT50Q-1MV2), Zephyr RTOS. Production target.
- **`common/`** — platform-agnostic sensor processing, rep detection, GATT protocol spec, shared types.

Both implement the same BLE GATT service defined in [`../docs/phase_2_hardware_and_firmware.md`](../docs/phase_2_hardware_and_firmware.md#7-ble-gatt-contract-frozen). The contract is **frozen**; any change requires a protocol version bump and coordinated mobile release.

## Toolchain

### MVP (ESP32-C3)
- ESP-IDF v5.2+
- Python 3.10+
- `idf.py set-target esp32c3`

### Production (nRF52840)
- Zephyr SDK 0.17+
- nRF Connect SDK 2.7+
- West (Zephyr's build tool)

## Building

```bash
# MVP
cd firmware/mvp
idf.py build flash monitor

# Production
cd firmware/prod
west build -b raytac_mdbt50q_db_40
west flash
```

## Tests

Host-side unit tests for the shared signal-processing code live in `common/tests/`. Run with CMake/CTest.

HIL (hardware-in-the-loop) tests run on a dedicated rig; see `hardware/test-rigs/`.

## Current Status

Scaffold only. First task: get a hello-world BLE peripheral advertising on the XIAO board.
