import type { CandidateProfile, FieldMapping, ScanResult, CaptureSession, ProfileMergePreview } from './types';

export type ContentMessage =
  | { type: 'SCAN_PAGE'; profile: CandidateProfile }
  | { type: 'FILL_PAGE'; mappings: FieldMapping[] }
  | { type: 'GET_CAPTURE' }
  | { type: 'CLEAR_CAPTURE' };

export type BackgroundMessage =
  | { type: 'UNLOCK'; passphrase: string }
  | { type: 'LOCK' }
  | { type: 'IS_LOCKED' }
  | { type: 'LOAD_PROFILE'; passphrase: string }
  | { type: 'SAVE_PROFILE'; profile: CandidateProfile; passphrase: string }
  | { type: 'PREVIEW_MERGE'; capture: CaptureSession; passphrase: string }
  | { type: 'SAVE_MERGE'; capture: CaptureSession; passphrase: string; accepted: string[] }
  | { type: 'PROFILE_EXISTS' }
  | { type: 'GET_SESSION_PROFILE' }
  | { type: 'DELETE_PROFILE' };

export type BackgroundResponse =
  | { ok: true }
  | { ok: false; error: string }
  | { locked: boolean }
  | { exists: boolean }
  | { profile: CandidateProfile | null }
  | { preview: ProfileMergePreview }
  | ScanResult
  | { filled: string[] }
  | CaptureSession;

export function sendToContent<T>(tabId: number, message: ContentMessage): Promise<T> {
  return chrome.tabs.sendMessage(tabId, message) as Promise<T>;
}

export function sendToBackground<T>(message: BackgroundMessage): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}
