import { DoctorShiftStatus } from '../../../common/constants/status.enum';
import { DoctorShift } from '../entities/shift.entity';

/** Candidate ca truc duoc sinh ra trong buoc preview/confirm auto-generate. */
export interface AutoGenerateCandidate {
  index?: number;
  slotAssignmentIndex?: number;
  assignmentIndex?: number;
  doctorId?: string;
  staffId?: string;
  roleId?: string | null;
  facilityId: string;
  roomId?: string | null;
  slotId?: string | null;
  shiftDate: string;
  startTime: string;
  endTime: string;
  maxAppointments?: number | null;
  status: DoctorShiftStatus;
}

/** Candidate hop le da resolve duoc staffId de co the luu thanh shift that. */
export interface AutoGenerateValidItem extends AutoGenerateCandidate {
  staffId: string;
}

/** Candidate bi bo qua hoac bi conflict, kem ly do de FE hien thi cho quan ly. */
export interface AutoGenerateIssueItem {
  index: number;
  slotAssignmentIndex?: number;
  assignmentIndex?: number;
  shiftDate: string;
  reason: string;
  candidate: Partial<AutoGenerateCandidate>;
  doctorConflicts?: DoctorShift[];
  roomConflicts?: DoctorShift[];
}

/** Plan noi bo dung chung cho preview va confirm, giup hai API khong lech logic. */
export interface AutoGeneratePlan {
  canConfirm: boolean;
  summary: {
    totalCandidates: number;
    valid: number;
    skipped: number;
    conflicted: number;
  };
  validShifts: AutoGenerateValidItem[];
  skippedItems: AutoGenerateIssueItem[];
  conflictItems: AutoGenerateIssueItem[];
  internalValidEntities: DoctorShift[];
}

/** Response public cua API preview: khong tra internalValidEntities vi do la entity noi bo de confirm/save. */
export type AutoGeneratePreviewResult = Omit<AutoGeneratePlan, 'internalValidEntities'>;

/** Response public cua API confirm: gom preview summary va danh sach ca da duoc luu. */
export interface AutoGenerateConfirmResult extends AutoGeneratePreviewResult {
  createdShifts: DoctorShift[];
  createdCount: number;
  allOrNothingRejected?: boolean;
}

/** Wrapper response dung o controller preview auto/bulk generate. */
export interface AutoGeneratePreviewApiResponse {
  message: string;
  data: AutoGeneratePreviewResult;
}

/** Wrapper response dung o controller confirm auto/bulk generate. */
export interface AutoGenerateConfirmApiResponse {
  message: string;
  data: AutoGenerateConfirmResult;
}
