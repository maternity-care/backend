import { SendOTPEmailInput } from '../interfaces/mail-service.interface';
import { escapeHtml, MailTemplate } from './mail-template.interface';

export function sendOTPEmailTemplate(input: SendOTPEmailInput): MailTemplate {
  const name = escapeHtml(input.name);
  const otp = escapeHtml(input.otp);
  const expiresInMinutes = escapeHtml(String(input.expiresInMinutes));

  return {
    subject: 'Mã OTP xác thực tài khoản Maternity Care',

    text: [
      `Xin chào ${input.name},`,
      '',
      'Chúng tôi đã nhận được yêu cầu tạo tài khoản Maternity Care của bạn.',
      '',
      `Mã OTP của bạn là: ${input.otp}`,
      '',
      `Mã OTP có hiệu lực trong ${input.expiresInMinutes} phút.`,
      'Vui lòng không chia sẻ mã OTP này với bất kỳ ai.',
      '',
      'Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.',
      '',
      'Trân trọng,',
      'Đội ngũ Maternity Care',
    ].join('\n'),

    html: `
      <div
        style="
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.6;
          color: #0f172a;
          background-color: #ffffff;
        "
      >
        <h2
          style="
            margin: 0 0 16px;
            color: #1270a6;
            text-align: center;
          "
        >
          Xác thực tài khoản Maternity Care
        </h2>

        <p>Xin chào <strong>${name}</strong>,</p>

        <p>
          Chúng tôi đã nhận được yêu cầu xác thực tài khoản
          Maternity Care của bạn.
        </p>

        <p>Vui lòng sử dụng mã OTP dưới đây để hoàn tất xác thực:</p>

        <div
          style="
            margin: 24px 0;
            padding: 20px;
            border-radius: 8px;
            background-color: #f0f9ff;
            text-align: center;
          "
        >
          <div
            style="
              margin-bottom: 8px;
              font-size: 14px;
              color: #475569;
            "
          >
            Mã OTP của bạn
          </div>

          <div
            style="
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #1270a6;
            "
          >
            ${otp}
          </div>
        </div>

        <p style="text-align: center; color: #475569;">
          Mã OTP có hiệu lực trong
          <strong>${expiresInMinutes} phút</strong>.
        </p>

        <div
          style="
            margin-top: 24px;
            padding: 12px 16px;
            border-left: 4px solid #f59e0b;
            background-color: #fffbeb;
            color: #92400e;
          "
        >
          Vui lòng không chia sẻ mã OTP này với bất kỳ ai,
          kể cả nhân viên hỗ trợ.
        </div>

        <p style="margin-top: 24px; color: #64748b;">
          Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
          Tài khoản của bạn sẽ không bị thay đổi.
        </p>

        <hr
          style="
            margin: 24px 0;
            border: 0;
            border-top: 1px solid #e2e8f0;
          "
        />

        <p style="margin: 0; color: #64748b;">
          Trân trọng,<br />
          <strong>Đội ngũ Maternity Care</strong>
        </p>
      </div>
    `,
  };
}
