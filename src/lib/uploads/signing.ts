import crypto from 'crypto';

export type UploadKind = 'image' | 'video';

export interface UploadSignaturePayload {
  uploadId: string;
  size: number;
  mimeType: string;
  kind: UploadKind;
  userId: string;
  expiresAt: number;
}

const DEFAULT_SECRET = 'upload-signing-secret';

export function getUploadSecret() {
  return process.env.UPLOAD_SECRET || process.env.JWT_SECRET || DEFAULT_SECRET;
}

export function buildSignaturePayload(payload: UploadSignaturePayload) {
  const { uploadId, size, mimeType, kind, userId, expiresAt } = payload;
  return `${uploadId}:${size}:${mimeType}:${kind}:${userId}:${expiresAt}`;
}

export function signPayload(payload: UploadSignaturePayload) {
  const base = buildSignaturePayload(payload);
  return crypto.createHmac('sha256', getUploadSecret()).update(base).digest('hex');
}

export function verifySignature(
  payload: UploadSignaturePayload,
  signature: string
) {
  try {
    const expected = signPayload(payload);
    
    // Both are hex strings (64 characters for SHA256)
    // Use timingSafeEqual for constant-time comparison to prevent timing attacks
    if (expected.length !== signature.length) {
      return false;
    }
    
    // Convert hex strings to buffers for timing-safe comparison
    // Hex strings are already in hex format, so we read them as hex
    const expectedBuffer = Buffer.from(expected, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');
    
    // Both should be 32 bytes (256 bits / 8) for SHA256
    if (expectedBuffer.length !== signatureBuffer.length || expectedBuffer.length !== 32) {
      return false;
    }
    
    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

