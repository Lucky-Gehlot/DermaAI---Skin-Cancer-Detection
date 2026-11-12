import crypto from 'node:crypto';
import express, { type Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import {
  adminAuth,
  attachAuthUser,
  clearSessionCookie,
  hashPassword,
  isAdminEmail,
  requireAdmin,
  requireAuth,
  setSessionCookie,
  toPublicUser,
  verifyPassword,
  type AuthenticatedRequest,
} from './auth.ts';
import {
  evaluateClinicalSymptomsAndNextSteps,
  getActiveDermatologyProvider,
  readStoredImageBuffer,
} from './dermatologyModel.ts';
import { chatSkinHealthEducation, generateAssessmentGuidance } from './geminiService.ts';
import {
  MAX_IMAGE_BYTES,
  saveValidatedImage,
  validateSkinImageBuffer,
} from './imageValidation.ts';
import {
  appendAuditLog,
  deleteStoredImageFile,
  loadDatabase,
  mutateDatabase,
} from './store.ts';
import type {
  AssessmentRecord,
  ChatTurn,
  ImageMetadata,
  PatientContext,
} from '../shared/types.ts';

// Temporary staging for validated uploaded images awaiting Step 2 submission (scoped to userId, TTL 1 hour)
interface PendingUpload {
  imageMetadata: ImageMetadata;
  userId: string;
  createdAtMs: number;
}
const pendingUploads = new Map<string, PendingUpload>();

function pruneExpiredPendingUploads() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [key, item] of pendingUploads.entries()) {
    if (item.createdAtMs < cutoff) {
      deleteStoredImageFile(item.imageMetadata.id);
      pendingUploads.delete(key);
    }
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: 1,
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait a few minutes and try again.' },
});

const assessmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Assessment rate limit reached. Please wait briefly before submitting again.' },
});

const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many chat messages sent recently. Please pause briefly.' },
});

