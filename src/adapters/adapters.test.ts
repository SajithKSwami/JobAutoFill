import { describe, it, expect, beforeEach, vi } from 'vitest';
import { greenhouseAdapter } from './greenhouseAdapter';
import { leverAdapter } from './leverAdapter';
import { workdayAdapter } from './workdayAdapter';
import { ashbyAdapter } from './ashbyAdapter';
import { genericAdapter } from './genericAdapter';
import { getBestAdapter } from './index';
import { sampleProfile } from '../shared/defaultProfile';
import type { DetectedField } from '../shared/types';

function field(overrides: Partial<DetectedField> & { label: string }): DetectedField {
  return {
    id: 'f1', selector: '#f1', tagName: 'input', inputType: 'text',
    required: false, visible: true, ...overrides,
  };
}

describe('greenhouseAdapter.detect', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('location', { hostname: 'boards.greenhouse.io', pathname: '/apply' });
  });

  it('returns high confidence on greenhouse.io hostname', () => {
    expect(greenhouseAdapter.detect()).toBeGreaterThan(0.8);
  });

  it('returns high confidence when application_form DOM marker present', () => {
    vi.stubGlobal('location', { hostname: 'company.com', pathname: '/jobs/apply' });
    document.body.innerHTML = `<form id="application_form"><input name="first_name" /></form>`;
    expect(greenhouseAdapter.detect()).toBeGreaterThan(0.5);
  });
});

describe('leverAdapter.detect', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('location', { hostname: 'jobs.lever.co', pathname: '/company/role' });
  });

  it('returns high confidence on lever.co hostname', () => {
    expect(leverAdapter.detect()).toBeGreaterThan(0.8);
  });

  it('returns confidence when .application-form present on custom domain', () => {
    vi.stubGlobal('location', { hostname: 'company.com', pathname: '/apply' });
    document.body.innerHTML = `<form class="application-form"></form>`;
    expect(leverAdapter.detect()).toBeGreaterThan(0.5);
  });
});

describe('workdayAdapter.detect', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('location', { hostname: 'company.wd1.myworkdayjobs.com', pathname: '/apply' });
  });

  it('returns high confidence on myworkdayjobs.com', () => {
    expect(workdayAdapter.detect()).toBeGreaterThan(0.8);
  });
});

describe('ashbyAdapter.detect', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('location', { hostname: 'jobs.ashbyhq.com', pathname: '/company/role' });
  });

  it('returns high confidence on ashbyhq.com', () => {
    expect(ashbyAdapter.detect()).toBeGreaterThan(0.8);
  });
});

describe('genericAdapter', () => {
  it('always returns 0.25 confidence', () => {
    expect(genericAdapter.detect()).toBe(0.25);
  });
});

describe('getBestAdapter', () => {
  it('returns greenhouse adapter on greenhouse hostname', () => {
    vi.stubGlobal('location', { hostname: 'boards.greenhouse.io', pathname: '/apply' });
    document.body.innerHTML = '';
    const { adapter } = getBestAdapter();
    expect(adapter.name).toBe('greenhouse');
  });

  it('returns lever adapter on lever hostname', () => {
    vi.stubGlobal('location', { hostname: 'jobs.lever.co', pathname: '/apply' });
    document.body.innerHTML = '';
    const { adapter } = getBestAdapter();
    expect(adapter.name).toBe('lever');
  });

  it('falls back to generic on unknown hostname', () => {
    vi.stubGlobal('location', { hostname: 'randomcompany.com', pathname: '/jobs' });
    document.body.innerHTML = '';
    const { adapter } = getBestAdapter();
    expect(adapter.name).toBe('generic');
  });
});

describe('greenhouseAdapter.map', () => {
  it('maps known field names with 0.98 confidence', () => {
    const fields: DetectedField[] = [
      field({ id: 'f1', label: 'First Name', name: 'first_name' }),
      field({ id: 'f2', label: 'Email', name: 'email' }),
    ];
    vi.stubGlobal('location', { hostname: 'boards.greenhouse.io', pathname: '/' });
    document.body.innerHTML = '';
    const mappings = greenhouseAdapter.map(fields, sampleProfile);
    const fnMapping = mappings.find(m => m.profilePath === 'personal.firstName');
    expect(fnMapping?.confidence).toBe(0.98);
    expect(fnMapping?.value).toBe(sampleProfile.personal.firstName);
  });
});
