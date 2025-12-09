import { YearSelection, SubjectSelection, FacultyUser, LetterSettings } from './types';

export const FACULTIES: FacultyUser[] = [
  { id: 'medical', name: 'Medical', label: 'Medical Faculty (UG)' },
  { id: 'homoeopathy', name: 'Homoeopathy', label: 'Homoeopathy Faculty' },
  { id: 'nursing', name: 'Nursing', label: 'Nursing Faculty' },
  { id: 'dental', name: 'Dental', label: 'Dental Faculty' },
  { id: 'ayurved', name: 'Ayurved', label: 'Ayurved Faculty' },
  { id: 'unani', name: 'Unani', label: 'Unani Faculty' },
  { id: 'ot_pt', name: 'OT/PT', label: 'OT/PT Faculty' },
  { id: 'allied', name: 'Allied', label: 'Allied Health Sciences' },
  { id: 'pg_medical', name: 'PG Medical', label: 'Medical Faculty (PG)' },
  { id: 'pg_dental', name: 'PG Dental', label: 'Dental Faculty (PG)' }
];

export const DEFAULT_LETTER_SETTINGS: LetterSettings = {
  officerNameMr: 'श्री. प्रविण म. पटले',
  officerDesigMr: 'कक्ष अधिकारी.',
  officerDeptMr: 'वैद्यकीय विद्याशाखा',
  officerNameEn: 'Shri. Pravin M. Patle',
  officerDesigEn: 'Section Officer',
  officerDeptEn: 'Medical Faculty(UG)',
  signatureImage: '',
  emailServiceId: '',
  emailTemplateId: '',
  emailPublicKey: ''
};

export const SUBJECT_CONFIG = [
  {
    year: "I - MBBS",
    subjects: ["ANATOMY", "PHYSIOLOGY", "BIOCHEMISTRY"]
  },
  {
    year: "II-MBBS",
    subjects: ["PHARMACOLOGY", "PATHOLOGY", "MICROBIOLOGY", "FMT"]
  },
  {
    year: "III-I-MBBS",
    subjects: ["COM.MEDICINE", "OPTHALMOLOGY", "Otorhinolaryngology(ENT)", "FMT"]
  },
  {
    year: "III-II-MBBS",
    subjects: ["GEN.MEDICINE", "GEN.SURGERY", "Obstetrics and Gynecology", "PEADIA"]
  }
];

export const FEE_CONSTANTS = {
  REGULAR_PAPER: 800,
  PHOTOCOPY_PAPER: 96,
  PHOTOCOPY_MARKSLIP: 110,
};

export const getShortSubjectName = (fullSubject: string) => {
    const map: {[key: string]: string} = {
        "ANATOMY": "ANA",
        "PHYSIOLOGY": "PHYSIO",
        "BIOCHEMISTRY": "BIO",
        "PHARMACOLOGY": "PHARMA",
        "PATHOLOGY": "PATHO",
        "MICROBIOLOGY": "MICRO",
        "FMT": "FMT",
        "COM.MEDICINE": "PSM",
        "OPTHALMOLOGY": "OPTHAL",
        "Otorhinolaryngology(ENT)": "ENT",
        "GEN.MEDICINE": "MEDICINE",
        "GEN.SURGERY": "SURGERY",
        "Obstetrics and Gynecology": "OBGY",
        "PEADIA": "PEAD"
    };
    return map[fullSubject] || fullSubject.substring(0, 4).toUpperCase();
};

// Helper to create an empty student structure
export const createEmptyStudent = (): any => {
  const years: YearSelection[] = SUBJECT_CONFIG.map(config => ({
    yearName: config.year,
    subjects: config.subjects.filter(s => s !== "").map(sub => ({
      subjectName: sub,
      papers: { I: false, II: false, PR: false, markSlipI: false, markSlipII: false }
    }))
  }));

  // Default to selecting ALL years so the form isn't empty by default
  const appliedYears = SUBJECT_CONFIG.map(c => c.year);

  return {
    id: crypto.randomUUID(),
    collegeCode: '',
    collegeName: '',
    inwardNo: '',
    inwardDate: new Date().toISOString().split('T')[0],
    seatNo: '',
    studentName: '',
    entryType: 'tr_pr',
    years,
    appliedYears, // New Field
    totalSubjects: 0,
    totalFees: 0,
    pendingFees: 0,
    studentPayFees: 0,
    ddNo: '',
    ddDate: '',
    bankName: '',
    dispatchDate: '',
    totalFeesReceived: 0,
    ifFeeLessExcess: '',
    checkedBy: '',
    remark: ''
  };
};