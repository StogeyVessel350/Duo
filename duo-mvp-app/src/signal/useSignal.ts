/**
 * React hook that re-renders at CHART_FPS with the current signal snapshot.
 * The underlying data is updated by BLE notifications at ~100 Hz; the hook
 * just paces how often React sees it.
 */

import { useEffect, useState } from 'react';
import { CHART_FPS } from '@/config';
import { snapshot, lastSampleRef, effectiveRateHz, totalSamples } from './store';
import type { ImuSample } from '@/ble/parseFrame';

export interface SignalSnapshot {
  samples: ImuSample[];
  last: ImuSample | null;
  rateHz: number;
  total: number;
}

export function useSignal(): SignalSnapshot {
  const [snap, setSnap] = useState<SignalSnapshot>({
    samples: [],
    last: null,
    rateHz: 0,
    total: 0,
  });

  useEffect(() => {
    const intervalMs = 1000 / CHART_FPS;
    const id = setInterval(() => {
      setSnap({
        samples: snapshot(),
        last: lastSampleRef(),
        rateHz: effectiveRateHz(),
        total: totalSamples(),
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, []);

  return snap;
}
