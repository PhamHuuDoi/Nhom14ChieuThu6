const bcrypt = require('bcrypt');
const prisma = require('../../config/prisma');
const otp = require('otp-generator');
const jwt = require('jsonwebtoken');

const { AuthFailureError, BadRequestError, BadGatewayError } = require('../../core/error.response');
const { Created, OK } = require('../../core/success.response');
const { createAccessToken, createRefreshToken } = require('../../auth/checkAuth');
const redisClient = require('../../config/redis');
const { upsertPrimaryStoreLocation } = require('../../services/store-location.service');
const sendMailForgotPassword = require('../../utils/mailForgotPassword');
const { oAuth2Client, oauth2 } = require('../../utils/loginOAuth2Google');
const { getFacebookLoginUrl, getFacebookAccessToken, getFacebookUserInfo } = require('../../utils/loginOAuth2Facebook');

const CLIENT_REDIRECT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const OTP_CONFIG = {
    digits: true,
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
};

const SALT_ROUNDS = 10;
const DEFAULT_ROLE = 'customer';
const ONE_DAY = 24 * 60 * 60 * 1000;
const THIRTY_DAYS = 30 * ONE_DAY;
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
};

const SAFE_USER_SELECT = {
    id: true,
    name: true,
    email: true,
    phone: true,
    address: true,
    latitude: true,
    longitude: true,
    role: true,
    created_at: true,
    updated_at: true,
    facebook_id: true,
    google_id: true,
};

const PROFILE_USER_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
    phone: true,
    address: true,
    latitude: true,
    longitude: true,
};

const normalizeEmail = (email) => email.trim().toLowerCase();
const normalizeString = (value) => value?.trim() || null;

const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie('accessToken', accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: ONE_DAY,
    });

    res.cookie('refreshToken', refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: THIRTY_DAYS,
    });

    res.cookie('logged', 1, {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: THIRTY_DAYS,
    });
};

const clearAuthCookies = (res) => {
    ['accessToken', 'refreshToken', 'logged'].forEach((cookieName) => {
        res.clearCookie(cookieName);
    });
};

