import type { CandidateProfile, DetectedField, FieldMapping } from '../shared/types';
import { AtsAdapter, fingerprintPage } from './adapter';
import { scanDomFields } from '../content/domScanner';
import { genericAdapter } from './genericAdapter';
import { getByPath } from '../shared/objectPath';

// Ashby uses name attributes and testid attributes
const knownFields: Record<string, string> = {
  '_systemfield_name': 'personal.firstName',
  '_systemfield_email': 'personal.email',
  '_systemfield_phone': 'personal.phone',
  '_systemfield_linkedin_url': 'personal.linkedin',
  '_systemfield_website_url': 'personal.portfolio',
};

export const ashbyAdapter: AtsAdapter = {
  name: 'ashby',

  detect: () => fingerprintPage({
    hostPatterns: [/jobs\.ashbyhq\.com/, /ashbyhq\.com/],
    domSelectors: [
      '[data-testid="application-form"]',
      '[name="_systemfield_name"]',
      '[name="_systemfield_email"]',
      '.ashby-application-form',
    ],
    scriptPatterns: [/ashbyhq\.com/, /ashby-hq\.com/],
    iframePatterns: [/ashbyhq\.com/],
  }),

  scan: scanDomFields,

  map(fields: DetectedField[], profile: CandidateProfile): FieldMapping[] {
    const exact = fields.flatMap(field => {
      const path = knownFields[field.name || ''];
      if (!path) return [];
      const value = getByPath(profile, path);
      if (value === undefined || value === null || value === '') return [];
      return [{
        fieldId: field.id,
        profilePath: path,
        value: String(value),
        confidence: 0.94,
        reason: 'Ashby known field name',
      }] as FieldMapping[];
    });

    const generic = genericAdapter.map(fields, profile)
      .filter(m => !exact.some(e => e.fieldId === m.fieldId))
      .map(m => ({ ...m, reason: `Ashby: ${m.reason}` }));

    return [...exact, ...generic];
  },
};
