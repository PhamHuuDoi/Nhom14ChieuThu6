const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config();

const {
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
    REFRESH_TOKEN,
    EMAIL_USER,
} = process.env;

const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

oAuth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN,
});

const validateMailConfig = () => {
    const requiredEnv = [
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI,
        REFRESH_TOKEN,
        EMAIL_USER,
    ];

    if (requiredEnv.some((value) => !value)) {
        throw new Error('Cấu hình email chưa đầy đủ');
    }
};

const createMailTransport = async () => {
    const accessToken = await oAuth2Client.getAccessToken();

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: EMAIL_USER,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            refreshToken: REFRESH_TOKEN,
            accessToken: accessToken?.token,
        },
    });
};

const forgotPasswordTemplate = (otp) => {
    return `
        <div style="
            font-family: Arial, sans-serif;
            max-width: 520px;
            margin: auto;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            background-color: #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        ">
            <h2 style="
                color: #1f2937;
                text-align: center;
                margin-bottom: 20px;
            ">
                Xác nhận đặt lại mật khẩu
            </h2>

            <p style="font-size: 16px; color: #4b5563;">
                Xin chào,
            </p>

            <p style="font-size: 16px; color: #4b5563; line-height: 1.6;">
                Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
                Vui lòng sử dụng mã OTP bên dưới để tiếp tục:
            </p>

            <div style="text-align: center; margin: 30px 0;">
                <span style="
                    display: inline-block;
                    background: #2563eb;
                    color: white;
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    padding: 16px 32px;
                    border-radius: 12px;
                ">
                    ${otp}
                </span>
            </div>

            <p style="
                font-size: 15px;
                color: #6b7280;
                line-height: 1.6;
            ">
                Mã OTP có hiệu lực trong <strong>5 phút</strong>.
                Vui lòng không chia sẻ mã này với bất kỳ ai để đảm bảo an toàn cho tài khoản.
            </p>

            <p style="
                font-size: 14px;
                color: #9ca3af;
                margin-top: 20px;
            ">
                Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
            </p>

            <hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;" />

            <p style="
                text-align: center;
                font-size: 13px;
                color: #9ca3af;
            ">
                Trân trọng,<br/>
                <strong>Đội ngũ hỗ trợ TheZooCoffee</strong>
            </p>
        </div>
    `;
};

const sendMailForgotPassword = async (email, otp) => {
    try {
        validateMailConfig();

        const transport = await createMailTransport();

        const info = await transport.sendMail({
            from: `"Moho Hỗ Trợ" <${EMAIL_USER}>`,
            to: email,
            subject: 'Mã OTP đặt lại mật khẩu',
            text: `Mã OTP của bạn là: ${otp}`,
            html: forgotPasswordTemplate(otp),
        });

        console.log(`Đã gửi email thành công: ${info.messageId}`);

        return {
            success: true,
            messageId: info.messageId,
        };
    } catch (error) {
        console.error('Lỗi gửi email:', error);

        if (error?.response?.data?.error === 'invalid_grant') {
            throw new Error('Refresh token đã hết hạn hoặc bị thu hồi');
        }

        throw new Error('Không thể gửi email đặt lại mật khẩu');
    }
};

module.exports = sendMailForgotPassword;