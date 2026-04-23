import React, { useState, useMemo } from 'react';
import {
  View, ScrollView, Pressable, Switch, StyleSheet, Animated,
  Text as RNText,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { TOKENS } from '@/theme';
import { Text, Button, Icon } from '@/components/primitives';
import { ScreenHeader, DuoMark } from '@/components/shell';
import { SubHeader } from '@/components/shell';
import { TAB_BAR_CLEARANCE } from '@/components/shell/TabBar';
import { useProfile, mockProfile, expLevelLabel } from '@/context/ProfileContext';
import { useUnits, fromKg, unitLabel } from '@/context/UnitsContext';
import { useAuth } from '@/context/AuthContext';
import { BodyMetricsPage } from '@/features/profile/BodyMetricsPage';
import { BilateralDashboard } from '@/features/profile/BilateralDashboard';

type SubPage = null | 'metrics' | 'bilateral' | 'preferences' | 'devices' | 'goals' | 'notifications' | 'export' | 'delete' | 'terms' | 'privacy' | 'licenses';

// ─── Toggle ──────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onChange(!on); }}
      style={[styles.toggle, on && styles.toggleOn]}
    >
      <View style={[styles.toggleThumb, on && styles.toggleThumbOn]} />
    </Pressable>
  );
}

// ─── SettingsRow ─────────────────────────────────────────────
function SettingsRow({
  icon, label, hint, right, onPress, danger, accent,
}: {
  icon?: string; label: string; hint?: string; right?: React.ReactNode;
  onPress?: () => void; danger?: boolean; accent?: boolean;
}) {
  const color = danger ? TOKENS.color.semantic.danger : (accent ? TOKENS.color.accent.primary : TOKENS.color.fg.primary);
  return (
    <Pressable
      onPress={onPress ? () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); } : undefined}
      style={styles.settingsRow}
    >
      {icon && (
        <View style={[styles.settingsIcon, danger && { backgroundColor: TOKENS.color.semantic.danger + '14' }]}>
          <Icon name={icon as any} size={13} color={danger ? TOKENS.color.semantic.danger : TOKENS.color.fg.secondary} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15, color }}>{label}</Text>
        {hint && <Text style={{ fontSize: 13, color: TOKENS.color.fg.tertiary, marginTop: 2 }}>{hint}</Text>}
      </View>
      {right !== undefined ? right : (onPress && <Icon name="chevron" size={11} color={TOKENS.color.fg.tertiary} />)}
    </Pressable>
  );
}

// ─── SettingsGroup ────────────────────────────────────────────
function SettingsGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  const kids = React.Children.toArray(children);
  return (
    <View style={{ marginBottom: TOKENS.space.lg }}>
      {title && (
        <View style={{ paddingHorizontal: TOKENS.space.md, marginBottom: TOKENS.space.sm }}>
          <Text style={styles.capLabel}>{title}</Text>
        </View>
      )}
      <View style={styles.group}>
        {kids.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={{ height: 1, marginLeft: 52, backgroundColor: TOKENS.color.border.subtle }} />}
            {child}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

// ─── StatTile ────────────────────────────────────────────────
function StatTile({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.capLabel}>{label}</Text>
      <Text style={{ fontSize: 22, fontWeight: '500', letterSpacing: -0.02 * 22, color: accent || TOKENS.color.fg.primary, marginTop: 4 }}>
        {value}{unit && <Text style={{ fontSize: 11, color: TOKENS.color.fg.tertiary }}> {unit}</Text>}
      </Text>
    </View>
  );
}

