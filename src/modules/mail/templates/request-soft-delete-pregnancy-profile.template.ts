import { RequestSoftDeleteEmailInput } from '../interfaces/mail-service.interface';
import { escapeHtml, MailTemplate } from './mail-template.interface';

export function createRequestSoftDeletePregnancyProfileTemplate(
  input: RequestSoftDeleteEmailInput,
): MailTemplate {
  const name = escapeHtml(input.name);
  const doctorName = escapeHtml(input.doctorName);
  const profileCode = escapeHtml(input.profileCode);
  const reason = escapeHtml(input.reason);
  const actionUrl = escapeHtml(
    input.actionUrl ?? process.env.FRONTEND_URL ?? 'http://localhost:3000',
  );

  return {
    subject: 'Có yêu cầu xóa hồ sơ thai sản từ bác sĩ',
    text: [
      `Xin chào ${name},`,
      '',
      `Bác sĩ ${doctorName} đang yêu cầu xóa một hồ sơ thai sản của bạn với mã hồ sơ là ${profileCode}.`,
      `Lý do: ${reason}`,
      'Vui lòng đăng nhập vào hệ thống để xem chi tiết và xác thực yêu cầu này.',
      '',
      `Truy cập: ${actionUrl}`,
      '',
      'Nếu bạn không đồng ý, hãy liên hệ với chúng tôi để được hỗ trợ.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin: 0 0 16px;">Có yêu cầu xóa hồ sơ thai sản</h2>
        <p>Xin chào ${name},</p>
        <p>Bác sĩ <strong>${doctorName}</strong> đang yêu cầu xóa một hồ sơ thai sản của bạn với mã hồ sơ là <strong>${profileCode}</strong>.</p>
        <p>Lý do: ${reason}</p>
        <p>Vui lòng đăng nhập vào hệ thống để xem chi tiết và xác thực yêu cầu này.</p>
        <p>Truy cập: <a href="${actionUrl}" style="color: #1270a6;">${actionUrl}</a></p>
        <p>Nếu bạn không đồng ý, hãy liên hệ với chúng tôi để được hỗ trợ.</p>
      </div>
    `,
  };
}
