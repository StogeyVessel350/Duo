import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UnitSystem = 'lbs' | 'kg';

interface UnitsContextValue {
  units: UnitSystem;
  setUnits: (u: UnitSystem) => void;
}

const UnitsContext = createContext<UnitsContextValue>({ units: 'lbs', setUnits: () => {} });

export function UnitsProvider({ children }: { children: React.ReactNode }) {
  const [units, setUnitsState] = useState<UnitSystem>('lbs');

  useEffect(() => {
    AsyncStorage.getItem('duo.units').then(v => {
      if (v === 'kg' || v === 'lbs') setUnitsState(v);
    });
  }, []);

  function setUnits(u: UnitSystem) {
    setUnitsState(u);
    AsyncStorage.setItem('duo.units', u);
  }

  return (
    <UnitsContext.Provider value={{ units, setUnits }}>
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnits() {
  return useContext(UnitsContext);
}

// Standalone helpers (mirror polish.jsx)
export function fromKg(kg: number | null, units: UnitSystem): number {
  if (kg == null) return 0;
  return units === 'lbs' ? kg * 2.20462 : kg;
}

export function toKg(val: number | null, units: UnitSystem): number {
  if (val == null) return 0;
  return units === 'lbs' ? val / 2.20462 : val;
}

export function displayWeight(kg: number | null, units: UnitSystem, decimals = 0): string {
  if (kg == null) return '—';
  const v = fromKg(kg, units);
  return decimals === 0 ? String(Math.round(v)) : v.toFixed(decimals);
}

export function unitLabel(units: UnitSystem): string {
  return units === 'lbs' ? 'lb' : 'kg';
}
