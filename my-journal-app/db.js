// db.js - all database code (SQLite via expo-sqlite).
// Screens never write SQL directly; they call the functions below.
import { removeFile, removeAllFiles } from './files';

// Runs once when the database opens. Safe to run on an existing database.
export async function initDb(db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY NOT NULL,
      note_id TEXT NOT NULL,
      type TEXT NOT NULL,          -- 'image' | 'file' | 'audio'
      uri TEXT NOT NULL,           -- stored FILE NAME inside the app's attachments folder
      name TEXT,                   -- display name
      mime_type TEXT,
      duration_ms INTEGER,         -- audio only
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );
  `);
}

export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

export const parseTags = (tags) =>
  (tags || '').split(',').map((t) => t.trim()).filter(Boolean);

// DB row -> the shape the screens use
const toAttachment = (row) => ({
  id: row.id,
  type: row.type,
  fileName: row.uri,
  name: row.name,
  mimeType: row.mime_type,
  durationMs: row.duration_ms,
});

/* ---------- Notes ---------- */

export async function getAllNotes(db) {
  return db.getAllAsync(
    `SELECT n.*,
            (SELECT COUNT(*) FROM attachments a WHERE a.note_id = n.id) AS attachment_count
     FROM notes n
     ORDER BY n.created_at DESC`
  );
}

export async function getNote(db, id) {
  return db.getFirstAsync('SELECT * FROM notes WHERE id = ?', id);
}

export async function getAttachments(db, noteId) {
  const rows = await db.getAllAsync(
    'SELECT * FROM attachments WHERE note_id = ? ORDER BY rowid',
    noteId
  );
  return rows.map(toAttachment);
}

// Saves a note AND its attachment changes in ONE transaction:
// either everything is saved or nothing is.
export async function saveNoteWithAttachments(
  db,
  { id, isNew, title, body, tags, added = [], removed = [] }
) {
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    if (isNew) {
      await db.runAsync(
        `INSERT INTO notes (id, title, body, tags, created_at, updated_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        id, title, body, tags, now, now
      );
    } else {
      // synced goes back to 0 so the change is picked up by the next sync
      await db.runAsync(
        'UPDATE notes SET title = ?, body = ?, tags = ?, updated_at = ?, synced = 0 WHERE id = ?',
        title, body, tags, now, id
      );
    }
    for (const a of removed) {
      await db.runAsync('DELETE FROM attachments WHERE id = ?', a.id);
    }
    for (const a of added) {
      await db.runAsync(
        `INSERT INTO attachments (id, note_id, type, uri, name, mime_type, duration_ms, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        a.id, id, a.type, a.fileName, a.name ?? null, a.mimeType ?? null, a.durationMs ?? null
      );
    }
  });
  // Delete the files from disk only AFTER the database commit succeeded.
  removed.forEach((a) => removeFile(a.fileName));
}

export async function deleteNote(db, id) {
  const atts = await getAttachments(db, id);
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM attachments WHERE note_id = ?', id);
    await db.runAsync('DELETE FROM notes WHERE id = ?', id);
  });
  atts.forEach((a) => removeFile(a.fileName));
}

// Deletes one attachment (row + file) and marks its note as needing sync.
export async function deleteAttachment(db, att, noteId) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM attachments WHERE id = ?', att.id);
    await db.runAsync('UPDATE notes SET synced = 0, updated_at = ? WHERE id = ?', Date.now(), noteId);
  });
  removeFile(att.fileName);
}

export async function clearAllData(db) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM attachments');
    await db.runAsync('DELETE FROM notes');
  });
  removeAllFiles();
}

/* ---------- Settings + stats ---------- */

export async function getSetting(db, key, fallback = null) {
  const row = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?', key);
  return row ? row.value : fallback;
}

export async function setSetting(db, key, value) {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key, String(value)
  );
}

export async function getStats(db) {
  const row = await db.getFirstAsync(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN synced = 0 THEN 1 ELSE 0 END) AS unsynced
     FROM notes`
  );
  return { total: row?.total ?? 0, unsynced: row?.unsynced ?? 0 };
}