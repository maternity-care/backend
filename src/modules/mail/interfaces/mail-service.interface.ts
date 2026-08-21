import { CreatedAccountInterface } from './created-account.interface';

export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

export interface SendPasswordResetEmailInput {
  to: string;
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export interface RequestSoftDeleteEmailInput {
  to: string;
  name: string;
  doctorName: string;
  profileCode: string;
  reason: string;
  actionUrl?: string;
}

export interface SendOTPEmailInput {
  to: string;
  name: string;
  otp: string;
  expiresInMinutes: number;
}

export interface SendAppointmentDisruptionEmailInput {
  to: string;
  patientName: string;
  appointmentId: string;
  facilityName: string;
  doctorName: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  reason: string;
  actionUrl: string;
}

export interface SendAppointmentDoctorChangedEmailInput {
  to: string;
  patientName: string;
  appointmentId: string;
  facilityName: string;
  oldDoctorName: string;
  newDoctorName: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  reason?: string | null;
  actionUrl: string;
}

export interface SendMissingNextWeekScheduleEmailInput {
  to: string;
  name: string;
  facilityName: string;
  weekStart: string;
  weekEnd: string;
}

export interface SendExamResultEmailInput {
  to: string;
  name: string;
  content: string;
}

export interface IMailService {
  sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void>;
  sendCreatedAccountEmail(input: CreatedAccountInterface): Promise<void>;
  sendSoftDeleteRequestEmail(input: RequestSoftDeleteEmailInput): Promise<void>;
  sendOTPEmail(input: SendOTPEmailInput): Promise<void>;
  sendLockAccountEmail(input: { to: string; name: string; reason: string }): Promise<void>;
  sendAppointmentDisruptionEmail(input: SendAppointmentDisruptionEmailInput): Promise<void>;
  sendAppointmentDoctorChangedEmail(input: SendAppointmentDoctorChangedEmailInput): Promise<void>;
  sendMissingNextWeekScheduleEmail(input: SendMissingNextWeekScheduleEmailInput): Promise<void>;
  sendExamResultEmail(input: SendExamResultEmailInput): Promise<void>;
}
