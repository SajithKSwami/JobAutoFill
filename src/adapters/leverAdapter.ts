import type { CandidateProfile, DetectedField, FieldMapping } from '../shared/types';
import { AtsAdapter, fingerprintPage } from './adapter';
import { scanDomFields } from '../content/domScanner';
import { genericAdapter } from './genericAdapter';
import { getByPath } from '../shared/objectPath';

// Lever uses data-qa attributes and name attributes consistently
const knownFields: Record<string, string> = {
  name: 'personal.firstName', // Lever sometimes combines
  'org-name': 'personal.firstName',
  email: 'personal.email',
  phone: 'personal.phone',
  org: 'personal.firstName',
  urls_linkedin: 'personal.linkedin',
  urls_portfolio: 'personal.portfolio',
  urls_other: 'personal.portfolio',
};

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
