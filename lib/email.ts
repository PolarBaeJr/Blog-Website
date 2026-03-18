import nodemailer from 'nodemailer';

/**
 * Email utility for sending invite emails.
 * Gracefully handles missing SMTP configuration by logging to console.
 */

/** Check if SMTP is configured */
function isSmtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

/** Create Nodemailer transporter from environment variables */
function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send an invite email to a new editor.
 * If SMTP is not configured, logs the invite URL to the console instead.
 * This function is fire-and-forget — it does not throw on failure.
 *
 * @param to - Recipient email address
 * @param inviteUrl - Full URL to the invite registration page
 * @param inviterName - Name of the user who sent the invite
 */
export async function sendInviteEmail(
  to: string,
  inviteUrl: string,
  inviterName: string
): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn(
      `[email] SMTP not configured. Invite email not sent. Invite URL for ${to}: ${inviteUrl}`
    );
    return;
  }

  const fromAddress = process.env.SMTP_FROM || 'noreply@demo.polardev.org';
  const subject = `You've been invited to join the blog!`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; border: 1px solid #e5e7eb;">
      <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827;">
        You're invited to join the blog!
      </h1>
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #4b5563;">
        <strong>${escapeHtml(inviterName)}</strong> has invited you to become an editor on the blog.
        Click the button below to create your account.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${escapeHtml(inviteUrl)}"
           style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 600;">
          Accept Invitation
        </a>
      </div>
      <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">
        Or copy and paste this link into your browser:
      </p>
      <p style="margin: 0 0 24px; font-size: 14px; color: #2563eb; word-break: break-all;">
        ${escapeHtml(inviteUrl)}
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        This invite link expires in 72 hours. If you did not expect this invitation, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `You've been invited to join the blog!\n\n${inviterName} has invited you to become an editor. Click the link below to create your account:\n\n${inviteUrl}\n\nThis invite link expires in 72 hours. If you did not expect this invitation, you can safely ignore this email.`;

  try {
    const transporter = createTransport();
    await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });
    console.log(`[email] Invite email sent successfully to ${to}`);
  } catch (error) {
    // Fire-and-forget: log error but do not throw
    console.error(`[email] Failed to send invite email to ${to}:`, error instanceof Error ? error.message : 'Unknown error');
  }
}

/** Escape HTML special characters to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
