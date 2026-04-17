# Mobile

Consumer app. React Native (bare, New Architecture), TypeScript strict.

See [`../docs/phase_4_mobile_app.md`](../docs/phase_4_mobile_app.md) for the full design.

## Stack

- React Native 0.74+ with New Architecture (Fabric + TurboModules)
- TypeScript 5.4+ (strict)
- WatermelonDB for local persistence
- Zustand + TanStack Query for state
- react-native-ble-plx + custom native BLE ingest module
- ExecuTorch for on-device ML
- FCM for push

## Setup

```bash
cd mobile
pnpm install
# iOS
cd ios && pod install && cd ..
pnpm ios
# Android
pnpm android
```

Minimum supported: iOS 16, Android 10 (API 29).

## Layout

```
src/
├── ui/           Screens, components, hooks, navigation
├── domain/       Session state machine, rep detector, occupancy, sync
├── data/         WatermelonDB models, API client, WS, auth
└── platform/    BLE bridge, notifications, background, location
ios/              Native iOS modules (BLEIngest, MLBridge)
android/          Native Android modules (BleIngest, MlBridge)
e2e/              Maestro flows
```

## Native BLE ingest module

The JS bridge cannot carry 20 Hz × 2 devices of telemetry frames + events + raw buffer pulls. Telemetry decoding and batching happens in Objective-C++ (iOS) / Kotlin (Android); JS receives batched events every 100 ms. See `ios/BLEIngest/` and `android/app/src/main/java/com/duo/bleingest/`.
