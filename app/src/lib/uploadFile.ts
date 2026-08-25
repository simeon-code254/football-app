import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export type UploadOptions = {
  /** 0–1. Only reported on native; the web path resolves in one step. */
  onProgress?: (fraction: number) => void;
  /** Abort an in-flight upload. Native only. */
  signal?: AbortSignal;
};

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

// Native upload via XMLHttpRequest + FormData.
//
// Two things this buys that the SDK cannot: real byte progress, and
// cancellation. It also stops reading the whole file into JS memory --
// React Native's networking layer streams a { uri } part straight from
// disk, whereas the base64 path below holds the file twice over (a ~33%
// larger base64 string plus the decoded buffer) and can exhaust heap on the
// entry-level devices that make up most of this app's market.
//
// Supabase's own docs say Blob/File/FormData "do not work as intended" in
// React Native -- that caveat is about passing those through the SDK's
// fetch path, not about the Storage endpoint, which accepts multipart
// (storage-js builds FormData itself in browsers). Going direct with XHR
// sidesteps the fetch/Blob polyfill entirely.
//
// This has NOT been verified on a physical device. That is exactly why any
// failure falls back to the previously-working base64 path rather than
// surfacing an error -- a regression here would break every upload in the
// app, since five repositories share this function.
async function uploadNativeWithProgress(
  bucket: string,
  path: string,
  fileUri: string,
  contentType: string,
  opts: UploadOptions
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in');

  await new Promise<void>((resolve, reject) => {
    const form = new FormData();
    // The { uri, name, type } shape is what RN's native layer recognises as
    // a file to stream, rather than a value to serialise.
    form.append('', {
      uri: fileUri,
      name: path.split('/').pop() ?? 'upload',
      type: contentType,
    } as unknown as Blob);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    // Matches the SDK's upsert:true, so re-uploading the same path still
    // overwrites rather than colliding.
    xhr.setRequestHeader('x-upsert', 'true');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) opts.onProgress(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new UploadRejectedError(xhr.status, xhr.responseText?.slice(0, 200)));
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));

    opts.signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(form);
  });
}

// The original path, kept as the fallback. Reads the file as base64 and
// decodes to an ArrayBuffer -- what Supabase's own React Native guidance
// recommends, and known to work here.
async function uploadNativeBase64(bucket: string, path: string, fileUri: string, contentType: string) {
  const file = new File(fileUri);
  const base64 = await file.base64();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, decode(base64), { contentType, upsert: true });
  if (error) throw error;
}

/**
 * The server answered and refused. Distinct from a transport failure, because
 * only the latter is worth retrying on the base64 path.
 */
export class UploadRejectedError extends Error {
  constructor(
    readonly status: number,
    body?: string
  ) {
    super(
      status === 413
        ? 'That file is too large for this upload.'
        : status === 401 || status === 403
          ? 'You are not signed in to upload this.'
          : `Upload failed (${status})${body ? `: ${body}` : ''}`
    );
    this.name = 'UploadRejectedError';
  }
}

export async function uploadFileToStorage(
  bucket: string,
  path: string,
  fileUri: string,
  contentType: string,
  opts: UploadOptions = {}
) {
  if (Platform.OS === 'web') {
    // Browsers have no filesystem to stream from, but a blob:/data: URI is
    // just a normal fetch -- the RN Blob-polyfill corruption issue does not
    // apply here.
    const blob = await fetch(fileUri).then((r) => r.blob());
    const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType, upsert: true });
    if (error) throw error;
    return path;
  }

  try {
    await uploadNativeWithProgress(bucket, path, fileUri, contentType, opts);
  } catch (err) {
    // A deliberate cancellation must NOT silently fall back and upload
    // anyway -- that would ignore the user.
    if (err instanceof Error && err.name === 'AbortError') throw err;

    // Nor should a server refusal. The fallback exists for "streaming does not
    // work on this device", not for "the server said no" -- a 413 over the
    // bucket's size limit, or a 401 on an expired token, fails identically on
    // the base64 path and only makes the user wait through a second full
    // upload before seeing the same error. Those surface immediately.
    if (err instanceof UploadRejectedError && err.status >= 400) throw err;

    console.warn('Streaming upload failed, falling back to base64 path:', err);
    await uploadNativeBase64(bucket, path, fileUri, contentType);
  }
  return path;
}
