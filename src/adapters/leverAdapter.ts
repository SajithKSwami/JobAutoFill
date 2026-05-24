import type { CandidateProfile, DetectedField, FieldMapping } from '../shared/types';
import { AtsAdapter, fingerprintPage } from './adapter';
import { scanDomFields } from '../content/domScanner';
import { genericAdapter } from './genericAdapter';
import { getByPath } from '../shared/objectPath';

// Lever uses data-qa attributes and name attributes consistently.
// 'name', 'org-name', 'org' are full-name fields — value computed at map time.
const knownFields: Record<string, string> = {
  email: 'personal.email',
  phone: 'personal.phone',
  urls_linkedin: 'personal.linkedin',
  urls_portfolio: 'personal.portfolio',
  urls_other: 'personal.portfolio',
};

// Fields that expect a full name (firstName + lastName combined)
const fullNameFields = new Set(['name', 'org-name', 'org']);

const knownDataQa: Record<string, string> = {
  'additional-information-text-editor': 'personal.portfolio',
};

export const leverAdapter: AtsAdapter = {
  name: 'lever',

  detect: () => fingerprintPage({
    hostPatterns: [/jobs\.lever\.co/, /lever\.co/],
    domSelectors: ['.application-form', '[data-qa="application-form"]', '.lever-apply', 'form.application-form'],
    scriptPatterns: [/lever\.co/, /jobs\.lever\.co/],
    iframePatterns: [/lever\.co/],
  }),

  scan: scanDomFields,

  map(fields: DetectedField[], profile: CandidateProfile): FieldMapping[] {
    const exact = fields.flatMap(field => {
      const nameKey = field.name || '';
      const dataQaKey = field.selector.match(/data-qa="([^"]+)"/)?.[1] || '';

      // Full-name fields: combine first + last
      if (fullNameFields.has(nameKey)) {
        const first = String(getByPath(profile, 'personal.firstName') ?? '').trim();
        const last = String(getByPath(profile, 'personal.lastName') ?? '').trim();
        const full = [first, last].filter(Boolean).join(' ');
        if (!full) return [];
        return [{ fieldId: field.id, profilePath: 'personal.firstName', value: full, confidence: 0.93, reason: 'Lever full name field' }] as FieldMapping[];
      }

      const path = knownFields[nameKey] || knownDataQa[dataQaKey];
      if (!path) return [];

      const value = getByPath(profile, path);
      if (value === undefined || value === null || value === '') return [];
      return [{
        fieldId: field.id,
        profilePath: path,
        value: String(value),
        confidence: 0.93,
        reason: 'Lever known field',
      }] as FieldMapping[];
    });

    const generic = genericAdapter.map(fields, profile)
      .filter(m => !exact.some(e => e.fieldId === m.fieldId))
      .map(m => ({ ...m, confidence: Math.min(m.confidence + 0.04, 0.92), reason: `Lever: ${m.reason}` }));

    return [...exact, ...generic];
  },
};
