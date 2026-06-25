import { CreatedAccountInterface } from '../interfaces/created-account.interface';
import { escapeHtml, MailTemplate } from './mail-template.interface';

export function createdAccountTemplate(input: CreatedAccountInterface): MailTemplate {
  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const password = escapeHtml(input.password);
  const frontendUrl = escapeHtml(process.env.FRONTEND_URL ?? 'http://localhost:3000');

  return {
    subject: 'Your Maternity Care account has been created',
    text: [
      `Hello ${name},`,
      '',
      'Your Maternity Care account has been created.',
      'Your email address is:',
      email,
      'Your password is:',
      password,
      '',
      'You can log in to your account at:',
      '${frontendUrl}',
      '',
      'After login, you can update your profile information and set up your Maternity Care account.',
    ].join('\n'),
    html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
                <h2 style="margin: 0 0 16px;">Your Maternity Care account has been created</h2>
                <p>Hello ${name},</p>
                <p>Your Maternity Care account has been created.</p>
                <p>Your email address is: <span style="font-weight: bold;">${email}</span></p>
                <p>Your password is: ${password}</p>
                <p>You can log in to your account at: <a href="${frontendUrl}" style="color: #1270a6;">${frontendUrl}</a></p>
                <p>After login, you can update your profile information and set up your Maternity Care account.</p>
            </div>
        `,
  };
}
