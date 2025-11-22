export type UploadKind = 'image' | 'video';

interface SignedUpload {
  uploadId: string;
  expiresAt: number;
  signature: string;
  uploadUrl: string;
  maxBytes: number;
}

interface UploadResult {
  url: string;
  kind: UploadKind;
  mimeType: string;
  size: number;
}

export async function signUpload(file: File, kind: UploadKind): Promise<SignedUpload> {
  const response = await fetch('/api/uploads/sign', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mimeType: file.type,
      size: file.size,
      kind,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to sign upload');
  }

  return response.json();
}

export async function uploadMedia(file: File, kind: UploadKind): Promise<UploadResult> {
  const signed = await signUpload(file, kind);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('uploadId', signed.uploadId);
  formData.append('signature', signed.signature);
  formData.append('expiresAt', signed.expiresAt.toString());
  formData.append('kind', kind);
  formData.append('mimeType', file.type);
  formData.append('size', file.size.toString());

  const response = await fetch(signed.uploadUrl, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to upload media');
  }

  return response.json();
}

