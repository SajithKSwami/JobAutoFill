import type { CandidateProfile, DetectedField, FieldMapping } from '../shared/types';
import { AtsAdapter, fingerprintPage } from './adapter';
import { scanDomFields } from '../content/domScanner';
import { genericAdapter } from './genericAdapter';
import { getByPath } from '../shared/objectPath';

// Greenhouse uses consistent field name attributes across all customers
const knownFields: Record<string, string> = {
  first_name: 'personal.firstName',
  last_name: 'personal.lastName',
  email: 'personal.email',
  phone: 'personal.phone',
  'job_application[answers_attributes][0][text_value]': 'personal.linkedin',
};

export const greenhouseAdapter: AtsAdapter = {
  name: 'greenhouse',

  detect: () => fingerprintPage({
    hostPatterns: [/greenhouse\.io/, /boards\.greenhouse\.io/],
    domSelectors: ['#application_form', '[name="first_name"][form]', 'form#application_form'],
    scriptPatterns: [/greenhouse\.io/, /ghcms\.greenhouse\.io/],
    iframePatterns: [/greenhouse\.io/],
  }),

  scan: scanDomFields,

  map(fields: DetectedField[], profile: CandidateProfile): FieldMapping[] {
    const exact = fields.flatMap(field => {
      const key = field.name || '';
      const path = knownFields[key];
      if (!path) return [];
      const value = getByPath(profile, path);
      if (value === undefined || value === null || value === '') return [];
      return [{
        fieldId: field.id,
        profilePath: path,
        value: String(value),
        confidence: 0.98,
        reason: 'Greenhouse known field name',
      }];
    });
    const generic = genericAdapter.map(fields, profile).filter(m => !exact.some(e => e.fieldId === m.fieldId));
    return [...exact, ...generic];
  },
};
