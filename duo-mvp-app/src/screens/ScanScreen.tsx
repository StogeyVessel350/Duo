import React from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useBleStore, startScan, stopScan, connect } from '@/ble/manager';

export default function ScanScreen() {
  const { state, discovered } = useBleStore();
  const router = useRouter();

  const scanning = state.kind === 'scanning';
  const connecting = state.kind === 'connecting' || state.kind === 'subscribing';

  React.useEffect(() => {
    if (state.kind === 'connected') router.replace('/live');
  }, [state, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DUO</Text>
        <Text style={styles.subtitle}>pair a sensor</Text>
      </View>

      {state.kind === 'error' && (
        <View style={styles.error}>
          <Text style={styles.errorText}>⚠ {state.message}</Text>
        </View>
      )}

      <FlatList
        style={styles.list}
        data={discovered}
        keyExtractor={(d) => d.id}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            {scanning ? (
              <>
                <ActivityIndicator color="#4ade80" />
                <Text style={styles.emptyText}>scanning for nearby DUO sensors…</Text>
              </>
            ) : (
              <Text style={styles.emptyText}>tap scan to start</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => connect(item)}
            disabled={connecting}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{item.name ?? 'unknown'}</Text>
              <Text style={styles.rowId}>{item.id}</Text>
            </View>
            <Text style={styles.rowAction}>
              {connecting ? '…' : 'connect'}
            </Text>
          </Pressable>
        )}
      />

      <View style={styles.footer}>
        {scanning ? (
          <Pressable style={styles.btnSecondary} onPress={stopScan}>
            <Text style={styles.btnSecondaryText}>stop</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.btnPrimary}
            onPress={startScan}
            disabled={connecting}
          >
            <Text style={styles.btnPrimaryText}>scan</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0e' },
  header: { paddingHorizontal: 24, paddingTop: 8 },
  title: { color: '#fff', fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  subtitle: { color: '#888', fontSize: 14, marginTop: 2 },
  list: { flex: 1, marginTop: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  rowPressed: { backgroundColor: '#141418' },
  rowName: { color: '#fff', fontSize: 16, fontWeight: '500' },
  rowId: { color: '#555', fontSize: 11, marginTop: 2, fontFamily: 'Menlo' },
  rowAction: { color: '#4ade80', fontSize: 14, fontWeight: '600' },
  emptyBox: { padding: 48, alignItems: 'center' },
  emptyText: { color: '#555', fontSize: 13, marginTop: 8 },
  error: { marginHorizontal: 24, padding: 12, backgroundColor: '#2a1616', borderRadius: 8, marginTop: 16 },
  errorText: { color: '#fca5a5', fontSize: 13 },
  footer: { padding: 24 },
  btnPrimary: {
    backgroundColor: '#4ade80',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#000', fontSize: 16, fontWeight: '700' },
  btnSecondary: {
    backgroundColor: '#222',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnSecondaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
