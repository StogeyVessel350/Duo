/**
 * Central configuration.
 *
 * We're using Nordic UART Service (NUS) as the transport. It's a standard
 * "stream arbitrary bytes" BLE service. Your firmware will advertise this
 * service and notify on the TX characteristic.
 *
 * Expected frame layout (12 bytes, little-endian):
 *   int16 ax  — accel X in milli-g   (1g = 1000)
 *   int16 ay
 *   int16 az
 *   int16 gx  — gyro X in milli-dps  (1 dps = 1000)
 *   int16 gy
 *   int16 gz
 *
 * This matches what the companion ESP32 sketch will emit.
 */

// Nordic UART Service UUIDs
export const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const NUS_TX      = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // notify
export const NUS_RX      = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // write

// Device name prefix to filter scan results — change this to match your firmware
export const DEVICE_NAME_PREFIX = 'DUO';

// Sample rate assumed when interpreting timestamps
export const SAMPLE_RATE_HZ = 100;

// Backend API
export const API_BASE_URL = 'https://superb-analysis-production-a657.up.railway.app';

// Chart rendering
export const CHART_WINDOW_SAMPLES = 200; // ~2 seconds at 100 Hz
export const CHART_FPS = 30;             // visual update rate