// ─── Preferences sub-page ────────────────────────────────────
function PreferencesPage({ onBack }: { onBack: () => void }) {
  const { units, setUnits } = useUnits();
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [restSec, setRestSec] = useState(120);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SubHeader title="Preferences" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: TOKENS.space.xl, paddingBottom: 120 }}>
        <SettingsGroup title="Units">
          <View style={{ padding: TOKENS.space.md }}>
            <View style={{ flexDirection: 'row', gap: TOKENS.space.sm }}>
              {(['lbs', 'kg'] as const).map(u => (
                <Pressable
                  key={u}
                  onPress={() => { Haptics.selectionAsync(); setUnits(u); }}
                  style={[styles.unitBtn, units === u && styles.unitBtnActive]}
                >
                  <Text style={{ fontSize: 14, fontWeight: units === u ? '600' : '400', textTransform: 'uppercase', letterSpacing: 0.04 * 14, color: units === u ? TOKENS.color.accent.onPrimary : TOKENS.color.fg.primary }}>
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize: 13, color: TOKENS.color.fg.tertiary, marginTop: TOKENS.space.sm }}>
              Applies across the app.
            </Text>
          </View>
        </SettingsGroup>

        <SettingsGroup title="Rest timer">
          <View style={{ padding: TOKENS.space.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={{ fontSize: 15, color: TOKENS.color.fg.primary }}>Default rest between sets</Text>
              <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 15, color: TOKENS.color.accent.primary }}>
                {Math.floor(restSec / 60)}:{String(restSec % 60).padStart(2, '0')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: TOKENS.space.md }}>
              {[30, 60, 90, 120, 180, 240, 300].map(s => (
                <Pressable
                  key={s}
                  onPress={() => { Haptics.selectionAsync(); setRestSec(s); }}
                  style={[styles.restBtn, restSec === s && styles.restBtnActive]}
                >
                  <RNText style={[styles.restBtnText, restSec === s && { color: TOKENS.color.accent.onPrimary }]}>
                    {s < 60 ? `${s}s` : `${s / 60}m`}
                  </RNText>
                </Pressable>
              ))}
            </View>
          </View>
        </SettingsGroup>

        <SettingsGroup title="Feedback">
          <SettingsRow icon="bolt" label="Haptics" hint="Vibrate on rep, zone change, timer"
            right={<Toggle on={hapticsEnabled} onChange={setHapticsEnabled} />} />
        </SettingsGroup>

        <SettingsGroup title="Coaching">
          <SettingsRow icon="coach" label="AI coaching" hint="Load adjustments, form cues, corrective suggestions"
            right={<Toggle on={aiEnabled} onChange={setAiEnabled} />} />
        </SettingsGroup>
      </ScrollView>
    </View>
  );
}

// ─── Devices sub-page ─────────────────────────────────────────
function DevicesPage({ onBack }: { onBack: () => void }) {
  const profile = useMemo(() => mockProfile(), []);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SubHeader title="Devices" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: TOKENS.space.xl, paddingBottom: 120 }}>
        {profile.devices.map(d => (
          <View key={d.id} style={styles.deviceCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.md }}>
              <Icon name="bluetooth" size={20} color={TOKENS.color.accent.primary} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.sm }}>
                  <Text style={{ fontSize: 17, fontWeight: '600', color: TOKENS.color.fg.primary }}>{d.name}</Text>
                  {d.isPrimary && (
                    <View style={styles.primaryBadge}>
                      <RNText style={styles.primaryBadgeText}>Primary</RNText>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 13, color: TOKENS.color.fg.tertiary, marginTop: 2 }}>
                  Last seen {d.lastSeen} · firmware {d.firmware}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: TOKENS.space.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={styles.capLabel}>Battery</Text>
                <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, color: d.battery > 0.3 ? TOKENS.color.accent.primary : TOKENS.color.semantic.warning }}>
                  {Math.round(d.battery * 100)}%
                </Text>
              </View>
              <View style={styles.batteryBar}>
                <View style={[styles.batteryFill, {
                  width: `${d.battery * 100}%` as any,
                  backgroundColor: d.battery > 0.3 ? TOKENS.color.accent.primary : TOKENS.color.semantic.warning,
                }]} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: TOKENS.space.sm, marginTop: TOKENS.space.md }}>
              <View style={[styles.sensorPill, { backgroundColor: TOKENS.color.bilateral.left + '14', borderColor: TOKENS.color.bilateral.left + '40' }]}>
                <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: TOKENS.color.bilateral.left, textAlign: 'center' }}>LEFT</Text>
                <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: TOKENS.color.fg.secondary, textAlign: 'center', marginTop: 2 }}>Connected</Text>
              </View>
              <View style={[styles.sensorPill, { backgroundColor: TOKENS.color.bilateral.right + '14', borderColor: TOKENS.color.bilateral.right + '40' }]}>
                <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: TOKENS.color.bilateral.right, textAlign: 'center' }}>RIGHT</Text>
                <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: TOKENS.color.fg.secondary, textAlign: 'center', marginTop: 2 }}>Connected</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: TOKENS.space.sm, marginTop: TOKENS.space.md }}>
              <Button variant="ghost" size="sm" full>Rename</Button>
              <Button variant="ghost" size="sm" full>Unpair</Button>
            </View>
          </View>
        ))}
        <Button variant="ghost" size="md" full leading={<Icon name="plus" size={14} color={TOKENS.color.fg.primary} />}>
          Pair another DUO
        </Button>
      </ScrollView>
    </View>
  );
}

