import type { CapturedField, CaptureSession, AtsName } from '../shared/types';

const captured = new Map<string, CapturedField>();
let ats: AtsName = 'unknown';
let pageUrl = location.href;

export function initCapture(detectedAts: AtsName, fields: import('../shared/types').DetectedField[]): void {
  ats = detectedAts;
  pageUrl = location.href;

  // Attach listeners to already-detected fields
  for (const field of fields) {
    attachListener(field.id, field.selector, field.label, field.name, field.inputType);
  }
}

function attachListener(
  fieldId: string,
  selector: string,
  label: string,
  name: string | undefined,
  inputType: string,
): void {
  const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  if (!el) return;

  const readValue = (): string => {
    if (el instanceof HTMLInputElement && el.type === 'checkbox') return el.checked ? 'true' : 'false';
    if (el instanceof HTMLInputElement && el.type === 'radio') return el.checked ? el.value : '';
    return (el as HTMLInputElement).value ?? '';
  };

  const handler = (): void => {
    const value = readValue();
    if (value) {
      captured.set(fieldId, { fieldId, selector, label, name, value, inputType });
    } else {
      captured.delete(fieldId);
    }
  };

  el.addEventListener('input', handler);
  el.addEventListener('change', handler);
  // Capture current value if already filled
  handler();
}

/** MutationObserver to pick up dynamically added fields (React/SPA forms). */
let observer: MutationObserver | null = null;

export function watchForNewFields(getFields: () => import('../shared/types').DetectedField[]): void {
  if (observer) observer.disconnect();

  observer = new MutationObserver(() => {
    const currentIds = new Set(captured.keys());
    for (const field of getFields()) {
      if (!currentIds.has(field.id)) {
        attachListener(field.id, field.selector, field.label, field.name, field.inputType);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

export function getCaptureSession(): CaptureSession {
  return {
    ats,
    url: pageUrl,
    capturedAt: Date.now(),
    fields: [...captured.values()].filter(f => f.value.trim() !== ''),
  };
}

export function clearCapture(): void {
  captured.clear();
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}
