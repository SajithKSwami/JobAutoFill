# JobAutoFill

A privacy-first Chrome / Edge browser extension that helps job seekers fill job application forms faster — without sending your data anywhere.

Your profile is stored **only on your device**, encrypted with a passphrase you control. No account, no cloud, no tracking.

---

## How it works

### Learn by filling (primary flow)
Fill any job application form as you normally would. The extension watches what you type and, when you're done, offers to save that data to your local encrypted profile. Next time you're on a similar form, it autofills from what it learned.

### Autofill from saved profile
Once your profile has data, click the extension popup, unlock your vault, scan the page, and autofill with one click.

---

## Features

| Feature | Detail |
|---------|--------|
| **Form capture** | Watches user-typed values in real time; saves on your approval |
| **ATS detection** | Identifies Greenhouse, Lever, Workday, Ashby — even on custom career pages — via URL + DOM + script fingerprinting |
| **Smart field mapping** | Maps form fields to your profile using label, name, placeholder, and aria attributes |
| **Encrypted vault** | AES-GCM encryption via Web Crypto API; key derived with PBKDF2 (250,000 iterations) |
| **Capture review** | Before saving, you tick exactly which captured values to keep |
| **Autofill preview** | See what will be filled and its confidence score before filling |
| **Custom answers** | Saves answers to free-text questions (why interested, salary expectation, etc.) and reuses them |
| **Session unlock** | Unlock once per browser session; service worker keeps key in memory only |
| **No cloud** | Zero external network calls for profile data |
| **No auto-submit** | Extension never clicks Submit on your behalf |

---

## Supported ATS platforms

| Platform | Detection method | Notes |
|----------|-----------------|-------|
| **Greenhouse** | URL + `#application_form` DOM + script fingerprint | Highest confidence; known field name mapping |
| **Lever** | URL + `.application-form` class + script | Good startup coverage |
| **Workday** | URL + `data-automation-id` attributes | Dynamic forms; generic fallback also active |
| **Ashby** | URL + `data-testid` + `_systemfield_*` names | Modern startup ATS |
| **SmartRecruiters, iCIMS, BambooHR, Taleo** | Host permission + generic scanner | Falls back to label-matching |
| **Any custom career page** | Generic label/name/placeholder matching | Works for most employer-owned forms |

---

## Quick start

### Prerequisites
- Node.js 18+
- Chrome or Edge (Manifest V3)

### Install and build

```bash
git clone https://github.com/SajithKSwami/JobAutoFill.git
cd JobAutoFill
npm install
npm run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder inside this repo

### Load in Edge

1. Open `edge://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `dist/`

---

## First run

1. Click the extension icon → you'll see the lock screen
2. Click **Options** (or right-click the icon → Options)
3. Set a passphrase (minimum 8 characters) and fill in your profile:
   - First name, last name, email, phone
   - City, country, LinkedIn, portfolio URL
   - Work authorization and notice period
4. Click **Save** → your profile is encrypted and stored locally

---

## Using the extension

### Save data from a form you fill manually

1. Navigate to any job application page
2. Fill the form as you normally would
3. Click the extension popup icon
4. Enter your passphrase to unlock
5. Click **Review & Save Captured Data**
6. Tick which fields to save to your profile
7. Click **Save Selected**

Your profile now remembers those values for future applications.

### Autofill a form from your saved profile

1. Navigate to a job application page
2. Click the extension popup
3. Unlock with your passphrase (stays unlocked for the browser session)
4. Click **Scan Page** — the extension detects the ATS and finds form fields
5. Review the field list and confidence scores
6. Click **Autofill** — fields ≥ 75% confidence are filled and highlighted briefly
7. Review everything before clicking Submit yourself

---

## Development

