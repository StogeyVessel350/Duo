# DUO MVP App

Expo React Native app that connects to a DUO sensor over BLE and plots the live signal.

## What this is

Two screens:

1. **Scan** — lists nearby advertising DUO sensors. Tap to connect.
2. **Live** — shows a live plot of `|a| − 1g` plus a readout of raw accel values, sample rate, and total samples received.

That's it. No accounts, no cloud, no workout logging yet. This exists to answer one question: **is my hardware stack producing clean data I can see on a phone?**

## Important — you can't use Expo Go

`react-native-ble-plx` contains native code, which Expo Go doesn't include.
You need a **development build** (still Expo, just with extra native modules baked in).

First-time setup runs Xcode (iOS) or Gradle (Android). After that, normal Expo DX applies: edit code → save → hot reload.

## Prerequisites

**For iOS:**
- macOS with Xcode 15+ installed
- An iPhone (simulator can't do BLE)
- A free Apple developer account configured in Xcode

**For Android:**
- Android Studio with SDK installed (API 35)
- A physical Android phone with USB debugging enabled
- Or an emulator — but BLE only works reliably on a real device

**Both platforms:** Node 20+, pnpm or npm.

## Setup

```bash
# clone / unzip this folder
cd duo-mvp-app

# install deps
npm install
# or: pnpm install

# iOS (macOS only)
npx expo run:ios --device

# Android
npx expo run:android --device
```

The first build takes 5–15 minutes. After that:

```bash
# normal dev loop
npx expo start --dev-client
```

Scan the QR code in the dev client app, not in Expo Go.

## How the app expects data

It looks for BLE peripherals whose name starts with `DUO` (change this in `src/config.ts` if your firmware uses a different prefix).

It subscribes to the **Nordic UART Service** TX characteristic and expects each BLE notification to carry a **12-byte frame**, little-endian:

```
offset size  field              unit
  0     2   int16 ax           milli-g   (1g = 1000)
  2     2   int16 ay
  4     2   int16 az
  6     2   int16 gx           milli-dps (1 dps = 1000)
  8     2   int16 gy
 10     2   int16 gz
```

At 100 Hz that's 1.2 KB/s of BLE traffic — well within any ESP32's capabilities.

## Testing the app before your firmware is ready

You can flash any ESP32 with Nordic's standard NUS example (e.g., the Arduino-ESP32 `ESP32_BLE_UART` example), rename it to `DUO-test`, and write a loop that notifies 12 bytes of data every 10 ms to test the full path before writing real IMU code.

A companion Arduino sketch matching this exact frame format is the next deliverable — ask for it.

## Project layout

```
app/                 expo-router routes
├── _layout.tsx     root stack layout
├── index.tsx       → ScanScreen
└── live.tsx        → LiveScreen

src/
├── ble/
│   ├── manager.ts      BleManager singleton + Zustand store
│   └── parseFrame.ts   12-byte → ImuSample decoder
├── signal/
│   ├── RingBuffer.ts   fixed-size ring buffer
│   ├── store.ts        global signal buffer + rate meter
│   ├── useSignal.ts    React hook polling at CHART_FPS
│   └── LiveChart.tsx   SVG polyline chart
├── screens/
│   ├── ScanScreen.tsx
│   └── LiveScreen.tsx
└── config.ts           UUIDs, prefixes, chart params
```

## Next steps

- Once data is flowing cleanly, add rep detection (peak-find on `mag`) and a rep counter to `LiveScreen`.
- Add a "start set / end set" flow and persist sets to local SQLite via `expo-sqlite`.
- After 2 weeks of dog-fooding, decide whether this is worth building more.

## Troubleshooting

**No devices appear in scan.** Confirm the device advertises with a name starting with `DUO`. Change `DEVICE_NAME_PREFIX` in `src/config.ts` if yours differs.

**Scan fails immediately on Android.** Location permissions. The library needs `ACCESS_FINE_LOCATION` on Android 11 and earlier; newer Android uses `BLUETOOTH_SCAN`. The app requests the right one for your version, but go check Settings → Apps → DUO → Permissions if it silently fails.

**Samples arrive but the chart is flat or garbled.** Byte order or scaling is wrong in firmware. Compare what `parseFrame.ts` expects against what you're emitting.

**App builds but crashes on launch.** Most common cause: forgot to add the `react-native-ble-plx` config plugin entry in `app.json`. It's there in this scaffold, but if you re-ran `expo prebuild` and something got out of sync, regenerate native projects: `npx expo prebuild --clean`.
