export enum NotificationType {
  APPOINTMENT = 'appointment', // nhắc hẹn
  REMINDER = 'reminder', // nhắc lại
  EXAM_RESULT = 'exam_result', // kết quả khám
  PREGNANCY_PROFILE = 'pregnancy_profile', // hồ sơ thai sản
  PAYMENT = 'payment', // thanh toán
  PACKAGE = 'package', // gói dịch vụ
  SYSTEM = 'system', // thông báo hệ thống
  APPOINTMENT_DISRUPTION = 'appointment_disruption',
  FORUM = 'forum',
}

export enum NotificationReferenceType {
  APPOINTMENT = 'appointment',
  EXAM = 'exam',
  APPOINTMENT_SERVICE_ITEM = 'appointment_service_item',
  PREGNANCY_PROFILE = 'pregnancy_profile',
  PAYMENT = 'payment',
  PACKAGE = 'package',
  SHIFT_DISRUPTION = 'shift_disruption',
  FORUM_POST = 'forum_post',
  FORUM_REPORT = 'forum_report',
}
