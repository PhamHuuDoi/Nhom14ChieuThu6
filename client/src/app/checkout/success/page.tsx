'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    AlertTriangle,
    CheckCircle2,
    Home,
    Package,
    ShoppingBag,
    ShoppingCart,
    Truck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/context/cart-context';
import orderService from '@/services/order.service';
import type { Order } from '@/types/api';

function formatCurrency(amount: number) {
    return `${Math.round(amount).toLocaleString('vi-VN')} vnđ`;
}

function parseAmount(value: number | string | null | undefined) {
    return Number(value || 0);
}

function estimateDelivery(createdAt?: string) {
    const baseDate = createdAt ? new Date(createdAt) : new Date();
    baseDate.setDate(baseDate.getDate() + 3);
    return baseDate.toLocaleDateString('vi-VN');
}

function mapPaymentStatus(status?: string) {
    if (status === 'paid') return 'Đã thanh toán';
    if (status === 'unpaid') return 'Chưa thanh toán';
    if (status === 'failed') return 'Thanh toán thất bại';
    if (status === 'refunded') return 'Đã hoàn tiền';
    return 'Đang cập nhật';
}

function mapPaymentMethod(method?: string | null) {
    if (method === 'cash') return 'Thanh toán khi nhận hàng';
    if (method === 'momo') return 'MoMo';
    if (method === 'vnpay') return 'VNPay';
    if (method === 'zalopay') return 'ZaloPay';
    if (method === 'banking') return 'Chuyển khoản';
    return 'Đang cập nhật';
}

function OrderSuccessContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const { clearCart } = useCart();
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const hasClearedCartRef = useRef(false);

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

        loadOrder();
    }, [orderId]);

    useEffect(() => {
        if (order?.payment_status !== 'paid' || hasClearedCartRef.current) {
            return;
        }

        hasClearedCartRef.current = true;
        void clearCart();
    }, [clearCart, order?.payment_status]);

    const subtotal = useMemo(() => {
        if (!order?.order_items?.length) {
            return 0;
        }

        return order.order_items.reduce((sum, item) => sum + parseAmount(item.subtotal), 0);
    }, [order]);

    const isPaymentFailed = order?.payment_status === 'failed';

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2">
                            <ShoppingBag className="h-6 w-6 text-primary" />
                            <span className="text-xl font-bold text-foreground">TheZooCoffee</span>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12">
                <div className="mx-auto max-w-3xl">
                    <div className="mb-8 text-center">
                        <div
                            className={`mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full ${
                                isPaymentFailed ? 'bg-red-100' : 'bg-emerald-100'
                            }`}
                        >
                            {isPaymentFailed ? (
                                <AlertTriangle className="h-10 w-10 text-red-600" />
                            ) : (
                                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                            )}
                        </div>
                        <h1 className="mb-2 text-3xl font-bold text-foreground">
                            {isPaymentFailed ? 'Thanh toán thất bại' : 'Đặt hàng thành công'}
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            {isPaymentFailed
                                ? 'Đơn hàng đã được ghi nhận nhưng giao dịch thanh toán chưa hoàn tất. Bạn có thể kiểm tra lại phương thức thanh toán hoặc đặt lại đơn.'
                                : 'Đơn hàng của bạn đã được ghi nhận. Chúng tôi sẽ sớm bắt đầu xử lý.'}
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
                                    {isPaymentFailed ? (
                                        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-red-700">Giao dịch chưa hoàn tất</p>
                                                    <p className="text-sm text-red-700/90">
                                                        Hệ thống chưa ghi nhận thanh toán thành công cho đơn này. Nếu tiền đã bị trừ,
                                                        bạn nên kiểm tra lại lịch sử giao dịch hoặc liên hệ hỗ trợ.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="mb-6 flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Mã đơn hàng</p>
                                            <p className="text-xl font-bold text-foreground">{order.order_code}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">
                                                {isPaymentFailed ? 'Trạng thái giao dịch' : 'Dự kiến giao'}
                                            </p>
                                            <p className="font-semibold text-foreground">
                                                {isPaymentFailed ? mapPaymentStatus(order.payment_status) : estimateDelivery(order.created_at)}
                                            </p>
                                        </div>
                                    </div>

                                    {!isPaymentFailed ? (
                                        <>
                                            <Separator className="mb-6" />

                                            <div className="mb-8 flex items-center justify-between">
                                                <div className="flex flex-col items-center">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                                                        <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                                                    </div>
                                                    <p className="mt-2 text-xs text-muted-foreground">Đã xác nhận</p>
                                                </div>
                                                <div className="mx-2 h-1 flex-1 bg-muted" />
                                                <div className="flex flex-col items-center">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                                        <Package className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                    <p className="mt-2 text-xs text-muted-foreground">Đang chuẩn bị</p>
                                                </div>
                                                <div className="mx-2 h-1 flex-1 bg-muted" />
                                                <div className="flex flex-col items-center">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                                        <Truck className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                    <p className="mt-2 text-xs text-muted-foreground">Đang giao</p>
                                                </div>
                                                <div className="mx-2 h-1 flex-1 bg-muted" />
                                                <div className="flex flex-col items-center">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                                        <Home className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                    <p className="mt-2 text-xs text-muted-foreground">Hoàn tất</p>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <Separator className="mb-6" />
                                    )}

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
                                            <p
                                                className={`text-sm font-medium ${
                                                    isPaymentFailed ? 'text-red-600' : 'text-foreground'
                                                }`}
                                            >
                                                {mapPaymentStatus(order.payment_status)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="mb-1 text-sm text-muted-foreground">Hình thức thanh toán</p>
                                            <p className="text-sm text-foreground">{mapPaymentMethod(order.payment_method)}</p>
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </CardContent>
                    </Card>

                    <div className="flex flex-col justify-center gap-4 sm:flex-row">
                        <Button asChild size="lg">
                            <Link href={isPaymentFailed ? '/checkout' : '/'}>{isPaymentFailed ? 'Thanh toán lại' : 'Về trang chủ'}</Link>
                        </Button>
                        <Button variant="outline" asChild size="lg">
                            <Link href={isPaymentFailed ? '/menu' : '/profile'}>
                                {isPaymentFailed ? 'Tiếp tục chọn món' : 'Xem tài khoản'}
                            </Link>
                        </Button>
                        {isPaymentFailed ? (
                            <Button variant="secondary" asChild size="lg">
                                <Link href="/cart">
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    Xem giỏ hàng
                                </Link>
                            </Button>
                        ) : null}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function OrderSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <OrderSuccessContent />
        </Suspense>
    );
}
