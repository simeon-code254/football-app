import { QueryClient, type Query } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

// How long a persisted cache entry is still worth showing offline. A day
// old squad list or trial listing is genuinely useful; a week old one is
// misleading, so it is dropped rather than shown as if current.
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retry transport failures, never authorisation ones.
      //
      // PostgREST answers an expired or missing token with 401 and a
      // `.single()` against a row the caller cannot see with 406. Neither
      // improves on a second attempt: the 401 needs a new session (the root
      // layout routes to /session-expired when Supabase fires SIGNED_OUT) and
      // the 406 means the row genuinely is not there for this account -- a
      // scout has no `players` row and never will. Retrying both was doubling
      // the console noise and delaying the real handling by a round trip.
      retry: (failureCount, error) => {
        const status = (error as { status?: number; code?: string } | null)?.status;
        if (status === 401 || status === 403 || status === 406) return false;
        return failureCount < 1;
      },
      // Cached data has to outlive the session for offline reads to be
      // possible at all -- the default 5 minutes would evict everything
      // long before the user reopens the app on a train with no signal.
      gcTime: CACHE_MAX_AGE_MS,
    },
  },
});

// Query keys whose data must never be written to disk. AsyncStorage is
// NOT encrypted -- this app deliberately keeps the auth session in an
// AES-encrypted store backed by the OS keystore
// (src/lib/secureSessionStorage.ts), and persisting private data in
// cleartext right next to it would undo that.
//
// Excluded on purpose:
//  - message threads, conversations and attachment URLs: private
//    correspondence, and this app's users include minors
//  - notifications: can quote message and application content
//  - scout verification documents: identity documents
//  - signed storage URLs (thumbs/attachments): they expire in an hour, so
//    a persisted copy is stale and useless anyway
//
// Everything else -- public trials, news, country reference data, discover
// listings -- is content the user could see signed-out, and is exactly
// what makes the app usable on a bad connection.
const NEVER_PERSIST = [
  'message',
  'Conversation',
  'conversations',
  'Notifications',
  'scoutVerificationDocs',
  'Thumbs',
  'AttachmentUrls',
];

function isPersistable(query: Query): boolean {
  const key = String(query.queryKey[0] ?? '');
  return !NEVER_PERSIST.some((deny) => key.toLowerCase().includes(deny.toLowerCase()));
}

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'matobev-query-cache',
  // Writing on every cache mutation would thrash storage on a list that
  // paginates; a short debounce batches those into one write.
  throttleTime: 2_000,
});

export const persistOptions = {
  persister: queryPersister,
  maxAge: CACHE_MAX_AGE_MS,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) => query.state.status === 'success' && isPersistable(query),
  },
};
