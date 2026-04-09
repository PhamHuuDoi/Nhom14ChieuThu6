
'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Banknote, Building2, Check, CreditCard, MapPin, Smartphone, type LucideIcon } from 'lucide-react';

import { Footer } from '@/components/footer';
import { LocationSearch } from '@/components/location-search';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { Toaster } from '@/components/ui/toaster';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import { type OpenStreetMapLocationSelection } from '@/lib/openstreetmap';
import couponService from '@/services/coupon.service';
import orderService from '@/services/order.service';
import paymentService from '@/services/payment.service';
import shippingService from '@/services/shipping.service';
import type { Coupon, PaymentMethod } from '@/types/api';

interface PaymentOption {
    id: PaymentMethod;
    name: string;
    description: string;
    icon: LucideIcon;
}

type DeliveryMode = 'account' | 'other';

type CheckoutAddress = {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    latitude: number;
    longitude: number;
};

const paymentMethods: PaymentOption[] = [
    { id: 'cod', name: 'Thanh toán khi nhận hàng', description: 'Thanh toán trực tiếp khi nhận đơn.', icon: Banknote },
    { id: 'vnpay', name: 'VNPay', description: 'Thanh toán qua cổng VNPay.', icon: Building2 },
    { id: 'momo', name: 'MoMo', description: 'Thanh toán qua ví MoMo.', icon: Smartphone },
    { id: 'zalopay', name: 'ZaloPay', description: 'Thanh toán qua ví ZaloPay.', icon: CreditCard },
];

const formatCurrency = (amount: number) => `${Math.round(amount).toLocaleString('vi-VN')} vnđ`;

function isAddressComplete(address: CheckoutAddress) {
    return Boolean(
        address.fullName.trim() &&
            address.phone.trim() &&
            address.email.trim() &&
            address.address.trim() &&
            address.latitude &&
            address.longitude,
    );
}

