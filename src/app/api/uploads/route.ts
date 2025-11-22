import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import type { AuthenticatedRequest } from '@/lib/middleware/auth';
import { promises as fs } from 'fs';
import path from 'path';
import { verifySignature } from '@/lib/uploads/signing';
import type { UploadKind } from '@/lib/uploads/signing';
import { uploadToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinary';

const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime'];

async function handler(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const uploadId = formData.get('uploadId')?.toString();
    const signature = formData.get('signature')?.toString();
    const expiresAt = Number(formData.get('expiresAt'));
    const kind = (formData.get('kind')?.toString() || 'image') as UploadKind;
    const mimeType = formData.get('mimeType')?.toString() || file.type;
    const sizeField = formData.get('size');
    const signedSize = sizeField ? Number(sizeField) : file.size;
    const { user } = request as AuthenticatedRequest;
    const userId = user?.userId;

    if (!uploadId || !signature || !expiresAt || !userId) {
      return NextResponse.json(
        { error: 'Missing upload metadata' },
        { status: 400 }
      );
    }

    if (Date.now() > expiresAt) {
      return NextResponse.json(
        { error: 'Upload signature expired' },
        { status: 400 }
      );
    }

    // Ensure userId is a string for signature verification
    const userIdString = typeof userId === 'string' ? userId : String(userId);
    
    const payload = {
      uploadId,
      size: signedSize,
      mimeType,
      kind,
      userId: userIdString,
      expiresAt,
    };

    if (!verifySignature(payload, signature)) {
      console.error('Signature verification failed', {
        payload,
        receivedSignature: signature,
      });
      return NextResponse.json(
        { error: 'Invalid upload signature' },
        { status: 400 }
      );
    }

    const allowedMime = kind === 'video' ? ALLOWED_VIDEO_MIME : ALLOWED_IMAGE_MIME;
    const maxBytes = kind === 'video' ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;

    if (!allowedMime.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File is too large (max ${Math.floor(maxBytes / (1024 * 1024))}MB)` },
        { status: 400 }
      );
    }

    if (file.size !== signedSize) {
      return NextResponse.json(
        { error: 'File size mismatch' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check if Cloudinary is configured
    if (isCloudinaryConfigured()) {
      // Use Cloudinary for uploads (production-ready)
      try {
        const resourceType = kind === 'video' ? 'video' : 'image';
        const result = await uploadToCloudinary(buffer, 'media', resourceType);
        return NextResponse.json({
          url: result.secure_url,
          kind,
          mimeType,
          size: result.bytes || file.size,
        });
      } catch (cloudinaryError: any) {
        console.error('Cloudinary upload error:', cloudinaryError);
        return NextResponse.json(
          { 
            error: 'Failed to upload to cloud storage',
            details: cloudinaryError.message || 'Unknown error'
          },
          { status: 500 }
        );
      }
    } else {
      // Fallback to filesystem for local development
      const ext = mimeType.split('/')[1] || (kind === 'video' ? 'mp4' : 'png');
      const fileName = `${uploadId}.${ext}`;
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      
      try {
        await fs.mkdir(uploadsDir, { recursive: true });
        const filePath = path.join(uploadsDir, fileName);
        await fs.writeFile(filePath, buffer);

        const url = `/uploads/${fileName}`;
        return NextResponse.json({
          url,
          kind,
          mimeType,
          size: file.size,
        });
      } catch (fsError: any) {
        console.error('File system error:', fsError);
        return NextResponse.json(
          { 
            error: 'File upload failed',
            details: fsError.message || 'Unknown error',
            note: 'For production, please configure Cloudinary by setting CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET'
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