// ─── Goals sub-page ───────────────────────────────────────────
function GoalsPage({ onBack }: { onBack: () => void }) {
  const { units } = useUnits();
  const profile = useMemo(() => mockProfile(), []);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SubHeader title="Goals" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: TOKENS.space.xl, paddingBottom: 120 }}>
        {profile.goals.map(g => {
          const pct = g.currentKg / g.targetKg;
          const daysToTarget = Math.max(0, Math.ceil((new Date(g.targetDate).getTime() - new Date(2026, 3, 22).getTime()) / 86400000));
          const EX_NAMES: Record<string, string> = { 'back-squat': 'Back squat', 'bench-press': 'Bench press', 'deadlift': 'Deadlift' };
          return (
            <View key={g.id} style={styles.goalCard}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: TOKENS.space.sm }}>
                <Text style={{ fontSize: 17, fontWeight: '600', color: TOKENS.color.fg.primary }}>{EX_NAMES[g.exerciseId] || g.exerciseId}</Text>
                <Text style={{ fontSize: 13, color: TOKENS.color.fg.tertiary }}>· 1RM</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 6 }}>
                <RNText style={styles.goalCurrent}>{Math.round(fromKg(g.currentKg, units))}</RNText>
                <Text style={{ fontSize: 15, color: TOKENS.color.fg.tertiary, paddingBottom: 4 }}>
                  / {Math.round(fromKg(g.targetKg, units))} {unitLabel(units)}
                </Text>
              </View>
              <View style={styles.goalBar}>
                <View style={[styles.goalBarFill, { width: `${pct * 100}%` as any }]} />
              </View>
              <Text style={{ fontSize: 13, color: TOKENS.color.fg.tertiary, marginTop: 10 }}>
                Target in {daysToTarget} days · {new Date(g.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          );
        })}
        <Button variant="ghost" size="md" full leading={<Icon name="plus" size={14} color={TOKENS.color.fg.primary} />}>
          New goal
        </Button>
      </ScrollView>
    </View>
  );
}

// ─── Notifications sub-page ───────────────────────────────────
function NotificationsPage({ onBack }: { onBack: () => void }) {
  const [notifPRs, setNotifPRs] = useState(true);
  const [notifStreaks, setNotifStreaks] = useState(true);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SubHeader title="Notifications" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: TOKENS.space.xl, paddingBottom: 120 }}>
        <SettingsGroup>
          <SettingsRow icon="bolt" label="Personal records" hint="When you hit a new PR"
            right={<Toggle on={notifPRs} onChange={setNotifPRs} />} />
          <SettingsRow icon="coach" label="Streak reminders" hint="Nudge if you haven't trained in 3 days"
            right={<Toggle on={notifStreaks} onChange={setNotifStreaks} />} />
        </SettingsGroup>
      </ScrollView>
    </View>
  );
}

