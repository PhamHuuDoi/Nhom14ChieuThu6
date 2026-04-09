import Link from 'next/link';
import { Coffee, Instagram, Facebook, Twitter } from 'lucide-react';

import { Button } from '@/components/ui/button';

const footerLinks = {
    company: [
        { label: 'Về chúng tôi', href: '/' },
        { label: 'Câu chuyện thương hiệu', href: '/' },
        { label: 'Tuyển dụng', href: '/' },
        { label: 'Liên hệ', href: '/' },
    ],
    menu: [
        { label: 'Cà phê', href: '/menu' },
        { label: 'Trà', href: '/menu' },
        { label: 'Bánh ngọt', href: '/menu' },
        { label: 'Đồ uống theo mùa', href: '/menu' },
    ],
    support: [
        { label: 'Câu hỏi thường gặp', href: '/profile' },
        { label: 'Theo dõi đơn hàng', href: '/profile' },
        { label: 'Chính sách thanh toán', href: '/' },
        { label: 'Chính sách bảo mật', href: '/' },
    ],
};

export function Footer() {
    return (
        <footer className="border-t border-border bg-card">
            <div className="border-b border-border">
                <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-12 text-center lg:flex-row lg:justify-between lg:px-8 lg:text-left">
                    <div>
                        <h3 className="font-serif text-2xl font-bold text-card-foreground">Nhận tin mới từ TheZooCoffee</h3>
                        <p className="mt-2 text-muted-foreground">
                            Đăng ký để nhận ưu đãi mới, món mới và những câu chuyện thú vị về cà phê.
                        </p>
                    </div>
                    <div className="flex w-full max-w-md gap-3">
                        <input
                            type="email"
                            placeholder="Nhập địa chỉ email của bạn"
                            className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Đăng ký</Button>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="lg:col-span-2">
                        <Link href="/" className="flex items-center gap-2">
                            <Coffee className="h-8 w-8 text-primary" />
                            <span className="font-serif text-xl font-bold text-card-foreground">TheZooCoffee</span>
                        </Link>
                        <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                            Chúng tôi mang đến trải nghiệm đồ uống chỉn chu, ấm áp và dễ quay lại mỗi ngày. Mỗi ly cà
                            phê là một câu chuyện nhỏ được pha bằng sự tử tế.
                        </p>
                        <div className="mt-6 flex items-center gap-4">
                            <Link
                                href="#"
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                            >
                                <Instagram className="h-5 w-5" />
                                <span className="sr-only">Instagram</span>
                            </Link>
                            <Link
                                href="#"
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                            >
                                <Facebook className="h-5 w-5" />
                                <span className="sr-only">Facebook</span>
                            </Link>
                            <Link
                                href="#"
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                            >
                                <Twitter className="h-5 w-5" />
                                <span className="sr-only">Twitter</span>
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-card-foreground">Công ty</h4>
                        <ul className="mt-4 space-y-3">
                            {footerLinks.company.map((link) => (
                                <li key={link.label}>
                                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-card-foreground">Thực đơn</h4>
                        <ul className="mt-4 space-y-3">
                            {footerLinks.menu.map((link) => (
                                <li key={link.label}>
                                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-card-foreground">Hỗ trợ</h4>
                        <ul className="mt-4 space-y-3">
                            {footerLinks.support.map((link) => (
                                <li key={link.label}>
                                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="border-t border-border">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-center text-sm text-muted-foreground lg:flex-row lg:px-8">
                    <p>&copy; {new Date().getFullYear()} TheZooCoffee. Bảo lưu mọi quyền.</p>
                    <div className="flex items-center gap-6">
                        <Link href="/" className="transition-colors hover:text-foreground">
                            Chính sách bảo mật
                        </Link>
                        <Link href="/" className="transition-colors hover:text-foreground">
                            Điều khoản sử dụng
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
