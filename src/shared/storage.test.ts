import { describe, it, expect } from 'vitest';
import { previewMerge, applyMerge } from './storage';
import { sampleProfile } from './defaultProfile';
import type { CaptureSession, CandidateProfile } from './types';

function makeCapture(fields: CaptureSession['fields']): CaptureSession {
  return { ats: 'greenhouse', url: 'https://boards.greenhouse.io/test', capturedAt: Date.now(), fields };
}

describe('previewMerge', () => {
  it('detects a changed email as an update', () => {
    const capture = makeCapture([
      { fieldId: 'f1', label: 'Email', name: 'email', value: 'new@email.com', inputType: 'email', selector: '#email' },
    ]);
    const preview = previewMerge(capture, sampleProfile);
    expect(preview.updates).toHaveLength(1);
    expect(preview.updates[0].profilePath).toBe('personal.email');
    expect(preview.updates[0].newValue).toBe('new@email.com');
  });

  it('skips fields where value matches existing profile', () => {
    const capture = makeCapture([
      { fieldId: 'f1', label: 'Email', name: 'email', value: sampleProfile.personal.email, inputType: 'email', selector: '#email' },
    ]);
    const preview = previewMerge(capture, sampleProfile);
    expect(preview.updates).toHaveLength(0);
  });

  it('classifies unrecognized labeled fields as new custom answers', () => {
    const capture = makeCapture([
      { fieldId: 'f2', label: 'Why are you interested in this role?', value: 'Because of the mission.', inputType: 'textarea', selector: '#why' },
    ]);
    const preview = previewMerge(capture, sampleProfile);
    expect(preview.newAnswers.length).toBeGreaterThan(0);
    expect(preview.newAnswers[0].answer).toBe('Because of the mission.');
  });

  it('skips empty values', () => {
    const capture = makeCapture([
      { fieldId: 'f1', label: 'Phone', value: '', inputType: 'tel', selector: '#phone' },
    ]);
    const preview = previewMerge(capture, sampleProfile);
    expect(preview.updates).toHaveLength(0);
  });

  it('does not add duplicate custom answers', () => {
    const profileWithAnswer: CandidateProfile = {
      ...sampleProfile,
      customAnswers: [{ questionPattern: 'why are you interested in this role?', answer: 'Existing answer' }],
    };
    const capture = makeCapture([
      { fieldId: 'f2', label: 'Why are you interested in this role?', value: 'New answer', inputType: 'textarea', selector: '#why' },
    ]);
    const preview = previewMerge(capture, profileWithAnswer);
    expect(preview.newAnswers).toHaveLength(0);
  });
});

describe('applyMerge', () => {
  it('applies accepted profile path updates', () => {
    const capture = makeCapture([
      { fieldId: 'f1', label: 'Email', name: 'email', value: 'updated@email.com', inputType: 'email', selector: '#email' },
    ]);
    const merged = applyMerge(capture, sampleProfile, ['personal.email']);
    expect(merged.personal.email).toBe('updated@email.com');
  });

  it('does not apply updates that were not accepted', () => {
    const capture = makeCapture([
      { fieldId: 'f1', label: 'Email', name: 'email', value: 'updated@email.com', inputType: 'email', selector: '#email' },
    ]);
    const merged = applyMerge(capture, sampleProfile, []);
    expect(merged.personal.email).toBe(sampleProfile.personal.email);
  });

  it('appends accepted custom answers', () => {
    const capture = makeCapture([
      { fieldId: 'f2', label: 'Tell us about yourself', value: 'I am a software engineer.', inputType: 'textarea', selector: '#bio' },
    ]);
    const merged = applyMerge(capture, sampleProfile, ['customAnswer:Tell us about yourself']);
    expect(merged.customAnswers.some(a => a.answer === 'I am a software engineer.')).toBe(true);
  });

  it('does not mutate the original profile', () => {
    const original = JSON.parse(JSON.stringify(sampleProfile)) as CandidateProfile;
    const capture = makeCapture([
      { fieldId: 'f1', label: 'Email', name: 'email', value: 'changed@email.com', inputType: 'email', selector: '#email' },
    ]);
    applyMerge(capture, sampleProfile, ['personal.email']);
    expect(sampleProfile.personal.email).toBe(original.personal.email);
  });
});
