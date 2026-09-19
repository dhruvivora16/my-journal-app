import React, { useCallback, useState } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { getSetting, setSetting, getStats, clearAllData } from './db';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [stats, setStats] = useState({ total: 0, unsynced: 0 });

  const refresh = useCallback(async () => {
    try {
      setSyncEnabled((await getSetting(db, 'cloud_sync_enabled', '0')) === '1');
      setStats(await getStats(db));
    } catch (e) {
      Alert.alert('Error', 'Could not load settings.');
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const toggleSync = async (value) => {
    setSyncEnabled(value);
    try {
      await setSetting(db, 'cloud_sync_enabled', value ? '1' : '0');
    } catch (e) {
      setSyncEnabled(!value);
      Alert.alert('Error', 'Could not save setting.');
    }
  };

  const syncNow = () => {
    // Wired up to Supabase in the next step.
    Alert.alert('Not connected yet', 'Cloud sync is added in the next step.');
  };

  const confirmClear = () => {
    Alert.alert(
      'Clear all data?',
      'This permanently deletes ALL notes, recordings, images and files from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData(db);
              await refresh();
              Alert.alert('Done', 'All data was cleared.');
            } catch (e) {
              Alert.alert('Error', 'Could not clear data.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.section}>Storage</Text>
      <View style={styles.card}>
        <Text style={styles.line}>Notes on this device: {stats.total}</Text>
        <Text style={styles.line}>Waiting to sync: {stats.unsynced}</Text>
      </View>

      <Text style={styles.section}>Cloud sync</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.line}>Enable cloud sync</Text>
          <Switch value={syncEnabled} onValueChange={toggleSync} />
        </View>
        <TouchableOpacity
          style={[styles.btn, !syncEnabled && { opacity: 0.4 }]}
          onPress={syncNow}
          disabled={!syncEnabled}
        >
          <Text style={styles.btnText}>Sync now</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>Danger zone</Text>
      <View style={styles.card}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#e03131' }]} onPress={confirmClear}>
          <Text style={styles.btnText}>Clear all data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f6' },
  section: { fontSize: 13, fontWeight: '700', color: '#666', marginTop: 20, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  line: { fontSize: 15, color: '#222', marginVertical: 3 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btn: { backgroundColor: '#3b5bdb', borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});