export default function CheckoutPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const { items: cartItems, clearCart } = useCart();

    const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cod');
    const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('account');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showProcessingModal, setShowProcessingModal] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [shippingFee, setShippingFee] = useState<number | null>(null);
    const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
    const [note, setNote] = useState('');
    const [otherAddress, setOtherAddress] = useState<CheckoutAddress>({
        fullName: '',
        phone: '',
        email: '',
        address: '',
        latitude: 0,
        longitude: 0,
    });

    const orderItems = useMemo(
        () =>
            cartItems.map((item) => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image,
            })),
        [cartItems],
    );

    const subtotal = useMemo(
        () => orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        [orderItems],
    );

    const accountAddress = useMemo<CheckoutAddress>(
        () => ({
            fullName: currentUser?.name || '',
            phone: currentUser?.phone || '',
            email: currentUser?.email || '',
            address: currentUser?.address || '',
            latitude: Number(currentUser?.latitude || 0),
            longitude: Number(currentUser?.longitude || 0),
        }),
        [currentUser],
    );

    useEffect(() => {
        setOtherAddress({
            fullName: currentUser?.name || '',
            phone: currentUser?.phone || '',
            email: currentUser?.email || '',
            address: '',
            latitude: 0,
            longitude: 0,
        });
    }, [currentUser]);

    const selectedAddress = deliveryMode === 'account' ? accountAddress : otherAddress;
    const total = Math.max(0, subtotal - discountAmount) + (shippingFee ?? 0);
    const isShippingInfoComplete = isAddressComplete(selectedAddress);

    const checkoutBlockReason = !currentUser
        ? 'Bạn cần đăng nhập trước khi đặt hàng.'
        : !isShippingInfoComplete
          ? 'Bạn cần điền đủ thông tin người nhận và chọn địa chỉ có tọa độ trước khi đặt hàng.'
          : isCalculatingShipping
            ? 'Hệ thống đang tính phí giao hàng theo khoảng cách.'
            : shippingFee === null
              ? 'Chưa lấy được phí giao hàng. Vui lòng thử lại sau.'
              : '';

    useEffect(() => {
        if (!selectedAddress.latitude || !selectedAddress.longitude || orderItems.length === 0) {
            setShippingFee(null);
            setIsCalculatingShipping(false);
            return;
        }

        let active = true;
        setIsCalculatingShipping(true);

        shippingService
            .getFee({
                customerLatitude: Number(selectedAddress.latitude),
                customerLongitude: Number(selectedAddress.longitude),
            })
            .then((quote) => {
                if (active) {
                    setShippingFee(quote.shippingFee);
                }
            })
            .catch(() => {
                if (active) {
                    setShippingFee(null);
                }
            })
            .finally(() => {
                if (active) {
                    setIsCalculatingShipping(false);
                }
            });

        return () => {
            active = false;
        };
    }, [orderItems.length, selectedAddress.latitude, selectedAddress.longitude]);

    const handleOtherAddressChange = (field: keyof CheckoutAddress, value: string) => {
        setOtherAddress((current) => ({ ...current, [field]: value }));
    };

    const handleOtherAddressSelect = (place: OpenStreetMapLocationSelection) => {
        setOtherAddress((current) => ({
            ...current,
            address: place.addressLine || place.formattedAddress,
            latitude: Number(place.latitude || 0),
            longitude: Number(place.longitude || 0),
        }));
    };
    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;

        if (appliedCoupon?.code === couponCode.trim()) {
            toast({
                title: 'Mã đã được áp dụng',
                description: `Mã ${appliedCoupon.code} đang được sử dụng cho đơn hàng này.`,
            });
            return;
        }

        setIsApplyingCoupon(true);
        try {
            const result = await couponService.validate(couponCode.trim(), subtotal);
            setAppliedCoupon(result.coupon);
            setDiscountAmount(result.discountAmount);
            setCouponCode(result.coupon.code);
            toast({ title: 'Áp dụng thành công', description: `Mã ${result.coupon.code} đã được áp dụng cho đơn hàng.` });
        } catch (error) {
            setAppliedCoupon(null);
            setDiscountAmount(0);
            toast({
                title: 'Không áp dụng được mã',
                description: error instanceof Error ? error.message : 'Vui lòng thử lại.',
                variant: 'destructive',
            });
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    const handlePlaceOrder = async () => {
        setSubmitError('');

        if (!currentUser || !isShippingInfoComplete || shippingFee === null) {
            setSubmitError(checkoutBlockReason || 'Không thể đặt hàng. Vui lòng kiểm tra lại thông tin.');
            return;
        }

        if (orderItems.length === 0) {
            setSubmitError('Giỏ hàng đang trống. Vui lòng thêm sản phẩm trước khi đặt hàng.');
            return;
        }

        setIsProcessing(true);
        let placedOrderResponse = null;

        try {
            placedOrderResponse = await orderService.checkout({
                shippingInfo: {
                    fullName: selectedAddress.fullName,
                    phone: selectedAddress.phone,
                    email: selectedAddress.email,
                    address: selectedAddress.address,
                    latitude: selectedAddress.latitude || undefined,
                    longitude: selectedAddress.longitude || undefined,
                    note: note.trim() || undefined,
                },
                paymentMethod: selectedPayment,
                items: orderItems.map((item) => ({ productId: Number(item.id), quantity: item.quantity })),
                couponCode: appliedCoupon?.code || undefined,
            });

            if (selectedPayment === 'cod') {
                await clearCart();
                toast({ title: 'Đặt hàng thành công', description: 'Đơn hàng của bạn đã được tạo.' });
                router.push(`/checkout/success?orderId=${placedOrderResponse.id}`);
                return;
            }

            setShowProcessingModal(true);
            const paymentResponse = await paymentService.initiate(
                placedOrderResponse.id,
                selectedPayment as Exclude<PaymentMethod, 'cod'>,
            );

            if (paymentResponse.paymentUrl) {
                window.location.href = paymentResponse.paymentUrl;
                return;
            }

            throw new Error('Không tạo được liên kết thanh toán. Vui lòng thử lại.');
        } catch (error) {
            setShowProcessingModal(false);

            if (placedOrderResponse) {
                await clearCart();
                toast({
                    title: 'Đơn hàng đã được tạo',
                    description: 'Đơn hàng đã được tạo nhưng chưa khởi tạo được thanh toán online. Bạn có thể vào mục đơn hàng trong tài khoản để thanh toán lại.',
                });
                router.push('/profile');
                return;
            }

            const errorMessage = error instanceof Error && error.message.trim() ? error.message : 'Không thể đặt hàng. Vui lòng thử lại.';
            setSubmitError(errorMessage);
            toast({ title: 'Đặt hàng thất bại', description: errorMessage, variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
                <div className="mb-10">
                    <Link href="/cart" className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                        Quay lại giỏ hàng
                    </Link>
                    <h1 className="mt-6 font-serif text-4xl font-bold text-foreground md:text-5xl">Thanh toán</h1>
                </div>

                <div className="grid gap-10 lg:grid-cols-3">
                    <div className="space-y-8 lg:col-span-2">
                        <Card className="rounded-2xl border border-border bg-card">
                            <CardContent className="space-y-4 p-6">
                                <h2 className="font-serif text-2xl font-semibold text-card-foreground">Thông tin giao hàng</h2>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <button type="button" onClick={() => setDeliveryMode('account')} className={`rounded-2xl border p-4 text-left transition ${deliveryMode === 'account' ? 'border-primary bg-primary/5' : 'border-border/60 bg-muted/20 hover:border-primary/40'}`}>
                                        <p className="font-medium text-foreground">Giao đến địa chỉ tài khoản</p>
                                        <p className="mt-1 text-sm text-muted-foreground">Dùng đúng thông tin và vị trí đang lưu trong tài khoản.</p>
                                    </button>
                                    <button type="button" onClick={() => setDeliveryMode('other')} className={`rounded-2xl border p-4 text-left transition ${deliveryMode === 'other' ? 'border-primary bg-primary/5' : 'border-border/60 bg-muted/20 hover:border-primary/40'}`}>
                                        <p className="font-medium text-foreground">Giao đến địa chỉ khác</p>
                                        <p className="mt-1 text-sm text-muted-foreground">Nhập người nhận khác hoặc chọn một địa chỉ giao mới ngay tại đây.</p>
                                    </button>
                                </div>

                                {deliveryMode === 'account' ? (
                                    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
                                        <p className="font-medium text-foreground">Giao đến địa chỉ tài khoản</p>
                                        <p className="mt-2 text-foreground">{accountAddress.fullName}</p>
                                        <p className="text-muted-foreground">{accountAddress.phone} - {accountAddress.email}</p>
                                        <p className="mt-2 text-foreground">{accountAddress.address || 'Chưa cập nhật địa chỉ'}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2"><Label htmlFor="otherFullName">Người nhận</Label><Input id="otherFullName" value={otherAddress.fullName} onChange={(event) => handleOtherAddressChange('fullName', event.target.value)} /></div>
                                            <div className="space-y-2"><Label htmlFor="otherPhone">Số điện thoại</Label><Input id="otherPhone" value={otherAddress.phone} onChange={(event) => handleOtherAddressChange('phone', event.target.value)} /></div>
                                            <div className="space-y-2 sm:col-span-2"><Label htmlFor="otherEmail">Email</Label><Input id="otherEmail" type="email" value={otherAddress.email} onChange={(event) => handleOtherAddressChange('email', event.target.value)} /></div>
                                        </div>

                                        <LocationSearch label="Chọn địa chỉ giao hàng khác" placeholder="Nhập tên đường, tòa nhà, địa chỉ..." onSelect={handleOtherAddressSelect} />

                                        <div className="rounded-2xl border border-border/60 bg-background p-4 text-sm">
                                            <div className="flex items-start gap-3">
                                                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                                                <div>
                                                    <p className="font-medium text-foreground">Địa chỉ đang chọn</p>
                                                    <p className="mt-1 text-foreground">{otherAddress.address || 'Chưa chọn địa điểm'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-2xl border border-border/60 bg-[linear-gradient(135deg,rgba(109,63,31,0.08),rgba(168,107,59,0.12))] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                Phí giao hàng
                                            </p>
                                        </div>
                                        <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                                            Ước tính hiện tại
                                        </span>
                                    </div>
                                    <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                                        {isCalculatingShipping
                                            ? 'Đang tính...'
                                            : shippingFee !== null
                                              ? formatCurrency(shippingFee)
                                              : '--'}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        {isCalculatingShipping
                                            ? 'Hệ thống đang tính phí từ vị trí cửa hàng đến địa chỉ giao hàng bạn đã chọn.'
                                            : shippingFee !== null
                                              ? 'Mức phí này được tính tự động từ khoảng cách giao hàng hiện tại.'
                                              : 'Chọn địa chỉ giao hàng có tọa độ để hệ thống tính phí chính xác hơn.'}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="note">Ghi chú</Label>
                                    <Textarea id="note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-2xl border border-border bg-card">
                            <CardContent className="p-6">
                                <h2 className="mb-6 font-serif text-2xl font-semibold text-card-foreground">Phương thức thanh toán</h2>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {paymentMethods.map((method) => {
                                        const Icon = method.icon;
                                        return (
                                            <button key={method.id} type="button" onClick={() => setSelectedPayment(method.id)} className={`relative rounded-xl border-2 p-4 text-left transition-all ${selectedPayment === method.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/40 hover:bg-muted/40'}`}>
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary"><Icon className="h-5 w-5 text-primary" /></div>
                                                    <div><p className="font-semibold text-foreground">{method.name}</p><p className="text-sm text-muted-foreground">{method.description}</p></div>
                                                </div>
                                                {selectedPayment === method.id ? <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary"><Check className="h-3 w-3 text-primary-foreground" /></div> : null}
                                            </button>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl border border-border bg-card">
                            <CardContent className="p-6">
                                <h2 className="mb-4 font-serif text-2xl font-semibold text-card-foreground">Mã giảm giá</h2>
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <div className="flex-1 space-y-2">
                                        <Input
                                            value={couponCode}
                                            onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                                            placeholder="Nhập mã coupon"
                                        />
                                        {appliedCoupon ? (
                                            <p className="text-sm font-medium text-[rgb(46,125,91)]">
                                                Mã {appliedCoupon.code} đang được áp dụng cho đơn hàng.
                                            </p>
                                        ) : null}
                                    </div>
                                    <Button type="button" onClick={handleApplyCoupon} disabled={isApplyingCoupon}>
                                        {isApplyingCoupon ? 'Đang áp dụng...' : appliedCoupon?.code === couponCode.trim() ? 'Đã áp dụng' : 'Áp dụng'}
                                    </Button>
                                </div>
                                {appliedCoupon ? (
                                    <div className="mt-4 rounded-2xl border border-[rgba(46,125,91,0.18)] bg-[rgba(46,125,91,0.08)] p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-foreground">{appliedCoupon.code}</p>
                                                <p className="text-sm text-muted-foreground">{appliedCoupon.name} - giảm {formatCurrency(discountAmount)}</p>
                                            </div>
                                            <Button type="button" variant="outline" onClick={() => { setCouponCode(''); setAppliedCoupon(null); setDiscountAmount(0); }}>Bỏ mã</Button>
                                        </div>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    </div>

                    <div>
                        <div className="sticky top-24 rounded-2xl border border-border bg-card p-6">
                            <h2 className="mb-6 font-serif text-xl font-semibold text-card-foreground">Tóm tắt đơn hàng</h2>
                            {orderItems.length === 0 ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">Giỏ hàng của bạn đang trống.</p>
                                    <Button asChild className="w-full"><Link href="/menu">Xem thực đơn</Link></Button>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        {orderItems.map((item) => (
                                            <div key={item.id} className="flex gap-3">
                                                <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-muted"><Image src={item.image} alt={item.name} fill className="object-cover" /></div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium text-foreground">{item.name}</p>
                                                    <p className="text-sm text-muted-foreground">Số lượng: {item.quantity}</p>
                                                    <p className="font-semibold text-primary">{formatCurrency(item.price * item.quantity)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Separator className="my-6" />
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between text-muted-foreground"><span>Tạm tính</span><span>{formatCurrency(subtotal)}</span></div>
                                        <div className="flex justify-between text-muted-foreground"><span>Phí giao hàng</span><span>{isCalculatingShipping ? 'Đang tính...' : shippingFee !== null ? formatCurrency(shippingFee) : '--'}</span></div>
                                        <div className="flex justify-between text-muted-foreground"><span>Giảm giá</span><span>-{formatCurrency(discountAmount)}</span></div>
                                    </div>
                                    <Separator className="my-6" />
                                    <div className="flex justify-between text-lg font-bold text-foreground"><span>Tổng cộng</span><span>{formatCurrency(total)}</span></div>
                                    {submitError ? <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{submitError}</div> : null}
                                    <Button size="lg" onClick={handlePlaceOrder} disabled={isProcessing || isCalculatingShipping} className="mt-6 w-full gap-2">
                                        {isProcessing ? <><Spinner className="h-4 w-4" />Đang xử lý...</> : <>Đặt hàng<ArrowRight className="h-4 w-4" /></>}
                                    </Button>
                                    {checkoutBlockReason ? <p className="mt-3 text-sm text-muted-foreground">{checkoutBlockReason}</p> : null}
                                    <Button variant="outline" asChild className="mt-3 w-full"><Link href="/cart">Quay lại giỏ hàng</Link></Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />

            <Dialog open={showProcessingModal} onOpenChange={setShowProcessingModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center">Đang xử lý thanh toán</DialogTitle>
                        <DialogDescription className="text-center">Đang kết nối tới {paymentMethods.find((method) => method.id === selectedPayment)?.name ?? 'cổng thanh toán'}...</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center py-8">
                        <Spinner className="h-12 w-12 text-primary" />
                        <p className="mt-4 text-sm text-muted-foreground">Vui lòng chờ trong giây lát để hệ thống chuyển bạn đến cổng thanh toán.</p>
                    </div>
                </DialogContent>
            </Dialog>

            <Toaster />
        </div>
    );
}
