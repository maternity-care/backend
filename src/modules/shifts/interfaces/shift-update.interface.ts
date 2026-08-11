import { DoctorShift } from '../entities/shift.entity';
import { DoctorAppointmentBlock } from './doctor-appointment-block.interface';

export interface ShiftUpdateChanges {
  assigneeChanged: boolean;
  roomChanged: boolean;
  scheduleChanged: boolean;
  roleChanged: boolean;
  capacityChanged: boolean;
  statusChanged: boolean;
  noteChanged: boolean;
}

export interface UpdateShiftWithAuditInput {
  before: DoctorShift;
  after: DoctorShift;
  changes: ShiftUpdateChanges;
  affectedAppointments: DoctorAppointmentBlock[];
  reason?: string | null;
  changedBy?: string | null;
}

export interface UpdateShiftWithAuditResult {
  shift: DoctorShift;
  changeLogId: string;
}
