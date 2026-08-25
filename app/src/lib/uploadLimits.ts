// The storage buckets' own limits, mirrored client-side.
//
// -- WHY MIRROR THEM AT ALL --
//
// The buckets enforce these server-side (20260808190000_storage_upload_limits
// and 20260814210000_message_attachments), so nothing dangerous gets through
// either way. The problem is the failure mode: pick a 40MB PDF, wait through a
// slow mobile upload, then get a generic error at the end having burned the
// data. These users are on metered connections; failing fast is the point.
//
// -- KEEPING THEM IN STEP --
//
// These are duplicated values and will drift if a migration changes a bucket
// without changing this file. That is a real risk and the reason each entry
// names its migration: a mismatch here is only ever a worse error message, not
// a security hole, because the bucket still rejects what it rejects.
export type BucketLimit = {
  bucket: string;
  maxBytes: number;
  mimeTypes: readonly string[];
  /** What to call these files when telling the user what is allowed. */
  label: string;
};

export const UPLOAD_LIMITS = {
  // 20260814210000_message_attachments.sql
  messageAttachments: {
    bucket: 'message-attachments',
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    label: 'a JPG, PNG, WebP or PDF',
  },
  // 20260808190000_storage_upload_limits.sql
  videos: {
    bucket: 'videos',
    maxBytes: 100 * 1024 * 1024,
    mimeTypes: ['video/mp4', 'video/quicktime', 'image/jpeg'],
    label: 'an MP4 or MOV',
  },
  avatars: {
    bucket: 'avatars',
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    label: 'a JPG, PNG or WebP',
  },
} as const satisfies Record<string, BucketLimit>;

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))}MB`;
  return `${Math.round(bytes / 1024)}KB`;
}

/**
 * Check a picked file against a bucket's limits.
 *
 * Returns null when it is fine, or a message written for the person who picked
 * it -- naming what is allowed rather than restating the rejection.
 *
 * `size` is optional because pickers do not always report it (some Android
 * providers return undefined). An unknown size is allowed through: the bucket
 * is still the authority, and blocking a file we simply could not measure
 * would be worse than letting the server answer.
 */
export function checkUpload(
  limit: BucketLimit,
  file: { size?: number | null; mimeType?: string | null; name?: string | null }
): string | null {
  if (file.size != null && file.size > limit.maxBytes) {
    return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(limit.maxBytes)} — try a smaller one.`;
  }
  // Only judge the type when the picker actually told us one.
  if (file.mimeType && !limit.mimeTypes.includes(file.mimeType)) {
    return `That file type is not supported. Pick ${limit.label}.`;
  }
  return null;
}
