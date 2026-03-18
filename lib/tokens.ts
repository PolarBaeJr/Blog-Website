import crypto from 'crypto';

/**
 * Generate a cryptographically random invite token.
 * Uses crypto.randomBytes(32) for 256 bits of entropy.
 *
 * @returns A 64-character hex string
 */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
