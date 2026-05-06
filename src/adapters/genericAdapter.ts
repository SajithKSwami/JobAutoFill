import type { CandidateProfile, DetectedField, FieldMapping } from '../shared/types';
import type { AtsAdapter } from './adapter';
import { canonicalRules } from './rules';
import { scanDomFields } from '../content/domScanner';
import { getByPath } from '../shared/objectPath';

export const genericAdapter: AtsAdapter = {
  name: 'generic',
  detect: () => 0.25,
  scan: scanDomFields,
  map(fields: DetectedField[], profile: CandidateProfile): FieldMapping[] {
    return fields.flatMap(field => {
      const haystack = [field.label, field.name, field.placeholder].filter(Boolean).join(' ');
      const rule = canonicalRules.find(r => r.patterns.some(p => p.test(haystack)));
      if (!rule) return [];
      const value = getByPath(profile, rule.path);
      if (value === undefined || value === null || value === '') return [];
      return [{ fieldId: field.id, profilePath: rule.path, value: String(value), confidence: 0.82, reason: rule.reason }];
    });
  }
};
