'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Bell,
    ChevronDown,
    Coffee,
    LogOut,
    Menu,
    ShoppingCart,
    Trash2,
    User,
    X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import { getClientSocket, SOCKET_EVENTS } from '@/lib/socket';
import notificationService from '@/services/notification.service';
import type { Notification } from '@/types/api';

const CLIENT_NOTIFICATION_REFRESH_INTERVAL_MS = 10000;

const navLinks = [
    { href: '/', label: 'Trang chủ' },
    { href: '/menu', label: 'Thực đơn' },
];

function formatNotificationTime(value?: string) {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function NotificationPanel({
    notifications,
    onMarkAsRead,
    onMarkAllAsRead,
    onDelete,
    onClearAll,
    onOpenOrder,
    onClose,
}: {
    notifications: Notification[];
    onMarkAsRead: (id: number) => void;
    onMarkAllAsRead: () => void;
    onDelete: (id: number) => void;
    onClearAll: () => void;
    onOpenOrder: (notification: Notification) => void;
    onClose: () => void;
}) {
    const [showReadNotifications, setShowReadNotifications] = useState(false);

    const unreadNotifications = notifications.filter((notification) => !notification.is_read);
    const readNotifications = notifications.filter((notification) => notification.is_read);

    const renderNotificationCard = (notification: Notification) => (
        <div
            key={notification.id}
            className={`rounded-2xl border px-4 py-3.5 ${
                notification.is_read ? 'border-border/80 bg-muted/35' : 'border-border bg-card shadow-sm'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        {!notification.is_read ? (
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                        ) : null}
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">
                            {notification.title}
                        </p>
                    </div>
                    <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-muted-foreground">
                        {notification.message}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onDelete(notification.id)}
                    className="shrink-0 rounded-full p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Xóa thông báo"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">
                        {notification.orders?.order_code ?? 'Thông báo hệ thống'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatNotificationTime(notification.created_at)}
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {notification.orders?.id ? (
                        <button
                            type="button"
                            onClick={() => onOpenOrder(notification)}
                            className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
                        >
                            Xem đơn
                        </button>
                    ) : null}

                    {!notification.is_read ? (
                        <button
                            type="button"
                            onClick={() => onMarkAsRead(notification.id)}
                            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                        >
                            Đã đọc
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-full flex-col">
            {/* Header cố định */}
            <div className="shrink-0 border-b border-border px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-base font-semibold text-foreground">Thông báo</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {unreadNotifications.length > 0
                                ? `${unreadNotifications.length} thông báo mới`
                                : 'Không có thông báo mới'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary hover:text-primary"
                        aria-label="Đóng"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                {(unreadNotifications.length > 0 || notifications.length > 0) ? (
                    <div className="mt-3 flex items-center gap-2">
                        {unreadNotifications.length > 0 ? (
                            <button
                                type="button"
                                onClick={onMarkAllAsRead}
                                className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
                            >
                                Đọc tất cả
                            </button>
                        ) : null}
                        {notifications.length > 0 ? (
                            <button
                                type="button"
                                onClick={onClearAll}
                                className="rounded-xl border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
                            >
                                Xóa tất cả
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {/* Nội dung cuộn */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                    {unreadNotifications.length > 0 ? (
                        unreadNotifications.map(renderNotificationCard)
                    ) : (
                        <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-6 text-center text-sm text-muted-foreground">
                            Chưa có thông báo mới.
                        </div>
                    )}

                    {readNotifications.length > 0 ? (
                        <div className="border-t border-border pt-3">
                            <button
                                type="button"
                                onClick={() => setShowReadNotifications((currentValue) => !currentValue)}
                                className="flex w-full items-center justify-between rounded-2xl bg-muted/50 px-4 py-3 text-left transition hover:bg-muted/70"
                            >
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Thông báo đã đọc</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {readNotifications.length} thông báo
                                    </p>
                                </div>
                                <ChevronDown
                                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${showReadNotifications ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {showReadNotifications ? (
                                <div className="mt-2 space-y-2">
                                    {readNotifications.map(renderNotificationCard)}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export function Navbar() {
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { user: currentUser, logout } = useAuth();
    const { totalItems } = useCart();

    const unreadNotifications = useMemo(
        () => notifications.filter((notification) => !notification.is_read),
        [notifications]
    );

    const loadNotifications = useCallback(async () => {
        if (!currentUser) {
            setNotifications([]);
            setNotificationOpen(false);
            return;
        }

        try {
            const data = await notificationService.getMyNotifications();
            setNotifications(data);
        } catch {
            setNotifications([]);
        }
    }, [currentUser]);

    useEffect(() => {
        void loadNotifications();
    }, [loadNotifications]);

    useEffect(() => {
        if (!currentUser) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void loadNotifications();
            }
        };

        const socket = getClientSocket();
        const handleRealtimeNotification = () => {
            void loadNotifications();
        };
        const intervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                void loadNotifications();
            }
        }, CLIENT_NOTIFICATION_REFRESH_INTERVAL_MS);

        socket.connect();
        socket.on(SOCKET_EVENTS.USER_ORDER_STATUS_UPDATED, handleRealtimeNotification);
        socket.on(SOCKET_EVENTS.USER_NOTIFICATION_CREATED, handleRealtimeNotification);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            socket.off(SOCKET_EVENTS.USER_ORDER_STATUS_UPDATED, handleRealtimeNotification);
            socket.off(SOCKET_EVENTS.USER_NOTIFICATION_CREATED, handleRealtimeNotification);
            socket.disconnect();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.clearInterval(intervalId);
        };
    }, [currentUser, loadNotifications]);

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            setMobileMenuOpen(false);
            setNotificationOpen(false);
            router.push('/');
            router.refresh();
        }
    };

    const handleMarkNotificationAsRead = async (notificationId: number) => {
        try {
            const updatedNotification = await notificationService.markAsRead(notificationId);
            setNotifications((currentNotifications) =>
                currentNotifications.map((notification) =>
                    notification.id === updatedNotification.id ? updatedNotification : notification
                )
            );
        } catch {
            // Keep quiet in navbar.
        }
    };

    const handleMarkAllNotificationsAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications((currentNotifications) =>
                currentNotifications.map((notification) =>
                    notification.is_read
                        ? notification
                        : {
                              ...notification,
                              is_read: true,
                              read_at: notification.read_at ?? new Date().toISOString(),
                          }
                )
            );
        } catch {
            // Keep quiet in navbar.
        }
    };

    const handleDeleteNotification = async (notificationId: number) => {
        try {
            await notificationService.deleteNotification(notificationId);
            setNotifications((currentNotifications) =>
                currentNotifications.filter((notification) => notification.id !== notificationId)
            );
        } catch {
            // Keep quiet in navbar.
        }
    };

    const handleClearNotifications = async () => {
        const hasUnreadNotifications = notifications.some((notification) => !notification.is_read);

        if (
            hasUnreadNotifications &&
            !window.confirm('Bạn vẫn còn thông báo chưa đọc. Bạn có chắc muốn xóa tất cả không?')
        ) {
            return;
        }

        try {
            await notificationService.clearNotifications();
            setNotifications([]);
        } catch {
            // Keep quiet in navbar.
        }
    };

    const handleOpenOrderFromNotification = async (notification: Notification) => {
        if (!notification.orders?.id) {
            return;
        }

        if (!notification.is_read) {
            await handleMarkNotificationAsRead(notification.id);
        }

        setNotificationOpen(false);
        setMobileMenuOpen(false);
        router.push('/profile?section=orders&orderId=' + notification.orders.id);
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
                <Link href="/" className="flex items-center gap-2">
                    <Coffee className="h-8 w-8 text-primary" />
                    <span className="font-serif text-xl font-bold tracking-tight text-foreground">TheZooCoffee</span>
                </Link>

                <div className="hidden items-center gap-8 md:flex">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="hidden items-center gap-3 md:flex">
                    {currentUser ? (
                        <>
                            <div className="relative">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setNotificationOpen((currentValue) => !currentValue)}
                                    className="relative text-muted-foreground hover:text-foreground"
                                >
                                    <Bell className="h-5 w-5" />
                                    {unreadNotifications.length > 0 ? (
                                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                                            {unreadNotifications.length > 99 ? '99+' : unreadNotifications.length}
                                        </span>
                                    ) : null}
                                    <span className="sr-only">Thông báo</span>
                                </Button>
                            </div>

                            <Link href="/profile">
                                <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                                    <User className="h-4 w-4" />
                                    {currentUser.name}
                                </Button>
                            </Link>
                            <Button
                                variant="ghost"
                                onClick={handleLogout}
                                className="gap-2 text-muted-foreground hover:text-foreground"
                            >
                                <LogOut className="h-4 w-4" />
                                Đăng xuất
                            </Button>
                        </>
                    ) : (
                        <>
                            <Link href="/login">
                                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                                    Đăng nhập
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button
                                    variant="outline"
                                    className="border-primary/30 text-foreground hover:bg-primary/5"
                                >
                                    Đăng ký
                                </Button>
                            </Link>
                        </>
                    )}

                    <Link href="/cart">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative text-muted-foreground hover:text-foreground"
                        >
                            <ShoppingCart className="h-5 w-5" />
                            {totalItems > 0 ? (
                                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                    {totalItems > 99 ? '99+' : totalItems}
                                </span>
                            ) : null}
                            <span className="sr-only">Giỏ hàng ({totalItems} sản phẩm)</span>
                        </Button>
                    </Link>

                    <Link href="/menu">
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                            Đặt hàng ngay
                        </Button>
                    </Link>
                </div>

                <div className="flex items-center gap-4 md:hidden">
                    {currentUser ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setNotificationOpen((currentValue) => !currentValue)}
                            className="relative text-muted-foreground"
                        >
                            <Bell className="h-5 w-5" />
                            {unreadNotifications.length > 0 ? (
                                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                                    {unreadNotifications.length > 99 ? '99+' : unreadNotifications.length}
                                </span>
                            ) : null}
                            <span className="sr-only">Thông báo</span>
                        </Button>
                    ) : null}

                    <Link href="/cart">
                        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                            <ShoppingCart className="h-5 w-5" />
                            {totalItems > 0 ? (
                                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                    {totalItems > 99 ? '99+' : totalItems}
                                </span>
                            ) : null}
                            <span className="sr-only">Giỏ hàng ({totalItems} sản phẩm)</span>
                        </Button>
                    </Link>

                    <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen((currentValue) => !currentValue)}>
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        <span className="sr-only">Mở menu</span>
                    </Button>
                </div>
            </nav>

            {/* Desktop: overlay + side panel */}
            {notificationOpen && currentUser ? (
                <div
                    className="fixed inset-0 z-50 hidden md:block"
                    onClick={() => setNotificationOpen(false)}
                >
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
                    <aside
                        className="absolute right-4 top-4 flex h-[calc(100vh-2rem)] w-[460px] flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <NotificationPanel
                            notifications={notifications}
                            onMarkAsRead={handleMarkNotificationAsRead}
                            onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                            onDelete={handleDeleteNotification}
                            onClearAll={handleClearNotifications}
                            onOpenOrder={handleOpenOrderFromNotification}
                            onClose={() => setNotificationOpen(false)}
                        />
                    </aside>
                </div>
            ) : null}

            {/* Mobile: bottom sheet */}
            {notificationOpen && currentUser ? (
                <div
                    className="fixed inset-0 z-50 md:hidden"
                    onClick={() => setNotificationOpen(false)}
                >
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
                    <aside
                        className="absolute bottom-0 left-0 right-0 flex max-h-[80vh] flex-col overflow-hidden rounded-t-3xl border-t border-border bg-background shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mx-auto mt-3 h-1 w-12 shrink-0 rounded-full bg-border" />
                        <NotificationPanel
                            notifications={notifications}
                            onMarkAsRead={handleMarkNotificationAsRead}
                            onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                            onDelete={handleDeleteNotification}
                            onClearAll={handleClearNotifications}
                            onOpenOrder={handleOpenOrderFromNotification}
                            onClose={() => setNotificationOpen(false)}
                        />
                    </aside>
                </div>
            ) : null}

            {mobileMenuOpen ? (
                <div className="border-t border-border md:hidden">
                    <div className="space-y-1 px-4 py-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="block rounded-lg px-3 py-2 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}

                        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                            {currentUser ? (
                                <>
                                    <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start gap-2 text-muted-foreground"
                                        >
                                            <User className="h-4 w-4" />
                                            {currentUser.name}
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-2"
                                        onClick={handleLogout}
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Đăng xuất
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                                        <Button variant="outline" className="w-full justify-start gap-2">
                                            <User className="h-4 w-4" />
                                            Đăng nhập
                                        </Button>
                                    </Link>
                                    <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start gap-2 text-muted-foreground"
                                        >
                                            Tạo tài khoản
                                        </Button>
                                    </Link>
                                </>
                            )}

                            <Link href="/menu" onClick={() => setMobileMenuOpen(false)}>
                                <Button className="w-full bg-primary text-primary-foreground">
                                    Đặt hàng ngay
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            ) : null}
        </header>
    );
}
