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
  const expected = signPayload(payload);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

