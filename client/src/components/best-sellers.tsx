'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, Plus, Star } from 'lucide-react';

import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { productService } from '@/services/product.service';
import { useCart } from '@/context/cart-context';
import { toast } from '@/hooks/use-toast';
import type { Product } from '@/types/api';

export function BestSellers() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedProductId, setAddedProductId] = useState<number | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productService.getAllProducts({ limit: 2, sort: 'popular' });
        setProducts(response.products || []);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchProducts();
  }, []);

  const handleAddToCart = async (product: Product) => {
    try {
      await addToCart({
        id: Number(product.id),
        name: product.name,
        description: product.description || '',
        price: Number(product.price || 0),
        image: product.image || '/images/store.jpg',
      });

      setAddedProductId(Number(product.id));
      toast({
        title: 'Đã thêm vào giỏ hàng',
        description: `${product.name} đã được thêm vào giỏ hàng của bạn.`,
      });

      window.setTimeout(() => {
        setAddedProductId((currentId) => (currentId === Number(product.id) ? null : currentId));
      }, 1500);
    } catch (error) {
      toast({
        title: 'Không thể thêm vào giỏ',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <section className="bg-secondary py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-12 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="mb-4 inline-block text-sm font-medium uppercase tracking-wider text-accent">
                Món Yêu Thích Của Khách Hàng
              </span>
              <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                Bán Chạy Nhất
              </h2>
            </div>
            <Button asChild variant="outline" className="gap-2 border-foreground/20 hover:bg-foreground/5">
              <Link href="/menu">
                Xem Tất Cả Sản Phẩm
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p>Đang tải sản phẩm bán chạy...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-secondary py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-12 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="mb-4 inline-block text-sm font-medium uppercase tracking-wider text-accent">
              Món Yêu Thích Của Khách Hàng
            </span>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Bán Chạy Nhất
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Danh sách này lấy lượt bán thực tế từ đơn hàng đã phát sinh, không dùng dữ liệu mẫu.
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2 border-foreground/20 hover:bg-foreground/5">
            <Link href="/menu">
              Xem Tất Cả Sản Phẩm
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {products.map((item) => {
            const isAdded = addedProductId === Number(item.id);

            return (
              <div
                key={item.id}
                className="group flex flex-col gap-6 overflow-hidden rounded-2xl bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg sm:flex-row sm:items-center"
              >
                <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-xl sm:w-48">
                  <Image
                    src={item.image || '/images/store.jpg'}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-accent text-accent" />
                      <span className="text-sm font-semibold text-foreground">{item.sold_count || 0}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">(được khách hàng lựa chọn nhiều)</span>
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-card-foreground">{item.name}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.description || 'Đồ uống cà phê ngon miệng'}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-xl font-bold text-foreground">{formatCurrency(item.price)}</span>
                    <Button
                      onClick={() => {
                        void handleAddToCart(item);
                      }}
                      className={`gap-1.5 ${
                        isAdded
                          ? 'bg-green-600 text-white hover:bg-green-600'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="h-4 w-4" />
                          Đã thêm
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Đặt hàng ngay
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
