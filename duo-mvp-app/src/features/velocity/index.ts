import { useState, useEffect, useRef } from 'react';
import { RepEvent, getVeloBar } from '@/services/ble';

export interface VelocityZone {
  id: string;
  label: string;
  min: number;
  max: number;
  color: string;
  description: string;
}

export const VELOCITY_ZONES: VelocityZone[] = [
  { id: 'strength',       label: 'Absolute Strength', min: 0,    max: 0.35, color: '#60A5FA', description: 'Max force, minimal velocity' },
  { id: 'strength-speed', label: 'Strength-Speed',    min: 0.35, max: 0.55, color: '#818CF8', description: 'High force, moderate velocity' },
  { id: 'power',          label: 'Power',              min: 0.55, max: 0.75, color: '#E6FF3D', description: 'Peak power output' },
  { id: 'speed-strength', label: 'Speed-Strength',    min: 0.75, max: 1.0,  color: '#FB923C', description: 'Moderate force, high velocity' },
  { id: 'speed',          label: 'Speed',              min: 1.0,  max: 9.99, color: '#F87171', description: 'Max velocity, minimal load' },
];

export function zoneFor(v: number): VelocityZone {
  return VELOCITY_ZONES.find(z => v >= z.min && v < z.max) ?? VELOCITY_ZONES[VELOCITY_ZONES.length - 1];
}

export function velocityLossPercent(reps: RepEvent[]): number {
  if (reps.length < 2) return 0;
  const first = reps[0].peakV;
  const last = reps[reps.length - 1].peakV;
  return parseFloat(((first - last) / first * 100).toFixed(1));
}

export function pairImbalance(reps: RepEvent[]): number {
  if (!reps.length) return 0;
  const avg = reps.reduce((s, r) => s + Math.abs(r.tilt), 0) / reps.length;
  return parseFloat(avg.toFixed(1));
}

export function useVelocityStream() {
  const [reps, setReps] = useState<RepEvent[]>([]);
  const [latest, setLatest] = useState<RepEvent | null>(null);
  const bar = useRef(getVeloBar());

  useEffect(() => {
    const unsub = bar.current.events.subscribe(evt => {
      setLatest(evt);
      setReps(prev => [...prev, evt]);
    });
    return unsub;
  }, []);

  function reset() { setReps([]); setLatest(null); }

  return { reps, latest, reset, zone: latest ? zoneFor(latest.peakV) : null };
}

export function generateMockBilateralHistory(days = 30) {
  const out: Array<{ date: string; left: number; right: number; exercise: string }> = [];
  const exercises = ['Back Squat', 'Deadlift', 'Bench Press', 'Overhead Press'];
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (Math.random() > 0.4) {
      out.push({
        date: d.toISOString().slice(0, 10),
        left: parseFloat((0.68 + Math.random() * 0.12).toFixed(3)),
        right: parseFloat((0.65 + Math.random() * 0.12).toFixed(3)),
        exercise: exercises[Math.floor(Math.random() * exercises.length)],
      });
    }
  }
  return out;
}
