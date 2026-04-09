import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { CartProvider } from '@/context/cart-context';
import { AuthProvider } from '@/context/auth-context';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const playfair = Playfair_Display({
    subsets: ['latin'],
    variable: '--font-serif',
    display: 'swap',
});

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'TheZooCoffee | Cà Phê Thủ Công Cao Cấp',
    description:
        'Trải nghiệm cà phê thủ công tinh tế nhất tại TheZooCoffee. Đồ uống được chế biến thủ công, hạt cà phê cao cấp và không gian ấm cúng.',
    generator: 'Next.js',
    icons: {
        icon: '/placeholder-logo.svg',
        apple: '/placeholder-logo.png',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="vi">
            <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
                <AuthProvider>
                    <CartProvider>
                        {children}
                        <Toaster />
                    </CartProvider>
                </AuthProvider>
                <Analytics />
            </body>
        </html>
    );
}
