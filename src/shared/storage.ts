import type { CandidateProfile, CaptureSession, ProfileMergePreview } from './types';
import { decryptJson, encryptJson, type EncryptedPayload } from './cryptoVault';
import { canonicalRules } from '../adapters/rules';
import { getByPath, setByPath } from './objectPath';

const DB_NAME = 'autofill-ai-vault';
const STORE = 'secure-profile';
const KEY = 'candidate-profile';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function profileExists(): Promise<boolean> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getKey(KEY);
      req.onsuccess = () => resolve(req.result !== undefined);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function saveEncryptedProfile(profile: CandidateProfile, passphrase: string): Promise<void> {
  const db = await openDb();
  const payload = await encryptJson(profile, passphrase);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(payload, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadEncryptedProfile(passphrase: string): Promise<CandidateProfile | null> {
  const db = await openDb();
  try {
    const payload = await new Promise<EncryptedPayload | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result as EncryptedPayload | undefined);
      req.onerror = () => reject(req.error);
    });
    return payload ? decryptJson<CandidateProfile>(payload, passphrase) : null;
  } finally {
    db.close();
  }
}

export async function deleteProfile(): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export function previewMerge(capture: CaptureSession, profile: CandidateProfile): ProfileMergePreview {
  const updates: ProfileMergePreview['updates'] = [];
  const newAnswers: ProfileMergePreview['newAnswers'] = [];

  for (const field of capture.fields) {
    if (!field.value.trim()) continue;
    const haystack = [field.label, field.name].filter(Boolean).join(' ');
    const rule = canonicalRules.find(r => r.patterns.some(p => p.test(haystack)));

    if (rule) {
      const oldValue = String(getByPath(profile, rule.path) ?? '');
      if (oldValue !== field.value) {
        updates.push({ profilePath: rule.path, label: field.label || field.name || rule.path, oldValue, newValue: field.value });
      }
    } else if (field.label && field.inputType !== 'file' && field.value.length > 0) {
      const alreadySaved = profile.customAnswers.some(
        a => a.questionPattern.toLowerCase() === field.label.toLowerCase()
      );
      if (!alreadySaved) {
        newAnswers.push({ questionPattern: field.label.slice(0, 120), answer: field.value });
      }
    }
  }

  return { updates, newAnswers };
}

export function applyMerge(
  capture: CaptureSession,
  profile: CandidateProfile,
  accepted: string[],
): CandidateProfile {
  const merged = JSON.parse(JSON.stringify(profile)) as CandidateProfile;
  const preview = previewMerge(capture, profile);

  for (const update of preview.updates) {
    if (accepted.includes(update.profilePath)) {
      setByPath(merged as unknown as Record<string, unknown>, update.profilePath, update.newValue);
    }
  }

  for (const answer of preview.newAnswers) {
    if (accepted.includes(`customAnswer:${answer.questionPattern}`)) {
      merged.customAnswers.push(answer);
    }
  }

  return merged;
}
