'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, ChevronRight, Plus, ShoppingBag, Star, Tag } from 'lucide-react';

import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/cart-context';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { productService } from '@/services/product.service';
import type { Product } from '@/types/api';

export default function ProductDetailPage() {
    const params = useParams<{ id: string }>();
    const productId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const [product, setProduct] = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdded, setIsAdded] = useState(false);
    const { addToCart } = useCart();

    useEffect(() => {
        const loadProduct = async () => {
            if (!productId) {
                setError('Không tìm thấy sản phẩm.');
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const data = await productService.getProductById(productId);
                setProduct(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Không thể tải chi tiết sản phẩm.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadProduct();
    }, [productId]);

    useEffect(() => {
        const loadRelatedProducts = async () => {
            if (!product?.categories?.name || !productId) {
                setRelatedProducts([]);
                return;
            }

            try {
                const response = await productService.getProductsByCategory(product.categories.name, {
                    limit: 8,
                });

                setRelatedProducts(
                    (response.products || []).filter((item) => String(item.id) !== String(productId)).slice(0, 4)
                );
            } catch {
                setRelatedProducts([]);
            }
        };

        void loadRelatedProducts();
    }, [product?.categories?.name, productId]);

    const detailDescription = useMemo(() => {
        if (!product?.description?.trim()) {
            return 'Sản phẩm hiện chưa có mô tả chi tiết.';
        }

        return product.description;
    }, [product?.description]);

    const handleAddToCart = async () => {
        if (!product) {
            return;
        }

        try {
            await addToCart({
                id: Number(product.id),
                name: product.name,
                description: product.description || '',
                price: Number(product.price || 0),
                image: product.image || '/images/store.jpg',
            });

            setIsAdded(true);
            toast({
                title: 'Đã thêm vào giỏ hàng',
                description: `${product.name} đã được thêm vào giỏ hàng của bạn.`,
            });

            window.setTimeout(() => setIsAdded(false), 1500);
        } catch (err) {
            toast({
                title: 'Không thể thêm vào giỏ',
                description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
                <Link
                    href="/menu"
                    className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại thực đơn
                </Link>

                {isLoading ? (
                    <div className="py-20 text-center text-muted-foreground">Đang tải chi tiết sản phẩm...</div>
                ) : null}

                {!isLoading && error ? (
                    <div className="mt-6 rounded-3xl border border-destructive/20 bg-destructive/5 px-6 py-8 text-center text-sm text-destructive">
                        {error}
                    </div>
                ) : null}

                {!isLoading && product ? (
                    <>
                        <section className="mt-6 grid gap-8 rounded-[32px] border border-border bg-card p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.92fr)] lg:p-8">
                            <div className="relative aspect-square overflow-hidden rounded-[28px] bg-muted">
                                <Image
                                    src={product.image || '/images/store.jpg'}
                                    alt={product.name}
                                    fill
                                    priority
                                    className="object-cover"
                                />
                            </div>

                            <div className="flex flex-col">
                                <div className="flex flex-wrap items-center gap-2">
                                    {product.categories?.name ? (
                                        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                                            <Tag className="mr-1 inline h-3.5 w-3.5" />
                                            {product.categories.name}
                                        </span>
                                    ) : null}

                                    {product.is_best_seller ? (
                                        <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                                            <Star className="mr-1 inline h-3.5 w-3.5" />
                                            Được chọn nhiều
                                        </span>
                                    ) : null}
                                </div>

                                <h1 className="mt-4 font-serif text-4xl font-bold text-foreground">
                                    {product.name}
                                </h1>

                                <p className="mt-4 text-3xl font-bold text-primary">
                                    {formatCurrency(product.price)}
                                </p>

                                <div className="mt-6 rounded-3xl bg-secondary/50 p-5">
                                    <p className="text-sm font-semibold text-foreground">Chi tiết sản phẩm</p>
                                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                                        {detailDescription}
                                    </p>
                                </div>

                                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-border bg-background px-4 py-4">
                                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                            Lượt chọn
                                        </p>
                                        <p className="mt-2 text-lg font-semibold text-foreground">
                                            {product.sold_count || 0} lần
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-border bg-background px-4 py-4">
                                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                            Trạng thái
                                        </p>
                                        <p className="mt-2 text-lg font-semibold text-foreground">Đang phục vụ</p>
                                    </div>
                                </div>

                                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                    <Button
                                        onClick={handleAddToCart}
                                        className={`h-12 flex-1 gap-2 ${
                                            isAdded
                                                ? 'bg-green-600 text-white hover:bg-green-600'
                                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                        }`}
                                    >
                                        {isAdded ? (
                                            <>
                                                <Check className="h-4 w-4" />
                                                Đã thêm vào giỏ
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4" />
                                                Thêm vào giỏ hàng
                                            </>
                                        )}
                                    </Button>

                                    <Button asChild variant="outline" className="h-12 flex-1 gap-2">
                                        <Link href="/cart">
                                            <ShoppingBag className="h-4 w-4" />
                                            Xem giỏ hàng
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </section>

                        {relatedProducts.length > 0 ? (
                            <section className="mt-10">
                                <div className="mb-5 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                                            Gợi ý thêm
                                        </p>
                                        <h2 className="mt-2 font-serif text-2xl font-bold text-foreground">
                                            Món cùng danh mục
                                        </h2>
                                    </div>
                                    {product.categories?.name ? (
                                        <Link
                                            href="/menu"
                                            className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:gap-2"
                                        >
                                            Xem thêm
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    ) : null}
                                </div>

                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                                    {relatedProducts.map((item, index) => (
                                        <ProductCard
                                            key={item.id}
                                            id={Number(item.id)}
                                            name={item.name}
                                            description={item.description || ''}
                                            price={formatCurrency(item.price)}
                                            image={item.image || '/images/store.jpg'}
                                            badge={item.is_best_seller ? 'Được chọn nhiều' : undefined}
                                            priority={index < 2}
                                        />
                                    ))}
                                </div>
                            </section>
                        ) : null}
                    </>
                ) : null}
            </main>

            <Footer />
        </div>
    );
}