export function createApiRouter(): Router {
  const router = express.Router();
  router.use(attachAuthUser);

  router.get('/health', (_req, res) => {
    const db = loadDatabase();
    res.json({
      status: 'ok',
      modelMode: db.activeModelMode,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // AUTHENTICATION ENDPOINTS
  // ==========================================

  router.post('/auth/register', authLimiter, async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const displayName = String(req.body?.displayName || '').trim();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
      }
      if (password.length < 8 || password.length > 128) {
        return res.status(400).json({
          error: 'Password must be between 8 and 128 characters.',
        });
      }
      if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return res.status(400).json({
          error: 'Password must contain at least one letter and one number.',
        });
      }
      if (!displayName || displayName.length > 100) {
        return res.status(400).json({ error: 'Please enter your display name (1–100 characters).' });
      }

      const db = loadDatabase();
      if (db.users.some((u) => u.email.toLowerCase() === email)) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const now = new Date().toISOString();
      const newUser = await mutateDatabase((store) => {
        const created = {
          id: crypto.randomUUID(),
          email,
          displayName,
          // Security invariant: self-registration NEVER grants admin privileges
          role: 'patient' as const,
          authProvider: 'local' as const,
          passwordHash: hashPassword(password),
          defaultRetentionDays: 30,
          allowImageStorage: true,
          createdAt: now,
          updatedAt: now,
        };
        store.users.push(created);
        appendAuditLog(store, {
          actorId: created.id,
          actorRole: created.role,
          action: 'USER_REGISTERED',
          targetType: 'user',
          targetId: created.id,
          summary: 'New patient account registered via email/password.',
          level: 'info',
        });
        return created;
      });

      setSessionCookie(res, newUser);
      return res.status(201).json({ user: toPublicUser(newUser) });
    } catch (err) {
      console.error('Register error:', err);
      return res.status(500).json({ error: 'Unable to complete registration.' });
    }
  });

  router.post('/auth/login', authLimiter, async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const db = loadDatabase();
      const user = db.users.find((u) => u.email.toLowerCase() === email);
      if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        await mutateDatabase((store) => {
          appendAuditLog(store, {
            actorId: 'anonymous',
            actorRole: 'system',
            action: 'AUTH_LOGIN_FAILED',
            targetType: 'auth',
            targetId: email.slice(0, 64),
            summary: 'Failed email/password sign-in attempt.',
            level: 'warning',
          });
        });
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      await mutateDatabase((store) => {
        appendAuditLog(store, {
          actorId: user.id,
          actorRole: user.role,
          action: 'USER_LOGIN',
          targetType: 'user',
          targetId: user.id,
          summary: 'User signed in via email/password.',
          level: 'info',
        });
      });

      setSessionCookie(res, user);
      return res.json({ user: toPublicUser(user) });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Unable to sign in at this time.' });
    }
  });

  router.post('/auth/google', authLimiter, async (req, res) => {
    try {
      const idToken = String(req.body?.idToken || '');
      if (!idToken) {
        return res.status(400).json({ error: 'Missing Firebase ID token.' });
      }

      const decoded = await adminAuth.verifyIdToken(idToken);
      const email = (decoded.email || '').trim().toLowerCase();
      if (!email) {
        return res.status(400).json({ error: 'Google account did not return an email address.' });
      }
      if (!decoded.email_verified) {
        return res.status(403).json({ error: 'Google email address must be verified.' });
      }

      const displayName = (decoded.name || email.split('@')[0] || 'DermaAI User').slice(0, 100);
      const now = new Date().toISOString();

      const syncedUser = await mutateDatabase((store) => {
        const existing = store.users.find(
          (u) => u.id === decoded.uid || u.email.toLowerCase() === email
        );
        if (existing) {
          existing.displayName = existing.displayName || displayName;
          if (isAdminEmail(email)) {
            existing.role = 'admin';
          }
          existing.updatedAt = now;
          appendAuditLog(store, {
            actorId: existing.id,
            actorRole: existing.role,
            action: 'USER_GOOGLE_LOGIN',
            targetType: 'user',
            targetId: existing.id,
            summary: 'User authenticated via Google Sign-In.',
            level: 'info',
          });
          return existing;
        }

        const created = {
          id: decoded.uid,
          email,
          displayName,
          role: isAdminEmail(email) ? ('admin' as const) : ('patient' as const),
          authProvider: 'google' as const,
          defaultRetentionDays: 30,
          allowImageStorage: true,
          createdAt: now,
          updatedAt: now,
        };
        store.users.push(created);
        appendAuditLog(store, {
          actorId: created.id,
          actorRole: created.role,
          action: 'USER_GOOGLE_REGISTERED',
          targetType: 'user',
          targetId: created.id,
          summary: 'New account provisioned via Google Sign-In.',
          level: 'info',
        });
        return created;
      });

      setSessionCookie(res, syncedUser);
      return res.json({ user: toPublicUser(syncedUser) });
    } catch (err) {
      console.error('Google auth verification error:', err);
      return res.status(401).json({ error: 'Google authentication could not be verified.' });
    }
  });

  router.post('/auth/logout', async (req: AuthenticatedRequest, res) => {
    if (req.currentUser) {
      const uid = req.currentUser.id;
      const role = req.currentUser.role;
      await mutateDatabase((store) => {
        appendAuditLog(store, {
          actorId: uid,
          actorRole: role,
          action: 'USER_LOGOUT',
          targetType: 'user',
          targetId: uid,
          summary: 'User signed out and session cookie cleared.',
          level: 'info',
        });
      });
    }
    clearSessionCookie(res);
    return res.json({ ok: true });
  });

  router.get('/auth/me', (req: AuthenticatedRequest, res) => {
    if (!req.currentUser) {
      return res.json({ user: null });
    }
    return res.json({ user: toPublicUser(req.currentUser) });
  });

  // ==========================================
  // USER PROFILE & PRIVACY MANAGEMENT
  // ==========================================

  router.get('/user/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    return res.json({ profile: toPublicUser(req.currentUser!) });
  });

  router.put('/user/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const displayName = String(req.body?.displayName || '').trim();
      const ageRange = String(req.body?.ageRange || '').trim().slice(0, 32);
      const allowImageStorage = Boolean(req.body?.allowImageStorage);
      const defaultRetentionDays = Number(req.body?.defaultRetentionDays ?? 30);

      if (!displayName || displayName.length > 100) {
        return res.status(400).json({ error: 'Display name must be 1–100 characters.' });
      }
      if (
        !Number.isInteger(defaultRetentionDays) ||
        defaultRetentionDays < 0 ||
        defaultRetentionDays > 365
      ) {
        return res.status(400).json({
          error: 'Retention period must be between 0 (immediate deletion) and 365 days.',
        });
      }

      const updated = await mutateDatabase((store) => {
        const user = store.users.find((u) => u.id === req.currentUser!.id);
        if (!user) return null;
        user.displayName = displayName;
        user.ageRange = ageRange || undefined;
        user.allowImageStorage = allowImageStorage;
        user.defaultRetentionDays = defaultRetentionDays;
        user.updatedAt = new Date().toISOString();
        appendAuditLog(store, {
          actorId: user.id,
          actorRole: user.role,
          action: 'PROFILE_UPDATED',
          targetType: 'user',
          targetId: user.id,
          summary: 'User updated profile or image retention preferences.',
          level: 'info',
        });
        return user;
      });

      if (!updated) return res.status(404).json({ error: 'User profile not found.' });
      return res.json({ profile: toPublicUser(updated) });
    } catch (err) {
      console.error('Profile update failed:', err);
      return res.status(500).json({ error: 'Unable to update profile.' });
    }
  });

  // ==========================================
  // ASSESSMENT UPLOAD & ANALYSIS ENDPOINTS
  // ==========================================

  router.post(
    '/assessment/upload',
    requireAuth,
    assessmentLimiter,
    (req, res, next) => {
      upload.single('image')(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              error: `Image exceeds the maximum allowed size of ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`,
            });
          }
          return res.status(400).json({ error: err.message || 'Image upload failed.' });
        }
        next();
      });
    },
    async (req: AuthenticatedRequest, res) => {
      try {
        pruneExpiredPendingUploads();
        const consentAccepted = req.body?.consentAccepted === 'true' || req.body?.consentAccepted === true;
        if (!consentAccepted) {
          return res.status(400).json({
            error: 'Explicit privacy consent is required before uploading or processing skin images.',
          });
        }

        const file = req.file;
        const validation = validateSkinImageBuffer(file?.buffer, file?.mimetype);
        if (!validation.valid || !file) {
          await mutateDatabase((store) => {
            appendAuditLog(store, {
              actorId: req.currentUser!.id,
              actorRole: req.currentUser!.role,
              action: 'IMAGE_UPLOAD_REJECTED',
              targetType: 'image',
              targetId: 'rejected',
              summary: validation.error || 'Uploaded file failed validation.',
              level: 'warning',
            });
          });
          return res.status(400).json({
            error: validation.error || 'Invalid image file.',
          });
        }

        const retentionDays = req.currentUser!.defaultRetentionDays ?? 30;
        const imageMetadata = saveValidatedImage(
          file.buffer,
          {
            format: validation.format!,
            mimeType: validation.mimeType!,
            width: validation.width!,
            height: validation.height!,
            sha256: validation.sha256!,
            qualityStatus: validation.qualityStatus!,
            qualityNotes: validation.qualityNotes!,
          },
          retentionDays
        );

        pendingUploads.set(imageMetadata.id, {
          imageMetadata,
          userId: req.currentUser!.id,
          createdAtMs: Date.now(),
        });

        return res.status(201).json({
          imageId: imageMetadata.id,
          imageMetadata,
        });
      } catch (err) {
        console.error('Image upload error:', err);
        return res.status(500).json({ error: 'Unable to process uploaded image.' });
      }
    }
  );

  router.post('/assessment/analyze', requireAuth, assessmentLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const imageId = String(req.body?.imageId || '').trim();
      const consentAccepted = Boolean(req.body?.consentAccepted);
      const storeImageAfterAssessment =
        req.body?.storeImageAfterAssessment !== undefined
          ? Boolean(req.body.storeImageAfterAssessment)
          : req.currentUser!.allowImageStorage;

      if (!consentAccepted) {
        return res.status(400).json({
          error: 'Privacy consent must be confirmed before running assessment.',
        });
      }

      const pending = pendingUploads.get(imageId);
      if (!pending || pending.userId !== req.currentUser!.id) {
        return res.status(404).json({
          error: 'Uploaded image session expired or was not found. Please upload the image again.',
        });
      }

      const rawContext = req.body?.patientContext || {};
      const patientContext: PatientContext = {
        ageRange: String(rawContext.ageRange || '').trim().slice(0, 32),
        bodyLocation: String(rawContext.bodyLocation || '').trim().slice(0, 120),
        durationPresent: String(rawContext.durationPresent || '').trim().slice(0, 64),
        hasChanged: String(rawContext.hasChanged || '').trim().slice(0, 64),
        symptoms: Array.isArray(rawContext.symptoms)
          ? rawContext.symptoms.map((s: unknown) => String(s).trim().slice(0, 64)).slice(0, 12)
          : [],
        personalHistory: String(rawContext.personalHistory || '').trim().slice(0, 500),
      };

      const imageBuffer = readStoredImageBuffer(pending.imageMetadata);
      if (!imageBuffer) {
        pendingUploads.delete(imageId);
        return res.status(404).json({ error: 'Image data could not be loaded from secure storage.' });
      }

      // 1. Run replaceable Dermatology Classification Provider
      const provider = getActiveDermatologyProvider();
      const modelResult = await provider.classify({
        imageMetadata: pending.imageMetadata,
        imageBuffer,
        patientContext,
      });

      // 2. Evaluate deterministic symptom warning signs & next steps
      const { warningSigns, recommendedNextSteps, urgencyLevel } =
        evaluateClinicalSymptomsAndNextSteps(patientContext, modelResult, pending.imageMetadata);

      // 3. Call Gemini strictly for educational plain-language explanation & limitations (no PII, no image diagnosis)
      const geminiGuidance = await generateAssessmentGuidance(
        patientContext,
        modelResult,
        warningSigns
      );

      // Honor immediate deletion preference if user opted out of image storage
      let imageStored = storeImageAfterAssessment;
      let imageDeletedAt: string | undefined;
      if (!storeImageAfterAssessment) {
        deleteStoredImageFile(pending.imageMetadata.id);
        imageStored = false;
        imageDeletedAt = new Date().toISOString();
      }

      const now = new Date().toISOString();
      const record: AssessmentRecord = {
        id: crypto.randomUUID(),
        userId: req.currentUser!.id,
        consentAccepted: true,
        consentTimestamp: now,
        imageStored,
        imageDeletedAt,
        imageMetadata: pending.imageMetadata,
        patientContext,
        modelResult,
        warningSigns,
        recommendedNextSteps,
        urgencyLevel,
        geminiGuidance,
        createdAt: now,
        updatedAt: now,
      };

      pendingUploads.delete(imageId);

      await mutateDatabase((store) => {
        store.assessments.unshift(record);
        appendAuditLog(store, {
          actorId: req.currentUser!.id,
          actorRole: req.currentUser!.role,
          action: 'ASSESSMENT_COMPLETED',
          targetType: 'assessment',
          targetId: record.id,
          summary: `Assessment recorded under status=${modelResult.status} (model=${modelResult.modelVersion}).`,
          level: modelResult.status === 'model_unavailable' ? 'error' : 'info',
        });
      });

      return res.status(201).json({ assessment: record });
    } catch (err) {
      console.error('Assessment analyze error:', err);
      await mutateDatabase((store) => {
        appendAuditLog(store, {
          actorId: req.currentUser?.id || 'unknown',
          actorRole: req.currentUser?.role || 'system',
          action: 'ASSESSMENT_ERROR',
          targetType: 'assessment',
          targetId: 'error',
          summary: err instanceof Error ? err.message : 'Unexpected assessment error',
          level: 'error',
        });
      });
      return res.status(500).json({
        error: 'Assessment analysis could not be completed. Please try again or consult a healthcare provider.',
      });
    }
  });

  router.get('/assessment/history', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = loadDatabase();
    const items = db.assessments
      .filter((a) => a.userId === req.currentUser!.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return res.json({ assessments: items });
  });

  router.get('/assessment/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = loadDatabase();
    const record = db.assessments.find(
      (a) => a.id === req.params.id && a.userId === req.currentUser!.id
    );
    if (!record) {
      return res.status(404).json({ error: 'Assessment record not found.' });
    }
    return res.json({ assessment: record });
  });

  router.get('/assessment/:id/image', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = loadDatabase();
    const record = db.assessments.find(
      (a) => a.id === req.params.id && a.userId === req.currentUser!.id
    );
    if (!record) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }
    if (!record.imageStored) {
      return res.status(404).json({ error: 'Image was deleted in accordance with privacy settings.' });
    }
    const buf = readStoredImageBuffer(record.imageMetadata);
    if (!buf) {
      return res.status(404).json({ error: 'Image file is no longer present in storage.' });
    }
    res.setHeader('Content-Type', record.imageMetadata.mimeType);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.send(buf);
  });

  router.delete('/assessment/:id/image', requireAuth, async (req: AuthenticatedRequest, res) => {
    const updated = await mutateDatabase((store) => {
      const record = store.assessments.find(
        (a) => a.id === req.params.id && a.userId === req.currentUser!.id
      );
      if (!record) return null;
      deleteStoredImageFile(record.imageMetadata.id);
      record.imageStored = false;
      record.imageDeletedAt = new Date().toISOString();
      record.updatedAt = new Date().toISOString();
      appendAuditLog(store, {
        actorId: req.currentUser!.id,
        actorRole: req.currentUser!.role,
        action: 'IMAGE_DELETED',
        targetType: 'assessment',
        targetId: record.id,
        summary: 'User permanently deleted uploaded lesion image while retaining record summary.',
        level: 'info',
      });
      return record;
    });

    if (!updated) {
      return res.status(404).json({ error: 'Assessment record not found.' });
    }
    return res.json({ assessment: updated });
  });

  router.delete('/assessment/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    const deleted = await mutateDatabase((store) => {
      const idx = store.assessments.findIndex(
        (a) => a.id === req.params.id && a.userId === req.currentUser!.id
      );
      if (idx === -1) return false;
      const [removed] = store.assessments.splice(idx, 1);
      deleteStoredImageFile(removed.imageMetadata.id);
      appendAuditLog(store, {
        actorId: req.currentUser!.id,
        actorRole: req.currentUser!.role,
        action: 'ASSESSMENT_DELETED',
        targetType: 'assessment',
        targetId: removed.id,
        summary: 'User permanently deleted assessment record and associated image.',
        level: 'info',
      });
      return true;
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Assessment record not found.' });
    }
    return res.json({ ok: true });
  });

  // ==========================================
  // EDUCATIONAL CONTENT & GEMINI CHAT
  // ==========================================

  router.get('/articles', (_req, res) => {
    const db = loadDatabase();
    return res.json({ articles: db.articles });
  });

  router.post('/chat', chatLimiter, async (req, res) => {
    const messages = Array.isArray(req.body?.messages) ? (req.body.messages as ChatTurn[]) : [];
    if (messages.length === 0) {
      return res.status(400).json({ error: 'Please include at least one message.' });
    }
    const result = await chatSkinHealthEducation(messages);
    return res.json(result);
  });

  router.post('/contact', async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!name || name.length > 120) {
      return res.status(400).json({ error: 'Please enter your name.' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!subject || subject.length > 180) {
      return res.status(400).json({ error: 'Please provide a subject.' });
    }
    if (message.length < 5 || message.length > 3000) {
      return res.status(400).json({ error: 'Message must be between 5 and 3000 characters.' });
    }

    const saved = await mutateDatabase((store) => {
      const item = {
        id: crypto.randomUUID(),
        name,
        email,
        subject,
        message,
        createdAt: new Date().toISOString(),
      };
      store.contactMessages.unshift(item);
      appendAuditLog(store, {
        actorId: 'public',
        actorRole: 'system',
        action: 'CONTACT_SUBMITTED',
        targetType: 'contact',
        targetId: item.id,
        summary: `Contact inquiry submitted: ${subject.slice(0, 60)}`,
        level: 'info',
      });
      return item;
    });

    return res.status(201).json({ message: saved });
  });

  // ==========================================
  // ADMIN DASHBOARD & RBAC ENDPOINTS
  // Privacy rule: NEVER expose patient images or lesion details to admins.
  // ==========================================

  router.get('/admin/dashboard', requireAdmin, (_req, res) => {
    const db = loadDatabase();
    const provider = getActiveDermatologyProvider();
    const errorLogs = db.auditLogs.filter((l) => l.level === 'error' || l.level === 'warning');

    return res.json({
      summary: {
        totalUsers: db.users.length,
        totalAssessments: db.assessments.length,
        demonstrationAssessments: db.assessments.filter(
          (a) => a.modelResult.status === 'demonstration_mode'
        ).length,
        activeModelMode: db.activeModelMode,
        activeProvider: {
          id: provider.id,
          name: provider.name,
          version: provider.version,
          isClinicallyValidated: provider.isClinicallyValidated,
        },
        geminiConfigured: Boolean(
          process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
        ),
        systemStatus: 'operational',
      },
      modelVersions: db.modelVersions,
      // Only non-medical administrative metadata is exposed for user management
      users: db.users.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        email: u.email,
        role: u.role,
        authProvider: u.authProvider,
        createdAt: u.createdAt,
      })),
      articles: db.articles,
      errorLogs: errorLogs.slice(0, 50),
      recentAuditLogs: db.auditLogs.slice(0, 50),
      contactMessages: db.contactMessages.slice(0, 30),
    });
  });

  router.patch('/admin/users/:id/role', requireAdmin, async (req: AuthenticatedRequest, res) => {
    const newRole = req.body?.role === 'admin' ? 'admin' : req.body?.role === 'patient' ? 'patient' : null;
    if (!newRole) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }
    if (req.params.id === req.currentUser!.id && newRole !== 'admin') {
      return res.status(400).json({ error: 'Administrators cannot demote their own active session.' });
    }

    const updated = await mutateDatabase((store) => {
      const target = store.users.find((u) => u.id === req.params.id);
      if (!target) return null;
      target.role = newRole;
      target.updatedAt = new Date().toISOString();
      appendAuditLog(store, {
        actorId: req.currentUser!.id,
        actorRole: 'admin',
        action: 'ADMIN_ROLE_CHANGED',
        targetType: 'user',
        targetId: target.id,
        summary: `Role updated to ${newRole}.`,
        level: 'info',
      });
      return toPublicUser(target);
    });

    if (!updated) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: updated });
  });

  router.post('/admin/articles', requireAdmin, async (req: AuthenticatedRequest, res) => {
    const title = String(req.body?.title || '').trim();
    const category = String(req.body?.category || '').trim();
    const readTime = String(req.body?.readTime || '4 min read').trim();
    const summary = String(req.body?.summary || '').trim();
    const content = String(req.body?.content || '').trim();
    const medicalSource = String(req.body?.medicalSource || '').trim();

    if (!title || !category || !summary || !content || !medicalSource) {
      return res.status(400).json({ error: 'All article fields are required.' });
    }

    const article = await mutateDatabase((store) => {
      const item = {
        id: `art-${crypto.randomUUID().slice(0, 8)}`,
        slug: title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 64),
        title: title.slice(0, 180),
        category: category.slice(0, 64),
        readTime: readTime.slice(0, 32),
        summary: summary.slice(0, 500),
        content: content.slice(0, 10000),
        medicalSource: medicalSource.slice(0, 200),
        publishedAt: new Date().toISOString(),
      };
      store.articles.unshift(item);
      appendAuditLog(store, {
        actorId: req.currentUser!.id,
        actorRole: 'admin',
        action: 'ARTICLE_CREATED',
        targetType: 'article',
        targetId: item.id,
        summary: `Published educational article: ${item.title}`,
        level: 'info',
      });
      return item;
    });

    return res.status(201).json({ article });
  });

  router.delete('/admin/articles/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
    const removed = await mutateDatabase((store) => {
      const idx = store.articles.findIndex((a) => a.id === req.params.id);
      if (idx === -1) return false;
      const [art] = store.articles.splice(idx, 1);
      appendAuditLog(store, {
        actorId: req.currentUser!.id,
        actorRole: 'admin',
        action: 'ARTICLE_DELETED',
        targetType: 'article',
        targetId: art.id,
        summary: `Removed educational article: ${art.title}`,
        level: 'info',
      });
      return true;
    });
    if (!removed) return res.status(404).json({ error: 'Article not found.' });
    return res.json({ ok: true });
  });

  return router;
}
