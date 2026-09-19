import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

export const formatTime = (seconds) => {
  const s = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// One voice note: play / pause, progress time, optional delete.
export default function AudioPlayer({ uri, durationMs, label, onDelete }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    // Make sure playback works even when the iPhone is on silent, and uses the speaker.
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
  }, []);

  const total = status.duration > 0 ? status.duration : (durationMs || 0) / 1000;

  const toggle = async () => {
    try {
      if (status.playing) {
        player.pause();
        return;
      }
      // If it already reached the end, start again from the beginning.
      if (total > 0 && status.currentTime >= total - 0.05) await player.seekTo(0);
      player.play();
    } catch (e) {
      Alert.alert('Playback failed', String(e?.message || e));
    }
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.playBtn} onPress={toggle}>
        <Text style={styles.playText}>{status.playing ? '❚❚' : '▶'}</Text>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.label} numberOfLines={1}>{label || 'Voice note'}</Text>
        <Text style={styles.time}>
          {formatTime(status.currentTime)} / {formatTime(total)}
        </Text>
      </View>
      {onDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.delBtn}>
          <Text style={styles.delText}>Delete</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e2e6',
  },
  playBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#3b5bdb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playText: { color: '#fff', fontSize: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#222' },
  time: { fontSize: 12, color: '#888', marginTop: 2 },
  delBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  delText: { color: '#e03131', fontSize: 14, fontWeight: '600' },
});