import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, Modal, StyleSheet, Alert,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import AudioPlayer from './AudioPlayer';
import { uriFor } from './files';

// Shows a note's attachments: voice notes (player), images (thumbnails + full-screen
// preview) and files (tap Open). If onRemove is given, each item can be removed.
export default function AttachmentList({ attachments, onRemove }) {
  const [preview, setPreview] = useState(null);

  const audio = attachments.filter((a) => a.type === 'audio');
  const images = attachments.filter((a) => a.type === 'image');
  const files = attachments.filter((a) => a.type === 'file');

  const confirmRemove = (att) => {
    Alert.alert('Remove attachment?', att.name || 'This attachment will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onRemove(att) },
    ]);
  };

  const openFile = async (att) => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Not available', 'Opening files is not supported on this device.');
        return;
      }
      await Sharing.shareAsync(uriFor(att.fileName), {
        mimeType: att.mimeType || undefined,
        dialogTitle: att.name || 'Open file',
      });
    } catch (e) {
      Alert.alert('Could not open file', String(e?.message || e));
    }
  };

  if (attachments.length === 0) return null;

  return (
    <View>
      {audio.length > 0 && <Text style={styles.heading}>Voice notes</Text>}
      {audio.map((a) => (
        <AudioPlayer
          key={a.id}
          uri={uriFor(a.fileName)}
          durationMs={a.durationMs}
          label={a.name}
          onDelete={onRemove ? () => confirmRemove(a) : undefined}
        />
      ))}

      {images.length > 0 && <Text style={styles.heading}>Images</Text>}
      <View style={styles.imageGrid}>
        {images.map((a) => (
          <View key={a.id} style={styles.thumbWrap}>
            <TouchableOpacity onPress={() => setPreview(a)}>
              <Image source={{ uri: uriFor(a.fileName) }} style={styles.thumb} />
            </TouchableOpacity>
            {onRemove && (
              <TouchableOpacity style={styles.thumbX} onPress={() => confirmRemove(a)}>
                <Text style={styles.thumbXText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {files.length > 0 && <Text style={styles.heading}>Files</Text>}
      {files.map((a) => (
        <View key={a.id} style={styles.fileRow}>
          <Text style={styles.fileIcon}>📄</Text>
          <Text style={styles.fileName} numberOfLines={1}>{a.name || a.fileName}</Text>
          <TouchableOpacity onPress={() => openFile(a)} style={styles.smallBtn}>
            <Text style={styles.openText}>Open</Text>
          </TouchableOpacity>
          {onRemove && (
            <TouchableOpacity onPress={() => confirmRemove(a)} style={styles.smallBtn}>
              <Text style={styles.delText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <Modal
        visible={!!preview}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}
      >
        <TouchableOpacity style={styles.modal} activeOpacity={1} onPress={() => setPreview(null)}>
          {preview && (
            <Image
              source={{ uri: uriFor(preview.fileName) }}
              style={styles.full}
              resizeMode="contain"
            />
          )}
          <Text style={styles.close}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 13, fontWeight: '700', color: '#555', marginTop: 18 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  thumbWrap: { marginRight: 10, marginBottom: 10 },
  thumb: { width: 96, height: 96, borderRadius: 10, backgroundColor: '#ddd' },
  thumbX: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e03131',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbXText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e2e6',
  },
  fileIcon: { fontSize: 20, marginRight: 10 },
  fileName: { flex: 1, fontSize: 14, color: '#222' },
  smallBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  openText: { color: '#3b5bdb', fontWeight: '600' },
  delText: { color: '#e03131', fontWeight: '600' },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  full: { width: '100%', height: '80%' },
  close: { color: '#ccc', marginTop: 12 },
});