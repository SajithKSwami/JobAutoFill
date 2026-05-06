import { describe, it, expect } from 'vitest';
import { canonicalRules } from './rules';
import { genericAdapter } from './genericAdapter';
import { sampleProfile } from '../shared/defaultProfile';
import type { DetectedField } from '../shared/types';

function field(overrides: Partial<DetectedField> & { label: string }): DetectedField {
  return {
    id: 'f1', selector: '#f1', tagName: 'input', inputType: 'text',
    required: false, visible: true, ...overrides,
  };
}

describe('canonicalRules', () => {
  it('matches first name patterns', () => {
    const rule = canonicalRules.find(r => r.path === 'personal.firstName')!;
    expect(rule.patterns.some(p => p.test('First Name'))).toBe(true);
    expect(rule.patterns.some(p => p.test('Given Name'))).toBe(true);
    expect(rule.patterns.some(p => p.test('first'))).toBe(true);
  });

  it('matches last name patterns', () => {
    const rule = canonicalRules.find(r => r.path === 'personal.lastName')!;
    expect(rule.patterns.some(p => p.test('Last Name'))).toBe(true);
    expect(rule.patterns.some(p => p.test('Surname'))).toBe(true);
    expect(rule.patterns.some(p => p.test('Family Name'))).toBe(true);
  });

  it('matches email patterns', () => {
    const rule = canonicalRules.find(r => r.path === 'personal.email')!;
    expect(rule.patterns.some(p => p.test('Email'))).toBe(true);
    expect(rule.patterns.some(p => p.test('Email Address'))).toBe(true);
  });

  it('matches phone patterns', () => {
    const rule = canonicalRules.find(r => r.path === 'personal.phone')!;
    expect(rule.patterns.some(p => p.test('Phone'))).toBe(true);
    expect(rule.patterns.some(p => p.test('Mobile Number'))).toBe(true);
    expect(rule.patterns.some(p => p.test('Contact Number'))).toBe(true);
  });

  it('matches linkedin patterns', () => {
    const rule = canonicalRules.find(r => r.path === 'personal.linkedin')!;
    expect(rule.patterns.some(p => p.test('LinkedIn'))).toBe(true);
    expect(rule.patterns.some(p => p.test('LinkedIn Profile'))).toBe(true);
  });

  it('matches salary expectation patterns', () => {
    const rule = canonicalRules.find(r => r.path === 'workAuthorization.salaryExpectation')!;
    expect(rule.patterns.some(p => p.test('Salary Expectation'))).toBe(true);
    expect(rule.patterns.some(p => p.test('Desired Salary'))).toBe(true);
    expect(rule.patterns.some(p => p.test('Compensation'))).toBe(true);
  });

  it('matches notice period patterns', () => {
    const rule = canonicalRules.find(r => r.path === 'workAuthorization.noticePeriod')!;
    expect(rule.patterns.some(p => p.test('Notice Period'))).toBe(true);
    expect(rule.patterns.some(p => p.test('Available to Start'))).toBe(true);
  });
});

describe('genericAdapter.map', () => {
  it('maps email label to personal.email', () => {
    const mappings = genericAdapter.map([field({ label: 'Email' })], sampleProfile);
    expect(mappings[0].profilePath).toBe('personal.email');
    expect(mappings[0].value).toBe(sampleProfile.personal.email);
  });

  it('maps first name label', () => {
    const mappings = genericAdapter.map([field({ label: 'First Name' })], sampleProfile);
    expect(mappings[0].profilePath).toBe('personal.firstName');
  });

  it('maps phone label', () => {
    const mappings = genericAdapter.map([field({ label: 'Mobile Number' })], sampleProfile);
    expect(mappings[0].profilePath).toBe('personal.phone');
  });

  it('returns no mapping for unrecognized label', () => {
    const mappings = genericAdapter.map([field({ label: 'Favourite colour' })], sampleProfile);
    expect(mappings).toHaveLength(0);
  });

  it('returns no mapping when profile value is empty', () => {
    const sparse = { ...sampleProfile, personal: { ...sampleProfile.personal, city: '' } };
    const mappings = genericAdapter.map([field({ label: 'City' })], sparse);
    expect(mappings).toHaveLength(0);
  });

  it('assigns confidence >= 0.8 for generic matches', () => {
    const mappings = genericAdapter.map([field({ label: 'Email' })], sampleProfile);
    expect(mappings[0].confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('maps linkedin via placeholder text', () => {
    const mappings = genericAdapter.map(
      [field({ label: '', placeholder: 'LinkedIn URL' })],
      sampleProfile
    );
    expect(mappings[0]?.profilePath).toBe('personal.linkedin');
  });
});
