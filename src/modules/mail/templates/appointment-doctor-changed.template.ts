import { SendAppointmentDoctorChangedEmailInput } from '../interfaces/mail-service.interface';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(value);
}

export function appointmentDoctorChangedTemplate(input: SendAppointmentDoctorChangedEmailInput) {
  const schedule = `${formatDateTime(input.scheduledStart)} - ${formatDateTime(input.scheduledEnd)}`;
  const reason = input.reason?.trim() || 'Cơ sở điều chỉnh phân công bác sĩ';

  return {
    subject: `Thay đổi bác sĩ phụ trách lịch khám #${input.appointmentId}`,
    text: [
      `Xin chào ${input.patientName},`,
      `Lịch khám #${input.appointmentId} tại ${input.facilityName} (${schedule}) đã đổi bác sĩ phụ trách.`,
      `Bác sĩ cũ: ${input.oldDoctorName}.`,
      `Bác sĩ mới: ${input.newDoctorName}.`,
      `Lý do: ${reason}.`,
      input.actionUrl,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:640px;margin:auto">
        <h2 style="color:#be185d">Thay đổi bác sĩ phụ trách</h2>
        <p>Xin chào <strong>${escapeHtml(input.patientName)}</strong>,</p>
        <p>Lịch khám <strong>#${escapeHtml(input.appointmentId)}</strong> tại
          <strong>${escapeHtml(input.facilityName)}</strong> (${escapeHtml(schedule)}) đã được đổi bác sĩ phụ trách.</p>
        <p><strong>Bác sĩ cũ:</strong> ${escapeHtml(input.oldDoctorName)}<br />
          <strong>Bác sĩ mới:</strong> ${escapeHtml(input.newDoctorName)}</p>
        <p><strong>Lý do:</strong> ${escapeHtml(reason)}</p>
        <p><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;padding:10px 16px;background:#be185d;color:white;text-decoration:none;border-radius:6px">Xem lịch khám</a></p>
      </div>
    `,
  };
}
