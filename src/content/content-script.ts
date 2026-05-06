import { getBestAdapter } from '../adapters';
import { fillMappings } from './fillExecutor';
import { initCapture, watchForNewFields, getCaptureSession, clearCapture } from './formCapture';
import type { CandidateProfile, FieldMapping, ScanResult } from '../shared/types';

let lastSelectors = new Map<string, string>();
let initialized = false;

function initOnce(): void {
  if (initialized) return;
  initialized = true;

  // Auto-detect ATS and start passive capture on page load
  const { adapter, confidence } = getBestAdapter();
  if (confidence > 0.2) {
    const fields = adapter.scan();
    lastSelectors = new Map(fields.map(f => [f.id, f.selector]));
    initCapture(adapter.name, fields);
    watchForNewFields(() => {
      const fresh = adapter.scan();
      lastSelectors = new Map(fresh.map(f => [f.id, f.selector]));
      return fresh;
    });
  }
}

// Start capture as soon as DOM is ready.
// Wrap in try-catch so a failure in initOnce() never prevents the
// message listener below from being registered — PING must always work.
function safeInit() { try { initOnce(); } catch { /* passive capture failing is non-fatal */ } }
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeInit);
} else {
  safeInit();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void (async () => {
    try {
      if (message.type === 'PING') {
        sendResponse({ ok: true });
        return;
      }

      if (message.type === 'SCAN_PAGE') {
        const profile = message.profile as CandidateProfile;
        const { adapter, confidence } = getBestAdapter();
        const fields = adapter.scan();
        lastSelectors = new Map(fields.map(f => [f.id, f.selector]));
        initCapture(adapter.name, fields);
        watchForNewFields(() => {
          const fresh = adapter.scan();
          lastSelectors = new Map(fresh.map(f => [f.id, f.selector]));
          return fresh;
        });
        const mappings = adapter.map(fields, profile);
        const warnings: string[] = [];
        if (confidence < 0.5) warnings.push('ATS not recognized – using generic field detection.');
        const result: ScanResult = { ats: adapter.name, confidence, fields, mappings, warnings };
        sendResponse(result);
      }

      if (message.type === 'FILL_PAGE') {
        const mappings = message.mappings as FieldMapping[];
        const filled = fillMappings(mappings, lastSelectors);
        sendResponse({ filled });
      }

      if (message.type === 'GET_CAPTURE') {
        sendResponse(getCaptureSession());
      }

      if (message.type === 'CLEAR_CAPTURE') {
        clearCapture();
        sendResponse({ ok: true });
      }
    } catch (err) {
      sendResponse({ error: err instanceof Error ? err.message : String(err) });
    }
  })();
  return true;
});
