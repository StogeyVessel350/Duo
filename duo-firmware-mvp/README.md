# DUO MVP Firmware

Arduino sketch for the Seeed XIAO ESP32-C3 that reads from an LSM6DSO32 IMU and streams 6-axis data at 100 Hz over BLE.

Advertises as **`DUO-mvp`**. Compatible with the `duo-mvp-app` Expo app out of the box.

## Parts needed

| Part | Price | Notes |
|---|---|---|
| Seeed XIAO ESP32-C3 | ~$5 | you already have one |
| SparkFun LSM6DSO32 breakout | ~$15 | DEV-19895, or Adafruit 4503 if you have that |
| 4 jumper wires | ~$1 | for the 4 I²C wires |
| Breadboard or protoboard | ~$5 | optional if soldering direct |
| USB-C cable | — | data, not just power |

Total: ~$20–25 to start. Add a LiPo cell later when you want untethered.

## Wiring

```
  XIAO ESP32-C3            LSM6DSO32 breakout
  ─────────────────        ──────────────────
  3V3  ────────────────── VIN / 3V3
  GND  ────────────────── GND
  D4 (GPIO6, SDA) ──────── SDA
  D5 (GPIO7, SCL) ──────── SCL
```

Both SparkFun and Adafruit breakouts already have pull-ups on the I²C lines, so you don't need external resistors. Ignore `INT1`/`INT2` — we're not using interrupts yet.

## Software setup

**1. Install Arduino IDE 2.x** (arduino.cc/en/software).

**2. Add ESP32 board support.**
   - File → Preferences → Additional boards manager URLs, add:
     `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Tools → Board → Boards Manager → search `esp32` → install "esp32 by Espressif Systems" (3.0+).

**3. Install libraries** (Tools → Manage Libraries):
   - **SparkFun 6DoF IMU Breakout LSM6DSO** (works for DSO and DSO32)
   - **NimBLE-Arduino** by h2zero (2.x version)

**4. Select board + settings:**
   - Tools → Board → esp32 → "XIAO_ESP32C3"
   - Tools → USB CDC On Boot → **Enabled** (so Serial monitor works)
   - Tools → Partition Scheme → Default
   - Tools → Port → whichever the XIAO shows up as

**5. Open and upload** `duo_firmware_mvp/duo_firmware_mvp.ino`.

   First upload may require holding the XIAO's BOOT button while plugging in USB. After that, normal upload works.

## What it does

On boot:
1. Initializes I²C, finds the LSM6DSO32.
2. Configures accel ±32 g and gyro ±2000 dps at 104 Hz.
3. Starts a BLE peripheral advertising as "DUO-mvp" with Nordic UART Service.

Once a phone connects:
4. Reads IMU samples at 100 Hz.
5. Packs each sample into a 12-byte frame (`int16` mg / mdps, little-endian).
6. Notifies the NUS TX characteristic.

Serial monitor prints status every 2 seconds so you can confirm samples are going out.

## Frame format

Matches `src/ble/parseFrame.ts` in the app exactly:

```
offset size  field            unit
  0     2   int16 ax         milli-g    (1g = 1000)
  2     2   int16 ay
  4     2   int16 az
  6     2   int16 gx         milli-dps  (1dps = 1000)
  8     2   int16 gy
 10     2   int16 gz
```

If you change either side (firmware or app), change both.

## Troubleshooting

**"LSM6DSO32 not found"** — onboard LED will strobe rapidly. Check wiring, especially that you have 3V3 not 5V (some breakouts have 5V-tolerant inputs but the XIAO is a 3V3 board). Check the sensor's I²C address — default is `0x6B` but some breakouts use `0x6A` depending on the SDO pin. The SparkFun library tries both.

**Upload fails** — hold BOOT button on the XIAO, plug in USB, release BOOT. On macOS the port will appear as `/dev/cu.usbmodem…`. On Windows check Device Manager for the COM port.

**App sees "DUO-mvp" but won't connect** — reset the ESP32 (unplug/replug). Sometimes a previous connection attempt leaves state stuck. If it persists, in the app: disconnect, force-quit, reopen.

**Samples arrive but values look wrong** — 
- Values way too large → you probably kept a default `±2g` range; re-check `setAccelRange(32)` got applied.
- Values all zero → I²C is connecting (no "not found" error) but reads fail. Check breakout has power (`VDD` LED lit if present).
- Values seem laggy → the app's chart caps at 30 fps, so individual spikes may look smoothed. The underlying data is at 100 Hz.

## What to build next

Once you see clean live data on your phone:

1. **Add rep detection in the firmware.** Peak-detect on `|a| − 1g` with a refractory period. Emit a "rep" event as a separate notify on a new characteristic (or just over NUS with a tag byte).
2. **Battery.** Wire a 300–500 mAh LiPo to the XIAO's BAT pads. The XIAO handles charging from USB-C. Battery percentage can be read via the internal ADC on GPIO2 but the XIAO-C3 makes this awkward — not worth the fight for MVP.
3. **Case + attachment.** 3D print a two-half yin-yang housing. Magnets at the seam, velcro straps for attachment to bars/handles.
4. **Workout logging in the app.** Add rep counting, "start set / end set" buttons, persist to SQLite. That's when you need the second half of the architecture we sketched out earlier.
