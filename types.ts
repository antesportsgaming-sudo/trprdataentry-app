
export interface SubjectSelection {
  subjectName: string;
  papers: {
    I: boolean;
    II: boolean;
    PR: boolean;
    markSlipI?: boolean;
    markSlipII?: boolean;
  };
}

export interface YearSelection {
  yearName: string; // e.g., "I - MBBS", "II-MBBS"
  subjects: SubjectSelection[];
}

export interface PaymentRecord {
  amount: number;
  ddNo: string; // or Transaction ID
  ddDate: string;
  bankName: string;
}

export interface StudentEntry {
  id: string;
  // College Details
  collegeCode: string;
  collegeName: string;
  
  // Student Details
  inwardNo: string;
  inwardDate: string;
  seatNo: string;
  studentName: string;
  
  // Type of Entry
  entryType: 'tr_pr' | 'photocopy';

  // Academic Data (The Matrix)
  years: YearSelection[];
  appliedYears: string[]; // List of selected years to display (e.g. ["I - MBBS"])

  // Payment Details
  totalSubjects: number;
  totalFees: number;
  pendingFees: number;
  
  // Legacy Fields (kept for backward compatibility, but UI uses 'payments' array)
  studentPayFees: number; 
  ddNo: string; 
  ddDate: string;
  bankName: string;

  // New Multi-Payment Field
  payments: PaymentRecord[];

  // Office Use
  dispatchDate: string;
  totalFeesReceived: number;
  ifFeeLessExcess: string;
  checkedBy: string;
  remark: string;
}

export interface MasterRecord {
  seatNo: string;
  studentName: string;
  collegeCode: string;
  collegeName: string;
}

export interface CollegeAddressRecord {
  collegeCode: string;
  address: string;
  email?: string; // Added email field
}

export type ViewState = 'LIST' | 'FORM' | 'ADMIN' | 'LEDGER';

export interface FeeConfig {
  perPaperFee: number;
  photocopyFee: number;
}

export interface FacultyUser {
  id: string;
  name: string;
  label: string;
}

export interface LetterSettings {
  officerNameMr: string;
  officerDesigMr: string;
  officerDeptMr: string;
  officerNameEn: string;
  officerDesigEn: string;
  officerDeptEn: string;
  signatureImage?: string; // Base64 string for signature
  universityLogo?: string; // Base64 string for university logo
  
  // EmailJS Configuration (Next Level Feature)
  emailServiceId?: string;
  emailTemplateId?: string;
  emailPublicKey?: string;
}

export interface ArchivedSession {
  id: string;
  examName: string;
  activeYears: string[]; // Years active during this session
  archivedDate: string;
  studentCount: number;
  students: StudentEntry[];
}
