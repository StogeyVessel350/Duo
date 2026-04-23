import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Only the user-editable overrides are stored; mockProfile() fills in the rest.
export interface ProfileOverrides {
  age: number;
  heightCm: number;
  weightKg: number;
  experienceLevel: number; // 0..4
}

export const DEFAULT_PROFILE_OVERRIDES: ProfileOverrides = {
  age: 29,
  heightCm: 170,
  weightKg: 68,
  experienceLevel: 2,
};

// Full mock profile — mirrors polish.jsx mockProfile()
export function mockProfile(overrides?: Partial<ProfileOverrides>) {
  const o = overrides || {};
  return {
    name: 'Jordan Lee',
    initials: 'JL',
    email: 'jordan@example.com',
    avatarSeed: 'JL',
    experienceLevel: o.experienceLevel ?? 2,
    sex: 'female',
    age: o.age ?? 29,
    heightCm: o.heightCm ?? 170,
    weightKg: o.weightKg ?? 68,
    joinedAt: '2024-10-12',
    stats: {
      totalWorkouts: 128,
      totalVolumeKg: 384200,
      currentStreakDays: 12,
      prsThisMonth: 3,
    },
    goals: [
      { id: 'g1', type: '1rm', exerciseId: 'back-squat', currentKg: 130, targetKg: 180, targetDate: '2026-07-15' },
      { id: 'g2', type: '1rm', exerciseId: 'bench-press', currentKg: 85, targetKg: 100, targetDate: '2026-08-20' },
    ],
    devices: [
      { id: 'd1', name: "Jordan's DUO", battery: 0.87, firmware: '2.1.4', lastSeen: 'Just now', paired: true, isPrimary: true },
    ],
    prefs: {
      units: 'lbs',
      restTimerSec: 120,
      hapticsEnabled: true,
      aiCoachingEnabled: true,
      notifPRs: true,
      notifStreaks: true,
    },
  };
}

export function expLevelLabel(n: number): string {
  return (['Novice', 'Beginner', 'Intermediate', 'Advanced', 'Elite'][n]) || 'Intermediate';
}

interface ProfileContextValue {
  profile: ProfileOverrides;
  setProfile: (p: ProfileOverrides) => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: DEFAULT_PROFILE_OVERRIDES,
  setProfile: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<ProfileOverrides>(DEFAULT_PROFILE_OVERRIDES);

  useEffect(() => {
    AsyncStorage.getItem('duo.profile').then(v => {
      if (v) {
        try {
          const saved = JSON.parse(v);
          setProfileState({ ...DEFAULT_PROFILE_OVERRIDES, ...saved });
        } catch {}
      }
    });
  }, []);

  function setProfile(p: ProfileOverrides) {
    setProfileState(p);
    AsyncStorage.setItem('duo.profile', JSON.stringify(p));
  }

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