```bash
# Watch mode (rebuilds on save)
npm run dev

# Production build
npm run build

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Project structure

```
src/
├── adapters/               ATS detection and field mapping
│   ├── adapter.ts          AtsAdapter interface + fingerprintPage() utility
│   ├── rules.ts            Canonical field-matching rules (label → profile path)
│   ├── greenhouseAdapter.ts
│   ├── leverAdapter.ts
│   ├── workdayAdapter.ts
│   ├── ashbyAdapter.ts
│   ├── genericAdapter.ts   Label-matching fallback for any form
│   └── index.ts            getBestAdapter() — picks highest-confidence adapter
├── background/
│   └── service-worker.ts   MV3 service worker: vault, session, merge orchestration
├── content/
│   ├── content-script.ts   Entry point: wires scan, capture, fill
│   ├── domScanner.ts       Finds all visible form fields and extracts labels
│   ├── fillExecutor.ts     Writes values and dispatches events (React/Vue/Angular safe)
│   └── formCapture.ts      Passive observer: records what the user types
├── popup/
│   ├── main.tsx            Three-view popup: unlock / main / capture review
│   └── style.css
├── options/
│   ├── main.tsx            Profile editor form
│   ├── style.css
│   └── index.html
└── shared/
    ├── types.ts            All TypeScript types
    ├── messaging.ts        Type-safe Chrome message helpers
    ├── cryptoVault.ts      AES-GCM encrypt/decrypt via Web Crypto API
    ├── storage.ts          IndexedDB profile CRUD + merge logic
    ├── objectPath.ts       getByPath / setByPath for nested profile updates
    └── defaultProfile.ts   Sample profile for development
```

### Adding a new ATS adapter

1. Create `src/adapters/myAtsAdapter.ts`:

```typescript
import { AtsAdapter, fingerprintPage } from './adapter';
import { scanDomFields } from '../content/domScanner';
import { genericAdapter } from './genericAdapter';

export const myAtsAdapter: AtsAdapter = {
  name: 'generic', // use 'generic' or add your ATS to the AtsName union in types.ts

  detect: () => fingerprintPage({
    hostPatterns: [/myats\.com/],
    domSelectors: ['[data-myats-form]'],
    scriptPatterns: [/myats\.com\/embed/],
  }),

  scan: scanDomFields,

  map(fields, profile) {
    return genericAdapter.map(fields, profile);
  },
};
```

2. Register it in `src/adapters/index.ts` before `genericAdapter`
3. Add host permissions to `public/manifest.json`
4. Write a fixture in `src/test-fixtures/` and a test in `adapters.test.ts`

---

## Security model

| Control | Implementation |
|---------|---------------|
| Storage | IndexedDB — local to the browser profile |
| Encryption | AES-GCM 256-bit via `crypto.subtle` |
| Key derivation | PBKDF2-SHA-256, 250,000 iterations |
| Session | Passphrase kept in service worker memory only; cleared on browser restart |
| Data export | Not implemented in MVP — profile stays local |
| Network | No external requests for profile data; extension only talks to the active tab |
| Auto-submit | Disabled — extension never clicks Submit, Apply, or Send |
| Hidden fields | Ignored by `domScanner.ts` |
| Honeypot fields | Excluded (zero-size elements filtered by `isVisible()`) |

---

## Tests

```
src/adapters/rules.test.ts       14 tests — canonical rule matching
src/adapters/adapters.test.ts    11 tests — ATS detection and field mapping
src/content/domScanner.test.ts    5 tests — DOM field extraction
src/shared/storage.test.ts        9 tests — merge preview and apply logic
─────────────────────────────────────────
Total                            39 tests, all passing
```

Run with: `npm test`

---

## Roadmap

- [ ] Workday multi-page flow support
- [ ] Resume file guidance (browser restrictions prevent programmatic attach)
- [ ] EEO fields with opt-in confirmation
- [ ] Profile export (encrypted file download)
- [ ] Firefox support (after MV3 compatibility review)
- [ ] One-click correction: remap a wrongly-filled field and remember it

---

## Privacy

- Your profile **never leaves your device** by default
- No telemetry, no analytics, no third-party scripts in the extension
- Encryption key is derived from your passphrase and never stored
- Decrypted profile exists only in service worker memory while unlocked

---

## License

MIT — see [LICENSE](LICENSE)
