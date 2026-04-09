'use client';

import { useEffect, useMemo, useState } from 'react';
import { Coffee, Leaf, Cake, Package, CupSoda } from 'lucide-react';

import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ProductCard } from '@/components/product-card';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { productService } from '@/services/product.service';
import type { Product, Category } from '@/types/api';

type PriceFilter = 'all' | 'under-30000' | '30000-50000' | '50000-70000' | 'over-70000';
type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name-asc';

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getCategoryIcon = (categoryName: string) => {
  const normalized = normalizeText(categoryName);

  if (normalized.includes('ca phe') || normalized.includes('coffee') || normalized.includes('espresso')) {
    return Coffee;
  }

  if (normalized.includes('tra') || normalized.includes('tea') || normalized.includes('matcha')) {
    return Leaf;
  }

  if (
    normalized.includes('banh') ||
    normalized.includes('cake') ||
    normalized.includes('pastry') ||
    normalized.includes('dessert')
  ) {
    return Cake;
  }

  if (
    normalized.includes('da xay') ||
    normalized.includes('ice blended') ||
    normalized.includes('smoothie') ||
    normalized.includes('frappe')
  ) {
    return CupSoda;
  }

  return Package;
};

function matchesPriceFilter(price: number, filter: PriceFilter) {
  if (filter === 'under-30000') return price < 30000;
  if (filter === '30000-50000') return price >= 30000 && price <= 50000;
  if (filter === '50000-70000') return price > 50000 && price <= 70000;
  if (filter === 'over-70000') return price > 70000;
  return true;
}

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [productsResponse, categoriesResponse] = await Promise.all([
          productService.getAllProducts({ limit: 100 }),
          productService.getCategories(),
        ]);

        const activeCategories = categoriesResponse.filter((category) => category.status === 'active');
        const activeCategoryIds = new Set(activeCategories.map((category) => category.id));

        setCategories(activeCategories);
        setProducts(
          productsResponse.products.filter(
            (product) => product.categories?.id && activeCategoryIds.has(product.categories.id),
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu menu.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);
    const nextProducts = products.filter((product) => {
      const productPrice = Number(product.price ?? 0);
      const matchesCategory =
        selectedCategory === 'all' || product.categories?.id.toString() === selectedCategory;
      const matchesSearch =
        !normalizedQuery ||
        normalizeText(product.name).includes(normalizedQuery) ||
        normalizeText(product.description || '').includes(normalizedQuery) ||
        normalizeText(product.categories?.name || '').includes(normalizedQuery);
      const matchesPrice = matchesPriceFilter(productPrice, priceFilter);

      return matchesCategory && matchesSearch && matchesPrice;
    });

    if (sortBy === 'price-asc') {
      nextProducts.sort((first, second) => Number(first.price) - Number(second.price));
    } else if (sortBy === 'price-desc') {
      nextProducts.sort((first, second) => Number(second.price) - Number(first.price));
    } else if (sortBy === 'name-asc') {
      nextProducts.sort((first, second) => first.name.localeCompare(second.name, 'vi'));
    }

    return nextProducts;
  }, [priceFilter, products, searchQuery, selectedCategory, sortBy]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Đang tải menu...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-red-500">{error}</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="font-serif text-4xl font-bold text-foreground md:text-5xl">Menu Của Chúng Tôi</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Khám phá đồ uống thủ công và món ăn ngon miệng của chúng tôi
          </p>
        </div>

        <div className="mb-10">
          <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-[1.6fr_1fr_1fr]">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm theo tên món, mô tả hoặc danh mục"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
            />
            <select
              value={priceFilter}
              onChange={(event) => setPriceFilter(event.target.value as PriceFilter)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
            >
              <option value="all">Tất cả mức giá</option>
              <option value="under-30000">Dưới 30.000đ</option>
              <option value="30000-50000">30.000đ - 50.000đ</option>
              <option value="50000-70000">50.000đ - 70.000đ</option>
              <option value="over-70000">Trên 70.000đ</option>
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
            >
              <option value="default">Sắp xếp mặc định</option>
              <option value="price-asc">Giá tăng dần</option>
              <option value="price-desc">Giá giảm dần</option>
              <option value="name-asc">Tên A-Z</option>
            </select>
          </div>

          <div className="flex flex-wrap justify-center gap-2 rounded-2xl bg-secondary/50 p-2 md:inline-flex md:mx-auto md:gap-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'relative flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all duration-300 ease-out',
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
              )}
            >
              <Package className="h-4 w-4" />
              <span>Tất cả</span>
              {selectedCategory === 'all' ? (
                <span className="absolute inset-0 rounded-xl ring-2 ring-primary/20 ring-offset-2 ring-offset-background" />
              ) : null}
            </button>

            {categories.map((category) => {
              const Icon = getCategoryIcon(category.name);
              const isActive = selectedCategory === category.id.toString();

              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id.toString())}
                  className={cn(
                    'relative flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all duration-300 ease-out',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
                  )}
                >
                  <Icon className={cn('h-4 w-4 transition-transform duration-300', isActive && 'scale-110')} />
                  <span>{category.name}</span>
                  {isActive ? (
                    <span className="absolute inset-0 rounded-xl ring-2 ring-primary/20 ring-offset-2 ring-offset-background" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div
          key={`${selectedCategory}-${priceFilter}-${sortBy}-${searchQuery}`}
          className="grid animate-in grid-cols-1 gap-6 fade-in slide-in-from-bottom-4 duration-300 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filteredProducts.map((product, index) => (
            <div
              key={product.id}
              className="animate-in fade-in zoom-in-95 duration-300"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
            >
              <ProductCard
                id={product.id}
                name={product.name}
                description={product.description || ''}
                price={formatCurrency(product.price)}
                image={product.image || '/images/store.jpg'}
                badge={product.status === 'available' ? undefined : product.status}
                priority={index < 4}
              />
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg text-muted-foreground">Không có sản phẩm phù hợp với bộ lọc hiện tại.</p>
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
