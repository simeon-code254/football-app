import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

// Two different code paths because neither works on both platforms:
// - Native (iOS/Android): expo-file-system's File API doesn't exist on web
//   at all ("expo-file-system is not supported on web"), and RN's
//   fetch().blob() is known to produce truncated uploads on Android with
//   this Expo+Supabase combo — so read the file as base64 and decode to an
//   ArrayBuffer instead (what Supabase's own RN guidance recommends).
// - Web: there's no filesystem to read from, but the picked file's blob:/
//   data: URI is just a normal browser fetch — no corruption risk there
//   (that's a React Native Blob-polyfill quirk, not a browser one), so hand
//   the Blob straight to storage.upload().
export async function uploadFileToStorage(
  bucket: string,
  path: string,
  fileUri: string,
  contentType: string
) {
  if (Platform.OS === 'web') {
    const blob = await fetch(fileUri).then((r) => r.blob());
    const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType, upsert: true });
    if (error) throw error;
    return path;
  }

  const file = new File(fileUri);
  const base64 = await file.base64();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, decode(base64), { contentType, upsert: true });
  if (error) throw error;
  return path;
}
