import React, { useCallback, useLayoutEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { getAllNotes, parseTags } from './db';

export default function HomeScreen({ navigation }) {
  const db = useSQLiteContext();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // "Settings" button in the header (left side, so it never sits under Snack's tools button)
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Text style={{ color: '#3b5bdb', fontSize: 16 }}>Settings</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const rows = await getAllNotes(db);
          if (active) setNotes(rows);
        } catch (e) {
          Alert.alert('Error', 'Could not load notes.');
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [db])
  );

  const renderItem = ({ item }) => {
    const tags = parseTags(item.tags);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('NoteDetail', { noteId: item.id })}
      >
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        {item.body ? <Text style={styles.body} numberOfLines={2}>{item.body}</Text> : null}
        <View style={styles.metaRow}>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
          {item.attachment_count > 0 && (
            <Text style={styles.date}>📎 {item.attachment_count}</Text>
          )}
        </View>
        {tags.length > 0 && (
          <View style={styles.tagRow}>
            {tags.map((t) => (
              <Text key={t} style={styles.tag}>#{t}</Text>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {!loading && notes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No notes yet</Text>
          <Text style={styles.emptyText}>Tap the + button to write your first note.</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('EditNote')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f6' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: { fontSize: 17, fontWeight: '600', color: '#111' },
  body: { fontSize: 14, color: '#555', marginTop: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  date: { fontSize: 12, color: '#999' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  tag: {
    fontSize: 12,
    color: '#3b5bdb',
    backgroundColor: '#e7ecff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    marginTop: 4,
    overflow: 'hidden',
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#333' },
  emptyText: { fontSize: 14, color: '#777', marginTop: 6, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#3b5bdb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 34 },
});