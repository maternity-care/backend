import { escapeHtml, MailTemplate } from './mail-template.interface';

export interface LockAccountTemplateInput {
  name: string;
  reason: string;
}

export function lockAccountTemplate(input: LockAccountTemplateInput): MailTemplate {
  const name = escapeHtml(input.name);
  const reason = escapeHtml(input.reason);

  return {
    subject: 'Thông báo khóa tài khoản Maternity Care',
    text: [
      `Xin chào ${name},`,
      '',
      'Tài khoản Maternity Care của bạn đã bị khóa.',
      `Lý do: ${reason}`,
      '',
      'Trong thời gian tài khoản bị khóa, bạn sẽ không thể đăng nhập hoặc sử dụng các dịch vụ trên hệ thống.',
      'Nếu bạn cho rằng đây là sự nhầm lẫn hoặc cần thêm thông tin, vui lòng liên hệ với bộ phận hỗ trợ.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin: 0 0 16px;">Thông báo khóa tài khoản</h2>
        <p>Xin chào ${name},</p>
        <p>Tài khoản Maternity Care của bạn đã bị khóa.</p>
        <div style="margin: 16px 0; padding: 12px 16px; border-left: 4px solid #dc2626; background-color: #fef2f2;">
          <strong>Lý do:</strong> ${reason}
        </div>
        <p>Trong thời gian tài khoản bị khóa, bạn sẽ không thể đăng nhập hoặc sử dụng các dịch vụ trên hệ thống.</p>
        <p>Nếu bạn cho rằng đây là sự nhầm lẫn hoặc cần thêm thông tin, vui lòng liên hệ với bộ phận hỗ trợ.</p>
      </div>
    `,
  };
}
