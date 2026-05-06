import type { CandidateProfile, DetectedField, FieldMapping, AtsName } from '../shared/types';

export interface AtsAdapter {
  name: AtsName;
  /** Returns confidence 0-1 that this adapter matches the current page. */
  detect(): number;
  scan(): DetectedField[];
  map(fields: DetectedField[], profile: CandidateProfile): FieldMapping[];
}

/** Multi-signal fingerprint: checks URL, DOM markers, scripts, and iframes. */
export function fingerprintPage(signals: {
  hostPatterns?: RegExp[];
  domSelectors?: string[];
  scriptPatterns?: RegExp[];
  iframePatterns?: RegExp[];
}): number {
  const scores: number[] = [];

  if (signals.hostPatterns) {
    const host = location.hostname + location.pathname;
    if (signals.hostPatterns.some(p => p.test(host))) scores.push(0.95);
  }

  if (signals.domSelectors) {
    const found = signals.domSelectors.filter(sel => !!document.querySelector(sel)).length;
    if (found > 0) scores.push(0.6 + (found / signals.domSelectors.length) * 0.3);
  }

  if (signals.scriptPatterns) {
    const scripts = [...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src') || '');
    if (signals.scriptPatterns.some(p => scripts.some(src => p.test(src)))) scores.push(0.85);
  }

  if (signals.iframePatterns) {
    const iframes = [...document.querySelectorAll('iframe[src]')].map(i => i.getAttribute('src') || '');
    if (signals.iframePatterns.some(p => iframes.some(src => p.test(src)))) scores.push(0.9);
  }

  return scores.length ? Math.max(...scores) : 0;
}
