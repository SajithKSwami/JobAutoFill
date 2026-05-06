import type { FieldMapping } from '../shared/types';

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(el, value);
}

function dispatch(el: Element): void {
  ['input', 'change', 'blur'].forEach(type => el.dispatchEvent(new Event(type, { bubbles: true })));
}

export function fillMappings(mappings: FieldMapping[], fieldsById: Map<string, string>): string[] {
  const filled: string[] = [];
  for (const mapping of mappings) {
    const selector = fieldsById.get(mapping.fieldId);
    if (!selector) continue;
    const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    if (!el) continue;
    if (el instanceof HTMLInputElement && ['checkbox', 'radio'].includes(el.type)) {
      el.checked = String(mapping.value).toLowerCase() === 'true';
      dispatch(el);
      filled.push(mapping.fieldId);
      continue;
    }
    if (el instanceof HTMLSelectElement) {
      const wanted = String(mapping.value).toLowerCase();
      const option = [...el.options].find(o => o.value.toLowerCase() === wanted || o.text.toLowerCase().includes(wanted));
      if (option) el.value = option.value;
      dispatch(el);
      filled.push(mapping.fieldId);
      continue;
    }
    setNativeValue(el as HTMLInputElement | HTMLTextAreaElement, String(mapping.value));
    (el as HTMLElement).style.outline = '2px solid #2f80ed';
    setTimeout(() => ((el as HTMLElement).style.outline = ''), 1500);
    dispatch(el);
    filled.push(mapping.fieldId);
  }
  return filled;
}
