import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  ArticleRecord,
  AssessmentRecord,
  AuditLogRecord,
  ContactMessageRecord,
  ModelVersionRecord,
  UserPublic,
} from '../shared/types.ts';

export interface StoredUser extends UserPublic {
  passwordHash?: string;
}

export interface DermaDatabase {
  users: StoredUser[];
  assessments: AssessmentRecord[];
  articles: ArticleRecord[];
  modelVersions: ModelVersionRecord[];
  auditLogs: AuditLogRecord[];
  contactMessages: ContactMessageRecord[];
  activeModelMode: 'demonstration' | 'external_endpoint';
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'dermaai-db.json');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true, mode: 0o700 });
  }
}

function getInitialSeedData(): DermaDatabase {
  const now = new Date().toISOString();
  return {
    users: [],
    assessments: [],
    activeModelMode:
      process.env.DERMATOLOGY_MODEL_VALIDATED === 'true' && process.env.DERMATOLOGY_MODEL_ENDPOINT
        ? 'external_endpoint'
        : 'demonstration',
    modelVersions: [
      {
        id: 'derma-demo-0-1-0',
        name: 'DermaAI Demonstration Pipeline',
        version: 'derma-demo-0.1.0',
        status: 'demonstration_only',
        isClinicallyValidated: false,
        supportedCategories: [
          'Melanoma',
          'Basal Cell Carcinoma',
          'Squamous Cell Carcinoma',
          'Benign Nevus',
          'Seborrheic Keratosis',
          'Other / Uncertain',
        ],
        intendedModality: 'Demonstration / Unvalidated (No diagnostic predictions emitted)',
        metrics: {
          sensitivity: 'N/A (Demo Mode)',
          specificity: 'N/A (Demo Mode)',
          expectedCalibrationError: 'N/A (Demo Mode)',
          fitzpatrickBreakdown: [
            {
              skinToneGroup: 'Fitzpatrick I–II (Very Fair / Fair)',
              sampleSize: 'Pending clinical validation dataset',
              sensitivity: 'Not evaluated',
              specificity: 'Not evaluated',
            },
            {
              skinToneGroup: 'Fitzpatrick III–IV (Medium / Olive)',
              sampleSize: 'Pending clinical validation dataset',
              sensitivity: 'Not evaluated',
              specificity: 'Not evaluated',
            },
            {
              skinToneGroup: 'Fitzpatrick V–VI (Brown / Deeply Pigmented)',
              sampleSize: 'Pending clinical validation dataset',
              sensitivity: 'Not evaluated',
              specificity: 'Not evaluated',
            },
          ],
        },
        updatedAt: now,
      },
    ],
    articles: [
      {
        id: 'art-abcde-melanoma',
        slug: 'understanding-the-abcde-rule',
        title: 'Understanding the ABCDE Warning Signs of Melanoma',
        category: 'Early Detection',
        readTime: '4 min read',
        summary:
          'A structured clinical guide to recognizing asymmetry, border irregularity, color variation, diameter, and evolution during monthly skin self-checks.',
        content: `Regular skin self-examinations help you notice new spots or changes in existing moles early. Dermatologists teach the ABCDE framework as a practical screening checklist—not a diagnosis—to identify lesions that deserve an in-person exam.\n\n• A — Asymmetry: One half of the spot does not match the other.\n• B — Border: Edges are irregular, ragged, notched, or blurred rather than smooth and well-defined.\n• C — Color: Pigment varies across the lesion, showing multiple shades of tan, brown, black, or patches of pink, red, white, or blue.\n• D — Diameter: The spot is larger than 6 millimeters across (about the size of a pencil eraser), though melanomas can be smaller when first detected.\n• E — Evolving: Any change in size, shape, color, elevation, or new symptoms such as bleeding, itching, or crusting.\n\nIf you notice an "ugly duckling" spot that looks different from surrounding moles or exhibits any ABCDE feature, schedule a full-body skin exam with a board-certified dermatologist.`,
        medicalSource: 'American Academy of Dermatology (AAD) & Skin Cancer Foundation',
        publishedAt: now,
      },
      {
        id: 'art-nonmelanoma-overview',
        slug: 'basal-and-squamous-cell-carcinoma-signs',
        title: 'Recognizing Basal Cell and Squamous Cell Carcinomas',
        category: 'Clinical Education',
        readTime: '5 min read',
        summary:
          'How the two most common skin cancers differ from melanoma, what subtle warning signs to watch for, and why non-healing sores require evaluation.',
        content: `Basal cell carcinoma (BCC) and squamous cell carcinoma (SCC) are keratinocyte skin cancers closely linked to cumulative ultraviolet exposure.\n\nBasal Cell Carcinoma often appears on sun-exposed areas such as the face, ears, neck, or scalp as a pearly or waxy bump, a flat flesh-colored or brown scar-like lesion, or a bleeding/scabbing sore that heals and returns.\n\nSquamous Cell Carcinoma commonly presents as a firm red nodule, a flat lesion with a scaly or crusted surface, or a persistent rough patch that may bleed easily when bumped.\n\nBoth conditions are highly treatable when caught early, yet neither can be ruled out from a photograph alone. Persistent sores lasting more than 3–4 weeks should always be examined with a dermatoscope and biopsied if clinically indicated.`,
        medicalSource: 'National Cancer Institute (NCI / NIH)',
        publishedAt: now,
      },
      {
        id: 'art-sun-protection',
        slug: 'evidence-based-uv-and-sun-protection',
        title: 'Evidence-Based Sun Protection Across All Skin Tones',
        category: 'Prevention',
        readTime: '4 min read',
        summary:
          'Practical photoprotection habits—broad-spectrum SPF 30+, UPF clothing, shade timing, and why UV protection matters across Fitzpatrick skin types I–VI.',
        content: `Ultraviolet (UVA and UVB) radiation contributes to DNA damage in skin cells across all skin tones. While higher melanin levels offer partial baseline protection against sunburn, skin cancers—including acral lentiginous melanoma on palms, soles, and nail beds—still occur in darker skin tones and are frequently diagnosed later.\n\nCore daily prevention practices:\n1. Apply broad-spectrum water-resistant sunscreen (SPF 30 or higher) generously 15 minutes before going outdoors and reapply every 2 hours or after swimming/sweating.\n2. Wear UPF 50+ sun-protective clothing, wide-brimmed hats, and UV-blocking sunglasses.\n3. Seek shade during peak UV hours (10:00 AM to 4:00 PM) and avoid indoor tanning beds entirely.\n4. Check overlooked areas during self-exams, including the scalp, behind ears, under nails, palms, and soles.`,
        medicalSource: 'American Academy of Dermatology (AAD)',
        publishedAt: now,
      },
      {
        id: 'art-benign-vs-concerning',
        slug: 'common-benign-skin-growths-overview',
        title: 'Common Benign Skin Lesions vs. When to Seek Care',
        category: 'Lesion Literacy',
        readTime: '3 min read',
        summary:
          'An introduction to common non-cancerous growths such as benign nevi and seborrheic keratoses, and why clinical overlap makes biopsy essential for uncertain spots.',
        content: `Many skin spots are harmless, including common acquired moles (benign nevi), cherry angiomas, dermatofibromas, and seborrheic keratoses—waxy, "stuck-on" tan or brown growths that frequently appear with age.\n\nHowever, seborrheic keratoses and atypical nevi can visually mimic melanoma or pigmented basal cell carcinoma even under magnification. Because visual overlap is common, no mobile app or AI model should ever tell a patient that a spot is definitively harmless.\n\nAlways consult a dermatologist whenever a lesion is new after age 30, bleeds spontaneously, hurts, forms a non-healing ulcer, or stands out from your other spots.`,
        medicalSource: 'British Association of Dermatologists & AAD',
        publishedAt: now,
      },
    ],
    auditLogs: [
      {
        id: crypto.randomUUID(),
        timestamp: now,
        actorId: 'system',
        actorRole: 'system',
        action: 'SYSTEM_INITIALIZED',
        targetType: 'platform',
        targetId: 'dermaai',
        summary: 'DermaAI initialized with Demonstration Model Mode active (no unvalidated medical predictions).',
        level: 'info',
      },
    ],
    contactMessages: [],
  };
}

