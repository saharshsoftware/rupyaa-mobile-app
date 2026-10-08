/**
 * AES-128-GCM encryption/decryption for encrypted API flow.
 * Uses @noble/ciphers + expo-crypto (React Native; no Web Crypto API).
 * Format: iv (12 bytes) + ciphertext + authTag (16 bytes); key = first 16 bytes of SHA-256(secret).
 * Compatible with backend encryptApiPayload / decryptApiPayload.
 */

import { Buffer } from 'buffer';
import { gcm } from '@noble/ciphers/aes.js';
import * as ExpoCrypto from 'expo-crypto';
import { getEncryptionSecret } from '@/src/config/resolvedAppConfig';

const KEY_LENGTH_BYTES = 16;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getSecret(): string {
  return getEncryptionSecret();
}

// --- base64 helpers (Expo/RN safe; btoa/atob may be missing) ---
type GlobalWithBtoa = { btoa?: (s: string) => string; atob?: (s: string) => string };
const g = typeof globalThis !== 'undefined' ? (globalThis as unknown as GlobalWithBtoa) : ({} as GlobalWithBtoa);

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return g.btoa ? g.btoa(s) : Buffer.from(bytes).toString('base64');
}

function fromBase64(b64: string): Uint8Array {
  if (g.atob) {
    const bin = g.atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

/**
 * Derive AES-128 key from secret: SHA256(secret) -> first 16 bytes.
 * Uses expo-crypto (no WebCrypto.subtle required).
 */
async function getEncryptionKeyBytes(secret: string): Promise<Uint8Array> {
  const digestHex = await ExpoCrypto.digestStringAsync(
    ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    secret
  );
  const hashBytes = new Uint8Array(
    digestHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
  );
  return hashBytes.subarray(0, KEY_LENGTH_BYTES);
}

let lastSecret: string | null = null;
let cachedKeyBytes: Uint8Array | null = null;

/** Resolves key for default secret (cached) or for explicit secret (no cache). */
async function getKey(secret?: string): Promise<Uint8Array> {
  const s = secret ?? getSecret();
  if (secret !== undefined) {
    return getEncryptionKeyBytes(s);
  }
  if (cachedKeyBytes && lastSecret === s) return cachedKeyBytes;
  cachedKeyBytes = await getEncryptionKeyBytes(s);
  lastSecret = s;
  return cachedKeyBytes;
}

/**
 * Encrypts plain text. Returns base64(iv + ciphertext + authTag).
 * Compatible with backend decryptApiPayload. Use when getEnableEncryption() is true.
 */
export async function encryptApiPayload(
  plainText: string,
  secret?: string
): Promise<string> {
  const key = await getKey(secret);
  const iv = new Uint8Array(await ExpoCrypto.getRandomBytesAsync(IV_LENGTH));
  const plainBytes = new TextEncoder().encode(plainText);
  const aes = gcm(key, iv);
  const ciphertextWithTag = aes.encrypt(plainBytes);
  const combined = new Uint8Array(iv.length + ciphertextWithTag.length);
  combined.set(iv, 0);
  combined.set(ciphertextWithTag, iv.length);
  return toBase64(combined);
}

/**
 * Decrypts base64(iv + ciphertext + authTag). Use for payloads from backend encryptApiPayload.
 */
export async function decryptApiPayload(
  encryptedBase64: string,
  secret?: string
): Promise<string> {
  const key = await getKey(secret);
  const combined = fromBase64(encryptedBase64);
  const minLength = IV_LENGTH + AUTH_TAG_LENGTH;
  if (combined.length < minLength) {
    throw new Error('Invalid encrypted payload: too short');
  }
  const iv = combined.subarray(0, IV_LENGTH);
  const ciphertextWithTag = combined.subarray(IV_LENGTH);
  const aes = gcm(key, iv);
  const decrypted = aes.decrypt(ciphertextWithTag);
  return new TextDecoder().decode(decrypted);
}

/**
 * Encrypts JSON-serializable payload -> base64(iv + ciphertext + tag).
 * Delegates to encryptApiPayload for consistency with backend.
 */
export async function encryptPayload(payload: unknown): Promise<string> {
  const plainText =
    typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
  return encryptApiPayload(plainText);
}

/** Decrypts { data: "<base64>" } response. Uses decryptApiPayload. */
export async function decryptResponse<T>(raw: {
  data?: string;
}): Promise<T> {
  const encrypted = raw?.data;
  if (!encrypted || typeof encrypted !== 'string') {
    throw new Error('Invalid response: missing encrypted data');
  }
  const json = await decryptApiPayload(encrypted);
  return JSON.parse(json) as T;
}

/**
 * Decrypts a raw base64-encrypted string (no { data: ... } wrapper).
 */
export async function decryptGeneric(encryptedData: string): Promise<unknown> {
  const json = await decryptApiPayload(encryptedData);
  return JSON.parse(json);
}

/**
 * Encrypt any JSON-serializable payload for API requests.
 * Same behavior as encryptPayload; provided for API parity with reference.
 */
export async function encryptGeneric(payload: unknown): Promise<string> {
  return encryptPayload(payload);
}

export function looksLikeEncryptedResponse(
  body: unknown
): body is { data: string } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'data' in body &&
    typeof (body as { data: unknown }).data === 'string'
  );
}
