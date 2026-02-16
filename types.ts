
export enum ActiveModule {
  Dashboard = 'dashboard',
  Report = 'report',
  Certificate = 'certificate',
  Repository = 'repository',
}

export type UserRole = 'student' | 'staff';
export type StaffDesignation = 'faculty' | 'hod' | 'dean' | 'principal' | null;

export interface User {
  id: string;
  username: string;
  email: string;
  password_DO_NOT_STORE_PLAINTEXT: string;
  role: UserRole;
  designation?: StaffDesignation;
}

export interface ReportVersion {
  content: string;
  timestamp: Date;
}

export interface CertificateData {
  recipientName: string;
  certificateId: string;
  courseTitle: string;
  issuingAuthority: string;
  issueDate: string;
  imageBase64?: string;
  cloudUrl?: string;
}

export interface VerificationResult {
  fileName: string;
  data: CertificateData | null;
  status: 'Verified' | 'Failed';
  error?: string;
  imageBase64?: string;
  mimeType?: string;
  cloudUrl?: string;
}

export interface StoredFile {
  id: string;
  userId: string;
  username: string;
  userRole: UserRole;
  userDesignation?: StaffDesignation;
  title: string;
  type: 'report' | 'certificate';
  category?: string;
  signature?: { name: string; title: string };
  content: string;
  reportDate?: string;
  images?: { base64: string; mimeType: string }[];
  createdAt: string;
  downloadsCount: number;
}

export interface UserStats {
  generated: number;
  downloaded: number;
  lastActivity: string;
}
