import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import aesjs from 'aes-js';

// Supabase's session persistence adapter. Plain AsyncStorage keeps the
// session (JWT + refresh token) readable in cleartext on-device -- fine for
// a simulator, not for a lost/stolen/rooted phone. expo-secure-store alone
// isn't a drop-in fix: iOS Keychain has historically rejected values above
// ~2048 bytes, expo-secure-store does no chunking, and a Supabase session
// (access token + refresh token + user_metadata incl. role/full_name/
// organization) can realistically exceed that. So: SecureStore holds only a
// small, fixed-size AES-256 key; the actual session blob stays in
// AsyncStorage (no size limit) but AES-CTR encrypted, unreadable without the
// key that only ever lives in the OS keystore.
//
// expo-secure-store has NO web implementation at all (its .web.ts is a bare
// `export default {}`) -- same zero-web-support pattern as
// expo-video-thumbnails elsewhere in this app. Web has no secure-enclave
// equivalent to bind a key to anyway, and the real threat this addresses
// (a lost/stolen/rooted phone) doesn't apply to a browser tab the same way,
// so web falls back to plain AsyncStorage -- identical to the prior
// behavior there, not a regression.

const KEY_PREFIX = 'matobev-session-key-';

async function getOrCreateKey(itemKey: string): Promise<Uint8Array> {
  const keyName = KEY_PREFIX + itemKey;
  let hex = await SecureStore.getItemAsync(keyName);
  if (!hex) {
    const bytes = await Crypto.getRandomBytesAsync(32); // AES-256
    hex = aesjs.utils.hex.fromBytes(bytes);
    await SecureStore.setItemAsync(keyName, hex);
  }
  return aesjs.utils.hex.toBytes(hex);
}

// CTR mode is only secure if the same key+counter-stream is never reused
// across two different messages -- reusing a fixed counter on every setItem
// (e.g. every token refresh, under the same never-rotated key) would let an
// attacker XOR two ciphertexts together and recover keystream/plaintext.
// A fresh random 16-byte nonce per encryption, stored alongside the
// ciphertext, is the standard fix -- the nonce isn't secret, it just has to
// be unique per message under a given key.
const NONCE_BYTES = 16;

async function encryptedGetItem(key: string): Promise<string | null> {
  const stored = await AsyncStorage.getItem(key);
  if (!stored) return null;
  try {
    const bytes = aesjs.utils.hex.toBytes(stored);
    const nonce = bytes.slice(0, NONCE_BYTES);
    const encryptedBytes = bytes.slice(NONCE_BYTES);
    const keyBytes = await getOrCreateKey(key);
    const decryptedBytes = new aesjs.ModeOfOperation.ctr(keyBytes, new aesjs.Counter(nonce)).decrypt(encryptedBytes);
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  } catch {
    // Key missing or corrupted (app reinstalled, keychain reset, etc.) --
    // the stored blob can never be decrypted again. Drop it and treat as
    // signed out rather than crash; the user just signs in again.
    await AsyncStorage.removeItem(key);
    return null;
  }
}

async function encryptedSetItem(key: string, value: string): Promise<void> {
  const keyBytes = await getOrCreateKey(key);
  const nonce = await Crypto.getRandomBytesAsync(NONCE_BYTES);
  const valueBytes = aesjs.utils.utf8.toBytes(value);
  const encryptedBytes = new aesjs.ModeOfOperation.ctr(keyBytes, new aesjs.Counter(nonce)).encrypt(valueBytes);
  const combined = new Uint8Array(NONCE_BYTES + encryptedBytes.length);
  combined.set(nonce, 0);
  combined.set(encryptedBytes, NONCE_BYTES);
  await AsyncStorage.setItem(key, aesjs.utils.hex.fromBytes(combined));
}

async function encryptedRemoveItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
  await SecureStore.deleteItemAsync(KEY_PREFIX + key).catch(() => {});
}

export const secureSessionStorage =
  Platform.OS === 'web'
    ? AsyncStorage
    : {
        getItem: encryptedGetItem,
        setItem: encryptedSetItem,
        removeItem: encryptedRemoveItem,
      };
