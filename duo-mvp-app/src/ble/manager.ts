/**
 * BLE manager — thin layer over react-native-ble-plx.
 *
 * Responsibilities:
 *   - Request permissions
 *   - Scan for advertising DUO devices (filter by name prefix)
 *   - Connect, discover, subscribe to the NUS TX characteristic
 *   - Parse incoming frames and push to the signal store
 *   - Expose connection state via Zustand store for the UI
 */

import { BleManager, Device, State } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { create } from 'zustand';

import { NUS_SERVICE, NUS_TX, DEVICE_NAME_PREFIX } from '@/config';
import { parseFrame, base64ToBytes } from '@/ble/parseFrame';
import { pushSample, resetSignal } from '@/signal/store';

let manager: BleManager | null = null;
function getManager(): BleManager {
  if (!manager) manager = new BleManager();
  return manager;
}

export type ConnectionState =
  | { kind: 'idle' }
  | { kind: 'scanning' }
  | { kind: 'connecting'; device: Device }
  | { kind: 'subscribing'; device: Device }
  | { kind: 'connected'; device: Device }
  | { kind: 'error'; message: string };

interface BleStore {
  state: ConnectionState;
  discovered: Device[];
  setState: (s: ConnectionState) => void;
  addDiscovered: (d: Device) => void;
  clearDiscovered: () => void;
}

export const useBleStore = create<BleStore>((set) => ({
  state: { kind: 'idle' },
  discovered: [],
  setState: (s) => set({ state: s }),
  addDiscovered: (d) =>
    set((state) => {
      if (state.discovered.some((x) => x.id === d.id)) return state;
      return { discovered: [...state.discovered, d] };
    }),
  clearDiscovered: () => set({ discovered: [] }),
}));

async function requestAndroidPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const perms =
    Platform.Version >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const results = await PermissionsAndroid.requestMultiple(perms);
  return Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
}

async function waitForPoweredOn(timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const s = await getManager().state();
    if (s === State.PoweredOn) return;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('Bluetooth not powered on');
}

export async function startScan(): Promise<void> {
  const store = useBleStore.getState();
  const ok = await requestAndroidPermissions();
  if (!ok) {
    store.setState({ kind: 'error', message: 'Bluetooth permissions denied' });
    return;
  }
  await waitForPoweredOn();

  store.clearDiscovered();
  store.setState({ kind: 'scanning' });

  getManager().startDeviceScan(null, { allowDuplicates: false }, (err, dev) => {
    if (err) {
      useBleStore.getState().setState({ kind: 'error', message: err.message });
      return;
    }
    if (!dev || !dev.name) return;
    if (dev.name.startsWith(DEVICE_NAME_PREFIX)) {
      useBleStore.getState().addDiscovered(dev);
    }
  });
}

export function stopScan(): void {
  getManager().stopDeviceScan();
  const cur = useBleStore.getState().state;
  if (cur.kind === 'scanning') useBleStore.getState().setState({ kind: 'idle' });
}

export async function connect(device: Device): Promise<void> {
  const store = useBleStore.getState();
  stopScan();

  try {
    store.setState({ kind: 'connecting', device });
    const connected = await device.connect({ requestMTU: 185 });
    await connected.discoverAllServicesAndCharacteristics();

    store.setState({ kind: 'subscribing', device: connected });
    resetSignal();

    connected.monitorCharacteristicForService(NUS_SERVICE, NUS_TX, (err, ch) => {
      if (err) {
        useBleStore.getState().setState({ kind: 'error', message: err.message });
        return;
      }
      if (!ch?.value) return;
      const bytes = base64ToBytes(ch.value);
      const sample = parseFrame(bytes, Date.now());
      if (sample) pushSample(sample);
    });

    connected.onDisconnected(() => {
      useBleStore.getState().setState({ kind: 'idle' });
    });

    store.setState({ kind: 'connected', device: connected });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    store.setState({ kind: 'error', message });
  }
}

export async function disconnect(): Promise<void> {
  const cur = useBleStore.getState().state;
  if ('device' in cur) {
    try {
      await cur.device.cancelConnection();
    } catch {
      /* ignore */
    }
  }
  useBleStore.getState().setState({ kind: 'idle' });
}
