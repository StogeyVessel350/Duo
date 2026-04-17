import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useBleStore, disconnect } from '@/ble/manager';
import { useSignal } from '@/signal/useSignal';
import { LiveChart } from '@/signal/LiveChart';

export default function LiveScreen() {
  const { state } = useBleStore();
  const router = useRouter();
  const { samples, last, rateHz, total } = useSignal();
  const { width } = useWindowDimensions();

  React.useEffect(() => {
    if (state.kind === 'idle' || state.kind === 'error') router.replace('/');
  }, [state, router]);

  const deviceName = state.kind === 'connected' ? state.device.name : '';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.deviceName}>{deviceName}</Text>
          <Text style={styles.status}>
            {state.kind === 'connected' ? 'connected' : state.kind}
          </Text>
        </View>
        <Pressable style={styles.btnDisconnect} onPress={disconnect}>
          <Text style={styles.btnDisconnectText}>disconnect</Text>
        </Pressable>
      </View>

      <View style={styles.chartWrap}>
        <Text style={styles.chartLabel}>|a| − 1g</Text>
        <LiveChart samples={samples} width={width - 32} height={240} yRange={[-2, 2]} />
      </View>

      <View style={styles.statsGrid}>
        <Stat label="rate" value={`${rateHz.toFixed(0)} Hz`} />
        <Stat label="samples" value={total.toLocaleString()} />
        <Stat
          label="ax"
          value={last ? last.ax.toFixed(2) : '—'}
          suffix="g"
        />
        <Stat
          label="ay"
          value={last ? last.ay.toFixed(2) : '—'}
          suffix="g"
        />
        <Stat
          label="az"
          value={last ? last.az.toFixed(2) : '—'}
          suffix="g"
        />
        <Stat
          label="|a|"
          value={last ? (last.mag + 1).toFixed(2) : '—'}
          suffix="g"
        />
      </View>
    </SafeAreaView>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {value}
        {suffix && <Text style={styles.statSuffix}> {suffix}</Text>}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0e' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  deviceName: { color: '#fff', fontSize: 18, fontWeight: '600' },
  status: { color: '#4ade80', fontSize: 12, marginTop: 2 },
  btnDisconnect: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#222',
    borderRadius: 8,
  },
  btnDisconnectText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  chartWrap: { padding: 16 },
  chartLabel: { color: '#666', fontSize: 11, marginBottom: 6, fontFamily: 'Menlo' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  stat: {
    width: '33.333%',
    padding: 12,
  },
  statLabel: { color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '600', marginTop: 4, fontFamily: 'Menlo' },
  statSuffix: { color: '#666', fontSize: 14, fontWeight: '400' },
});
