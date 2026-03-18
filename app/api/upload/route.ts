import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getSession } from '@/lib/auth-helpers';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  getExtensionFromMime,
  isAllowedMimeType,
  validateMagicBytes,
  ensureUploadDir,
} from '@/lib/upload';

/**
 * Force Node.js runtime (not Edge) since we need filesystem access.
 */
export const runtime = 'nodejs';

/**
 * POST /api/upload — Upload an image file.
 *
 * Authentication required. Accepts multipart form data with field name 'file'.
 * Validates MIME type (both header and magic bytes), enforces 5MB size limit,
 * generates a random UUID filename, and writes to public/uploads/.
 *
 * Returns:
 *   201: { url: '/uploads/<uuid>.ext' }
 *   400: Invalid file, wrong type, too large, or empty
 *   401: Not authenticated
 *   500: Server error during file write
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Parse multipart form data
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: 'Invalid form data' },
        { status: 400 }
      );
    }

    const file = formData.get('file');

    // 3. Validate file exists and is a File object
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided. Use field name "file".' },
        { status: 400 }
      );
    }

    // 4. Validate file is not empty
    if (file.size === 0) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      );
    }

    // 5. Validate file size (5MB max)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
        },
        { status: 400 }
      );
    }

    // 6. Validate MIME type from Content-Type header
    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type "${file.type}". Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // 7. Read file buffer for magic byte validation
    const buffer = await file.arrayBuffer();

    // 8. Validate magic bytes — don't trust MIME type header alone
    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: 'File content does not match declared type' },
        { status: 400 }
      );
    }

    // 9. Generate random filename — never use user-provided filename
    const extension = getExtensionFromMime(file.type);
    const filename = `${crypto.randomUUID()}.${extension}`;

    // 10. Ensure upload directory exists and write file
    const uploadDir = await ensureUploadDir();
    const filepath = path.join(uploadDir, filename);

    const uint8Array = new Uint8Array(buffer);
    await writeFile(filepath, uint8Array);

    // 11. Return the public URL path
    const url = `/uploads/${filename}`;
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    // Log internal error details server-side only — never expose to client
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
