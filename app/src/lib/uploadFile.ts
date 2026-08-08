import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

// RN can't hand a file:// URI straight to supabase-js — fetch().blob() is
// known to produce truncated uploads on Android with this Expo+Supabase
// combo, so we read the file as base64 and decode to an ArrayBuffer instead
// (what Supabase's own RN guidance recommends).
export async function uploadFileToStorage(
  bucket: string,
  path: string,
  fileUri: string,
  contentType: string
) {
  const file = new File(fileUri);
  const base64 = await file.base64();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, decode(base64), { contentType, upsert: true });
  if (error) throw error;
  return path;
}