// ─── Legal page ───────────────────────────────────────────────
function LegalPage({ kind, onBack }: { kind: string; onBack: () => void }) {
  const titles: Record<string, string> = { terms: 'Terms of service', privacy: 'Privacy policy', licenses: 'Open-source licenses' };
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SubHeader title={titles[kind] || kind} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: TOKENS.space.xl, paddingBottom: 120 }}>
        <View style={{ padding: TOKENS.space.xl, alignItems: 'center' }}>
          <Text style={{ fontSize: 15, color: TOKENS.color.fg.secondary, textAlign: 'center' }}>
            {titles[kind]} — placeholder
          </Text>
          <Text style={{ fontSize: 13, color: TOKENS.color.fg.tertiary, textAlign: 'center', marginTop: 8 }}>
            In production, this would be the full legal text. Mocked for the prototype.
          </Text>
        </View>
        <Button variant="ghost" size="md" onPress={onBack}>Back</Button>
      </ScrollView>
    </View>
  );
}

// ─── Delete account page ──────────────────────────────────────
function DeleteAccountPage({ onBack }: { onBack: () => void }) {
  const [confirmText, setConfirmText] = useState('');
  const { TextInput } = require('react-native');
  const insets = useSafeAreaInsets();
  const canDelete = confirmText === 'DELETE';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SubHeader title="Delete account" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: TOKENS.space.xl }}>
        <View style={styles.dangerBox}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: TOKENS.color.semantic.danger }}>
            This can't be undone.
          </Text>
          <Text style={{ fontSize: 13, color: TOKENS.color.fg.secondary, marginTop: 8 }}>
            All workouts, velocity data, bilateral history, and goals will be permanently deleted. Export first if you want a copy.
          </Text>
        </View>
        <View style={{ marginTop: TOKENS.space.xl }}>
          <Text style={[styles.capLabel, { marginBottom: 6 }]}>Type DELETE to confirm</Text>
          <TextInput
            value={confirmText}
            onChangeText={(t: string) => setConfirmText(t.toUpperCase())}
            style={styles.deleteInput}
            placeholderTextColor={TOKENS.color.fg.tertiary}
          />
          <View style={{ marginTop: TOKENS.space.xl }}>
            <Button
              variant="primary"
              size="md"
              full
              disabled={!canDelete}
              onPress={() => {}}
            >
              Permanently delete account
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Main profile screen ──────────────────────────────────────
function ProfileMain({ onOpenSubPage }: { onOpenSubPage: (p: SubPage) => void }) {
  const insets = useSafeAreaInsets();
  const { profile: overrides } = useProfile();
  const { units } = useUnits();
  const { user, signOut } = useAuth();
  const profile = useMemo(() => mockProfile(overrides), [overrides]);
  // Use real auth name/email when available
  const displayName = user?.name || profile.name;
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const stats = profile.stats;
  const volumeDisplay = Math.round(fromKg(stats.totalVolumeKg, units) / 1000);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader right={undefined}>
        <DuoMark size={13} />
      </ScreenHeader>

      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE + 20 }}>
        <View style={{ paddingHorizontal: TOKENS.space.xl, paddingBottom: TOKENS.space.lg }}>
          <Text style={{ fontSize: 28, lineHeight: 34, fontWeight: '500', letterSpacing: -0.01 * 28, color: TOKENS.color.fg.primary }}>Profile</Text>
        </View>

        <View style={{ paddingHorizontal: TOKENS.space.xl, paddingBottom: TOKENS.space.md }}>
          {/* Athlete card */}
          <View style={styles.athleteCard}>
            <View style={styles.avatar}>
              <Text style={{ fontSize: 20, fontWeight: '600', color: TOKENS.color.bg.base }}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: TOKENS.color.fg.primary }}>{displayName}</Text>
              <Text style={{ fontSize: 13, color: TOKENS.color.fg.tertiary, marginTop: 2 }}>
                {expLevelLabel(profile.experienceLevel)} · {Math.round(fromKg(profile.weightKg, units))}{unitLabel(units)}
              </Text>
            </View>
            <Pressable onPress={() => onOpenSubPage('metrics')} style={styles.editBtn}>
              <Text style={{ fontSize: 12, color: TOKENS.color.fg.secondary }}>Edit</Text>
            </Pressable>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatTile label="Workouts" value={String(stats.totalWorkouts)} />
            <StatTile label="Volume" value={`${volumeDisplay}k`} unit={unitLabel(units)} />
            <StatTile label="Streak" value={String(stats.currentStreakDays)} unit="d" accent={TOKENS.color.accent.primary} />
          </View>
        </View>

        <View style={{ paddingHorizontal: TOKENS.space.xl }}>
          {/* Performance */}
          <SettingsGroup title="Performance">
            <SettingsRow icon="coach" label="Goals"
              hint={`${profile.goals.length} active`}
              onPress={() => onOpenSubPage('goals')} />
            <SettingsRow icon="bolt" label="Bilateral analysis"
              hint="Tap to open"
              accent
              onPress={() => onOpenSubPage('bilateral')} />
          </SettingsGroup>

          {/* Body metrics */}
          <SettingsGroup title="Body metrics">
            <SettingsRow icon="profile" label="Height"
              right={<Text style={{ fontSize: 15, color: TOKENS.color.fg.tertiary }}>
                {units === 'lbs'
                  ? (() => { const i = Math.round(profile.heightCm / 2.54); return `${Math.floor(i / 12)}′ ${i % 12}″`; })()
                  : `${profile.heightCm} cm`}
              </Text>}
              onPress={() => onOpenSubPage('metrics')} />
            <SettingsRow icon="bolt" label="Weight"
              right={<Text style={{ fontSize: 15, color: TOKENS.color.fg.tertiary }}>
                {Math.round(fromKg(profile.weightKg, units))} {unitLabel(units)}
              </Text>}
              onPress={() => onOpenSubPage('metrics')} />
            <SettingsRow icon="coach" label="Experience"
              right={<Text style={{ fontSize: 15, color: TOKENS.color.fg.tertiary }}>{expLevelLabel(profile.experienceLevel)}</Text>}
              onPress={() => onOpenSubPage('metrics')} />
          </SettingsGroup>

          {/* Devices */}
          <SettingsGroup title="Devices">
            {profile.devices.map(d => (
              <SettingsRow key={d.id} icon="bluetooth" label={d.name}
                hint={`Battery ${Math.round(d.battery * 100)}% · firmware ${d.firmware}`}
                accent
                onPress={() => onOpenSubPage('devices')} />
            ))}
            <SettingsRow icon="plus" label="Pair new device"
              onPress={() => {}} />
          </SettingsGroup>

          {/* Preferences */}
          <SettingsGroup title="Preferences">
            <SettingsRow icon="bolt" label="Preferences"
              hint="Units, rest timer, haptics, AI coaching"
              onPress={() => onOpenSubPage('preferences')} />
            <SettingsRow icon="history" label="Notifications"
              hint="PRs, streaks, reminders"
              onPress={() => onOpenSubPage('notifications')} />
          </SettingsGroup>

          {/* Data */}
          <SettingsGroup title="Data">
            <SettingsRow icon="settings" label="Export all data"
              hint="Download as JSON"
              onPress={() => onOpenSubPage('export')} />
            <SettingsRow icon="close" label="Delete account"
              danger
              onPress={() => onOpenSubPage('delete')} />
          </SettingsGroup>

          {/* About */}
          <SettingsGroup title="About">
            <SettingsRow label="Version"
              right={<Text style={{ fontSize: 15, color: TOKENS.color.fg.tertiary }}>1.0.0 · build 124</Text>} />
            <SettingsRow label="Terms of service" onPress={() => onOpenSubPage('terms')} />
            <SettingsRow label="Privacy policy" onPress={() => onOpenSubPage('privacy')} />
            <SettingsRow label="Open-source licenses" onPress={() => onOpenSubPage('licenses')} />
          </SettingsGroup>

          <View style={{ paddingBottom: 20 }}>
            <Button variant="ghost" size="md" full onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); signOut(); }}>Sign out</Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Export page ──────────────────────────────────────────────
