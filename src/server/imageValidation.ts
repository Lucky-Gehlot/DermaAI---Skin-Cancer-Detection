import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ImageMetadata } from '../shared/types.ts';
import { getUploadsDir } from './store.ts';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MIN_IMAGE_DIMENSION = 200;
export const MAX_IMAGE_DIMENSION = 8192;

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  format?: 'JPEG' | 'PNG';
  mimeType?: 'image/jpeg' | 'image/png';
  width?: number;
  height?: number;
  sha256?: string;
  qualityStatus?: 'acceptable' | 'suboptimal' | 'rejected';
  qualityNotes?: string[];
}

function parsePngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.subarray(0, 8).equals(sig)) return null;
  if (buf.subarray(12, 16).toString('ascii') !== 'IHDR') return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

function parseJpegDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 4) return null;
  if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return null;
  let offset = 2;
  while (offset + 4 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];
    // Standalone markers (RST, SOI, EOI, TEM)
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    if (offset + 4 >= buf.length) break;
    const segmentLength = buf.readUInt16BE(offset + 2);
    if (segmentLength < 2) return null;
    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof) {
      if (offset + 9 >= buf.length) return null;
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height };
    }
    offset += 2 + segmentLength;
  }
  return null;
}

function scanForSuspiciousPayloads(buf: Buffer): string | null {
  // Check executable headers (PE/MZ, ELF, Mach-O)
  if (buf.length >= 4) {
    if (buf[0] === 0x4d && buf[1] === 0x5a) {
      return 'Executable signature detected in uploaded file.';
    }
    if (buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46) {
      return 'ELF binary signature detected in uploaded file.';
    }
  }
  // Check for embedded script/polyglot tags in ASCII view
  const lower = buf.toString('latin1').toLowerCase();
  const patterns = ['<script', '<?php', 'javascript:', 'onerror=', 'onload='];
  for (const pat of patterns) {
    if (lower.includes(pat)) {
      return 'Potentially unsafe embedded script content detected in file.';
    }
  }
  return null;
}

export function validateSkinImageBuffer(
  buf: Buffer | undefined,
  declaredMimeType?: string
): ImageValidationResult {
  if (!buf || buf.length === 0) {
    return {
      valid: false,
      error: 'Uploaded file is empty. Please select a clear JPG or PNG photograph.',
    };
  }

  if (buf.length > MAX_IMAGE_BYTES) {
    return {
      valid: false,
      error: `Image exceeds the maximum allowed size of ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`,
    };
  }

  if (
    declaredMimeType &&
    !['image/jpeg', 'image/jpg', 'image/png'].includes(declaredMimeType.toLowerCase())
  ) {
    return {
      valid: false,
      error: 'Unsupported file format. Only JPG, JPEG, and PNG images are accepted.',
    };
  }

  const threat = scanForSuspiciousPayloads(buf);
  if (threat) {
    return { valid: false, error: threat };
  }

  let format: 'JPEG' | 'PNG' | null = null;
  let mimeType: 'image/jpeg' | 'image/png' | null = null;
  let dims: { width: number; height: number } | null = null;

  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    format = 'PNG';
    mimeType = 'image/png';
    dims = parsePngDimensions(buf);
  } else if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    format = 'JPEG';
    mimeType = 'image/jpeg';
    dims = parseJpegDimensions(buf);
  }

  if (!format || !mimeType) {
    return {
      valid: false,
      error: 'Invalid image signature. File contents do not match a valid JPG or PNG image.',
    };
  }

  if (!dims || dims.width <= 0 || dims.height <= 0) {
    return {
      valid: false,
      error: 'Corrupted or unreadable image header. Please upload another photograph.',
    };
  }

  if (dims.width < MIN_IMAGE_DIMENSION || dims.height < MIN_IMAGE_DIMENSION) {
    return {
      valid: false,
      error: `Image resolution (${dims.width}×${dims.height}px) is too low. Please upload an image at least ${MIN_IMAGE_DIMENSION}×${MIN_IMAGE_DIMENSION}px.`,
    };
  }

  if (dims.width > MAX_IMAGE_DIMENSION || dims.height > MAX_IMAGE_DIMENSION) {
    return {
      valid: false,
      error: `Image dimensions (${dims.width}×${dims.height}px) exceed the ${MAX_IMAGE_DIMENSION}px limit.`,
    };
  }

  const qualityNotes: string[] = [];
  let qualityStatus: 'acceptable' | 'suboptimal' = 'acceptable';

  if (dims.width < 480 || dims.height < 480) {
    qualityStatus = 'suboptimal';
    qualityNotes.push(
      'Resolution is below 480px on one side; closer, well-lit photography improves visual clarity.'
    );
  }

  const aspect = Math.max(dims.width, dims.height) / Math.min(dims.width, dims.height);
  if (aspect > 2.2) {
    qualityStatus = 'suboptimal';
    qualityNotes.push(
      'Wide panoramic aspect ratio detected; centering the lesion in a closer square or 4:3 frame is recommended.'
    );
  }

  if (buf.length < 15 * 1024) {
    qualityStatus = 'suboptimal';
    qualityNotes.push(
      'Heavy compression or very small file size detected; sharp detail around lesion borders may be reduced.'
    );
  }

  if (qualityNotes.length === 0) {
    qualityNotes.push('Resolution, aspect ratio, and file integrity passed baseline upload checks.');
  }

  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');

  return {
    valid: true,
    format,
    mimeType,
    width: dims.width,
    height: dims.height,
    sha256,
    qualityStatus,
    qualityNotes,
  };
}

export function saveValidatedImage(
  buf: Buffer,
  validation: Required<Pick<ImageValidationResult, 'format' | 'mimeType' | 'width' | 'height' | 'sha256' | 'qualityStatus' | 'qualityNotes'>>,
  retentionDays: number
): ImageMetadata {
  const id = crypto.randomUUID();
  const ext = validation.format === 'PNG' ? 'png' : 'jpg';
  const target = path.resolve(getUploadsDir(), `${id}.${ext}`);
  fs.writeFileSync(target, buf, { mode: 0o600 });

  const uploadedAt = new Date().toISOString();
  const expiresAt =
    retentionDays > 0
      ? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

  return {
    id,
    mimeType: validation.mimeType,
    format: validation.format,
    width: validation.width,
    height: validation.height,
    sizeBytes: buf.length,
    sha256: validation.sha256,
    qualityStatus: validation.qualityStatus,
    qualityNotes: validation.qualityNotes,
    uploadedAt,
    expiresAt,
  };
}
