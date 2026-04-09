'use client';
import { ProductCard } from '@/components/product-card';
import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/currency';
import { productService } from '@/services/product.service';
import type { Product } from '@/types/api';

export function FeaturedProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await productService.getAllProducts({ limit: 4 });
                setProducts(response.products || []);
            } catch (error) {
                console.error('Failed to fetch products:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    if (loading) {
        return (
            <section id="menu" className="bg-background py-20 lg:py-28">
                <div className="mx-auto max-w-7xl px-4 lg:px-8">
                    <div className="mb-12 flex flex-col items-center text-center">
                        <span className="mb-4 inline-block text-sm font-medium uppercase tracking-wider text-accent">
                            Menu Của Chúng Tôi
                        </span>
                        <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl text-balance">
                            Đồ Uống Nổi Bật
                        </h2>
                        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
                            Đang tải đồ uống nổi bật của chúng tôi...
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section id="menu" className="bg-background py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
                {/* Header */}
                <div className="mb-12 flex flex-col items-center text-center">
                    <span className="mb-4 inline-block text-sm font-medium uppercase tracking-wider text-accent">
                        Menu Của Chúng Tôi
                    </span>
                    <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl text-balance">
                        Đồ Uống Nổi Bật
                    </h2>
                    <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
                        Khám phá bộ sưu tập đồ uống cà phê thủ công cao cấp của chúng tôi, được làm từ những hạt cà phê
                        tốt nhất trên thế giới.
                    </p>
                </div>

                {/* Products Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {products.map((product) => (
                        <ProductCard
                            key={product.id}
                            id={product.id}
                            name={product.name}
                            description={product.description || ''}
                            price={formatCurrency(product.price)}
                            image={product.image || '/images/store.jpg'}
                            badge={product.is_best_seller ? 'Best Seller' : undefined}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
