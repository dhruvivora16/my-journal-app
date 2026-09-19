import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';

import {
  getNote, getAttachments, saveNoteWithAttachments, parseTags, newId,
} from './db';
import { saveToAppStorage, removeFile, extensionOf } from './files';
import { showPermissionDenied } from './permissions';
import AttachmentList from './AttachmentList';
import { formatTime } from './AudioPlayer';

// One screen for creating (no noteId) and editing (noteId in route params).
export default function EditNoteScreen({ route, navigation }) {
  const db = useSQLiteContext();
  const routeId = route.params?.noteId;
  const isNew = !routeId;
  // For a NEW note we create the id up front so attachments can point to it.
  const [noteId] = useState(() => routeId || newId());

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  // attachments currently shown; items with isNew:true are not in the DB yet
  const [attachments, setAttachments] = useState([]);
  // existing attachments the user removed (deleted from DB/disk when Save is pressed)
  const [removed, setRemoved] = useState([]);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);

  const savedRef = useRef(false);
  const newFilesRef = useRef([]);
  useEffect(() => {
    newFilesRef.current = attachments.filter((a) => a.isNew);
  }, [attachments]);

  // Leaving without saving: delete the files copied during this session.
  useEffect(() => {
    return () => {
      if (!savedRef.current) newFilesRef.current.forEach((a) => removeFile(a.fileName));
      try {
        if (recorder.isRecording) recorder.stop().catch(() => {});
      } catch (e) {
        // recorder already released
      }
    };
  }, []);

  useEffect(() => {
    navigation.setOptions({ title: isNew ? 'New Note' : 'Edit Note' });
    if (isNew) return;
    (async () => {
      try {
        const note = await getNote(db, noteId);
        if (note) {
          setTitle(note.title);
          setBody(note.body);
          setTags(note.tags);
        }
        setAttachments(await getAttachments(db, noteId));
      } catch (e) {
        Alert.alert('Error', 'Could not load note.');
      }
    })();
  }, []);

  const addAttachment = (att) => setAttachments((prev) => [...prev, { ...att, isNew: true }]);

  const removeAttachment = (att) => {
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    if (att.isNew) removeFile(att.fileName);
    else setRemoved((prev) => [...prev, att]);
  };

  /* ---------- Audio ---------- */
  const startRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        showPermissionDenied('Microphone');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      Alert.alert('Recording failed', String(e?.message || e));
    }
  };

  const stopRecording = async () => {
    try {
      const ms = recState.durationMillis;
      await recorder.stop();
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      const source = recorder.uri;
      if (!source) throw new Error('No recording file was produced.');
      const id = newId();
      const fileName = saveToAppStorage(source, id, extensionOf(source, 'm4a'));
      addAttachment({
        id,
        type: 'audio',
        fileName,
        name: `Voice note ${new Date().toLocaleTimeString()}`,
        mimeType: 'audio/m4a',
        durationMs: ms,
      });
    } catch (e) {
      Alert.alert('Could not save recording', String(e?.message || e));
    }
  };

  /* ---------- Images ---------- */
  const addImage = async (fromCamera) => {
    try {
      let result;
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          showPermissionDenied('Camera');
          return;
        }
        result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      } else {
        // The system photo picker needs no permission; it only shares the photo you pick.
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });
      }
      if (result.canceled) return;
      const asset = result.assets[0];
      const id = newId();
      const fileName = saveToAppStorage(asset.uri, id, extensionOf(asset.fileName || asset.uri, 'jpg'));
      addAttachment({
        id,
        type: 'image',
        fileName,
        name: asset.fileName || `Photo ${new Date().toLocaleTimeString()}`,
        mimeType: asset.mimeType || 'image/jpeg',
        durationMs: null,
      });
    } catch (e) {
      Alert.alert('Could not add image', String(e?.message || e));
    }
  };

  /* ---------- Files ---------- */
  const addFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const id = newId();
      const fileName = saveToAppStorage(asset.uri, id, extensionOf(asset.name, 'bin'));
      addAttachment({
        id,
        type: 'file',
        fileName,
        name: asset.name,
        mimeType: asset.mimeType || null,
        durationMs: null,
      });
    } catch (e) {
      Alert.alert('Could not add file', String(e?.message || e));
    }
  };

  /* ---------- Save ---------- */
  const onSave = async () => {
    if (recState.isRecording) {
      Alert.alert('Still recording', 'Please stop the recording before saving.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a title for your note.');
      return;
    }
    try {
      setSaving(true);
      await saveNoteWithAttachments(db, {
        id: noteId,
        isNew,
        title: title.trim(),
        body: body.trim(),
        tags: parseTags(tags).join(','),
        added: attachments.filter((a) => a.isNew),
        removed,
      });
      savedRef.current = true;
      navigation.goBack();
    } catch (e) {
      setSaving(false);
      Alert.alert('Could not save', String(e?.message || e));
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Note title"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Note</Text>
      <TextInput
        style={[styles.input, styles.bodyInput]}
        value={body}
        onChangeText={setBody}
        placeholder="Write something..."
        placeholderTextColor="#999"
        multiline
        textAlignVertical="top"
      />

      <Text style={styles.label}>Tags (comma separated)</Text>
      <TextInput
        style={styles.input}
        value={tags}
        onChangeText={setTags}
        placeholder="work, ideas"
        placeholderTextColor="#999"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Attach</Text>
      {recState.isRecording ? (
        <View style={styles.recBar}>
          <Text style={styles.recText}>● Recording {formatTime(recState.durationMillis / 1000)}</Text>
          <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
            <Text style={styles.stopText}>Stop</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.attachRow}>
          <TouchableOpacity style={styles.attachBtn} onPress={startRecording}>
            <Text style={styles.attachText}>🎤 Record</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachBtn} onPress={() => addImage(true)}>
            <Text style={styles.attachText}>📷 Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachBtn} onPress={() => addImage(false)}>
            <Text style={styles.attachText}>🖼 Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachBtn} onPress={addFile}>
            <Text style={styles.attachText}>📎 File</Text>
          </TouchableOpacity>
        </View>
      )}

      <AttachmentList attachments={attachments} onRemove={removeAttachment} />

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={onSave}
        disabled={saving}
      >
        <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f6' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#111',
    borderWidth: 1,
    borderColor: '#e2e2e6',
  },
  bodyInput: { minHeight: 160 },
  attachRow: { flexDirection: 'row', flexWrap: 'wrap' },
  attachBtn: {
    backgroundColor: '#e7ecff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  attachText: { color: '#3b5bdb', fontWeight: '600', fontSize: 14 },
  recBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff0f0',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  recText: { color: '#e03131', fontWeight: '700', fontSize: 16 },
  stopBtn: { backgroundColor: '#e03131', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  stopText: { color: '#fff', fontWeight: '700' },
  saveBtn: {
    backgroundColor: '#3b5bdb',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});