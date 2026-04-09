'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Coffee, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import authService from '@/services/auth.service';

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d\S]{8,50}$/;

type RegisterErrors = {
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    form?: string;
};

function getSafeErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message.trim()) {
        return error.message.trim();
    }

    return fallback;
}

export default function RegisterPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { register, refreshUser } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [errors, setErrors] = useState<RegisterErrors>({});

    useEffect(() => {
        setFullName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setErrors({});
    }, []);

    const validateForm = (): RegisterErrors => {
        const nextErrors: RegisterErrors = {};
        const trimmedName = fullName.trim();
        const trimmedEmail = email.trim();

        if (!trimmedName) {
            nextErrors.fullName = 'Vui lòng nhập họ và tên.';
        } else if (trimmedName.length < 2) {
            nextErrors.fullName = 'Họ và tên phải có ít nhất 2 ký tự.';
        }

        if (!trimmedEmail) {
            nextErrors.email = 'Vui lòng nhập email.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            nextErrors.email = 'Email chưa đúng định dạng.';
        }

        if (!password.trim() || !PASSWORD_RULE.test(password)) {
            nextErrors.password = 'invalid';
        }

        if (!confirmPassword.trim()) {
            nextErrors.confirmPassword = 'Vui lòng nhập lại mật khẩu.';
        } else if (password !== confirmPassword) {
            nextErrors.confirmPassword = 'Mật khẩu xác nhận chưa khớp.';
        }

        return nextErrors;
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors({});
        setIsSubmitting(true);

        try {
            await register({
                name: fullName.trim(),
                email: email.trim(),
                password,
            });
            await refreshUser();

            toast({
                title: 'Đăng ký thành công',
                description: 'Tài khoản của bạn đã được tạo.',
            });

            router.push('/');
            router.refresh();
        } catch (error) {
            const message = getSafeErrorMessage(error, 'Không thể tạo tài khoản lúc này.');
            setErrors({ form: message });
            toast({
                title: 'Đăng ký thất bại',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignup = () => {
        setIsGoogleLoading(true);
        authService.loginWithGoogle();
    };

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
                <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
            </div>

            <div className="relative flex flex-1 items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">
                    <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
                        <div className="mb-8 flex flex-col items-center">
                            <Link href="/" className="mb-4 flex items-center gap-2">
                                <Coffee className="h-10 w-10 text-primary" />
                                <span className="font-serif text-2xl font-bold tracking-tight text-foreground">TheZooCoffee</span>
                            </Link>
                            <h1 className="text-xl font-semibold text-foreground">Tạo tài khoản mới</h1>
                            <p className="mt-1 text-center text-sm text-muted-foreground">
                                Đăng ký để đặt hàng nhanh hơn và theo dõi đơn hàng của bạn.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Họ và tên</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="fullName"
                                        name="register_full_name"
                                        type="text"
                                        autoComplete="off"
                                        placeholder="Nguyễn Văn A"
                                        value={fullName}
                                        onChange={(event) => {
                                            setFullName(event.target.value);
                                            setErrors((prev) => ({ ...prev, fullName: undefined, form: undefined }));
                                        }}
                                        className="pl-10"
                                        aria-invalid={Boolean(errors.fullName)}
                                    />
                                </div>
                                {errors.fullName ? <p className="text-sm text-destructive">{errors.fullName}</p> : null}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        name="register_email"
                                        type="email"
                                        autoComplete="off"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        placeholder="ban@example.com"
                                        value={email}
                                        onChange={(event) => {
                                            setEmail(event.target.value);
                                            setErrors((prev) => ({ ...prev, email: undefined, form: undefined }));
                                        }}
                                        className="pl-10"
                                        aria-invalid={Boolean(errors.email)}
                                    />
                                </div>
                                {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Mật khẩu</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        name="register_password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        placeholder="Tạo mật khẩu"
                                        value={password}
                                        onChange={(event) => {
                                            setPassword(event.target.value);
                                            setErrors((prev) => ({ ...prev, password: undefined, form: undefined }));
                                        }}
                                        className="pl-10 pr-10"
                                        aria-invalid={Boolean(errors.password)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((currentValue) => !currentValue)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        <span className="sr-only">{showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}</span>
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground">Mật khẩu cần 8-50 ký tự, có ít nhất 1 chữ và 1 số.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="confirmPassword"
                                        name="register_confirm_password"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        placeholder="Nhập lại mật khẩu"
                                        value={confirmPassword}
                                        onChange={(event) => {
                                            setConfirmPassword(event.target.value);
                                            setErrors((prev) => ({ ...prev, confirmPassword: undefined, form: undefined }));
                                        }}
                                        className="pl-10 pr-10"
                                        aria-invalid={Boolean(errors.confirmPassword)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((currentValue) => !currentValue)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        <span className="sr-only">{showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}</span>
                                    </button>
                                </div>
                                {errors.confirmPassword ? <p className="text-sm text-destructive">{errors.confirmPassword}</p> : null}
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Khi tạo tài khoản, bạn đồng ý với điều khoản sử dụng và chính sách bảo mật của TheZooCoffee.
                            </p>

                            {errors.form ? (
                                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                                    {errors.form.trim() || 'Đã có lỗi xảy ra. Vui lòng thử lại.'}
                                </div>
                            ) : null}

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                                size="lg"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Spinner className="mr-2 h-4 w-4" />
                                        Đang tạo tài khoản...
                                    </>
                                ) : (
                                    'Tạo tài khoản'
                                )}
                            </Button>
                        </form>

                        <div className="my-6 flex items-center gap-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-sm text-muted-foreground">hoặc đăng ký với</span>
                            <div className="h-px flex-1 bg-border" />
                        </div>

                        <Button
                            type="button"
                            onClick={handleGoogleSignup}
                            disabled={isGoogleLoading}
                            variant="outline"
                            className="w-full gap-2"
                            size="lg"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            {isGoogleLoading ? 'Đang chuyển đến Google...' : 'Tiếp tục với Google'}
                        </Button>

                        <p className="mt-6 text-center text-sm text-muted-foreground">
                            Đã có tài khoản?{' '}
                            <Link href="/login" className="font-medium text-primary transition-colors hover:text-primary/80">
                                Đăng nhập
                            </Link>
                        </p>
                    </div>

                    <div className="mt-6 text-center">
                        <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                            Về trang chủ
                        </Link>
                    </div>
                </div>
            </div>
            <Toaster />
        </div>
    );
}
