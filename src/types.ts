export const ADMIN_CATEGORIES = [
  'Dapodik & Sinkronisasi Data',
  'Info GTK & Tunjangan Profesi (TPG)',
  'NUPTK, NRG & Verval PTK',
  'SK Pembagian Tugas & Jam Mengajar',
  'Kenaikan Pangkat, PAK & e-Kinerja',
  'Kurikulum, Rapor & E-Rapor',
  'Cuti, Izin & Kepegawaian',
  'Tata Usaha & Administrasi Lainnya',
] as const;

export type AdminCategory = (typeof ADMIN_CATEGORIES)[number];

export const URGENCY_LEVELS = ['Normal', 'Mendesak', 'Kritis'] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export const COMPLAINT_STATUSES = [
  'Menunggu Tinjauan',
  'Sedang Diproses',
  'Terselesaikan',
] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export type UserRole = 'guru' | 'admin';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'ptk.aja507@gmail.com';

export const FIELD_LIMITS = {
  displayName: { min: 2, max: 120 },
  email: { min: 3, max: 200 },
  schoolName: { min: 2, max: 160 },
  nipOrNuptk: { max: 40 },
  title: { min: 5, max: 180 },
  description: { min: 10, max: 3000 },
  solutionSummary: { max: 1000 },
  solutionSteps: { maxItems: 10, maxItemLen: 500 },
  requiredDocuments: { maxItems: 10, maxItemLen: 300 },
  relatedParties: { max: 300 },
  estimatedTime: { max: 120 },
  officialResponse: { max: 2500 },
  resolvedBy: { max: 120 },
  noteMessage: { min: 1, max: 1500 },
} as const;

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  schoolName: string;
  nipOrNuptk: string;
  role: UserRole;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface GeneratedSolution {
  solutionSummary: string;
  solutionSteps: string[];
  requiredDocuments: string[];
  relatedParties: string;
  estimatedTime: string;
}

export interface ComplaintRecord {
  id: string;
  ticketCode: string;
  authorId: string;
  teacherName: string;
  teacherEmail: string;
  schoolName: string;
  nipOrNuptk: string;
  category: AdminCategory;
  urgency: UrgencyLevel;
  title: string;
  description: string;
  status: ComplaintStatus;
  solutionSummary: string;
  solutionSteps: string[];
  requiredDocuments: string[];
  relatedParties: string;
  estimatedTime: string;
  officialResponse: string;
  resolvedBy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ComplaintNote {
  id: string;
  complaintAuthorId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  message: string;
  createdAt: Date | null;
}

export interface KnowledgeGuide {
  id: string;
  title: string;
  category: AdminCategory;
  symptom: string;
  steps: string[];
  documents: string[];
  relatedParties: string;
  estimatedTime: string;
}

export type NavSection = 'dashboard' | 'submit' | 'complaints' | 'guides';
