'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, Shield, Clock, Loader2 } from 'lucide-react';

import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

function PaymentProcessingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Đang kết nối tới cổng thanh toán...');

    useEffect(() => {
        const statusMessages = [
            'Đang kết nối tới cổng thanh toán...',
            'Đang kiểm tra thông tin giao dịch...',
            'Đang chuẩn bị chuyển hướng...',
            'Sắp mở trang thanh toán...',
        ];

        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep += 1;

            if (currentStep < statusMessages.length) {
                setStatus(statusMessages[currentStep]);
                setProgress((currentStep / statusMessages.length) * 100);
            } else {
                setProgress(100);
                clearInterval(interval);

                setTimeout(() => {
                    const redirectUrl = searchParams.get('redirect');
                    const orderId = searchParams.get('orderId');

                    if (redirectUrl) {
                        window.location.href = redirectUrl;
                        return;
                    }

                    router.push(orderId ? `/checkout/success?orderId=${orderId}` : '/checkout/success');
                }, 1000);
            }
        }, 1200);

        return () => clearInterval(interval);
    }, [router, searchParams]);

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
                <div className="mx-auto max-w-2xl">
                    <div className="mb-10 text-center">
                        <h1 className="font-serif text-4xl font-bold text-foreground md:text-5xl">Đang chuyển đến thanh toán</h1>
                        <p className="mt-3 text-lg text-muted-foreground">
                            Vui lòng đợi trong giây lát, hệ thống đang chuẩn bị kết nối an toàn tới nhà cung cấp.
                        </p>
                    </div>

                    <Card className="rounded-2xl border border-border bg-card shadow-sm">
                        <CardContent className="p-8 md:p-10">
                            <div className="mb-8 flex flex-col items-center justify-center text-center">
                                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                                    <CreditCard className="h-10 w-10 animate-pulse text-primary" />
                                </div>

                                <h2 className="font-serif text-2xl font-semibold text-card-foreground">Giao dịch an toàn</h2>

                                <p className="mt-2 text-muted-foreground">Không làm mới hoặc đóng trang này trong lúc đang chuyển hướng.</p>
                            </div>

                            <div className="mb-8">
                                <Progress value={progress} className="h-2 rounded-full" />

                                <div className="mt-4 flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    <span className="text-sm text-muted-foreground">{status}</span>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-secondary p-5">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Shield className="mt-0.5 h-5 w-5 text-primary" />
                                        <div>
                                            <p className="font-medium text-foreground">Kết nối được mã hóa</p>
                                            <p className="text-sm text-muted-foreground">
                                                Mọi dữ liệu thanh toán sẽ được xử lý qua kênh kết nối bảo mật.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Clock className="mt-0.5 h-5 w-5 text-primary" />
                                        <div>
                                            <p className="font-medium text-foreground">Thời gian xử lý ngắn</p>
                                            <p className="text-sm text-muted-foreground">
                                                Thông thường quá trình chuyển hướng chỉ mất vài giây.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 text-center">
                                <span className="text-sm text-muted-foreground">{Math.round(progress)}% hoàn tất</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default function PaymentProcessingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <PaymentProcessingContent />
        </Suspense>
    );
}
