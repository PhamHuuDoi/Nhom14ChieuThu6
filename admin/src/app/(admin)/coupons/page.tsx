'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import catalogService from '@/services/catalog.service';
import type { Coupon } from '@/types/api';

const ITEMS_PER_PAGE = 5;

function formatCurrency(amount: number) {
    return `${Math.round(amount).toLocaleString('vi-VN')} vnd`;
}

function formatDateTime(value?: string | null) {
    if (!value) return 'Khong gioi han';
    return new Date(value).toLocaleString('vi-VN');
}

function toIsoDateTime(value?: string) {
    if (!value) return undefined;

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate.toISOString();
}

function parseOptionalNumber(value: string) {
    if (!value.trim()) return undefined;

    const parsedNumber = Number(value);
    return Number.isFinite(parsedNumber) ? parsedNumber : Number.NaN;
}

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeCouponAction, setActiveCouponAction] = useState<{ id: number; type: 'toggle' | 'delete' } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [expandedCouponId, setExpandedCouponId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        discountType: 'percentage' as 'percentage' | 'fixed',
        discountValue: '',
        minOrderValue: '',
        maxDiscountAmount: '',
        usageLimit: '',
        startsAt: '',
        expiresAt: '',
        status: 'active' as 'active' | 'inactive',
    });

    useEffect(() => {
        const loadCoupons = async () => {
            try {
                setCoupons(await catalogService.getCoupons());
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Khong the tai danh sach ma giam gia.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadCoupons();
    }, []);

    const totalPages = Math.max(1, Math.ceil(coupons.length / ITEMS_PER_PAGE));
    const paginatedCoupons = useMemo(
        () => coupons.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
        [coupons, currentPage],
    );

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        setErrorMessage('');
        setSuccessMessage('');

        if (!formData.code.trim() || !formData.name.trim()) {
            setErrorMessage('Vui long nhap ma coupon va ten chuong trinh.');
            return;
        }

        const discountValue = Number(formData.discountValue);
        const minOrderValue = parseOptionalNumber(formData.minOrderValue);
        const maxDiscountAmount = parseOptionalNumber(formData.maxDiscountAmount);
        const usageLimit = parseOptionalNumber(formData.usageLimit);
        const startsAtIso = toIsoDateTime(formData.startsAt);
        const expiresAtIso = toIsoDateTime(formData.expiresAt);

        if (!Number.isFinite(discountValue) || discountValue <= 0) {
            setErrorMessage('Gia tri giam gia phai lon hon 0.');
            return;
        }

        if (formData.discountType === 'percentage' && discountValue > 100) {
            setErrorMessage('Coupon giam theo phan tram khong duoc vuot qua 100%.');
            return;
        }

        if (minOrderValue !== undefined && (!Number.isFinite(minOrderValue) || minOrderValue < 0)) {
            setErrorMessage('Gia tri don toi thieu khong hop le.');
            return;
        }

        if (maxDiscountAmount !== undefined && (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount <= 0)) {
            setErrorMessage('Gia tri giam toi da phai lon hon 0.');
            return;
        }

        if (usageLimit !== undefined && (!Number.isInteger(usageLimit) || usageLimit <= 0)) {
            setErrorMessage('So luot toi da phai la so nguyen duong.');
            return;
        }

        if (formData.startsAt && !startsAtIso) {
            setErrorMessage('Thoi gian bat dau khong hop le.');
            return;
        }

        if (formData.expiresAt && !expiresAtIso) {
            setErrorMessage('Thoi gian het han khong hop le.');
            return;
        }

        if (startsAtIso && expiresAtIso && new Date(expiresAtIso) <= new Date(startsAtIso)) {
            setErrorMessage('Thoi gian het han phai sau thoi gian bat dau.');
            return;
        }

        setIsSubmitting(true);

        try {
            const createdCoupon = await catalogService.createCoupon({
                code: formData.code.trim().toUpperCase(),
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
                discountType: formData.discountType,
                discountValue,
                minOrderValue,
                maxDiscountAmount,
                usageLimit,
                startsAt: startsAtIso,
                expiresAt: expiresAtIso,
                status: formData.status,
            });

            setCoupons((prev) => [createdCoupon, ...prev]);
            setExpandedCouponId(createdCoupon.id);
            setSuccessMessage('Tao ma giam gia thanh cong.');
            setFormData({
                code: '',
                name: '',
                description: '',
                discountType: 'percentage',
                discountValue: '',
                minOrderValue: '',
                maxDiscountAmount: '',
                usageLimit: '',
                startsAt: '',
                expiresAt: '',
                status: 'active',
            });
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Khong the tao ma giam gia.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (coupon: Coupon) => {
        if (activeCouponAction) return;

        setErrorMessage('');
        setSuccessMessage('');
        setActiveCouponAction({ id: coupon.id, type: 'toggle' });

        try {
            const updated = await catalogService.toggleCouponStatus(coupon.id);
            setCoupons((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
            setSuccessMessage(`Da ${updated.status === 'active' ? 'kich hoat' : 'tam ngung'} ma ${updated.code}.`);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Khong the cap nhat trang thai coupon.');
        } finally {
            setActiveCouponAction(null);
        }
    };

    const handleDelete = async (coupon: Coupon) => {
        if (activeCouponAction) return;
        if (!confirm(`Ban co chac muon xoa ma ${coupon.code}?`)) return;

        setErrorMessage('');
        setSuccessMessage('');
        setActiveCouponAction({ id: coupon.id, type: 'delete' });

        try {
            await catalogService.deleteCoupon(coupon.id);
            setCoupons((prev) => prev.filter((item) => item.id !== coupon.id));
            if (expandedCouponId === coupon.id) {
                setExpandedCouponId(null);
            }
            setSuccessMessage('Xoa ma giam gia thanh cong.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Khong the xoa ma giam gia.');
        } finally {
            setActiveCouponAction(null);
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        const nextPageItems = coupons.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
        if (!nextPageItems.some((item) => item.id === expandedCouponId)) {
            setExpandedCouponId(null);
        }
    };

    return (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <SectionCard title="Tao ma giam gia" description="Admin co the tao coupon de nguoi dung ap dung tai buoc thanh toan.">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <input className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" placeholder="Ma coupon" value={formData.code} onChange={(event) => setFormData((prev) => ({ ...prev, code: event.target.value }))} />
                        <input className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" placeholder="Ten chuong trinh" value={formData.name} onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))} />
                    </div>
                    <textarea className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" rows={3} placeholder="Mo ta" value={formData.description} onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))} />
                    <div className="grid gap-4 md:grid-cols-2">
                        <select value={formData.discountType} onChange={(event) => setFormData((prev) => ({ ...prev, discountType: event.target.value as 'percentage' | 'fixed' }))} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none">
                            <option value="percentage">Giam theo phan tram</option>
                            <option value="fixed">Giam so tien co dinh</option>
                        </select>
                        <input type="number" min="0" value={formData.discountValue} onChange={(event) => setFormData((prev) => ({ ...prev, discountValue: event.target.value }))} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" placeholder="Gia tri giam" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <input type="number" min="0" value={formData.minOrderValue} onChange={(event) => setFormData((prev) => ({ ...prev, minOrderValue: event.target.value }))} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" placeholder="Don toi thieu" />
                        <input type="number" min="0" value={formData.maxDiscountAmount} onChange={(event) => setFormData((prev) => ({ ...prev, maxDiscountAmount: event.target.value }))} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" placeholder="Giam toi da" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <input type="number" min="0" value={formData.usageLimit} onChange={(event) => setFormData((prev) => ({ ...prev, usageLimit: event.target.value }))} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" placeholder="So luot toi da" />
                        <select value={formData.status} onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' }))} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none">
                            <option value="active">Dang hoat dong</option>
                            <option value="inactive">Tam ngung</option>
                        </select>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <input type="datetime-local" value={formData.startsAt} onChange={(event) => setFormData((prev) => ({ ...prev, startsAt: event.target.value }))} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" />
                        <input type="datetime-local" value={formData.expiresAt} onChange={(event) => setFormData((prev) => ({ ...prev, expiresAt: event.target.value }))} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" />
                    </div>
                    {errorMessage ? <div className="rounded-2xl border border-[rgba(157,49,49,0.18)] bg-[rgba(157,49,49,0.08)] px-4 py-3 text-sm text-[var(--danger)]">{errorMessage}</div> : null}
                    {successMessage ? <div className="rounded-2xl border border-[rgba(46,125,91,0.18)] bg-[rgba(46,125,91,0.08)] px-4 py-3 text-sm text-[var(--foreground)]">{successMessage}</div> : null}
                    <button type="submit" disabled={isSubmitting} className="w-full rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-70">
                        {isSubmitting ? 'Dang tao coupon...' : 'Tao ma giam gia'}
                    </button>
                </form>
            </SectionCard>

            <SectionCard title="Danh sach coupon" description="Co phan trang va chi hien chi tiet khi ban bam vao coupon.">
                {isLoading ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-6 text-sm text-[var(--muted)]">Dang tai ma giam gia...</div>
                ) : (
                    <div className="grid gap-3">
                        {paginatedCoupons.map((coupon) => {
                            const isExpanded = expandedCouponId === coupon.id;
                            const isToggling = activeCouponAction?.id === coupon.id && activeCouponAction.type === 'toggle';
                            const isDeleting = activeCouponAction?.id === coupon.id && activeCouponAction.type === 'delete';

                            return (
                                <div key={coupon.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                                    <button type="button" onClick={() => setExpandedCouponId(isExpanded ? null : coupon.id)} className="flex w-full items-center justify-between gap-3 text-left">
                                        <div>
                                            <p className="text-lg font-semibold text-[var(--foreground)]">{coupon.code}</p>
                                            <p className="text-sm text-[var(--muted)]">{coupon.name}</p>
                                        </div>
                                        <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)]">
                                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        </span>
                                    </button>
                                    {isExpanded ? (
                                        <div className="mt-3 border-t border-[var(--border)] pt-3 text-sm text-[var(--muted)]">
                                            <p>Trang thai: {coupon.status === 'active' ? 'Hoat dong' : 'Tam ngung'}</p>
                                            <p>Mo ta: {coupon.description || 'Khong co mo ta'}</p>
                                            <p>Loai: {coupon.discount_type === 'percentage' ? `${Number(coupon.discount_value)}%` : formatCurrency(Number(coupon.discount_value))}</p>
                                            <p>Don toi thieu: {formatCurrency(Number(coupon.min_order_value || 0))}</p>
                                            <p>Da dung: {coupon.used_count || 0}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}</p>
                                            <p>Giam toi da: {coupon.max_discount_amount ? formatCurrency(Number(coupon.max_discount_amount)) : 'Khong gioi han'}</p>
                                            <p>Bat dau: {formatDateTime(coupon.starts_at)}</p>
                                            <p>Het han: {formatDateTime(coupon.expires_at)}</p>
                                            <div className="mt-3 flex gap-2">
                                                <button type="button" onClick={() => handleToggleStatus(coupon)} disabled={Boolean(activeCouponAction)} className="min-w-[140px] rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] disabled:opacity-50">
                                                    {isToggling ? 'Dang cap nhat...' : coupon.status === 'active' ? 'Tam ngung' : 'Kich hoat'}
                                                </button>
                                                <button type="button" onClick={() => handleDelete(coupon)} disabled={Boolean(activeCouponAction)} className="min-w-[140px] rounded-2xl border border-[rgba(157,49,49,0.18)] px-4 py-3 text-sm font-semibold text-[var(--danger)] disabled:opacity-50">
                                                    {isDeleting ? 'Dang xoa...' : 'Xoa'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                        {coupons.length > 0 ? (
                            <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3">
                                <p className="text-sm text-[var(--muted)]">Trang {currentPage}/{totalPages} • {coupons.length} coupon</p>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">Trang truoc</button>
                                    <button type="button" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">Trang sau</button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
