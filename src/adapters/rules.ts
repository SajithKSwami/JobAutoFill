export const canonicalRules: Array<{ patterns: RegExp[]; path: string; reason: string }> = [
  { patterns: [/first\s*name/i, /^first$/i, /given\s*name/i, /prénom/i, /vorname/i], path: 'personal.firstName', reason: 'first name label match' },
  { patterns: [/last\s*name/i, /^last$/i, /family\s*name/i, /surname/i, /nom\s*de\s*famille/i, /nachname/i], path: 'personal.lastName', reason: 'last name label match' },
  { patterns: [/^email/i, /e-mail/i, /email\s*address/i], path: 'personal.email', reason: 'email label match' },
  { patterns: [/phone/i, /mobile/i, /telephone/i, /cell/i, /contact\s*number/i], path: 'personal.phone', reason: 'phone label match' },
  { patterns: [/^city$/i, /city\s*\/\s*town/i, /municipality/i], path: 'personal.city', reason: 'city label match' },
  { patterns: [/^country$/i, /country\s*of\s*residence/i, /nation/i], path: 'personal.country', reason: 'country label match' },
  { patterns: [/linkedin/i, /linked\s*in/i], path: 'personal.linkedin', reason: 'LinkedIn label match' },
  { patterns: [/portfolio/i, /personal\s*site/i, /personal\s*website/i, /website\s*url/i], path: 'personal.portfolio', reason: 'portfolio label match' },
  { patterns: [/require.*sponsor/i, /need.*sponsor/i, /visa\s*sponsor/i, /sponsorship/i], path: 'workAuthorization.requiresSponsorship', reason: 'sponsorship question match' },
  { patterns: [/work.*authoriz/i, /legally.*work/i, /authorized.*work/i, /eligible.*work/i], path: 'workAuthorization.authorized', reason: 'work authorization match' },
  { patterns: [/notice\s*period/i, /start\s*date/i, /available\s*to\s*start/i], path: 'workAuthorization.noticePeriod', reason: 'notice period match' },
  { patterns: [/salary\s*expect/i, /desired\s*salary/i, /compensation/i, /pay\s*expect/i], path: 'workAuthorization.salaryExpectation', reason: 'salary expectation match' },
];
