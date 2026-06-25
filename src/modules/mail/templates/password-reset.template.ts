import { SendPasswordResetEmailInput } from '../interfaces/mail-service.interface';
import { escapeHtml, MailTemplate } from './mail-template.interface';

export function passwordResetTemplate(input: SendPasswordResetEmailInput): MailTemplate {
  const name = escapeHtml(input.name);
  const resetUrl = escapeHtml(input.resetUrl);

  return {
    subject: 'Reset your Maternity Care password',
    text: [
      `Hello ${input.name},`,
      '',
      'We received a request to reset your password.',
      `Open this link within ${input.expiresInMinutes} minutes:`,
      input.resetUrl,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin: 0 0 16px;">Reset your password</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your Maternity Care password.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 16px; background: #0f766e; color: #ffffff; text-decoration: none; border-radius: 6px;">
            Reset password
          </a>
        </p>
        <p>This link expires in ${input.expiresInMinutes} minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  };
}
