import type { CandidateProfile } from './types';

export const sampleProfile: CandidateProfile = {
  personal: {
    firstName: 'Jane',
    lastName: 'Candidate',
    email: 'jane@example.com',
    phone: '+1 416 555 0100',
    city: 'Toronto',
    country: 'Canada',
    linkedin: 'https://www.linkedin.com/in/example',
    portfolio: 'https://example.com'
  },
  workAuthorization: {
    authorized: true,
    requiresSponsorship: false,
    noticePeriod: 'Two weeks'
  },
  customAnswers: [
    { questionPattern: 'why are you interested', answer: 'I am interested because the role aligns with my experience, values, and growth goals.' },
    { questionPattern: 'salary expectation', answer: 'Open to discussing based on total compensation and role scope.' }
  ]
};
