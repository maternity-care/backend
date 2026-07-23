export enum AccountStatus {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  LOCKED = 'locked',
}

export enum ActiveStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum FacilityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted',
}

export enum DoctorShiftStatus {
  AVAILABLE = 'available',
  FULL = 'full',
  CANCELLED = 'cancelled',
  OFF = 'off',
}

export enum ShiftDisruptionStatus {
  OPEN = 'open',
  PARTIALLY_RESOLVED = 'partially_resolved',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
}

export enum AvailabilityStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
}

export enum MaternityPackageStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum PatientPackageStatus {
  PENDING_PAYMENT = 'pending_payment',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  UPGRADED = 'upgraded',
}

export enum PatientExtraServiceStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  USED = 'used',
  CANCELLED = 'cancelled',
}

export enum PregnancyProfileStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
  DELETED = 'deleted',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum AppointmentStatus {
  PENDING_PAYMENT = 'pending_payment',
  BOOKED = 'booked',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  RESCHEDULED = 'rescheduled',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum ReminderStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum OrderStatus {
  DRAFT = 'draft',
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum InvoiceStatus {
  ISSUED = 'issued',
  CANCELLED = 'cancelled',
}

export enum RefundStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
}

export enum ShippingStatus {
  PENDING = 'pending',
  PACKING = 'packing',
  SHIPPING = 'shipping',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PrescriptionStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum ConversationStatus {
  OPEN = 'open',
  PENDING = 'pending',
  CLOSED = 'closed',
}

export enum ArticleStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

export enum ForumContentStatus {
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
}

export enum ContentReportStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

export enum DisruptionStatus {
  OPEN = 'open',
  PARTIALLY_RESOLVED = 'partially_resolved',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
}

export enum AppointmentDisruptionResolutionStatus {
  PENDING = 'pending',
  RESCHEDULED = 'rescheduled',
  REASSIGNED = 'reassigned',
  CANCELLED = 'cancelled',
  REFUND_PENDING = 'refund_pending',
  RESOLVED = 'resolved',
}

export enum FaqStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
