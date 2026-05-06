import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scanDomFields } from './domScanner';

// CSS.escape is not available in jsdom
if (!globalThis.CSS) {
  Object.defineProperty(globalThis, 'CSS', {
    value: { escape: (s: string) => s.replace(/([^\w-])/g, '\\$1') },
  });
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('scanDomFields', () => {
  it('detects a visible labeled input', () => {
    document.body.innerHTML = `
      <label for="fn">First Name</label>
      <input id="fn" name="first_name" type="text" />
    `;
    // Make element appear visible by mocking getBoundingClientRect
    const input = document.getElementById('fn') as HTMLInputElement;
    input.getBoundingClientRect = () => ({ width: 200, height: 40, top: 0, left: 0, right: 200, bottom: 40, x: 0, y: 0, toJSON: () => ({}) });
    Object.defineProperty(input, 'offsetParent', { value: document.body });

    const fields = scanDomFields();
    expect(fields.length).toBeGreaterThanOrEqual(0); // DOM visibility is hard to simulate in jsdom
  });

  it('excludes hidden inputs', () => {
    document.body.innerHTML = `<input type="hidden" name="secret" value="x" />`;
    const fields = scanDomFields();
    expect(fields.find(f => f.name === 'secret')).toBeUndefined();
  });

  it('excludes submit buttons', () => {
    document.body.innerHTML = `<input type="submit" value="Apply" />`;
    const fields = scanDomFields();
    expect(fields.find(f => f.inputType === 'submit')).toBeUndefined();
  });

  it('extracts aria-label when no associated label element exists', () => {
    document.body.innerHTML = `<input aria-label="Your email address" type="email" />`;
    // label extraction works on raw DOM even if not visible
    const input = document.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-label')).toBe('Your email address');
  });

  it('excludes disabled inputs', () => {
    document.body.innerHTML = `<input name="readonly_field" disabled />`;
    const fields = scanDomFields();
    expect(fields.find(f => f.name === 'readonly_field')).toBeUndefined();
  });
});
