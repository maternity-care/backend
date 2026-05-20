export enum PermissionEnum {
  USER_VIEW = 'user.view',
  USER_CREATE = 'user.create',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',
  USER_ASSIGN_ROLE = 'user.assign_role',

  ROLE_VIEW = 'role.view',
  ROLE_CREATE = 'role.create',
  ROLE_UPDATE = 'role.update',
  ROLE_DELETE = 'role.delete',

  PERMISSION_VIEW = 'permission.view',
  PERMISSION_CREATE = 'permission.create',
  PERMISSION_UPDATE = 'permission.update',
  PERMISSION_DELETE = 'permission.delete',

  MEMBER_VIEW = 'member.view',
  MEMBER_CREATE = 'member.create',
  MEMBER_UPDATE = 'member.update',
  MEMBER_DELETE = 'member.delete',
  MEMBER_MEDICAL_VIEW = 'member.medical_view',

  DOCTOR_VIEW = 'doctor.view',
  DOCTOR_CREATE = 'doctor.create',
  DOCTOR_UPDATE = 'doctor.update',
  DOCTOR_DELETE = 'doctor.delete',

  NURSE_VIEW = 'nurse.view',
  NURSE_CREATE = 'nurse.create',
  NURSE_UPDATE = 'nurse.update',
  NURSE_DELETE = 'nurse.delete',

  STAFF_VIEW = 'staff.view',
  STAFF_CREATE = 'staff.create',
  STAFF_UPDATE = 'staff.update',
  STAFF_DELETE = 'staff.delete',

  PREGNANCY_VIEW = 'pregnancy.view',
  PREGNANCY_CREATE = 'pregnancy.create',
  PREGNANCY_UPDATE = 'pregnancy.update',
  PREGNANCY_DELETE = 'pregnancy.delete',
  PREGNANCY_ASSIGN_DOCTOR = 'pregnancy.assign_doctor',
  PREGNANCY_SHARE = 'pregnancy.share',

  HEALTH_METRIC_VIEW = 'health_metric.view',
  HEALTH_METRIC_CREATE = 'health_metric.create',
  HEALTH_METRIC_UPDATE = 'health_metric.update',
  HEALTH_METRIC_DELETE = 'health_metric.delete',

  APPOINTMENT_VIEW = 'appointment.view',
  APPOINTMENT_CREATE = 'appointment.create',
  APPOINTMENT_UPDATE = 'appointment.update',
  APPOINTMENT_CANCEL = 'appointment.cancel',
  APPOINTMENT_APPROVE = 'appointment.approve',
  APPOINTMENT_ASSIGN_DOCTOR = 'appointment.assign_doctor',

  MEDICAL_RECORD_VIEW = 'medical_record.view',
  MEDICAL_RECORD_CREATE = 'medical_record.create',
  MEDICAL_RECORD_UPDATE = 'medical_record.update',
  MEDICAL_RECORD_DELETE = 'medical_record.delete',
  MEDICAL_RECORD_SENSITIVE_VIEW = 'medical_record.sensitive_view',

  REMINDER_VIEW = 'reminder.view',
  REMINDER_CREATE = 'reminder.create',
  REMINDER_UPDATE = 'reminder.update',
  REMINDER_DELETE = 'reminder.delete',

  CHECKLIST_VIEW = 'checklist.view',
  CHECKLIST_CREATE = 'checklist.create',
  CHECKLIST_UPDATE = 'checklist.update',
  CHECKLIST_DELETE = 'checklist.delete',

  CONSULTATION_VIEW = 'consultation.view',
  CONSULTATION_CREATE = 'consultation.create',
  CONSULTATION_REPLY = 'consultation.reply',
  CONSULTATION_CLOSE = 'consultation.close',

  ARTICLE_VIEW = 'article.view',
  ARTICLE_CREATE = 'article.create',
  ARTICLE_UPDATE = 'article.update',
  ARTICLE_DELETE = 'article.delete',
  ARTICLE_PUBLISH = 'article.publish',

  SERVICE_PACKAGE_VIEW = 'service_package.view',
  SERVICE_PACKAGE_CREATE = 'service_package.create',
  SERVICE_PACKAGE_UPDATE = 'service_package.update',
  SERVICE_PACKAGE_DELETE = 'service_package.delete',

  PAYMENT_VIEW = 'payment.view',
  PAYMENT_REFUND = 'payment.refund',

  REPORT_VIEW = 'report.view',
  REPORT_EXPORT = 'report.export',
  AUDIT_LOG_VIEW = 'audit_log.view',
}
