import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function Hero() {
    return (
        <section className="relative min-h-[90vh] overflow-hidden bg-secondary">
            <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
                {/* Content */}
                <div className="relative z-10 flex flex-col items-start gap-6">
                    <span className="inline-block rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
                        Cà Phê Thủ Công Cao Cấp
                    </span>
                    <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl text-balance">
                        Phục Vụ Tốt Nhất <br />
                        <span className="text-accent">Thường Xuyên</span>
                    </h1>
                    <p className="max-w-md text-lg leading-relaxed text-muted-foreground text-pretty">
                        Trải nghiệm cà phê thủ công tinh tế nhất, được chế biến với niềm đam mê. Mỗi ly cà phê kể một
                        câu chuyện về hạt cà phê cao cấp và nghệ thuật rang xay.
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                        <Link href="/menu">
                            <Button size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                                Đặt Hàng Ngay
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="/menu">
                            <Button variant="outline" size="lg" className="border-foreground/20 hover:bg-foreground/5">
                                Xem Menu
                            </Button>
                        </Link>
                    </div>
                    {/* Stats */}
                    <div className="mt-8 flex items-center gap-8 border-t border-border pt-8">
                        <div>
                            <p className="font-serif text-3xl font-bold text-foreground">15+</p>
                            <p className="text-sm text-muted-foreground">Năm Kinh Nghiệm</p>
                        </div>
                        <div className="h-12 w-px bg-border" />
                        <div>
                            <p className="font-serif text-3xl font-bold text-foreground">50k+</p>
                            <p className="text-sm text-muted-foreground">Khách Hàng Hài Lòng</p>
                        </div>
                        <div className="h-12 w-px bg-border" />
                        <div>
                            <p className="font-serif text-3xl font-bold text-foreground">20+</p>
                            <p className="text-sm text-muted-foreground">Loại Cà Phê</p>
                        </div>
                    </div>
                </div>

                {/* Image */}
                <div className="relative flex items-center justify-center lg:justify-end">
                    <div className="relative aspect-square w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl">
                        <Image
                            src="/images/hero-coffee.jpg"
                            alt="Premium artisan coffee cup with steam rising"
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-accent/20" />
                    <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-primary/10" />
                </div>
            </div>
        </section>
    );
}
