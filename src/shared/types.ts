export type UserRole = 'patient' | 'admin';

export type LesionCategory =
  | 'Melanoma'
  | 'Basal Cell Carcinoma'
  | 'Squamous Cell Carcinoma'
  | 'Benign Nevus'
  | 'Seborrheic Keratosis'
  | 'Other / Uncertain';

export type AssessmentStatus =
  | 'demonstration_mode'
  | 'completed_validated'
  | 'rejected_quality'
  | 'model_unavailable';

export interface UserPublic {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  authProvider: 'local' | 'google';
  ageRange?: string;
  defaultRetentionDays: number;
  allowImageStorage: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImageMetadata {
  id: string;
  mimeType: 'image/jpeg' | 'image/png';
  format: 'JPEG' | 'PNG';
  width: number;
  height: number;
  sizeBytes: number;
  sha256: string;
  qualityStatus: 'acceptable' | 'suboptimal' | 'rejected';
  qualityNotes: string[];
  uploadedAt: string;
  expiresAt?: string;
}

export interface PatientContext {
  ageRange: string;
  bodyLocation: string;
  durationPresent: string;
  hasChanged: string;
  symptoms: string[];
  personalHistory: string;
}

export interface CategoryProbability {
  category: LesionCategory;
  probability: number;
}

export interface DermatologyModelResult {
  providerId: string;
  providerName: string;
  modelVersion: string;
  isClinicallyValidated: boolean;
  classificationAvailable: boolean;
  status: AssessmentStatus;
  displayMessage: string;
  topCategory: LesionCategory | null;
  probabilities: CategoryProbability[] | null;
  uncertaintyScore: number | null;
  rejectedReason: string | null;
  limitations: string[];
  evaluatedScope: {
    imageModality: string;
    intendedPopulation: string;
    fitzpatrickCoverage: string;
  };
}

export interface GeminiGuidanceOutput {
  available: boolean;
  plainLanguageSummary: string;
  terminologyExplained: Array<{ term: string; explanation: string }>;
  limitationsExplained: string;
  questionsForDoctor: string[];
  errorMessage?: string;
}

export interface AssessmentRecord {
  id: string;
  userId: string;
  isDemoSample?: boolean;
  consentAccepted: boolean;
  consentTimestamp: string;
  imageStored: boolean;
  imageDeletedAt?: string;
  imageMetadata: ImageMetadata;
  patientContext: PatientContext;
  modelResult: DermatologyModelResult;
  warningSigns: string[];
  recommendedNextSteps: string[];
  urgencyLevel: 'routine' | 'prompt_evaluation' | 'uncertain_review';
  geminiGuidance: GeminiGuidanceOutput;
  createdAt: string;
  updatedAt: string;
}

export interface ModelVersionRecord {
  id: string;
  name: string;
  version: string;
  status: 'demonstration_only' | 'validated_active' | 'retired';
  isClinicallyValidated: boolean;
  supportedCategories: LesionCategory[];
  intendedModality: string;
  metrics: {
    sensitivity: string;
    specificity: string;
    expectedCalibrationError: string;
    fitzpatrickBreakdown: Array<{
      skinToneGroup: string;
      sampleSize: string;
      sensitivity: string;
      specificity: string;
    }>;
  };
  updatedAt: string;
}

export interface ArticleRecord {
  id: string;
  slug: string;
  title: string;
  category: string;
  readTime: string;
  summary: string;
  content: string;
  medicalSource: string;
  publishedAt: string;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: UserRole | 'system';
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  level: 'info' | 'warning' | 'error';
}

export interface ContactMessageRecord {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}
