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
    if (!value) return 'Không giới hạn';
    return new Date(value).toLocaleString('vi-VN');
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
                setErrorMessage(error instanceof Error ? error.message : 'Không thể tải danh sách mã giảm giá.');
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
        setErrorMessage('');
        setSuccessMessage('');

        if (!formData.code.trim() || !formData.name.trim()) {
            return setErrorMessage('Vui lòng nhập mã coupon và tên chương trình.');
        }

        if (!formData.discountValue || Number(formData.discountValue) <= 0) {
            return setErrorMessage('Giá trị giảm giá phải lớn hơn 0.');
        }

        setIsSubmitting(true);

        try {
            const createdCoupon = await catalogService.createCoupon({
                code: formData.code.trim().toUpperCase(),
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
                discountType: formData.discountType,
                discountValue: Number(formData.discountValue),
                minOrderValue: formData.minOrderValue ? Number(formData.minOrderValue) : undefined,
                maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : undefined,
                usageLimit: formData.usageLimit ? Number(formData.usageLimit) : undefined,
                startsAt: formData.startsAt || undefined,
                expiresAt: formData.expiresAt || undefined,
                status: formData.status,
            });

            setCoupons((prev) => [createdCoupon, ...prev]);
            setExpandedCouponId(createdCoupon.id);
            setSuccessMessage('Tạo mã giảm giá thành công.');
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
            setErrorMessage(error instanceof Error ? error.message : 'Không thể tạo mã giảm giá.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (coupon: Coupon) => {
        setErrorMessage('');
        setSuccessMessage('');
        setActiveCouponAction({ id: coupon.id, type: 'toggle' });

        try {
            const updated = await catalogService.toggleCouponStatus(coupon.id);
            setCoupons((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
            setSuccessMessage(`Đã ${updated.status === 'active' ? 'kích hoạt' : 'tạm ngưng'} mã ${updated.code}.`);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái coupon.');
        } finally {
            setActiveCouponAction(null);
        }
    };

    const handleDelete = async (coupon: Coupon) => {
        if (!confirm(`Bạn có chắc muốn xóa mã ${coupon.code}?`)) return;

        setErrorMessage('');
        setSuccessMessage('');
        setActiveCouponAction({ id: coupon.id, type: 'delete' });

        try {
            await catalogService.deleteCoupon(coupon.id);
            setCoupons((prev) => prev.filter((item) => item.id !== coupon.id));
            if (expandedCouponId === coupon.id) {
                setExpandedCouponId(null);
            }
            setSuccessMessage('Xóa mã giảm giá thành công.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa mã giảm giá.');
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
            <SectionCard title="Tạo mã giảm giá" description="Admin có thể tạo coupon để người dùng áp dụng tại bước thanh toán.">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <input
                            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
                            placeholder="Mã coupon"
                            value={formData.code}
                            onChange={(event) => setFormData((prev) => ({ ...prev, code: event.target.value }))}
                        />
                        <input
                            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
                            placeholder="Tên chương trình"
                            value={formData.name}
                            onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                        />
                    </div>
                    <textarea
                        className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
                        rows={3}
                        placeholder="Mô tả"
                        value={formData.description}
                        onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                        <select
                            value={formData.discountType}
                            onChange={(event) => setFormData((prev) => ({ ...prev, discountType: event.target.value as 'percentage' | 'fixed' }))}
                            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
                        >
                            <option value="percentage">Giảm theo phần trăm</option>
                            <option value="fixed">Giảm số tiền cố định</option>
                        </select>
                        <input
                            type="number"
                            min="0"
                            value={formData.discountValue}
                            onChange={(event) => setFormData((prev) => ({ ...prev, discountValue: event.target.value }))}
                            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
                            placeholder="Giá trị giảm"
                        />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <input
                            type="number"
                            min="0"
                            value={formData.minOrderValue}
                            onChange={(event) => setFormData((prev) => ({ ...prev, minOrderValue: event.target.value }))}
                            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
                            placeholder="Đơn tối thiểu"
                        />
                        <input
                            type="number"
                            min="0"
                            value={formData.maxDiscountAmount}
                            onChange={(event) => setFormData((prev) => ({ ...prev, maxDiscountAmount: event.target.value }))}
                            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
                            placeholder="Giảm tối đa"
                        />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <input
                            type="number"
                            min="0"
                            value={formData.usageLimit}
                            onChange={(event) => setFormData((prev) => ({ ...prev, usageLimit: event.target.value }))}
                            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
                            placeholder="Số lượt tối đa"
                        />
                        <select
                            value={formData.status}
                            onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' }))}
                            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
                        >
                            <option value="active">Đang hoạt động</option>
                            <option value="inactive">Tạm ngưng</option>
                        </select>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <input
                            type="datetime-local"
                            value={formData.startsAt}
                            onChange={(event) => setFormData((prev) => ({ ...prev, startsAt: event.target.value }))}
                            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
                        />
                        <input
                            type="datetime-local"
                            value={formData.expiresAt}
                            onChange={(event) => setFormData((prev) => ({ ...prev, expiresAt: event.target.value }))}
                            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
                        />
                    </div>
                    {errorMessage ? (
                        <div className="rounded-2xl border border-[rgba(157,49,49,0.18)] bg-[rgba(157,49,49,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
                            {errorMessage}
                        </div>
                    ) : null}
                    {successMessage ? (
                        <div className="rounded-2xl border border-[rgba(46,125,91,0.18)] bg-[rgba(46,125,91,0.08)] px-4 py-3 text-sm text-[var(--foreground)]">
                            {successMessage}
                        </div>
                    ) : null}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
                    >
                        {isSubmitting ? 'Đang tạo coupon...' : 'Tạo mã giảm giá'}
                    </button>
                </form>
            </SectionCard>

            <SectionCard title="Danh sách coupon" description="Có phân trang và chỉ hiện chi tiết khi bạn bấm vào coupon.">
                {isLoading ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-6 text-sm text-[var(--muted)]">
                        Đang tải mã giảm giá...
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {paginatedCoupons.map((coupon) => {
                            const isExpanded = expandedCouponId === coupon.id;
                            const isToggling = activeCouponAction?.id === coupon.id && activeCouponAction.type === 'toggle';
                            const isDeleting = activeCouponAction?.id === coupon.id && activeCouponAction.type === 'delete';

                            return (
                                <div key={coupon.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedCouponId(isExpanded ? null : coupon.id)}
                                        className="flex w-full items-center justify-between gap-3 text-left"
                                    >
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
                                            <p>Trạng thái: {coupon.status === 'active' ? 'Hoạt động' : 'Tạm ngưng'}</p>
                                            <p>Mô tả: {coupon.description || 'Không có mô tả'}</p>
                                            <p>
                                                Loại:{' '}
                                                {coupon.discount_type === 'percentage'
                                                    ? `${Number(coupon.discount_value)}%`
                                                    : formatCurrency(Number(coupon.discount_value))}
                                            </p>
                                            <p>Đơn tối thiểu: {formatCurrency(Number(coupon.min_order_value || 0))}</p>
                                            <p>Đã dùng: {coupon.used_count || 0}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}</p>
                                            <p>
                                                Giảm tối đa:{' '}
                                                {coupon.max_discount_amount
                                                    ? formatCurrency(Number(coupon.max_discount_amount))
                                                    : 'Không giới hạn'}
                                            </p>
                                            <p>Bắt đầu: {formatDateTime(coupon.starts_at)}</p>
                                            <p>Hết hạn: {formatDateTime(coupon.expires_at)}</p>
                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(coupon)}
                                                    disabled={Boolean(activeCouponAction)}
                                                    className="min-w-[140px] rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] disabled:opacity-50"
                                                >
                                                    {isToggling ? 'Đang cập nhật...' : coupon.status === 'active' ? 'Tạm ngưng' : 'Kích hoạt'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(coupon)}
                                                    disabled={Boolean(activeCouponAction)}
                                                    className="min-w-[140px] rounded-2xl border border-[rgba(157,49,49,0.18)] px-4 py-3 text-sm font-semibold text-[var(--danger)] disabled:opacity-50"
                                                >
                                                    {isDeleting ? 'Đang xóa...' : 'Xóa'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                        {coupons.length > 0 ? (
                            <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3">
                                <p className="text-sm text-[var(--muted)]">
                                    Trang {currentPage}/{totalPages} • {coupons.length} coupon
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                                    >
                                        Trang trước
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                                    >
                                        Trang sau
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
