//mô tả appointment đang chiếm slot của bác sĩ:
export interface DoctorAppointmentBlock {
  id: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  status: string;
}
