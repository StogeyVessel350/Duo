/**
 * Decode a 12-byte IMU frame from the sensor.
 *
 * Layout (little-endian):
 *   [0..2]  int16 ax   (milli-g)
 *   [2..4]  int16 ay
 *   [4..6]  int16 az
 *   [6..8]  int16 gx   (milli-dps)
 *   [8..10] int16 gy
 *   [10..12] int16 gz
 *
 * BLE frames arrive base64-encoded from react-native-ble-plx; callers
 * should decode to bytes before passing in.
 */

export interface ImuSample {
  t: number;  // monotonic receive timestamp, ms
  ax: number; // g
  ay: number;
  az: number;
  gx: number; // dps
  gy: number;
  gz: number;
  mag: number; // |a| - 1g, in g — convenient for rep detection
}

export function parseFrame(bytes: Uint8Array, t: number): ImuSample | null {
  if (bytes.length < 12) return null;

  // DataView handles signed-int16 + little-endian correctly across platforms.
  const dv = new DataView(bytes.buffer, bytes.byteOffset, 12);
  const ax = dv.getInt16(0, true) / 1000;
  const ay = dv.getInt16(2, true) / 1000;
  const az = dv.getInt16(4, true) / 1000;
  const gx = dv.getInt16(6, true) / 1000;
  const gy = dv.getInt16(8, true) / 1000;
  const gz = dv.getInt16(10, true) / 1000;

  const mag = Math.sqrt(ax * ax + ay * ay + az * az) - 1.0;

  return { t, ax, ay, az, gx, gy, gz, mag };
}

/** Decode a base64 string (from ble-plx) to a Uint8Array. */
export function base64ToBytes(b64: string): Uint8Array {
  // React Native ships atob via core-js polyfill in recent versions.
  // If you hit runtime errors, add `import 'react-native-quick-base64'` and swap.
  const bin = globalThis.atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
