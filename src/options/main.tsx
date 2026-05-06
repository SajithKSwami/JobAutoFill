import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { CandidateProfile } from '../shared/types';

const emptyProfile: CandidateProfile = {
  personal: { firstName: '', lastName: '', email: '', phone: '', city: '', country: '', linkedin: '', portfolio: '' },
  workAuthorization: { authorized: true, requiresSponsorship: false, noticePeriod: '', salaryExpectation: '' },
  experience: [],
  education: [],
  customAnswers: [],
};

function bg<T>(msg: Record<string, unknown>): Promise<T> {
  return chrome.runtime.sendMessage(msg) as Promise<T>;
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="field">
      <label>{label}<input type={type} value={value} onChange={e => onChange(e.target.value)} /></label>
    </div>
  );
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="field check-field">
      <label>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        {label}
      </label>
    </div>
  );
}

function App() {
  const [profile, setProfile] = useState<CandidateProfile>(emptyProfile);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [newAnswer, setNewAnswer] = useState({ q: '', a: '' });

  function setP(path: string[], value: string | boolean) {
    setProfile(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as CandidateProfile;
      let obj: Record<string, unknown> = next as unknown as Record<string, unknown>;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]] as Record<string, unknown>;
      obj[path[path.length - 1]] = value;
      return next;
    });
  }

  async function loadOrCreate() {
    setError('');
    if (passphrase.length < 8) { setError('Passphrase must be at least 8 characters.'); return; }
    const r = await bg<{ profile: CandidateProfile | null }>({ type: 'LOAD_PROFILE', passphrase });
    if (r.profile) {
      setProfile(r.profile);
      setIsNew(false);
      setUnlocked(true);
      setStatus('Profile loaded.');
    } else {
      if (!confirmPass) { setError('No existing profile found. Enter confirm passphrase to create one.'); return; }
      if (passphrase !== confirmPass) { setError('Passphrases do not match.'); return; }
      setUnlocked(true);
      setIsNew(true);
      setStatus('New profile. Fill in your details and click Save.');
    }
  }

  async function save() {
    setError('');
    if (!profile.personal.email || !profile.personal.firstName) {
      setError('First name and email are required.'); return;
    }
    const r = await bg<{ ok: boolean; error?: string }>({ type: 'SAVE_PROFILE', profile, passphrase });
    if (!r.ok) { setError(r.error ?? 'Save failed.'); return; }
    setStatus('Profile saved and encrypted locally.');
    setIsNew(false);
  }

  async function deleteProfileHandler() {
    if (!confirm('Delete your local profile? This cannot be undone.')) return;
    await bg({ type: 'DELETE_PROFILE' });
    setProfile(emptyProfile);
    setUnlocked(false);
    setPassphrase('');
    setConfirmPass('');
    setStatus('Profile deleted.');
  }

  function addCustomAnswer() {
    if (!newAnswer.q.trim() || !newAnswer.a.trim()) return;
    setProfile(prev => ({
      ...prev,
      customAnswers: [...prev.customAnswers, { questionPattern: newAnswer.q.trim(), answer: newAnswer.a.trim() }],
    }));
    setNewAnswer({ q: '', a: '' });
  }

  function removeCustomAnswer(i: number) {
    setProfile(prev => ({ ...prev, customAnswers: prev.customAnswers.filter((_, idx) => idx !== i) }));
  }

  if (!unlocked) return (
    <main className="opts">
      <h1>AutoFill AI — Profile Setup</h1>
      <p className="hint">Your profile is stored only on this device, encrypted with your passphrase.</p>
      <section className="card">
        <div className="field"><label>Passphrase<input type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)} placeholder="At least 8 characters" /></label></div>
        <div className="field"><label>Confirm passphrase (new profiles only)<input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Repeat passphrase" /></label></div>
        {error && <p className="error">{error}</p>}
        <button className="btn-primary" onClick={() => void loadOrCreate()}>Open / Create Profile</button>
      </section>
    </main>
  );

  return (
    <main className="opts">
      <div className="opts-header">
        <h1>AutoFill AI — Profile Editor</h1>
        <div className="opts-header-actions">
          {status && <span className="status-inline">{status}</span>}
          <button className="btn-primary" onClick={() => void save()}>Save</button>
          <button className="btn-ghost" onClick={() => { setUnlocked(false); setPassphrase(''); }}>Lock</button>
          <button className="btn-danger" onClick={() => void deleteProfileHandler()}>Delete Profile</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>Personal Information</h2>
        <div className="two-col">
          <Field label="First name *" value={profile.personal.firstName} onChange={v => setP(['personal','firstName'], v)} />
          <Field label="Last name *" value={profile.personal.lastName} onChange={v => setP(['personal','lastName'], v)} />
          <Field label="Email *" value={profile.personal.email} onChange={v => setP(['personal','email'], v)} type="email" />
          <Field label="Phone" value={profile.personal.phone} onChange={v => setP(['personal','phone'], v)} type="tel" />
          <Field label="City" value={profile.personal.city ?? ''} onChange={v => setP(['personal','city'], v)} />
          <Field label="Country" value={profile.personal.country ?? ''} onChange={v => setP(['personal','country'], v)} />
          <Field label="LinkedIn URL" value={profile.personal.linkedin ?? ''} onChange={v => setP(['personal','linkedin'], v)} />
          <Field label="Portfolio / Website" value={profile.personal.portfolio ?? ''} onChange={v => setP(['personal','portfolio'], v)} />
        </div>
      </section>

      <section className="card">
        <h2>Work Authorization</h2>
        <div className="two-col">
          <CheckField label="Authorized to work without sponsorship" checked={profile.workAuthorization.authorized} onChange={v => setP(['workAuthorization','authorized'], v)} />
          <CheckField label="Requires visa sponsorship" checked={profile.workAuthorization.requiresSponsorship} onChange={v => setP(['workAuthorization','requiresSponsorship'], v)} />
          <Field label="Notice period (e.g. 2 weeks)" value={profile.workAuthorization.noticePeriod ?? ''} onChange={v => setP(['workAuthorization','noticePeriod'], v)} />
          <Field label="Salary expectation" value={profile.workAuthorization.salaryExpectation ?? ''} onChange={v => setP(['workAuthorization','salaryExpectation'], v)} />
        </div>
      </section>

      <section className="card">
        <h2>Saved Custom Answers</h2>
        <p className="hint">These are filled automatically when a question matches. Answers are also built up when you save form data.</p>
        {profile.customAnswers.map((a, i) => (
          <div key={i} className="answer-row">
            <div className="answer-content">
              <strong>{a.questionPattern}</strong>
              <span>{a.answer}</span>
            </div>
            <button className="btn-danger-small" onClick={() => removeCustomAnswer(i)}>✕</button>
          </div>
        ))}
        <div className="add-answer">
          <input placeholder="Question pattern (e.g. why interested)" value={newAnswer.q} onChange={e => setNewAnswer(p => ({ ...p, q: e.target.value }))} />
          <input placeholder="Your answer" value={newAnswer.a} onChange={e => setNewAnswer(p => ({ ...p, a: e.target.value }))} />
          <button className="btn-secondary" onClick={addCustomAnswer}>Add</button>
        </div>
      </section>

      {!isNew && (
        <section className="card">
          <h2>Privacy</h2>
          <p className="hint">Your profile never leaves this device. It is encrypted with AES-GCM using your passphrase.</p>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
