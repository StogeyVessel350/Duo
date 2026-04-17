/**
 * Singleton signal store.
 *
 * BLE notifications land here via `push()`. The chart polls `snapshot()`
 * at CHART_FPS. This decoupling keeps React from re-rendering per sample.
 */

import { CHART_WINDOW_SAMPLES } from '@/config';
import { RingBuffer } from './RingBuffer';
import type { ImuSample } from '@/ble/parseFrame';

export const signalBuffer = new RingBuffer<ImuSample>(CHART_WINDOW_SAMPLES);

let lastSample: ImuSample | null = null;
let sampleCount = 0;
let lastRateCheck = Date.now();
let samplesSinceRateCheck = 0;
let currentRateHz = 0;

export function pushSample(s: ImuSample): void {
  signalBuffer.push(s);
  lastSample = s;
  sampleCount++;
  samplesSinceRateCheck++;

  const now = Date.now();
  const elapsed = now - lastRateCheck;
  if (elapsed >= 1000) {
    currentRateHz = (samplesSinceRateCheck * 1000) / elapsed;
    samplesSinceRateCheck = 0;
    lastRateCheck = now;
  }
}

export function snapshot(): ImuSample[] {
  return signalBuffer.toArray();
}

export function lastSampleRef(): ImuSample | null {
  return lastSample;
}

export function totalSamples(): number {
  return sampleCount;
}

export function effectiveRateHz(): number {
  return currentRateHz;
}

export function resetSignal(): void {
  signalBuffer.clear();
  lastSample = null;
  sampleCount = 0;
  samplesSinceRateCheck = 0;
  currentRateHz = 0;
  lastRateCheck = Date.now();
}