const sendClientRedirect = (res, path = '/profile') => {
    const destination = `${CLIENT_REDIRECT_URL}${path}`;

    return res.status(200).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0;url=${destination}" />
    <title>Redirecting...</title>
  </head>
  <body>
    <script>
      window.location.replace(${JSON.stringify(destination)});
    </script>
    <p>Redirecting to your account...</p>
  </body>
</html>`);
};

class UserController {
    async register(req, res) {
        const { name, email, password, phone, address, latitude, longitude } = req.body;
        const normalizedEmail = normalizeEmail(email);

        const existingUser = await prisma.users.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            throw new BadRequestError('Email đã tồn tại');
        }

        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        const user = await prisma.users.create({
            data: {
                name: name.trim(),
                email: normalizedEmail,
                phone: normalizeString(phone),
                address: normalizeString(address),
                latitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
                longitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
                password_hash,
                role: DEFAULT_ROLE,
            },
            select: PROFILE_USER_SELECT,
        });

        const accessToken = createAccessToken({ id: user.id });
        const refreshToken = createRefreshToken({ id: user.id });

        setAuthCookies(res, accessToken, refreshToken);

        new Created({
            message: 'Đăng ký thành công',
            metadata: user,
        }).send(res);
    }

    async login(req, res) {
        const { email, password } = req.body;

        const existingUser = await prisma.users.findUnique({
            where: { email: normalizeEmail(email) },
        });

        if (!existingUser) {
            throw new AuthFailureError('Email hoặc mật khẩu không đúng');
        }

        const isValidPassword = await bcrypt.compare(password, existingUser.password_hash);

        if (!isValidPassword) {
            throw new AuthFailureError('Email hoặc mật khẩu không đúng');
        }

        const user = {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role,
        };

        const accessToken = createAccessToken({ id: user.id });
        const refreshToken = createRefreshToken({ id: user.id });

        setAuthCookies(res, accessToken, refreshToken);

        new OK({
            message: 'Đăng nhập thành công',
            metadata: user,
        }).send(res);
    }

    async loginOauth2Google(req, res) {
        const url = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['email', 'profile'],
            prompt: 'consent',
        });

        return res.redirect(url);
    }

    async Oauth2callbackGoogle(req, res) {
        const { code } = req.query;

        if (!code) {
            throw new BadRequestError('Không nhận được code từ Google');
        }

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        const { data } = await oauth2.userinfo.get();
        const { email, name, id: googleId } = data;

        let user = await prisma.users.findUnique({
            where: { email },
            select: SAFE_USER_SELECT,
        });

        if (!user) {
            user = await prisma.users.create({
                data: {
                    email,
                    name,
                    google_id: googleId,
                    role: DEFAULT_ROLE,
                },
                select: SAFE_USER_SELECT,
            });
        } else if (!user.google_id) {
            user = await prisma.users.update({
                where: { id: user.id },
                data: { google_id: googleId },
                select: SAFE_USER_SELECT,
            });
        }

        const accessToken = createAccessToken({ id: user.id });
        const refreshToken = createRefreshToken({ id: user.id });

        setAuthCookies(res, accessToken, refreshToken);
        return sendClientRedirect(res);
    }

    async loginOauth2Facebook(req, res) {
        const url = getFacebookLoginUrl();
        return res.redirect(url);
    }

    async Oauth2callbackFacebook(req, res) {
        const { code } = req.query;

        if (!code) {
            throw new BadRequestError('Không nhận được code từ Facebook');
        }

        const accessToken = await getFacebookAccessToken(code);
        const data = await getFacebookUserInfo(accessToken);
        const { id: facebookId, name, email } = data;

        let user = await prisma.users.findUnique({
            where: { email },
            select: SAFE_USER_SELECT,
        });

        if (!user) {
            user = await prisma.users.create({
                data: {
                    email,
                    name,
                    facebook_id: facebookId,
                    role: DEFAULT_ROLE,
                },
                select: SAFE_USER_SELECT,
            });
        } else if (!user.facebook_id) {
            user = await prisma.users.update({
                where: { id: user.id },
                data: { facebook_id: facebookId },
                select: SAFE_USER_SELECT,
            });
        }

        const jwtAccessToken = createAccessToken({ id: user.id });
        const refreshToken = createRefreshToken({ id: user.id });

        setAuthCookies(res, jwtAccessToken, refreshToken);
        return sendClientRedirect(res);
    }

    async logout(req, res) {
        clearAuthCookies(res);

        new OK({
            message: 'Đăng xuất thành công',
            metadata: true,
        }).send(res);
    }

    async authUser(req, res) {
        const currentUser = await prisma.users.findUnique({
            where: {
                id: req.user?.id,
            },
            select: PROFILE_USER_SELECT,
        });

        if (!currentUser) {
            throw new AuthFailureError('Người dùng không tồn tại');
        }

        new OK({
            message: 'Xác thực người dùng thành công',
            metadata: currentUser,
        }).send(res);
    }

    async updateProfile(req, res) {
        const userId = req.user?.id;

        if (!userId) {
            throw new AuthFailureError('Vui lòng đăng nhập');
        }

        const { name, phone, address, latitude, longitude } = req.body;

        const updatedUser = await prisma.users.update({
            where: { id: userId },
            data: {
                name: name.trim(),
                phone: phone?.trim() || null,
                address: address?.trim() || null,
                latitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
                longitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
            },
            select: PROFILE_USER_SELECT,
        });

        if (updatedUser.role === 'admin' && updatedUser.address?.trim()) {
            await upsertPrimaryStoreLocation({
                adminUserId: updatedUser.id,
                name: updatedUser.name,
                phone: updatedUser.phone,
                address: updatedUser.address,
                latitude: updatedUser.latitude,
                longitude: updatedUser.longitude,
            });
        }

        new OK({
            message: 'Cập nhật hồ sơ thành công',
            metadata: updatedUser,
        }).send(res);
    }

    async forgotPassword(req, res) {
        const { email } = req.body;

        const user = await prisma.users.findUnique({
            where: { email },
        });

        if (!user) {
            throw new AuthFailureError('Email không tồn tại');
        }

        const generatedOtp = otp.generate(6, OTP_CONFIG);
        await redisClient.set(`otp:${email}`, generatedOtp, { EX: 300 });

        const token = jwt.sign({ email }, process.env.JWT_SECRET, {
            expiresIn: '5m',
        });

        res.cookie('tokenVerifyForgotPassword', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 5 * 60 * 1000,
        });

        try {
            await sendMailForgotPassword(email, generatedOtp);
        } catch (error) {
            throw new BadGatewayError('Không thể gửi email');
        }

        new OK({
            message: 'Email đặt lại mật khẩu đã được gửi',
        }).send(res);
    }

    async verifyForgotPassword(req, res) {
        const { otp: inputOtp, password } = req.body;
        const token = req.cookies.tokenVerifyForgotPassword;

        if (!token) {
            throw new AuthFailureError('Token xác minh không tồn tại');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const email = decoded.email;
        const storedOtp = await redisClient.get(`otp:${email}`);

        if (!storedOtp) {
            throw new AuthFailureError('OTP đã hết hạn hoặc không tồn tại');
        }

        if (storedOtp !== inputOtp) {
            throw new AuthFailureError('OTP không đúng');
        }

        const user = await prisma.users.findUnique({
            where: { email },
        });

        if (!user) {
            throw new AuthFailureError('Email không tồn tại');
        }

        const isSamePassword = await bcrypt.compare(password, user.password_hash);

        if (isSamePassword) {
            throw new BadRequestError('Mật khẩu mới không được trùng mật khẩu cũ');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.users.update({
            where: { email },
            data: { password_hash: hashedPassword },
        });

        clearAuthCookies(res);
        res.clearCookie('tokenVerifyForgotPassword');
        await redisClient.del(`otp:${email}`);

        new OK({
            message: 'Đổi mật khẩu thành công',
            metadata: true,
        }).send(res);
    }

    async resetPassword(req, res) {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            throw new AuthFailureError('Vui lòng đăng nhập');
        }

        const findUser = await prisma.users.findUnique({
            where: { id: userId },
        });

        if (!findUser) {
            throw new AuthFailureError('Người dùng không tồn tại');
        }

        const isValidOldPassword = await bcrypt.compare(oldPassword, findUser.password_hash);

        if (!isValidOldPassword) {
            throw new BadRequestError('Mật khẩu cũ không chính xác');
        }

        const isSamePassword = await bcrypt.compare(newPassword, findUser.password_hash);

        if (isSamePassword) {
            throw new BadRequestError('Mật khẩu mới không được trùng mật khẩu cũ');
        }

        const generatedOtp = otp.generate(6, OTP_CONFIG);

        try {
            await sendMailForgotPassword(findUser.email, generatedOtp);
        } catch (error) {
            throw new BadGatewayError('Không thể gửi email');
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await redisClient.set(
            `otp:reset-password:${findUser.email}`,
            JSON.stringify({
                otp: generatedOtp,
                newPassword: hashedNewPassword,
            }),
            { EX: 300 },
        );

        new OK({
            message: 'Mã OTP xác nhận đổi mật khẩu đã được gửi đến email của bạn',
            metadata: true,
        }).send(res);
    }

    async verifyResetPassword(req, res) {
        const { otp: inputOtp } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            throw new AuthFailureError('Vui lòng đăng nhập');
        }

        const findUser = await prisma.users.findUnique({
            where: { id: userId },
        });

        if (!findUser) {
            throw new AuthFailureError('Người dùng không tồn tại');
        }

        const storedData = await redisClient.get(`otp:reset-password:${findUser.email}`);

        if (!storedData) {
            throw new AuthFailureError('OTP đã hết hạn hoặc không tồn tại');
        }

        const { otp, newPassword } = JSON.parse(storedData);

        if (otp !== inputOtp) {
            throw new AuthFailureError('OTP không đúng');
        }

        await prisma.users.update({
            where: { id: userId },
            data: { password_hash: newPassword },
        });

        clearAuthCookies(res);
        await redisClient.del(`otp:reset-password:${findUser.email}`);

        new OK({
            message: 'Đổi mật khẩu thành công',
            metadata: true,
        }).send(res);
    }
}

module.exports = new UserController();
