import type { AtsAdapter } from './adapter';
import { greenhouseAdapter } from './greenhouseAdapter';
import { leverAdapter } from './leverAdapter';
import { workdayAdapter } from './workdayAdapter';
import { ashbyAdapter } from './ashbyAdapter';
import { genericAdapter } from './genericAdapter';

// Listed in priority order; genericAdapter is always last fallback
const adapters: AtsAdapter[] = [
  greenhouseAdapter,
  leverAdapter,
  workdayAdapter,
  ashbyAdapter,
  genericAdapter,
];

export function getBestAdapter(): { adapter: AtsAdapter; confidence: number } {
  const scored = adapters
    .map(adapter => ({ adapter, confidence: adapter.detect() }))
    .sort((a, b) => b.confidence - a.confidence);
  return scored[0];
}

export { greenhouseAdapter, leverAdapter, workdayAdapter, ashbyAdapter, genericAdapter };
