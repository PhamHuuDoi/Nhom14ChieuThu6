'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CreditCard, Home, RefreshCcw, ShoppingCart } from 'lucide-react';

import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import orderService from '@/services/order.service';
import type { Order } from '@/types/api';

function formatCurrency(amount: number) {
    return `${Math.round(amount).toLocaleString('vi-VN')} vnđ`;
}

function parseAmount(value: number | string | null | undefined) {
    return Number(value || 0);
}

function mapPaymentMethod(method?: string | null) {
    if (method === 'cash') return 'Thanh toán khi nhận hàng';
    if (method === 'momo') return 'MoMo';
    if (method === 'vnpay') return 'VNPay';
    if (method === 'zalopay') return 'ZaloPay';
    if (method === 'banking') return 'Chuyển khoản';
    return 'Đang cập nhật';
}

function mapProvider(provider?: string | null) {
    if (provider === 'momo') return 'MoMo';
    if (provider === 'vnpay') return 'VNPay';
    if (provider === 'zalopay') return 'ZaloPay';
    return 'cổng thanh toán';
}

function PaymentFailedContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const provider = searchParams.get('provider');
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const loadOrder = async () => {
            if (!orderId) {
                setErrorMessage('Không tìm thấy mã đơn hàng.');
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const data = await orderService.getOrderById(orderId);
                setOrder(data);
                setErrorMessage('');
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Không thể tải thông tin đơn hàng.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadOrder();
    }, [orderId]);

    const subtotal = useMemo(() => {
        if (!order?.order_items?.length) {
            return 0;
        }

        return order.order_items.reduce((sum, item) => sum + parseAmount(item.subtotal), 0);
    }, [order]);

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="container mx-auto px-4 py-12">
                <div className="mx-auto max-w-3xl">
                    <div className="mb-8 text-center">
                        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                            <AlertTriangle className="h-10 w-10 text-red-600" />
                        </div>
                        <h1 className="mb-2 text-3xl font-bold text-foreground">Thanh toán thất bại</h1>
                        <p className="text-lg text-muted-foreground">
                            Giao dịch qua {mapProvider(provider)} chưa hoàn tất. Đơn hàng vẫn được ghi nhận nhưng thanh toán chưa thành công.
                        </p>
                    </div>

                    <Card className="mb-6 overflow-hidden rounded-3xl border-border">
                        <CardContent className="p-6">
                            {isLoading ? (
                                <p className="text-sm text-muted-foreground">Đang tải thông tin đơn hàng...</p>
                            ) : errorMessage ? (
                                <p className="text-sm text-destructive">{errorMessage}</p>
                            ) : order ? (
                                <>
                                    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
                                            <div className="space-y-1">
                                                <p className="font-semibold text-red-700">Giao dịch chưa hoàn tất</p>
                                                <p className="text-sm text-red-700/90">
                                                    Bạn có thể quay lại giỏ hàng để thử lại, hoặc vào tài khoản để kiểm tra trạng thái đơn hàng.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-6 flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Mã đơn hàng</p>
                                            <p className="text-xl font-bold text-foreground">{order.order_code}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">Phương thức thanh toán</p>
                                            <p className="font-semibold text-foreground">{mapPaymentMethod(order.payment_method)}</p>
                                        </div>
                                    </div>

                                    <Separator className="mb-6" />

                                    <div className="mb-6 space-y-3">
                                        <h3 className="font-semibold text-foreground">Sản phẩm đã đặt</h3>
                                        {(order.order_items || []).map((item) => (
                                            <div key={item.id} className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">
                                                    {item.products?.name || 'Sản phẩm'} x {item.quantity}
                                                </span>
                                                <span className="text-foreground">{formatCurrency(parseAmount(item.subtotal))}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <Separator className="mb-4" />

                                    <div className="mb-6 space-y-2">
                                        <div className="flex justify-between text-sm text-muted-foreground">
                                            <span>Tạm tính</span>
                                            <span>{formatCurrency(subtotal)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-muted-foreground">
                                            <span>Phí giao hàng</span>
                                            <span>{formatCurrency(parseAmount(order.shipping_fee))}</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-bold text-foreground">
                                            <span>Tổng cộng</span>
                                            <span className="text-primary">{formatCurrency(parseAmount(order.total_amount))}</span>
                                        </div>
                                    </div>

                                    <Separator className="mb-6" />

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <p className="mb-1 text-sm text-muted-foreground">Địa chỉ giao hàng</p>
                                            <p className="text-sm text-foreground">{order.shipping_address}</p>
                                        </div>
                                        <div>
                                            <p className="mb-1 text-sm text-muted-foreground">Trạng thái thanh toán</p>
                                            <p className="text-sm font-medium text-red-600">Thanh toán thất bại</p>
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </CardContent>
                    </Card>

                    <div className="flex flex-col justify-center gap-4 sm:flex-row">
                        <Button asChild size="lg">
                            <Link href="/cart">
                                <RefreshCcw className="mr-2 h-4 w-4" />
                                Thử thanh toán lại
                            </Link>
                        </Button>
                        <Button variant="outline" asChild size="lg">
                            <Link href="/profile">
                                <CreditCard className="mr-2 h-4 w-4" />
                                Xem đơn hàng
                            </Link>
                        </Button>
                        <Button variant="secondary" asChild size="lg">
                            <Link href="/">
                                <Home className="mr-2 h-4 w-4" />
                                Về trang chủ
                            </Link>
                        </Button>
                        <Button variant="ghost" asChild size="lg">
                            <Link href="/menu">
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Tiếp tục chọn món
                            </Link>
                        </Button>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default function PaymentFailedPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <PaymentFailedContent />
        </Suspense>
    );
}
