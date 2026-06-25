import { passwordResetTemplate } from './password-reset.template';

describe('passwordResetTemplate', () => {
  it('renders password reset subject, text, and escaped html', () => {
    const template = passwordResetTemplate({
      to: 'patient@example.com',
      name: '<Patient & One>',
      resetUrl: 'https://app.example.com/reset-password?token=<abc&x=1>',
      expiresInMinutes: 30,
    });

    expect(template.subject).toBe('Reset your Maternity Care password');
    expect(template.text).toContain('https://app.example.com/reset-password?token=<abc&x=1>');
    expect(template.html).toContain('&lt;Patient &amp; One&gt;');
    expect(template.html).toContain(
      'https://app.example.com/reset-password?token=&lt;abc&amp;x=1&gt;',
    );
    expect(template.html).toContain('This link expires in 30 minutes.');
  });
});
