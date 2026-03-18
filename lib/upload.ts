import { mkdir } from 'fs/promises';
import path from 'path';

/**
 * Allowed MIME types for image uploads.
 * Only standard image formats are permitted.
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

/**
 * Maximum file size: 5MB.
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Map MIME type to file extension.
 * Returns 'bin' for unknown types (which should never pass validation).
 */
export function getExtensionFromMime(mime: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return mimeToExt[mime] || 'bin';
}

/**
 * Validate that a MIME type is an allowed image type.
 */
export function isAllowedMimeType(mime: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

/**
 * Magic byte signatures for image types.
 * Used to validate file content independently of the MIME type header,
 * which can be spoofed by malicious clients.
 */
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]], // GIF8
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP starts with RIFF header)
};

/**
 * Validate file content by checking magic bytes against the declared MIME type.
 * This prevents attackers from uploading non-image files with a spoofed Content-Type.
 * Returns true if the file's leading bytes match the expected signature.
 */
export function validateMagicBytes(
  buffer: ArrayBuffer,
  declaredMime: string
): boolean {
  const bytes = new Uint8Array(buffer);
  const signatures = MAGIC_BYTES[declaredMime];
  if (!signatures) return false;

  return signatures.some((sig) =>
    sig.every((byte, index) => bytes[index] === byte)
  );
}

/**
 * Ensure the upload directory exists at public/uploads.
 * Creates the directory recursively if it doesn't exist.
 * Returns the absolute path to the upload directory.
 */
export async function ensureUploadDir(): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadDir, { recursive: true });
  return uploadDir;
}