function DataExportPage({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const insets = useSafeAreaInsets();

  const runExport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState('running');
    setProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p += 0.18;
      setProgress(Math.min(1, p));
      if (p >= 1) { clearInterval(iv); setState('done'); }
    }, 120);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SubHeader title="Export data" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: TOKENS.space.xl, paddingBottom: 120 }}>
        <Text style={{ fontSize: 15, color: TOKENS.color.fg.secondary, lineHeight: 22 }}>
          Bundles all your workouts, velocity streams, goals, and bilateral data into a single JSON file.
        </Text>
        <View style={styles.exportCard}>
          {state === 'idle' && (
            <Button variant="primary" size="md" full onPress={runExport}
              leading={<Icon name="settings" size={14} color={TOKENS.color.accent.onPrimary} />}>
              Export all data
            </Button>
          )}
          {state === 'running' && (
            <View>
              <Text style={{ fontSize: 15, color: TOKENS.color.fg.primary }}>Preparing your archive…</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
              </View>
              <Text style={{ fontSize: 13, fontFamily: 'JetBrainsMono_400Regular', color: TOKENS.color.fg.tertiary, marginTop: 6 }}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
          )}
          {state === 'done' && (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.sm }}>
                <View style={styles.checkCircle}>
                  <Icon name="check" size={14} color={TOKENS.color.accent.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, color: TOKENS.color.fg.primary }}>Archive ready</Text>
                  <Text style={{ fontSize: 13, color: TOKENS.color.fg.tertiary }}>duo-export-2026-04-22.json · 284 KB</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: TOKENS.space.sm, marginTop: TOKENS.space.md }}>
                <Button variant="primary" size="sm" full>Share</Button>
                <Button variant="ghost" size="sm" full onPress={() => setState('idle')}>Done</Button>
              </View>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 13, color: TOKENS.color.fg.tertiary, marginTop: TOKENS.space.lg }}>
          Your data is yours. DUO doesn't sell or share it.
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── ProfileScreen orchestrator ───────────────────────────────
export default function ProfileScreen() {
  const [subPage, setSubPage] = useState<SubPage>(null);

  switch (subPage) {
    case 'metrics':       return <BodyMetricsPage onBack={() => setSubPage(null)} />;
    case 'bilateral':     return <BilateralDashboard onBack={() => setSubPage(null)} />;
    case 'preferences':   return <PreferencesPage onBack={() => setSubPage(null)} />;
    case 'devices':       return <DevicesPage onBack={() => setSubPage(null)} />;
    case 'goals':         return <GoalsPage onBack={() => setSubPage(null)} />;
    case 'notifications': return <NotificationsPage onBack={() => setSubPage(null)} />;
    case 'export':        return <DataExportPage onBack={() => setSubPage(null)} />;
    case 'delete':        return <DeleteAccountPage onBack={() => setSubPage(null)} />;
    case 'terms':
    case 'privacy':
    case 'licenses':      return <LegalPage kind={subPage} onBack={() => setSubPage(null)} />;
    default:              return <ProfileMain onOpenSubPage={setSubPage} />;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.color.bg.base },
  capLabel: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, fontWeight: '600',
    letterSpacing: 0.08 * 11, textTransform: 'uppercase', color: TOKENS.color.fg.tertiary,
  },
  group: {
    backgroundColor: TOKENS.color.bg.surface, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.md, overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.md,
    paddingHorizontal: TOKENS.space.md, paddingVertical: TOKENS.space.md, minHeight: 52,
  },
  settingsIcon: {
    width: 28, height: 28, borderRadius: TOKENS.radius.sm,
    backgroundColor: TOKENS.color.bg.elevated,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  athleteCard: {
    backgroundColor: TOKENS.color.bg.surface, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.lg, padding: TOKENS.space.lg,
    flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.md,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: TOKENS.color.bilateral.left,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  editBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: TOKENS.color.border.default, borderRadius: TOKENS.radius.pill,
  },
  statsRow: { flexDirection: 'row', gap: TOKENS.space.sm, marginTop: TOKENS.space.md },
  statTile: {
    flex: 1, padding: TOKENS.space.md,
    backgroundColor: TOKENS.color.bg.surface, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.md,
  },

  toggle: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: TOKENS.color.bg.elevated,
    borderWidth: 1, borderColor: TOKENS.color.border.default,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: TOKENS.color.accent.primary, borderColor: TOKENS.color.accent.primary },
  toggleThumb: {
    position: 'absolute', left: 2, width: 20, height: 20, borderRadius: 10,
    backgroundColor: TOKENS.color.fg.primary,
  },
  toggleThumbOn: { left: 22, backgroundColor: TOKENS.color.accent.onPrimary },

  unitBtn: {
    flex: 1, padding: 12,
    backgroundColor: TOKENS.color.bg.elevated,
    borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.md, alignItems: 'center',
  },
  unitBtnActive: { backgroundColor: TOKENS.color.accent.primary, borderColor: TOKENS.color.accent.primary },

  restBtn: {
    flex: 1, paddingVertical: 8,
    backgroundColor: TOKENS.color.bg.elevated,
    borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.sm, alignItems: 'center',
  },
  restBtnActive: { backgroundColor: TOKENS.color.accent.primary, borderColor: TOKENS.color.accent.primary },
  restBtnText: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: TOKENS.color.fg.secondary,
  },

  deviceCard: {
    backgroundColor: TOKENS.color.bg.surface, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.lg, padding: TOKENS.space.lg, marginBottom: TOKENS.space.md,
  },
  primaryBadge: {
    paddingHorizontal: 6, paddingVertical: 1,
    backgroundColor: TOKENS.color.accent.primary + '22', borderRadius: 3,
  },
  primaryBadgeText: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, fontWeight: '600',
    color: TOKENS.color.accent.primary, letterSpacing: 0.1 * 9, textTransform: 'uppercase',
  },
  batteryBar: {
    height: 4, backgroundColor: TOKENS.color.bg.elevated, borderRadius: 2, overflow: 'hidden',
  },
  batteryFill: { height: '100%', borderRadius: 2 },
  sensorPill: {
    flex: 1, padding: TOKENS.space.sm, borderWidth: 1, borderRadius: TOKENS.radius.md,
  },

  goalCard: {
    backgroundColor: TOKENS.color.bg.surface, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.lg, padding: TOKENS.space.lg, marginBottom: TOKENS.space.md,
  },
  goalCurrent: {
    fontSize: 32, fontWeight: '500', letterSpacing: -0.02 * 32, color: TOKENS.color.accent.primary,
  },
  goalBar: {
    height: 6, backgroundColor: TOKENS.color.bg.elevated, borderRadius: 3, overflow: 'hidden', marginTop: TOKENS.space.md,
  },
  goalBarFill: { height: '100%', backgroundColor: TOKENS.color.accent.primary, borderRadius: 3 },

  dangerBox: {
    padding: TOKENS.space.lg,
    backgroundColor: TOKENS.color.semantic.danger + '14',
    borderWidth: 1, borderColor: TOKENS.color.semantic.danger + '40',
    borderRadius: TOKENS.radius.md,
  },
  deleteInput: {
    padding: 12, marginTop: 8,
    backgroundColor: TOKENS.color.bg.elevated,
    borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.md,
    color: TOKENS.color.fg.primary,
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 16, letterSpacing: 0.05 * 16,
  },

  exportCard: {
    marginTop: TOKENS.space.xl, padding: TOKENS.space.lg,
    backgroundColor: TOKENS.color.bg.surface,
    borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.md,
  },
  progressBar: {
    marginTop: TOKENS.space.md, height: 4,
    backgroundColor: TOKENS.color.bg.elevated, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: TOKENS.color.accent.primary, borderRadius: 2,
  },
  checkCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: TOKENS.color.accent.primary + '22',
    alignItems: 'center', justifyContent: 'center',
  },
});
