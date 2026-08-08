import { SendAppointmentDisruptionEmailInput } from '../interfaces/mail-service.interface';

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

export function appointmentDisruptionTemplate(input: SendAppointmentDisruptionEmailInput) {
  const start = formatDateTime(input.scheduledStart);
  const end = formatDateTime(input.scheduledEnd);
  const subject = `Lịch khám #${input.appointmentId} cần được xử lý`;
  const text = [
    `Xin chào ${input.patientName},`,
    `Lịch khám #${input.appointmentId} tại ${input.facilityName} với ${input.doctorName}, từ ${start} đến ${end}, đã bị ảnh hưởng.`,
    `Lý do: ${input.reason}.`,
    'Vui lòng đăng nhập để chọn lịch khác hoặc gửi yêu cầu hoàn tiền.',
    input.actionUrl,
  ].join('\n');

  return {
    subject,
    text,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:640px;margin:auto">
        <h2 style="color:#be185d">Lịch khám cần được xử lý</h2>
        <p>Xin chào <strong>${escapeHtml(input.patientName)}</strong>,</p>
        <p>Lịch khám <strong>#${escapeHtml(input.appointmentId)}</strong> tại
          <strong>${escapeHtml(input.facilityName)}</strong> với
          <strong>${escapeHtml(input.doctorName)}</strong>, từ ${escapeHtml(start)} đến ${escapeHtml(end)}, đã bị ảnh hưởng.</p>
        <p><strong>Lý do:</strong> ${escapeHtml(input.reason)}</p>
        <p>Bạn có thể chọn một lịch khác hoặc gửi yêu cầu hoàn tiền trên website.</p>
        <p><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;padding:10px 16px;background:#be185d;color:white;text-decoration:none;border-radius:6px">Xử lý lịch khám</a></p>
        <p style="font-size:12px;color:#6b7280">Đây là thông báo tự động. Việc hoàn tiền cần được cơ sở xác nhận trước khi thực hiện.</p>
      </div>
    `,
  };
}
