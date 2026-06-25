import { CreatedAccountInterface } from './created-account.interface';

export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

export interface SendPasswordResetEmailInput {
  to: string;
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export interface IMailService {
  sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void>;
  sendCreatedAccountEmail(input: CreatedAccountInterface): Promise<void>;
}
