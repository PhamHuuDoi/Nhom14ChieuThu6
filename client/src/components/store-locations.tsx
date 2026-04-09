'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { MapPin, Phone } from 'lucide-react';

import shippingService from '@/services/shipping.service';
import type { StoreLocation } from '@/types/api';

function buildFullAddress(location: StoreLocation) {
    return location.address?.trim() || 'Chưa có địa chỉ cửa hàng';
}

export function StoreLocations() {
    const [locations, setLocations] = useState<StoreLocation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadStoreLocation = async () => {
            try {
                const storeLocation = await shippingService.getStoreLocations();
                if (isMounted) {
                    setLocations(storeLocation);
                }
            } catch {
                if (isMounted) {
                    setLocations([]);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        void loadStoreLocation();

        return () => {
            isMounted = false;
        };
    }, []);

    const primaryLocation = useMemo(
        () => locations.find((location) => location.is_primary) ?? locations[0] ?? null,
        [locations]
    );

    return (
        <section id="about" className="bg-background py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                    <div className="relative">
                        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-2xl">
                            <Image src="/images/store.jpg" alt="TheZooCoffee store interior" fill className="object-cover" loading="eager" />
                        </div>

                    </div>

                    <div>
                        <span className="mb-4 inline-block text-sm font-medium uppercase tracking-wider text-accent">
                            Thăm Chúng Tôi
                        </span>
                        <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                            Địa Chỉ Cửa Hàng
                        </h2>


                        <div className="mt-8 space-y-6">
                            {isLoading ? (
                                <div className="rounded-xl border border-border bg-card p-5">
                                    <p className="text-sm text-muted-foreground">Đang tải địa chỉ cửa hàng...</p>
                                </div>
                            ) : locations.length ? (
                                locations.map((location) => {
                                    const fullAddress = buildFullAddress(location);
                                    const isPrimary = primaryLocation?.id === location.id;

                                    return (
                                        <div
                                            key={location.id}
                                            className="rounded-xl border border-border bg-card p-5 transition-all hover:border-accent/50 hover:shadow-md"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <h3 className="font-serif text-lg font-semibold text-card-foreground">
                                                    {location.name || 'TheZooCoffee'}
                                                </h3>
                                                {isPrimary ? (
                                                    <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                                                        Địa chỉ giao hàng
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="mt-3 space-y-2">
                                                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                                                    <span>{fullAddress}</span>
                                                </div>
                                                {location.phone ? (
                                                    <div className="flex items-start gap-3 text-sm text-muted-foreground">
                                                        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                                                        <span>{location.phone}</span>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="rounded-xl border border-border bg-card p-5">
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p className="font-medium text-foreground">Chưa có địa chỉ cửa hàng</p>
                                        <p>Admin cần cập nhật địa chỉ cửa hàng trong trang quản trị để hiển thị tại đây.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}
