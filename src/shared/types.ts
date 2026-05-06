export type AtsName = 'greenhouse' | 'lever' | 'workday' | 'ashby' | 'smartrecruiters' | 'generic' | 'unknown';

export interface CandidateProfile {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    city?: string;
    country?: string;
    linkedin?: string;
    portfolio?: string;
  };
  workAuthorization: {
    authorized: boolean;
    requiresSponsorship: boolean;
    noticePeriod?: string;
    salaryExpectation?: string;
  };
  experience?: Array<{
    company: string;
    title: string;
    startDate: string;
    endDate?: string;
    summary?: string;
  }>;
  education?: Array<{
    school: string;
    degree: string;
    field?: string;
    graduationYear?: string;
  }>;
  eeo?: {
    gender?: string;
    race?: string;
    veteran?: string;
    disability?: string;
  };
  customAnswers: Array<{ questionPattern: string; answer: string; tags?: string[] }>;
}

export interface DetectedField {
  id: string;
  selector: string;
  tagName: string;
  inputType: string;
  label: string;
  name?: string;
  placeholder?: string;
  required: boolean;
  visible: boolean;
}

export interface FieldMapping {
  fieldId: string;
  profilePath: string;
  value: string | boolean;
  confidence: number;
  reason: string;
}

export interface ScanResult {
  ats: AtsName;
  confidence: number;
  fields: DetectedField[];
  mappings: FieldMapping[];
  warnings: string[];
}

export interface CapturedField {
  fieldId: string;
  label: string;
  name?: string;
  value: string;
  inputType: string;
  selector: string;
}

export interface CaptureSession {
  ats: AtsName;
  url: string;
  capturedAt: number;
  fields: CapturedField[];
}

export interface ProfileMergePreview {
  updates: Array<{ profilePath: string; label: string; oldValue: string; newValue: string }>;
  newAnswers: Array<{ questionPattern: string; answer: string }>;
}
