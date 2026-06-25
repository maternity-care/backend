import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { IMailService, SendPasswordResetEmailInput } from './interfaces/mail-service.interface';
import { passwordResetTemplate } from './templates/password-reset.template';
import { createdAccountTemplate } from './templates/created-account.template';
import { CreatedAccountInterface } from './interfaces/created-account.interface';

interface MailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class MailService implements IMailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;

  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void> {
    const template = passwordResetTemplate(input);

    await this.sendMail({
      to: input.to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  private async sendMail(payload: MailPayload): Promise<void> {
    if (!this.configService.get<boolean>('mail.enabled')) {
      this.logger.warn('MAIL_ENABLED is false. Skipping SMTP email delivery.');
      return;
    }

    const transporter = this.getTransporter();
    const fromName = this.configService.getOrThrow<string>('mail.fromName');
    const fromAddress = this.configService.getOrThrow<string>('mail.fromAddress');

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.configService.getOrThrow<string>('mail.host');
    const port = this.configService.getOrThrow<number>('mail.port');
    const secure = this.configService.getOrThrow<boolean>('mail.secure');
    const username = this.configService.get<string>('mail.username');
    const password = this.configService.get<string>('mail.password');

    if (!host) {
      throw new Error('MAIL_HOST is required when MAIL_ENABLED=true');
    }

    this.transporter = createTransport({
      host,
      port,
      secure,
      auth: username && password ? { user: username, pass: password } : undefined,
    });

    return this.transporter;
  }

  async sendCreatedAccountEmail(input: CreatedAccountInterface): Promise<void> {
    const template = createdAccountTemplate(input);

    await this.sendMail({
      to: input.to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }
}
