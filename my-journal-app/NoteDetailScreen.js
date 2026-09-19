import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { getNote, getAttachments, deleteNote, deleteAttachment, parseTags } from './db';
import AttachmentList from './AttachmentList';

export default function NoteDetailScreen({ route, navigation }) {
  const db = useSQLiteContext();
  const { noteId } = route.params;
  const [note, setNote] = useState(null);
  const [attachments, setAttachments] = useState([]);

  const load = useCallback(async () => {
    try {
      const n = await getNote(db, noteId);
      const atts = await getAttachments(db, noteId);
      setNote(n);
      setAttachments(atts);
    } catch (e) {
      Alert.alert('Error', 'Could not load note.');
    }
  }, [db, noteId]);

  // Reload whenever this screen is shown (e.g. after editing).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const removeOneAttachment = async (att) => {
    try {
      await deleteAttachment(db, att, noteId);
      await load();
    } catch (e) {
      Alert.alert('Error', 'Could not delete attachment.');
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete note?', 'The note and all its attachments will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNote(db, noteId);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', 'Could not delete note.');
          }
        },
      },
    ]);
  };

  if (!note) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const tags = parseTags(note.tags);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Text style={styles.title}>{note.title}</Text>
      <Text style={styles.date}>Created {new Date(note.created_at).toLocaleString()}</Text>
      {note.updated_at !== note.created_at && (
        <Text style={styles.date}>Edited {new Date(note.updated_at).toLocaleString()}</Text>
      )}
      <Text style={styles.date}>{note.synced ? '☁ Synced' : 'Not synced yet'}</Text>

      {tags.length > 0 && (
        <View style={styles.tagRow}>
          {tags.map((t) => (
            <Text key={t} style={styles.tag}>#{t}</Text>
          ))}
        </View>
      )}

      <Text style={styles.body}>{note.body || 'No text.'}</Text>

      <AttachmentList attachments={attachments} onRemove={removeOneAttachment} />

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: '#3b5bdb' }]}
          onPress={() => navigation.navigate('EditNote', { noteId })}
        >
          <Text style={styles.btnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#e03131' }]} onPress={confirmDelete}>
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#111' },
  date: { fontSize: 12, color: '#999', marginTop: 4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
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
  body: { fontSize: 16, color: '#222', marginTop: 20, lineHeight: 24 },
  actions: { flexDirection: 'row', marginTop: 32 },
  btn: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center', marginHorizontal: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});