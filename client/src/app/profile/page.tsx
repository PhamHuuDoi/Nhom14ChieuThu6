'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    BadgeCheck,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    LogOut,
    Mail,
    MapPin,
    Phone,
    User,
} from 'lucide-react';

import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LocationSearch } from '@/components/location-search';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getClientSocket, SOCKET_EVENTS } from '@/lib/socket';
import { type OpenStreetMapLocationSelection } from '@/lib/openstreetmap';
import authService from '@/services/auth.service';
import notificationService from '@/services/notification.service';
import orderService from '@/services/order.service';
import type { Notification, Order } from '@/types/api';

const OTP_DURATION_SECONDS = 5 * 60;
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d\S]{8,50}$/;
const USER_NOTIFICATION_REFRESH_INTERVAL_MS = 10000;

function formatCurrency(amount: number | string | null | undefined) {
    const numericAmount = Number(amount ?? 0);
    const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;
    return `${Math.round(safeAmount).toLocaleString('vi-VN')} vnđ`;
}

function mapOrderStatus(status?: string) {
    if (status === 'pending') return 'Chờ xác nhận';
    if (status === 'confirmed') return 'Đã xác nhận';
    if (status === 'preparing') return 'Đang chuẩn bị';
    if (status === 'shipping') return 'Đang giao vận';
    if (status === 'completed') return 'Hoàn thành';
    if (status === 'cancelled') return 'Đã hủy';
    return 'Đang cập nhật';
}

function mapPaymentStatus(status?: string) {
    if (status === 'paid') return 'Đã thanh toán';
    if (status === 'unpaid') return 'Chưa thanh toán';
    if (status === 'failed') return 'Thanh toán thất bại';
    if (status === 'refunded') return 'Đã hoàn tiền';
    return 'Đang cập nhật';
}

const ORDER_GROUPS: Array<{
    key: 'pending' | 'confirmed' | 'preparing' | 'shipping' | 'completed';
    title: string;
    description: string;
}> = [
    {
        key: 'pending',
        title: 'Đơn chờ xác nhận',
        description: 'Các đơn đã gửi và đang chờ cửa hàng xác nhận.',
    },
    {
        key: 'confirmed',
        title: 'Đơn đã xác nhận',
        description: 'Các đơn đã được cửa hàng tiếp nhận.',
    },
    {
        key: 'preparing',
        title: 'Đơn đang chuẩn bị',
        description: 'Các đơn đang được cửa hàng chuẩn bị món.',
    },
    {
        key: 'shipping',
        title: 'Đơn đang vận chuyển',
        description: 'Các đơn đang được giao tới bạn.',
    },
    {
        key: 'completed',
        title: 'Đơn hoàn thành',
        description: 'Các đơn đã hoàn tất sau khi bạn xác nhận đã nhận hàng.',
    },
];

type OrderGroupKey = (typeof ORDER_GROUPS)[number]['key'];

