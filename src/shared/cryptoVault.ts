const enc = new TextEncoder();
const dec = new TextDecoder();

export interface EncryptedPayload {
  salt: number[];
  iv: number[];
  ciphertext: number[];
  iterations: number;
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptJson(data: unknown, passphrase: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 250000;
  const key = await deriveKey(passphrase, salt, iterations);
  const plaintext = enc.encode(JSON.stringify(data));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { salt: [...salt], iv: [...iv], ciphertext: [...new Uint8Array(encrypted)], iterations };
}

export async function decryptJson<T>(payload: EncryptedPayload, passphrase: string): Promise<T> {
  const key = await deriveKey(passphrase, new Uint8Array(payload.salt), payload.iterations);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(payload.iv) },
    key,
    new Uint8Array(payload.ciphertext)
  );
  return JSON.parse(dec.decode(decrypted)) as T;
}
