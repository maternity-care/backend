//mô tả appointment đang chiếm slot của bác sĩ:
export interface DoctorAppointmentBlock {
  id: string;
  doctorId?: string | null;
  roomId?: string | null;
  scheduledStart: Date;
  scheduledEnd: Date;
  status: string;
}
