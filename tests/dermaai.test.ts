import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from '../src/server/auth.ts';
import {
  DEMONSTRATION_MESSAGE,
  DemonstrationDermatologyProvider,
  evaluateClinicalSymptomsAndNextSteps,
} from '../src/server/dermatologyModel.ts';
import { validateSkinImageBuffer } from '../src/server/imageValidation.ts';
import type { ImageMetadata, PatientContext } from '../src/shared/types.ts';

function buildMinimalPng(width: number, height: number): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrLen = Buffer.alloc(4);
  ihdrLen.writeUInt32BE(13, 0);
  const ihdrType = Buffer.from('IHDR', 'ascii');
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // RGB
  const crc = Buffer.alloc(4);
  return Buffer.concat([sig, ihdrLen, ihdrType, ihdrData, crc, Buffer.alloc(1024)]);
}

describe('Authentication & Password Security', () => {
  it('hashes passwords with unique salts and verifies correctly', () => {
    const h1 = hashPassword('DermaSafe2026!');
    const h2 = hashPassword('DermaSafe2026!');
    expect(h1).not.toEqual(h2);
    expect(verifyPassword('DermaSafe2026!', h1)).toBe(true);
    expect(verifyPassword('WrongPass123', h1)).toBe(false);
  });

  it('signs and verifies session tokens and rejects tampered tokens', () => {
    const token = signSessionToken({
      uid: 'user-123',
      role: 'patient',
      exp: Date.now() + 60_000,
    });
    const verified = verifySessionToken(token);
    expect(verified?.uid).toBe('user-123');
    expect(verified?.role).toBe('patient');

    const tampered = `${token.slice(0, -4)}abcd`;
    expect(verifySessionToken(tampered)).toBeNull();
  });
});

describe('Image Upload Binary & Security Validation', () => {
  it('rejects empty buffers and non-image signatures', () => {
    expect(validateSkinImageBuffer(Buffer.alloc(0), 'image/png').valid).toBe(false);
    expect(
      validateSkinImageBuffer(Buffer.from('not a real image'), 'image/jpeg').valid
    ).toBe(false);
  });

  it('rejects executable or embedded script payloads', () => {
    const validPng = buildMinimalPng(500, 500);
    const polyglot = Buffer.concat([validPng, Buffer.from('<script>alert(1)</script>')]);
    const result = validateSkinImageBuffer(polyglot, 'image/png');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/script/i);
  });

  it('rejects images below minimum 200x200 dimensions', () => {
    const smallPng = buildMinimalPng(120, 180);
    const result = validateSkinImageBuffer(smallPng, 'image/png');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too low/i);
  });

  it('accepts valid PNG buffers and extracts exact dimensions', () => {
    const validPng = buildMinimalPng(640, 480);
    const result = validateSkinImageBuffer(validPng, 'image/png');
    expect(result.valid).toBe(true);
    expect(result.format).toBe('PNG');
    expect(result.width).toBe(640);
    expect(result.height).toBe(480);
  });
});

describe('Dermatology Model Safety & Symptom Triage', () => {
  it('DemonstrationDermatologyProvider never fabricates medical classifications or probabilities', async () => {
    const provider = new DemonstrationDermatologyProvider();
    const metadata: ImageMetadata = {
      id: 'img-1',
      mimeType: 'image/png',
      format: 'PNG',
      width: 640,
      height: 480,
      sizeBytes: 50000,
      sha256: 'abc',
      qualityStatus: 'acceptable',
      qualityNotes: [],
      uploadedAt: new Date().toISOString(),
    };
    const context: PatientContext = {
      ageRange: '30–49',
      bodyLocation: 'Arms / Hands',
      durationPresent: '1–6 months',
      hasChanged: 'no_change',
      symptoms: [],
      personalHistory: '',
    };

    const output = await provider.classify({
      imageMetadata: metadata,
      imageBuffer: Buffer.alloc(100),
      patientContext: context,
    });

    expect(output.isClinicallyValidated).toBe(false);
    expect(output.classificationAvailable).toBe(false);
    expect(output.probabilities).toBeNull();
    expect(output.topCategory).toBeNull();
    expect(output.displayMessage).toBe(DEMONSTRATION_MESSAGE);
  });

  it('flags bleeding and rapid evolution for prompt clinical evaluation', async () => {
    const provider = new DemonstrationDermatologyProvider();
    const metadata: ImageMetadata = {
      id: 'img-2',
      mimeType: 'image/jpeg',
      format: 'JPEG',
      width: 800,
      height: 800,
      sizeBytes: 120000,
      sha256: 'def',
      qualityStatus: 'acceptable',
      qualityNotes: [],
      uploadedAt: new Date().toISOString(),
    };
    const context: PatientContext = {
      ageRange: '50–64',
      bodyLocation: 'Upper Back / Shoulders',
      durationPresent: '1–6 months',
      hasChanged: 'yes_rapidly',
      symptoms: ['Bleeding or oozing'],
      personalHistory: '',
    };

    const modelResult = await provider.classify({
      imageMetadata: metadata,
      imageBuffer: Buffer.alloc(100),
      patientContext: context,
    });
    const triage = evaluateClinicalSymptomsAndNextSteps(context, modelResult, metadata);
    expect(triage.urgencyLevel).toBe('prompt_evaluation');
    expect(triage.warningSigns.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Firestore Security Rules Hardening', () => {
  it('enforces default-deny catch-all, ID validation, and verified email admin checks', () => {
    const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');
    expect(rules).toContain('allow read, write: if false;');
    expect(rules).toContain('function isValidId(id)');
    expect(rules).toContain('request.auth.token.email_verified == true');
    expect(rules).toContain('resource.data.userId == request.auth.uid');
    expect(rules).not.toContain('allow read: if isSignedIn();');
  });
});
