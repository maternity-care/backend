export enum ForumCategory {
  PREGNANCY = 'pregnancy',
  NUTRITION = 'nutrition',
  POSTPARTUM = 'postpartum',
  ASK_DOCTOR = 'ask_doctor',
  BOOKING_EXPERIENCE = 'booking_experience',
}

export enum ForumAuthorRole {
  USER = 'user',
  STAFF = 'staff',
  DOCTOR = 'doctor',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

export enum ForumTargetType {
  POST = 'post',
  COMMENT = 'comment',
}

export enum ForumModerationAction {
  SUBMIT = 'submit',
  APPROVE = 'approve',
  HIDE = 'hide',
  REJECT = 'reject',
  DELETE = 'delete',
  LOCK_COMMENTS = 'lock_comments',
  UNLOCK_COMMENTS = 'unlock_comments',
  PIN = 'pin',
  UNPIN = 'unpin',
  FEATURE = 'feature',
  UNFEATURE = 'unfeature',
  WARN_USER = 'warn_user',
  BAN_USER = 'ban_user',
  RESOLVE_REPORT = 'resolve_report',
}
