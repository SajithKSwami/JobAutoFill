import type { CandidateProfile, DetectedField, FieldMapping } from '../shared/types';
import { AtsAdapter, fingerprintPage } from './adapter';
import { scanDomFields } from '../content/domScanner';
import { genericAdapter } from './genericAdapter';
import { getByPath } from '../shared/objectPath';

// Workday uses data-automation-id attributes for reliable field identification
const automationIdMap: Record<string, string> = {
  'legalNameSection_firstName': 'personal.firstName',
  'legalNameSection_lastName': 'personal.lastName',
  'email': 'personal.email',
  'phone-number': 'personal.phone',
  'addressSection_city': 'personal.city',
  'addressSection_countryRegion': 'personal.country',
  'linkedInUrl': 'personal.linkedin',
  'portfolioUrl': 'personal.portfolio',
  'howDidYouHearAboutUs': 'personal.portfolio',
};

export const workdayAdapter: AtsAdapter = {
  name: 'workday',

  detect: () => fingerprintPage({
    hostPatterns: [/myworkdayjobs\.com/, /wd\d+\.myworkdayjobs\.com/, /workday\.com/],
    domSelectors: [
      '[data-automation-id="legalNameSection_firstName"]',
      '[data-automation-id="email"]',
      '.wd-popup-inner',
      '[data-automation-id="multiSelectContainer"]',
    ],
    scriptPatterns: [/workday\.com/, /myworkdayjobs\.com/],
    iframePatterns: [/workday\.com/, /myworkdayjobs\.com/],
  }),

  scan: scanDomFields,

  map(fields: DetectedField[], profile: CandidateProfile): FieldMapping[] {
    const exact = fields.flatMap(field => {
      const autoId = document.querySelector(field.selector)?.getAttribute('data-automation-id') || '';
      const path = automationIdMap[autoId];
      if (!path) return [];
      const value = getByPath(profile, path);
      if (value === undefined || value === null || value === '') return [];
      return [{
        fieldId: field.id,
        profilePath: path,
        value: String(value),
        confidence: 0.91,
        reason: 'Workday automation-id field',
      }] as FieldMapping[];
    });

    const generic = genericAdapter.map(fields, profile)
      .filter(m => !exact.some(e => e.fieldId === m.fieldId))
      .map(m => ({ ...m, reason: `Workday generic: ${m.reason}` }));

    return [...exact, ...generic];
  },
};
