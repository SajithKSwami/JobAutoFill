import type { DetectedField } from '../shared/types';

function cssPath(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
    const tag = node.tagName.toLowerCase();
    const parent = node.parentElement;
    if (!parent) break;
    const siblings = [...parent.children].filter(x => x.tagName === node!.tagName);
    const nth = siblings.indexOf(node) + 1;
    parts.unshift(`${tag}:nth-of-type(${nth})`);
    node = parent;
  }
  return parts.join(' > ');
}

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
}

function labelFor(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const labels = 'labels' in el && el.labels ? [...el.labels].map(l => l.innerText).join(' ') : '';
  const aria = el.getAttribute('aria-label') || '';
  const labelledBy = el.getAttribute('aria-labelledby');
  const ariaText = labelledBy ? labelledBy.split(' ').map(id => document.getElementById(id)?.innerText || '').join(' ') : '';
  const nearby = el.closest('label, div, li, fieldset')?.textContent?.slice(0, 200) || '';
  const placeholder = el instanceof HTMLSelectElement ? '' : el.placeholder;
  return [labels, aria, ariaText, placeholder, el.name, el.id, nearby].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function scanDomFields(): DetectedField[] {
  const nodes = [...document.querySelectorAll('input, textarea, select')] as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
  return nodes
    .filter(el => !(el as HTMLInputElement).disabled && !(el as HTMLInputElement).readOnly)
    .map((el, idx) => ({
      id: `field-${idx}`,
      selector: cssPath(el),
      tagName: el.tagName.toLowerCase(),
      inputType: el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase(),
      label: labelFor(el),
      name: el.getAttribute('name') || undefined,
      placeholder: el.getAttribute('placeholder') || undefined,
      required: el.hasAttribute('required') || el.getAttribute('aria-required') === 'true',
      visible: isVisible(el as HTMLElement)
    }))
    .filter(f => f.visible && !['hidden', 'submit', 'button', 'reset', 'password'].includes(f.inputType));
}
