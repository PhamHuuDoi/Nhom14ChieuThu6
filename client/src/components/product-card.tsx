'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Check, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCart } from '@/context/cart-context';
import { toast } from '@/hooks/use-toast';

interface ProductCardProps {
    id: number;
    name: string;
    description: string;
    price: string;
    image: string;
    badge?: string;
    priority?: boolean;
}

function parsePrice(price: string) {
    return Number(String(price).replace(/[^\d]/g, '')) || 0;
}

export function ProductCard({ id, name, description, price, image, badge, priority = false }: ProductCardProps) {
    const { addToCart } = useCart();
    const [isAdded, setIsAdded] = useState(false);

    const handleAddToCart = async () => {
        try {
            await addToCart({
                id,
                name,
                description,
                price: parsePrice(price),
                image,
            });

            setIsAdded(true);
            toast({
                title: 'Đã thêm vào giỏ hàng',
                description: `${name} đã được thêm vào giỏ hàng của bạn.`,
            });

            setTimeout(() => setIsAdded(false), 1500);
        } catch (error) {
            toast({
                title: 'Không thể thêm vào giỏ',
                description: error instanceof Error ? error.message : 'Vui lòng thử lại.',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            {badge ? (
                <span className="absolute left-4 top-4 z-10 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                    {badge}
                </span>
            ) : null}

            <Link href={`/menu/${id}`} className="block">
                <div className="relative aspect-square overflow-hidden bg-muted">
                    <Image
                        src={image}
                        alt={name}
                        fill
                        priority={priority}
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </div>
            </Link>

            <div className="flex flex-1 flex-col p-5">
                <Link href={`/menu/${id}`} className="block">
                    <h3 className="line-clamp-2 min-h-[3.5rem] font-serif text-lg font-semibold text-card-foreground transition group-hover:text-primary">
                        {name}
                    </h3>
                </Link>

                <div className="mt-4">
                    <span className="text-xl font-bold text-foreground">{price}</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                        href={`/menu/${id}`}
                        className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full bg-foreground px-4 text-sm font-semibold text-background transition hover:bg-primary"
                    >
                        Xem chi tiết
                    </Link>
                    <Button
                        size="sm"
                        onClick={handleAddToCart}
                        className={`h-10 w-full gap-1.5 whitespace-nowrap transition-all duration-300 ${
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
                                Thêm
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
