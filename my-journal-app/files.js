// files.js - copies picked/recorded files into permanent app storage.
//
// WHY: recordings and picked files first land in a CACHE folder that iOS/Android
// may clear at any time. We copy them into the app's Documents folder and store
// only the FILE NAME in SQLite. The full path is rebuilt when needed, because the
// app's container path can change between app updates/reinstalls on iOS.
import * as FileSystem from 'expo-file-system/legacy';

const attachmentsDir = () => FileSystem.documentDirectory + 'attachments/';

async function ensureDir() {
  const dir = attachmentsDir();
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

// "photo.JPG" -> "jpg"
export function extensionOf(nameOrUri, fallback = 'bin') {
  const clean = (nameOrUri || '').split('?')[0];
  const dot = clean.lastIndexOf('.');
  if (dot === -1 || dot < clean.lastIndexOf('/')) return fallback;
  return clean.slice(dot + 1).toLowerCase() || fallback;
}

// Copies a file into permanent storage. Returns the stored file name.
export async function saveToAppStorage(sourceUri, id, ext) {
  const dir = await ensureDir(); 
  const fileName = `${id}.${ext}`;
  new File(sourceUri).copy(new File(dir, fileName));
  return fileName;
}

// Stored file name -> full file:// URI (use this for <Image> and audio players).
export function uriFor(fileName) {
  return new File(attachmentsDir(), fileName).uri;
}

export function removeFile(fileName) {
  try {
    const file = new File(attachmentsDir(), fileName);
    if (file.exists) file.delete();
  } catch (e) {
    console.warn('Could not delete file', fileName, e);
  }
}

export function removeAllFiles() {
  try {
    const dir = attachmentsDir();
    if (dir.exists) dir.delete();
  } catch (e) {
    console.warn('Could not clear attachments folder', e);
  }
}