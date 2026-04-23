import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TOKENS } from '@/theme';
import { TabBar } from '@/components/shell';
import WorkoutScreen from './workout';
import HistoryScreen from './history';
import LibraryScreen from './library';
import CoachScreen from './coach';
import ProfileScreen from './profile';

export default function AppIndex() {
  const [activeTab, setActiveTab] = useState('workout');

  return (
    // Root takes full screen. TabBar is absolute on top; content fills underneath.
    <View style={styles.root}>
      {activeTab === 'workout' && <WorkoutScreen />}
      {activeTab === 'history' && <HistoryScreen />}
      {activeTab === 'library' && <LibraryScreen />}
      {activeTab === 'coach' && <CoachScreen />}
      {activeTab === 'profile' && <ProfileScreen />}

      <TabBar activeTab={activeTab} onSelect={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TOKENS.color.bg.base,
  },
});
