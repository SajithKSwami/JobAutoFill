import {
  profileExists,
  saveEncryptedProfile,
  loadEncryptedProfile,
  deleteProfile,
  previewMerge,
  applyMerge,
} from '../shared/storage';
import type { CandidateProfile, CaptureSession } from '../shared/types';

// In-memory session unlock — cleared when service worker restarts
let sessionPassphrase: string | null = null;
let sessionProfile: CandidateProfile | null = null;

chrome.runtime.onInstalled.addListener(() => {
  console.info('AutoFill AI installed');
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void handle(message).then(sendResponse).catch(err => {
    console.error('[SW]', err);
    sendResponse({ ok: false, error: String(err) });
  });
  return true; // keep channel open for async response
});

async function handle(message: { type: string; [k: string]: unknown }): Promise<unknown> {
  switch (message.type) {

    case 'PROFILE_EXISTS':
      return { exists: await profileExists() };

    case 'IS_LOCKED':
      return { locked: sessionPassphrase === null };

    case 'UNLOCK': {
      const pass = message.passphrase as string;
      const profile = await loadEncryptedProfile(pass);
      if (!profile) return { ok: false, error: 'Wrong passphrase or no profile found.' };
      sessionPassphrase = pass;
      sessionProfile = profile;
      return { ok: true };
    }

    case 'LOCK':
      sessionPassphrase = null;
      sessionProfile = null;
      return { ok: true };

    case 'LOAD_PROFILE': {
      const pass = message.passphrase as string;
      const profile = await loadEncryptedProfile(pass);
      if (!profile) return { ok: false, error: 'Wrong passphrase or no profile found.' };
      sessionPassphrase = pass;
      sessionProfile = profile;
      return { profile };
    }

    case 'SAVE_PROFILE': {
      const profile = message.profile as CandidateProfile;
      const pass = message.passphrase as string;
      await saveEncryptedProfile(profile, pass);
      sessionPassphrase = pass;
      sessionProfile = profile;
      return { ok: true };
    }

    case 'DELETE_PROFILE': {
      await deleteProfile();
      sessionPassphrase = null;
      sessionProfile = null;
      return { ok: true };
    }

    case 'GET_SESSION_PROFILE':
      return { profile: sessionProfile };

    case 'PREVIEW_MERGE': {
      const capture = message.capture as CaptureSession;
      const pass = message.passphrase as string;
      let profile = sessionProfile;
      if (!profile) {
        profile = await loadEncryptedProfile(pass);
        if (!profile) return { ok: false, error: 'Wrong passphrase.' };
        sessionPassphrase = pass;
        sessionProfile = profile;
      }
      return { preview: previewMerge(capture, profile) };
    }

    case 'SAVE_MERGE': {
      const capture = message.capture as CaptureSession;
      const pass = (message.passphrase as string) || sessionPassphrase;
      const accepted = message.accepted as string[];
      if (!pass) return { ok: false, error: 'Not unlocked.' };
      let profile = sessionProfile;
      if (!profile) {
        profile = await loadEncryptedProfile(pass);
        if (!profile) return { ok: false, error: 'Wrong passphrase.' };
      }
      const merged = applyMerge(capture, profile, accepted);
      await saveEncryptedProfile(merged, pass);
      sessionProfile = merged;
      return { ok: true };
    }

    default:
      return { ok: false, error: `Unknown message type: ${message.type}` };
  }
}