let cachedDb: DermaDatabase | null = null;
let writeQueue: Promise<void> = Promise.resolve();

export function getUploadsDir(): string {
  ensureDirectories();
  return UPLOADS_DIR;
}

export function loadDatabase(): DermaDatabase {
  ensureDirectories();
  if (cachedDb) return cachedDb;
  if (!fs.existsSync(DB_FILE)) {
    cachedDb = getInitialSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(cachedDb, null, 2), { mode: 0o600 });
    return cachedDb;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    cachedDb = JSON.parse(raw) as DermaDatabase;
    return cachedDb;
  } catch (err) {
    console.error('Failed to read database file, resetting to clean seed:', err);
    cachedDb = getInitialSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(cachedDb, null, 2), { mode: 0o600 });
    return cachedDb;
  }
}

export async function mutateDatabase<T>(fn: (db: DermaDatabase) => T | Promise<T>): Promise<T> {
  const task = writeQueue.then(async () => {
    const db = loadDatabase();
    const result = await fn(db);
    ensureDirectories();
    const tmpFile = `${DB_FILE}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), { mode: 0o600 });
    fs.renameSync(tmpFile, DB_FILE);
    return result;
  });
  writeQueue = task.then(
    () => undefined,
    () => undefined
  );
  return task;
}

export function appendAuditLog(
  db: DermaDatabase,
  entry: Omit<AuditLogRecord, 'id' | 'timestamp'>
) {
  db.auditLogs.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (db.auditLogs.length > 500) {
    db.auditLogs.length = 500;
  }
}

export function deleteStoredImageFile(imageId: string): boolean {
  const uploadsDir = getUploadsDir();
  for (const ext of ['jpg', 'png']) {
    const candidate = path.resolve(uploadsDir, `${imageId}.${ext}`);
    if (candidate.startsWith(uploadsDir) && fs.existsSync(candidate)) {
      fs.unlinkSync(candidate);
      return true;
    }
  }
  return false;
}
