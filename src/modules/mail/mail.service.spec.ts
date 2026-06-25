import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { createTransport } from 'nodemailer';
import { MailService } from './mail.service';

config();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

const TEST_RECIPIENT = 'duyvt2506@gmail.com';
const createTransportMock = createTransport as jest.MockedFunction<typeof createTransport>;
const realNodemailer = jest.requireActual<typeof import('nodemailer')>('nodemailer');

function makeConfig(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
    getOrThrow: jest.fn((key: string) => {
      const value = values[key];

      if (value === undefined || value === null) {
        throw new Error(`${key} is required`);
      }

      return value;
    }),
  } as unknown as ConfigService;
}

describe('MailService', () => {
  const sendMail = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    createTransportMock.mockReturnValue({ sendMail } as never);
  });

  it('sends password reset email through configured SMTP transport', async () => {
    const service = new MailService(
      makeConfig({
        'mail.enabled': true,
        'mail.host': 'mail.tungduy.com',
        'mail.port': 465,
        'mail.secure': true,
        'mail.username': 'no-reply@tungduy.com',
        'mail.password': 'secret',
        'mail.fromName': 'Maternity Care',
        'mail.fromAddress': 'no-reply@tungduy.com',
      }),
    );

    await service.sendPasswordResetEmail({
      to: 'patient@example.com',
      name: 'Patient One',
      resetUrl: 'https://app.example.com/reset-password?token=abc',
      expiresInMinutes: 30,
    });

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'mail.tungduy.com',
      port: 465,
      secure: true,
      auth: {
        user: 'no-reply@tungduy.com',
        pass: 'secret',
      },
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Maternity Care" <no-reply@tungduy.com>',
        to: 'patient@example.com',
        subject: 'Reset your Maternity Care password',
        text: expect.stringContaining('https://app.example.com/reset-password?token=abc'),
        html: expect.stringContaining('Reset password'),
      }),
    );
  });

  it('does not create SMTP transport when mail is disabled', async () => {
    const service = new MailService(makeConfig({ 'mail.enabled': false }));

    await service.sendPasswordResetEmail({
      to: 'patient@example.com',
      name: 'Patient One',
      resetUrl: 'https://app.example.com/reset-password?token=abc',
      expiresInMinutes: 30,
    });

    expect(createTransportMock).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('throws when SMTP is enabled without host', async () => {
    const service = new MailService(
      makeConfig({
        'mail.enabled': true,
        'mail.host': '',
        'mail.port': 465,
        'mail.secure': true,
        'mail.fromName': 'Maternity Care',
        'mail.fromAddress': 'no-reply@tungduy.com',
      }),
    );

    await expect(
      service.sendPasswordResetEmail({
        to: 'patient@example.com',
        name: 'Patient One',
        resetUrl: 'https://app.example.com/reset-password?token=abc',
        expiresInMinutes: 30,
      }),
    ).rejects.toThrow('MAIL_HOST is required when MAIL_ENABLED=true');
  });
});

describe('MailService SMTP integration', () => {
  const runSmtpIntegration = process.env.RUN_SMTP_INTEGRATION === 'true';
  const maybeIt = runSmtpIntegration ? it : it.skip;

  function requiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
      throw new Error(`${name} is required`);
    }

    return value;
  }

  maybeIt(
    'sends a real test email using .env SMTP config',
    async () => {
      const host = requiredEnv('MAIL_HOST');
      const port = Number(process.env.MAIL_PORT ?? 587);
      const secure = process.env.MAIL_SECURE === 'true';
      const username = process.env.MAIL_USERNAME;
      const password = process.env.MAIL_PASSWORD;
      const fromName = process.env.MAIL_FROM_NAME ?? process.env.APP_NAME ?? 'Maternity Care';
      const fromAddress = process.env.MAIL_FROM_ADDRESS ?? username;

      if (!fromAddress) {
        throw new Error('MAIL_FROM_ADDRESS or MAIL_USERNAME is required');
      }

      const transporter = realNodemailer.createTransport({
        host,
        port,
        secure,
        auth: username && password ? { user: username, pass: password } : undefined,
      });

      await transporter.verify();

      const sentAt = new Date().toISOString();
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: TEST_RECIPIENT,
        subject: 'Maternity Care SMTP test',
        text: ['SMTP test from Maternity Care backend.', '', `Sent at: ${sentAt}`].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
            <h2 style="margin: 0 0 16px;">Maternity Care SMTP test</h2>
            <p>SMTP test from Maternity Care backend.</p>
            <p><strong>Sent at:</strong> ${sentAt}</p>
          </div>
        `,
      });

      expect(info.messageId).toBeTruthy();
      console.log(`SMTP test email sent to ${TEST_RECIPIENT}. Message ID: ${info.messageId}`);
    },
    30000,
  );
});
