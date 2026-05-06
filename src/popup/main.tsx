import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ScanResult, FieldMapping, CaptureSession, ProfileMergePreview } from '../shared/types';
import './style.css';

type View = 'lock' | 'main' | 'capture-review';

async function activeTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) throw new Error('No active tab');
  return tab.id;
}

function bg<T>(msg: Record<string, unknown>): Promise<T> {
  return chrome.runtime.sendMessage(msg) as Promise<T>;
}

function App() {
  const [view, setView] = useState<View>('lock');
  const [passphrase, setPassphrase] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [captureSession, setCaptureSession] = useState<CaptureSession | null>(null);
  const [preview, setPreview] = useState<ProfileMergePreview | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [profileExists, setProfileExists] = useState(false);

  useEffect(() => {
    void bg<{ locked: boolean }>({ type: 'IS_LOCKED' }).then(r => {
      if (!r.locked) setView('main');
    });
    void bg<{ exists: boolean }>({ type: 'PROFILE_EXISTS' }).then(r => setProfileExists(r.exists));
  }, []);

  function clearError() { setError(''); }

  async function unlock() {
    clearError();
    if (passphrase.length < 8) { setError('Passphrase must be at least 8 characters.'); return; }
    const r = await bg<{ ok: boolean; error?: string }>({ type: 'UNLOCK', passphrase });
    if (!r.ok) { setError(r.error ?? 'Wrong passphrase.'); return; }
    setView('main');
  }

  async function scanPage() {
    clearError();
    setStatus('Scanning page…');
    try {
      const tabId = await activeTabId();
      const profileRes = await bg<{ profile: unknown }>({ type: 'GET_SESSION_PROFILE' });
      if (!profileRes.profile) { setError('No profile loaded. Please unlock first.'); setStatus(''); return; }
      const result = await chrome.tabs.sendMessage(tabId, { type: 'SCAN_PAGE', profile: profileRes.profile }) as ScanResult;
      setScanResult(result);
      setStatus(`${result.ats.toUpperCase()} · ${result.fields.length} fields · ${Math.round(result.confidence * 100)}% confidence`);
    } catch (e) {
      setError('Could not scan. Make sure you are on a job application page.');
      setStatus('');
    }
  }

  async function autofill() {
    if (!scanResult) return;
    clearError();
    const safeMappings: FieldMapping[] = scanResult.mappings.filter(m => m.confidence >= 0.75);
    if (!safeMappings.length) { setError('No high-confidence fields to fill.'); return; }
    setStatus('Filling fields…');
    const tabId = await activeTabId();
    const r = await chrome.tabs.sendMessage(tabId, { type: 'FILL_PAGE', mappings: safeMappings }) as { filled: string[] };
    setStatus(`Filled ${r.filled.length} fields. Review before submitting.`);
  }

  async function openCaptureReview() {
    clearError();
    setStatus('Reading captured data…');
    const tabId = await activeTabId();
    const session = await chrome.tabs.sendMessage(tabId, { type: 'GET_CAPTURE' }) as CaptureSession;
    if (!session.fields.length) { setError('No data captured yet. Fill the form first, then click this.'); setStatus(''); return; }
    setCaptureSession(session);

    const r = await bg<{ preview?: ProfileMergePreview; ok?: boolean; error?: string }>({
      type: 'PREVIEW_MERGE', capture: session, passphrase,
    });
    if (!r.preview) { setError(r.error ?? 'Could not preview merge.'); setStatus(''); return; }
    setPreview(r.preview);
    const all = new Set([
      ...r.preview.updates.map(u => u.profilePath),
      ...r.preview.newAnswers.map(a => `customAnswer:${a.questionPattern}`),
    ]);
    setAccepted(all);
    setView('capture-review');
    setStatus('');
  }

  async function saveMerge() {
    if (!captureSession || !preview) return;
    clearError();
    const r = await bg<{ ok: boolean; error?: string }>({
      type: 'SAVE_MERGE', capture: captureSession, passphrase, accepted: [...accepted],
    });
    if (!r.ok) { setError(r.error ?? 'Save failed.'); return; }
    await chrome.tabs.sendMessage(await activeTabId(), { type: 'CLEAR_CAPTURE' });
    setCaptureSession(null);
    setPreview(null);
    setView('main');
    setStatus('Profile updated from form data.');
  }

  function toggleAccepted(key: string) {
    setAccepted(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // ─── Views ────────────────────────────────────────────────────────────────

  if (view === 'lock') return (
    <main className="popup">
      <header><h1>AutoFill AI</h1><p className="tagline">Local · Private · Secure</p></header>
      <section className="card">
        {!profileExists && (
          <p className="hint">No profile yet. <a href="#" onClick={() => chrome.runtime.openOptionsPage()}>Create one in Options →</a></p>
        )}
        <label>Passphrase
          <input
            type="password"
            value={passphrase}
            onChange={e => setPassphrase(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void unlock()}
            placeholder="Your vault passphrase"
            autoFocus
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn-primary" onClick={() => void unlock()}>Unlock</button>
        <button className="btn-ghost" onClick={() => chrome.runtime.openOptionsPage()}>Options</button>
      </section>
    </main>
  );

  if (view === 'capture-review' && preview) return (
    <main className="popup wide">
      <header>
        <h1>Save Form Data</h1>
        <button className="btn-ghost small" onClick={() => { setView('main'); setStatus(''); }}>← Back</button>
      </header>
      <p className="hint">Select which captured values to save to your profile.</p>

      {preview.updates.length > 0 && (
        <section className="card">
          <h2>Profile updates</h2>
          {preview.updates.map(u => (
            <label key={u.profilePath} className="check-row">
              <input
                type="checkbox"
                checked={accepted.has(u.profilePath)}
                onChange={() => toggleAccepted(u.profilePath)}
              />
              <span>
                <strong>{u.label}</strong>
                {u.oldValue && <s className="old-val">{u.oldValue}</s>}
                <span className="new-val">{u.newValue}</span>
              </span>
            </label>
          ))}
        </section>
      )}

      {preview.newAnswers.length > 0 && (
        <section className="card">
          <h2>New custom answers</h2>
          {preview.newAnswers.map(a => (
            <label key={a.questionPattern} className="check-row">
              <input
                type="checkbox"
                checked={accepted.has(`customAnswer:${a.questionPattern}`)}
                onChange={() => toggleAccepted(`customAnswer:${a.questionPattern}`)}
              />
              <span>
                <strong>{a.questionPattern}</strong>
                <span className="new-val">{a.answer}</span>
              </span>
            </label>
          ))}
        </section>
      )}

      {preview.updates.length === 0 && preview.newAnswers.length === 0 && (
        <p className="hint">Nothing new to save — your profile is already up to date.</p>
      )}

      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="btn-primary" onClick={() => void saveMerge()} disabled={accepted.size === 0}>
          Save Selected
        </button>
        <button className="btn-ghost" onClick={() => setView('main')}>Cancel</button>
      </div>
    </main>
  );

  // main view
  return (
    <main className="popup">
      <header>
        <h1>AutoFill AI</h1>
        <button className="btn-ghost small lock-btn" onClick={() => {
          void bg({ type: 'LOCK' });
          setView('lock');
          setPassphrase('');
          setScanResult(null);
        }}>🔒</button>
      </header>

      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>Autofill from profile</h2>
        <p className="hint">Scan this page to detect fields, then autofill from your saved profile.</p>
        <div className="actions">
          <button className="btn-primary" onClick={() => void scanPage()}>Scan Page</button>
          <button className="btn-secondary" onClick={() => void autofill()} disabled={!scanResult?.mappings.length}>
            Autofill
          </button>
        </div>
        {scanResult && (
          <ul className="field-list">
            {scanResult.mappings.map(m => (
              <li key={m.fieldId}>
                <span className="field-label">{m.profilePath.split('.').pop()}</span>
                <span className="confidence" style={{ opacity: m.confidence }}>{Math.round(m.confidence * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
        {scanResult?.warnings.map(w => <p key={w} className="warning">{w}</p>)}
      </section>

      <section className="card">
        <h2>Save from this form</h2>
        <p className="hint">Fill the form manually and save what you typed to your profile for future use.</p>
        <button className="btn-secondary full-width" onClick={() => void openCaptureReview()}>
          Review &amp; Save Captured Data
        </button>
      </section>

      <footer>
        <button className="btn-ghost" onClick={() => chrome.runtime.openOptionsPage()}>Edit Profile</button>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