function ProfileField({ icon: Icon, label, value }: { icon: typeof User; label: string; value?: string }) {
    const displayValue = value?.trim() ? value : 'Chưa cập nhật';
    const isLongValue = displayValue.length > 28;

    return (
        <div className="flex min-w-0 w-full overflow-hidden items-start gap-3 rounded-2xl border border-border bg-background p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p
                    className={`font-medium text-foreground ${
                        isLongValue ? 'text-sm leading-6 break-all' : 'text-base break-words'
                    }`}
                >
                    {displayValue}
                </p>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const router = useRouter();
    const { user: currentUser, isLoading, logout, refreshUser, setUser } = useAuth();
    const { toast } = useToast();
    const [activeSection, setActiveSection] = useState<'orders' | 'profile'>('orders');
    const [selectedOrderGroup, setSelectedOrderGroup] = useState<OrderGroupKey>('pending');
    const [orderPage, setOrderPage] = useState(1);
    const [expandedOrderId, setExpandedOrderId] = useState<number | string | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);
    const [confirmingOrderId, setConfirmingOrderId] = useState<number | string | null>(null);
    const [isProfileFormOpen, setIsProfileFormOpen] = useState(false);
    const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
    const [isRequestingOtp, setIsRequestingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [otpRequested, setOtpRequested] = useState(false);
    const [otpTimeLeft, setOtpTimeLeft] = useState(0);
    const [orders, setOrders] = useState<Order[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [selectedGooglePlace, setSelectedGooglePlace] = useState<OpenStreetMapLocationSelection | null>(null);
    const lastNotifiedNotificationId = useRef<number | null>(null);
    const hasSyncedTargetOrderRef = useRef(false);
    const [profileForm, setProfileForm] = useState({ name: '', phone: '', address: '' });
    const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '', otp: '' });
    const [showPasswords, setShowPasswords] = useState({ oldPassword: false, newPassword: false, confirmPassword: false });
    const [targetOrderId, setTargetOrderId] = useState('');
    const ordersPerPage = 4;

    const missingProfileFields = [
        !currentUser?.name?.trim() ? 'Họ và tên' : null,
        !currentUser?.phone?.trim() ? 'Số điện thoại' : null,
        !currentUser?.address?.trim() ? 'Địa chỉ' : null,
        currentUser?.latitude == null || currentUser?.longitude == null ? 'Vị trí trên bản đồ' : null,
    ].filter(Boolean) as string[];

    const currentOrderGroup = ORDER_GROUPS.find((group) => group.key === selectedOrderGroup) || ORDER_GROUPS[0];
    const filteredOrders = orders.filter((order) => order.order_status === currentOrderGroup.key);
    const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage));
    const paginatedOrders = filteredOrders.slice((orderPage - 1) * ordersPerPage, orderPage * ordersPerPage);

    const canResendOtp = otpRequested && otpTimeLeft === 0 && !isRequestingOtp && !isVerifyingOtp;
    const isPhoneInvalid =
        profileForm.phone.trim().length > 0 && !/^(0|\+84)[0-9]{9}$/.test(profileForm.phone.trim());

    const handleGooglePlaceSelect = useCallback((place: OpenStreetMapLocationSelection) => {
        setSelectedGooglePlace(place);
        setProfileForm((prev) => ({
            ...prev,
            address: place.addressLine || place.formattedAddress,
        }));
    }, []);

    useEffect(() => {
        let isMounted = true;
        if (!currentUser && !isLoading) {
            refreshUser().then((user) => {
                if (!user && isMounted) {
                    router.push('/login');
                }
            });
        }
        return () => {
            isMounted = false;
        };
    }, [currentUser, isLoading, refreshUser, router]);

    useEffect(() => {
        if (!currentUser) {
            return;
        }
        setProfileForm({
            name: currentUser.name ?? '',
            phone: currentUser.phone ?? '',
            address: currentUser.address ?? '',
        });
        setSelectedGooglePlace(
            currentUser.address
                ? {
                      placeId: null,
                      formattedAddress: currentUser.address || '',
                      addressLine: currentUser.address || '',
                      provinceName: '',
                      districtName: '',
                      wardName: '',
                      latitude: currentUser.latitude ?? null,
                      longitude: currentUser.longitude ?? null,
                  }
                : null
        );
    }, [currentUser]);

    const loadOrders = useCallback(async () => {
        if (!currentUser) {
            setOrders([]);
            return;
        }

        setIsLoadingOrders(true);
        try {
            const response = await orderService.getOrders();
            setOrders(response.orders ?? []);
        } catch {
            setOrders([]);
        } finally {
            setIsLoadingOrders(false);
        }
    }, [currentUser]);

    useEffect(() => {
        void loadOrders();
    }, [loadOrders]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const section = params.get('section');
        const orderId = params.get('orderId') || '';

        if (section === 'orders' || section === 'profile') {
            setActiveSection(section);
        }

        setTargetOrderId(orderId);
        hasSyncedTargetOrderRef.current = false;
    }, []);

    useEffect(() => {
        if (!targetOrderId || activeSection !== 'orders' || orders.length === 0) {
            return;
        }

        const matchedOrder = orders.find((order) => String(order.id) === String(targetOrderId));
        if (!matchedOrder) {
            return;
        }

        const matchedGroup = ORDER_GROUPS.find((group) => group.key === matchedOrder.order_status);
        if (!hasSyncedTargetOrderRef.current && matchedGroup && selectedOrderGroup !== matchedGroup.key) {
            hasSyncedTargetOrderRef.current = true;
            setSelectedOrderGroup(matchedGroup.key);
            return;
        }

        hasSyncedTargetOrderRef.current = true;
        setExpandedOrderId(matchedOrder.id);

        const element = document.getElementById(`order-card-${matchedOrder.id}`);
        if (!element) {
            return;
        }

        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [activeSection, orders, selectedOrderGroup, targetOrderId]);

    useEffect(() => {
        setOrderPage(1);
        setExpandedOrderId(null);
    }, [selectedOrderGroup]);

    useEffect(() => {
        if (orderPage > totalOrderPages) {
            setOrderPage(totalOrderPages);
        }
    }, [orderPage, totalOrderPages]);

    const loadNotifications = useCallback(async () => {
        if (!currentUser) {
            setNotifications([]);
            return;
        }

        try {
            const data = await notificationService.getMyNotifications();
            setNotifications(data);

            const unreadNotifications = data.filter((notification) => !notification.is_read);
            if (unreadNotifications.length > 0) {
                const latestNotification = unreadNotifications[0];
                if (lastNotifiedNotificationId.current !== latestNotification.id) {
                    lastNotifiedNotificationId.current = latestNotification.id;
                    toast({
                        title: latestNotification.title,
                        description: latestNotification.message,
                    });
                }
            }
        } catch {
            setNotifications([]);
        }
    }, [currentUser, toast]);

    useEffect(() => {
        void loadNotifications();
    }, [loadNotifications]);

    useEffect(() => {
        if (!currentUser) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void loadOrders();
                void loadNotifications();
            }
        };

        const socket = getClientSocket();
        const handleRealtimeUpdate = () => {
            void loadOrders();
            void loadNotifications();
        };
        const intervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                void loadOrders();
                void loadNotifications();
            }
        }, USER_NOTIFICATION_REFRESH_INTERVAL_MS);

        socket.connect();
        socket.on(SOCKET_EVENTS.USER_ORDER_STATUS_UPDATED, handleRealtimeUpdate);
        socket.on(SOCKET_EVENTS.USER_NOTIFICATION_CREATED, handleRealtimeUpdate);

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            socket.off(SOCKET_EVENTS.USER_ORDER_STATUS_UPDATED, handleRealtimeUpdate);
            socket.off(SOCKET_EVENTS.USER_NOTIFICATION_CREATED, handleRealtimeUpdate);
            socket.disconnect();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.clearInterval(intervalId);
        };
    }, [currentUser, loadNotifications, loadOrders]);

    useEffect(() => {
        if (!otpRequested || otpTimeLeft <= 0) {
            return;
        }
        const timer = window.setInterval(() => {
            setOtpTimeLeft((prev) => {
                if (prev <= 1) {
                    window.clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => window.clearInterval(timer);
    }, [otpRequested, otpTimeLeft]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
            router.push('/');
            router.refresh();
        } finally {
            setIsLoggingOut(false);
        }
    };

    const handlePasswordInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setPasswordForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleProfileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setProfileForm((prev) => ({ ...prev, [name]: value }));
    };

    const togglePasswordVisibility = (field: 'oldPassword' | 'newPassword' | 'confirmPassword') => {
        setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    const formatOtpTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const validateNewPassword = () => {
        if (!passwordForm.newPassword.trim()) return 'Vui lòng nhập mật khẩu mới.';
        if (!PASSWORD_RULE.test(passwordForm.newPassword)) {
            return 'Mật khẩu mới phải có từ 8 đến 50 ký tự, gồm cả chữ và số.';
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return 'Mật khẩu xác nhận chưa khớp.';
        }
        return null;
    };

    const validateProfileForm = () => {
        if (!profileForm.name.trim()) return 'Vui lòng nhập họ và tên.';
        if (profileForm.name.trim().length < 2) return 'Họ và tên phải có ít nhất 2 ký tự.';
        if (isPhoneInvalid) {
            return '__phone_invalid__';
        }
        if (profileForm.address.trim() && profileForm.address.trim().length < 5) {
            return 'Địa chỉ cần chi tiết hơn.';
        }
        if (!selectedGooglePlace?.latitude || !selectedGooglePlace?.longitude) {
            return 'Vui lòng chọn địa điểm từ bản đồ để lưu tọa độ giao hàng.';
        }
        return null;
    };

    const handleSaveProfile = async () => {
        const validationError = validateProfileForm();
        if (validationError) {
            if (validationError !== '__phone_invalid__') {
                toast({ title: 'Thông tin chưa hợp lệ', description: validationError, variant: 'destructive' });
            }
            return;
        }
        setIsSavingProfile(true);
        try {
            const updatedUser = await authService.updateProfile({
                name: profileForm.name.trim(),
                phone: profileForm.phone.trim() || undefined,
                address: profileForm.address.trim() || undefined,
                latitude: selectedGooglePlace?.latitude || undefined,
                longitude: selectedGooglePlace?.longitude || undefined,
            });
            setProfileForm({
                name: updatedUser.name ?? '',
                phone: updatedUser.phone ?? '',
                address: updatedUser.address ?? '',
            });
            setUser(updatedUser);
            await refreshUser();
            setIsProfileFormOpen(false);
            toast({ title: 'Cập nhật thành công', description: 'Thông tin tài khoản của bạn đã được lưu.' });
        } catch (error) {
            toast({
                title: 'Không thể cập nhật hồ sơ',
                description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra khi lưu thông tin.',
                variant: 'destructive',
            });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleRequestOtp = async () => {
        if (!passwordForm.oldPassword.trim()) {
            toast({
                title: 'Thiếu mật khẩu hiện tại',
                description: 'Vui lòng nhập mật khẩu hiện tại để tiếp tục.',
                variant: 'destructive',
            });
            return;
        }
        const passwordValidationError = validateNewPassword();
        if (passwordValidationError) {
            toast({ title: 'Mật khẩu mới chưa hợp lệ', description: passwordValidationError, variant: 'destructive' });
            return;
        }
        setIsRequestingOtp(true);
        try {
            await authService.requestPasswordReset({
                oldPassword: passwordForm.oldPassword,
                newPassword: passwordForm.newPassword,
            });
            setOtpRequested(true);
            setOtpTimeLeft(OTP_DURATION_SECONDS);
            toast({ title: 'Đã gửi mã OTP', description: 'Vui lòng kiểm tra email để lấy mã xác thực.' });
        } catch (error) {
            toast({
                title: 'Không thể gửi OTP',
                description: error instanceof Error ? error.message : 'Yêu cầu đổi mật khẩu không thành công.',
                variant: 'destructive',
            });
        } finally {
            setIsRequestingOtp(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!passwordForm.otp.trim()) {
            toast({
                title: 'Thiếu mã OTP',
                description: 'Vui lòng nhập mã OTP đã được gửi tới email của bạn.',
                variant: 'destructive',
            });
            return;
        }
        setIsVerifyingOtp(true);
        try {
            await authService.verifyPasswordReset({ otp: passwordForm.otp.trim() });
            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '', otp: '' });
            setOtpRequested(false);
            setOtpTimeLeft(0);
            setIsPasswordSectionOpen(false);
            toast({
                title: 'Đổi mật khẩu thành công',
                description: 'Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập lại để tiếp tục.',
            });
            setUser(null);
            router.push('/login');
            router.refresh();
        } catch (error) {
            toast({
                title: 'Xác thực OTP thất bại',
                description: error instanceof Error ? error.message : 'Không thể xác thực mã OTP.',
                variant: 'destructive',
            });
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleConfirmReceivedOrder = async (orderId: number | string) => {
        setConfirmingOrderId(orderId);
        try {
            const updatedOrder = await orderService.confirmReceived(String(orderId));
            setOrders((prev) => prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
            toast({
                title: 'Đã xác nhận nhận hàng',
                description: 'Đơn hàng của bạn đã được chuyển sang trạng thái hoàn thành.',
            });
        } catch (error) {
            toast({
                title: 'Không thể xác nhận đơn hàng',
                description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra khi xác nhận nhận hàng.',
                variant: 'destructive',
            });
        } finally {
            setConfirmingOrderId(null);
        }
    };

    const handleMarkNotificationAsRead = async (notificationId: number) => {
        try {
            const updatedNotification = await notificationService.markAsRead(notificationId);
            setNotifications((prev) =>
                prev.map((notification) => (notification.id === updatedNotification.id ? updatedNotification : notification)),
            );
        } catch {
            // Keep the page quiet for this secondary action.
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
                <div className="mb-10">
                    <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                        Về trang chủ
                    </Link>
                    <h1 className="mt-6 font-serif text-4xl font-bold text-foreground md:text-5xl">Tài khoản của tôi</h1>
                    <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
                        Quản lý thông tin cá nhân, địa chỉ giao hàng và trạng thái đơn hàng của bạn.
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-border bg-card">
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <Spinner className="h-5 w-5" />
                            Đang tải thông tin tài khoản...
                        </div>
                    </div>
                ) : currentUser ? (
                    <div className="space-y-8">
                        <Card className="overflow-hidden rounded-3xl border-white/10 bg-[linear-gradient(135deg,rgba(18,18,18,0.98),rgba(63,42,29,0.95))]">
                            <CardHeader className="border-b border-white/10 bg-transparent text-white">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.28em] text-white/60">Account View</p>
                                        <CardTitle className="mt-3 font-serif text-3xl text-white">
                                            {activeSection === 'orders' ? 'Đơn hàng của bạn' : 'Hồ sơ của bạn'}
                                        </CardTitle>
                                        <CardDescription className="mt-2 max-w-2xl text-white/70">
                                            {activeSection === 'orders'
                                                ? 'Đơn mới nhất được đưa lên trên để bạn theo dõi nhanh trạng thái và thanh toán.'
                                                : 'Cập nhật hồ sơ giao hàng, thông tin liên hệ và bảo mật tài khoản ở một nơi.'}
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/85">{orders.length} đơn</div>
                                        <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/85">
                                            {isLoadingOrders ? 'Đang đồng bộ' : 'Đã cập nhật'}
                                        </div>
                                    </div>
                                </div>
                                <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as 'orders' | 'profile')} className="mt-6">
                                    <TabsList className="h-auto rounded-full bg-white/10 p-1">
                                        <TabsTrigger value="orders" className="rounded-full border-0 px-5 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-black">
                                            Đơn hàng
                                        </TabsTrigger>
                                        <TabsTrigger value="profile" className="rounded-full border-0 px-5 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-black">
                                            Hồ sơ
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </CardHeader>
                            <CardContent className="bg-card p-6">
                                {activeSection === 'orders' ? (
                                    isLoadingOrders ? (
                                        <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-5 text-sm text-muted-foreground">
                                            <Spinner className="h-4 w-4" />
                                            Đang tải đơn hàng...
                                        </div>
                                    ) : orders.length > 0 ? (
                                        <div className="space-y-6">
                                            <div className="space-y-4 rounded-2xl border border-border bg-background p-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-foreground">Chọn loại đơn hàng</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        Chọn trạng thái bạn muốn xem, chỉ nhóm đó sẽ được hiển thị.
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {ORDER_GROUPS.map((group) => {
                                                        const groupedCount = orders.filter((order) => order.order_status === group.key).length;
                                                        const isActive = selectedOrderGroup === group.key;

                                                        return (
                                                            <button
                                                                key={group.key}
                                                                type="button"
                                                                onClick={() => setSelectedOrderGroup(group.key)}
                                                                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                                                                    isActive
                                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                                        : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted'
                                                                }`}
                                                            >
                                                                {group.title} ({groupedCount})
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {filteredOrders.length === 0 ? (
                                                <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center">
                                                    <p className="font-medium text-foreground">Chưa có đơn trong nhóm này</p>
                                                    <p className="mt-2 text-sm text-muted-foreground">{currentOrderGroup.description}</p>
                                                </div>
                                            ) : (
                                                <section className="space-y-4">
                                                    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-background px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
                                                        <div>
                                                            <h3 className="text-lg font-semibold text-foreground">{currentOrderGroup.title}</h3>
                                                            <p className="text-sm text-muted-foreground">{currentOrderGroup.description}</p>
                                                        </div>
                                                        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                                                            {filteredOrders.length} đơn
                                                        </span>
                                                    </div>

                                                    <div className="grid gap-4 lg:grid-cols-2">
                                                            {paginatedOrders.map((order, index) => {
                                                                const displayOrderNumber = (orderPage - 1) * ordersPerPage + index + 1;
                                                                const isExpanded = String(expandedOrderId) === String(order.id);

                                                                return (
                                                                <div
                                                                    key={order.id}
                                                                    id={`order-card-${order.id}`}
                                                                    className={`rounded-2xl border p-5 transition-colors hover:border-primary/40 ${String(order.id) === String(targetOrderId) ? 'border-primary ring-2 ring-primary/30' : 'border-border bg-background'}`}
                                                                >
                                                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                                        <div>
                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                                                                    {displayOrderNumber === 1 ? 'Đơn mới nhất' : `Đơn ${displayOrderNumber}`}
                                                                                </span>
                                                                                <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                                                                                    {mapOrderStatus(order.order_status)}
                                                                                </span>
                                                                            </div>
                                                                            <p className="mt-3 font-semibold text-foreground">{order.order_code}</p>
                                                                            <p className="mt-1 text-sm text-muted-foreground">
                                                                                {order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : 'Đang cập nhật thời gian'}
                                                                            </p>
                                                                        </div>
                                                                        <div className="text-sm sm:text-right">
                                                                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tổng thanh toán</p>
                                                                            <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(order.total_amount)}</p>
                                                                            <p className="mt-1 text-muted-foreground">{mapPaymentStatus(order.payment_status)}</p>
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                className="mt-3"
                                                                                onClick={() =>
                                                                                    setExpandedOrderId((current) =>
                                                                                        String(current) === String(order.id) ? null : order.id
                                                                                    )
                                                                                }
                                                                            >
                                                                                {isExpanded ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                    {isExpanded ? (
                                                                    <div className="mt-4 rounded-2xl bg-muted/40 p-4">
                                                                        <p className="text-sm font-medium text-foreground">Địa chỉ giao hàng</p>
                                                                        <p className="mt-1 text-sm text-muted-foreground">{order.shipping_address}</p>
                                                                        <p className="mt-3 text-sm text-muted-foreground">
                                                                            Thanh toán: {order.payment_method ?? order.payment?.method ?? 'Đang cập nhật'}
                                                                        </p>
                                                                        {order.order_status === 'shipping' ? (
                                                                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                                                                <Button
                                                                                    onClick={() => handleConfirmReceivedOrder(order.id)}
                                                                                    disabled={confirmingOrderId === order.id}
                                                                                >
                                                                                    {confirmingOrderId === order.id ? 'Đang xác nhận...' : 'Xác nhận đã nhận hàng'}
                                                                                </Button>
                                                                                <p className="text-sm text-muted-foreground">
                                                                                    Nhấn nút này khi bạn đã nhận được hàng để hoàn tất đơn.
                                                                                </p>
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                    ) : null}
                                                                </div>
                                                            )})}
                                                    </div>

                                                    {totalOrderPages > 1 ? (
                                                        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                                            <p className="text-sm text-muted-foreground">
                                                                Trang {orderPage}/{totalOrderPages}
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    onClick={() => setOrderPage((prev) => Math.max(1, prev - 1))}
                                                                    disabled={orderPage === 1}
                                                                >
                                                                    Trang trước
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    onClick={() => setOrderPage((prev) => Math.min(totalOrderPages, prev + 1))}
                                                                    disabled={orderPage === totalOrderPages}
                                                                >
                                                                    Trang sau
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </section>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center">
                                            <p className="font-medium text-foreground">Bạn chưa có đơn hàng nào</p>
                                            <p className="mt-2 text-sm text-muted-foreground">Khi có đơn mới, phần này sẽ hiển thị như một feed để bạn theo dõi nhanh trạng thái.</p>
                                        </div>
                                    )
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center">
                                        <p className="font-medium text-foreground">Chế độ hồ sơ đang được bật</p>
                                        <p className="mt-2 text-sm text-muted-foreground">Phần thông tin tài khoản và bảo mật hiện ở ngay bên dưới để bạn cập nhật nhanh.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {activeSection === 'profile' ? (
                            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
                                <Card className="min-w-0 rounded-2xl border-border">
                                    <CardHeader>
                                        <CardTitle className="font-serif text-2xl">Thông tin tài khoản</CardTitle>
                                        <CardDescription>Những dữ liệu hiện đang được lưu trên hệ thống.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="flex flex-col gap-4 rounded-2xl bg-secondary/50 p-6 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Đang đăng nhập</p>
                                                <h2 className="mt-2 font-serif text-3xl font-semibold text-foreground">{currentUser.name}</h2>
                                                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 text-sm text-muted-foreground">
                                                    <BadgeCheck className="h-4 w-4 text-primary" />
                                                    Phiên đăng nhập đang hoạt động
                                                </div>
                                            </div>
                                            <Button variant="outline" onClick={handleLogout} disabled={isLoggingOut} className="gap-2">
                                                <LogOut className="h-4 w-4" />
                                                {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                                            </Button>
                                        </div>

                                        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                                            {missingProfileFields.length > 0 ? (
                                                <div className="sm:col-span-2 rounded-xl border border-destructive/50 bg-destructive/5 p-4">
                                                    <p className="font-medium text-destructive">Thông tin còn thiếu</p>
                                                    <p className="mt-1 text-sm text-destructive">
                                                        {missingProfileFields.join(', ')} chưa được cập nhật. Vui lòng bổ sung để thanh toán và tính phí giao hàng ổn định hơn.
                                                    </p>
                                                </div>
                                            ) : null}

                                            <ProfileField icon={User} label="Họ và tên" value={currentUser.name} />
                                            <ProfileField icon={Mail} label="Email" value={currentUser.email} />
                                            <ProfileField icon={Phone} label="Số điện thoại" value={currentUser.phone} />
                                            <ProfileField icon={MapPin} label="Địa chỉ" value={currentUser.address} />
                                        </div>

                                        <Separator />

                                        <div className="space-y-4">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-foreground">Cập nhật hồ sơ</h3>
                                                    <p className="text-sm text-muted-foreground">Chỉnh sửa tên, số điện thoại, địa chỉ và vị trí giao hàng.</p>
                                                </div>
                                                <Button variant={isProfileFormOpen ? 'secondary' : 'outline'} onClick={() => setIsProfileFormOpen((prev) => !prev)}>
                                                    {isProfileFormOpen ? 'Thu gọn' : 'Chỉnh sửa hồ sơ'}
                                                </Button>
                                            </div>

                                            {isProfileFormOpen ? (
                                                <div className="grid gap-4 rounded-2xl border border-border bg-background p-5 sm:grid-cols-2">
                                                    <div className="space-y-2 sm:col-span-2">
                                                        <Label htmlFor="name">Họ và tên</Label>
                                                        <Input id="name" name="name" value={profileForm.name} onChange={handleProfileInputChange} placeholder="Nguyễn Văn A" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="phone">Số điện thoại</Label>
                                                        <Input
                                                            id="phone"
                                                            name="phone"
                                                            value={profileForm.phone}
                                                            onChange={handleProfileInputChange}
                                                            placeholder="0901234567"
                                                            aria-invalid={isPhoneInvalid}
                                                        />
                                                    </div>
                                                    <LocationSearch onSelect={handleGooglePlaceSelect} />
                                                    <div className="space-y-2 sm:col-span-2">
                                                        <Label>Địa chỉ chi tiết</Label>
                                                        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
                                                            {profileForm.address || 'Chưa chọn địa điểm'}
                                                        </div>
                                                    </div>
                                                    {selectedGooglePlace?.formattedAddress ? (
                                                        <div className="space-y-2 sm:col-span-2 rounded-2xl border border-border bg-muted/30 p-4">
                                                            <p className="text-sm font-medium text-foreground">Địa điểm đã chọn</p>
                                                            <p className="text-sm leading-6 text-muted-foreground">{selectedGooglePlace.formattedAddress}</p>
                                                            {selectedGooglePlace.latitude && selectedGooglePlace.longitude ? (
                                                                <p className="text-xs text-muted-foreground">
                                                                    Tọa độ: {selectedGooglePlace.latitude}, {selectedGooglePlace.longitude}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    ) : null}
                                                    <div className="sm:col-span-2 flex justify-end">
                                                        <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="gap-2">
                                                            {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                                            {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-2xl border-border lg:max-w-[420px] lg:justify-self-end">
                                    <CardHeader>
                                        <CardTitle className="font-serif text-2xl">Bảo mật tài khoản</CardTitle>
                                        <CardDescription>Đổi mật khẩu qua OTP để tài khoản an toàn hơn.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="rounded-2xl bg-secondary/40 p-5">
                                            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Mức độ hoàn thiện</p>
                                            <p className="mt-3 text-3xl font-semibold text-foreground">
                                                {missingProfileFields.length === 0 ? '100%' : `${Math.max(40, 100 - missingProfileFields.length * 20)}%`}
                                            </p>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {missingProfileFields.length === 0
                                                    ? 'Hồ sơ của bạn đã sẵn sàng cho thanh toán và giao hàng.'
                                                    : 'Hoàn thiện hồ sơ để phí giao hàng và checkout chạy ổn định hơn.'}
                                            </p>
                                        </div>

                                        <Separator />

                                        <div className="space-y-4">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-foreground">Đổi mật khẩu</h3>
                                                    <p className="text-sm text-muted-foreground">Nhập mật khẩu hiện tại, mật khẩu mới rồi xác thực OTP qua email.</p>
                                                </div>
                                                <Button variant={isPasswordSectionOpen ? 'secondary' : 'outline'} onClick={() => setIsPasswordSectionOpen((prev) => !prev)} className="gap-2">
                                                    <KeyRound className="h-4 w-4" />
                                                    {isPasswordSectionOpen ? 'Thu gọn' : 'Mở đổi mật khẩu'}
                                                </Button>
                                            </div>

                                            {isPasswordSectionOpen ? (
                                                <div className="space-y-4 rounded-2xl border border-border bg-background p-5">
                                                    {[
                                                        { id: 'oldPassword', label: 'Mật khẩu hiện tại', value: passwordForm.oldPassword, visible: showPasswords.oldPassword },
                                                        { id: 'newPassword', label: 'Mật khẩu mới', value: passwordForm.newPassword, visible: showPasswords.newPassword },
                                                        { id: 'confirmPassword', label: 'Xác nhận mật khẩu mới', value: passwordForm.confirmPassword, visible: showPasswords.confirmPassword },
                                                    ].map((field) => (
                                                        <div key={field.id} className="space-y-2">
                                                            <Label htmlFor={field.id}>{field.label}</Label>
                                                            <div className="relative">
                                                                <Input id={field.id} name={field.id} type={field.visible ? 'text' : 'password'} value={field.value} onChange={handlePasswordInputChange} />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => togglePasswordVisibility(field.id as 'oldPassword' | 'newPassword' | 'confirmPassword')}
                                                                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
                                                                >
                                                                    {field.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    <div className="flex flex-wrap gap-3">
                                                        <Button onClick={handleRequestOtp} disabled={isRequestingOtp} className="gap-2">
                                                            {isRequestingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                                            {otpRequested ? 'Gửi lại OTP' : 'Gửi OTP'}
                                                        </Button>
                                                        {otpRequested ? (
                                                            <span className="inline-flex items-center rounded-full bg-secondary px-3 py-2 text-sm text-muted-foreground">
                                                                {otpTimeLeft > 0 ? `OTP hết hạn sau ${formatOtpTime(otpTimeLeft)}` : 'Bạn có thể yêu cầu gửi lại OTP'}
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    {otpRequested ? (
                                                        <div className="space-y-4 rounded-xl border border-dashed border-border p-4">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="otp">Mã OTP</Label>
                                                                <Input id="otp" name="otp" value={passwordForm.otp} onChange={handlePasswordInputChange} placeholder="Nhập mã OTP từ email" />
                                                            </div>
                                                            <div className="flex flex-wrap gap-3">
                                                                <Button onClick={handleVerifyOtp} disabled={isVerifyingOtp} className="gap-2">
                                                                    {isVerifyingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                                                    {isVerifyingOtp ? 'Đang xác thực...' : 'Xác nhận đổi mật khẩu'}
                                                                </Button>
                                                                {canResendOtp ? (
                                                                    <Button variant="outline" onClick={handleRequestOtp} disabled={isRequestingOtp}>
                                                                        Gửi lại OTP
                                                                    </Button>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </div>

                                        <Separator />

                                        <div className="space-y-3">
                                            <Button variant="outline" className="w-full" asChild>
                                                <Link href="/menu">Tiếp tục mua hàng</Link>
                                            </Button>
                                            <Button variant="secondary" className="w-full" asChild>
                                                <Link href="/cart">Xem giỏ hàng</Link>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </main>
            <Footer />
        </div>
    );
}
