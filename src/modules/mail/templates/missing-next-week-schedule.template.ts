import { SendMissingNextWeekScheduleEmailInput } from '../interfaces/mail-service.interface';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function missingNextWeekScheduleTemplate(input: SendMissingNextWeekScheduleEmailInput) {
  return {
    subject: `Nhắc tạo lịch trực tuần sau - ${input.facilityName}`,
    text: [
      `Xin chào ${input.name},`,
      `${input.facilityName} chưa có lịch trực từ ${input.weekStart} đến ${input.weekEnd}.`,
      'Vui lòng đăng nhập trang quản lý cơ sở để tạo lịch trực tuần sau.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:640px;margin:auto">
        <h2 style="color:#0f766e">Nhắc tạo lịch trực tuần sau</h2>
        <p>Xin chào <strong>${escapeHtml(input.name)}</strong>,</p>
        <p><strong>${escapeHtml(input.facilityName)}</strong> chưa có lịch trực từ
          <strong>${escapeHtml(input.weekStart)}</strong> đến <strong>${escapeHtml(input.weekEnd)}</strong>.</p>
        <p>Vui lòng đăng nhập trang quản lý cơ sở để tạo lịch trực tuần sau.</p>
      </div>
    `,
  };
}
