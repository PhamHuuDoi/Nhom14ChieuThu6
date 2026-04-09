'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import catalogService from '@/services/catalog.service';
import type { InventoryItem } from '@/types/api';

type InventoryStatus = 'available' | 'out_of_stock';
const ITEMS_PER_PAGE = 5;

function displayNumber(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === '') return '0';
    return String(value);
}

function formatCurrency(value: number | string | null | undefined) {
    const numericValue = Number(value ?? 0);
    const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
    return `${Math.round(safeValue).toLocaleString('vi-VN')} vnđ`;
}

function getStatusLabel(status: InventoryStatus | undefined) {
    return status === 'out_of_stock' ? 'Hết hàng' : 'Còn hàng';
}

export default function InventoryPage() {
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        unit: '',
        quantity: '',
        minQuantity: '',
        costPrice: '',
        supplierName: '',
        status: 'available' as InventoryStatus,
    });
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [editFormData, setEditFormData] = useState({
        name: '',
        unit: '',
        quantity: '',
        minQuantity: '',
        costPrice: '',
        supplierName: '',
        status: 'available' as InventoryStatus,
    });

    useEffect(() => {
        const loadInventory = async () => {
            try {
                setInventoryItems(await catalogService.getInventory());
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Không thể tải kho nguyên liệu.');
            } finally {
                setIsLoading(false);
            }
        };
        void loadInventory();
    }, []);

    const totalPages = Math.max(1, Math.ceil(inventoryItems.length / ITEMS_PER_PAGE));
    const paginatedItems = useMemo(() => inventoryItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [inventoryItems, currentPage]);

    const closeEditModal = () => {
        setShowEditModal(false);
        setEditingItem(null);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');
        if (!formData.name.trim() || !formData.unit.trim()) {
            setErrorMessage('Vui lòng nhập tên nguyên liệu và đơn vị tính.');
            return;
        }
        setIsSubmitting(true);
        try {
            const createdItem = await catalogService.createInventory({
                name: formData.name.trim(),
                unit: formData.unit.trim(),
                quantity: formData.quantity ? Number(formData.quantity) : undefined,
                minQuantity: formData.minQuantity ? Number(formData.minQuantity) : undefined,
                costPrice: formData.costPrice ? Number(formData.costPrice) : undefined,
                supplierName: formData.supplierName.trim() || undefined,
                status: formData.status,
            });
            setInventoryItems((prev) => [createdItem, ...prev]);
            setExpandedItemId(createdItem.id);
            setFormData({ name: '', unit: '', quantity: '', minQuantity: '', costPrice: '', supplierName: '', status: 'available' });
            setSuccessMessage('Tạo nguyên liệu thành công.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Không thể tạo nguyên liệu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (item: InventoryItem) => {
        setEditingItem(item);
        setEditFormData({
            name: item.name,
            unit: item.unit,
            quantity: displayNumber(item.quantity),
            minQuantity: displayNumber(item.min_quantity ?? item.minQuantity),
            costPrice: displayNumber(item.cost_price ?? item.costPrice),
            supplierName: item.supplier_name ?? item.supplierName ?? '',
            status: item.status ?? 'available',
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingItem) return;
        setIsSubmitting(true);
        try {
            const updated = await catalogService.updateInventory(editingItem.id, {
                name: editFormData.name.trim(),
                unit: editFormData.unit.trim(),
                quantity: Number(editFormData.quantity || 0),
                minQuantity: Number(editFormData.minQuantity || 0),
                costPrice: Number(editFormData.costPrice || 0),
                supplierName: editFormData.supplierName.trim() || undefined,
                status: editFormData.status,
            });
            setInventoryItems((prev) => prev.map((item) => (item.id === editingItem.id ? updated : item)));
            setSuccessMessage('Cập nhật nguyên liệu thành công.');
            closeEditModal();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật nguyên liệu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Bạn có chắc chắn muốn xóa nguyên liệu này?')) return;
        setIsSubmitting(true);
        try {
            await catalogService.deleteInventory(id);
            setInventoryItems((prev) => prev.filter((item) => item.id !== id));
            if (expandedItemId === id) setExpandedItemId(null);
            setSuccessMessage('Xóa nguyên liệu thành công.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa nguyên liệu đang được sử dụng.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        const nextPageItems = inventoryItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
        if (!nextPageItems.some((item) => item.id === expandedItemId)) setExpandedItemId(null);
    };

    return (
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <SectionCard title="Tạo Nguyên Liệu" description="Quản lý kho nguyên liệu riêng để công thức tham chiếu ổn định.">
                <form onSubmit={handleSubmit} className="grid gap-4">
                    <input type="text" value={formData.name} onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))} placeholder="Tên nguyên liệu" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" />
                    <div className="grid gap-4 md:grid-cols-2">
                        <input type="text" value={formData.unit} onChange={(event) => setFormData((prev) => ({ ...prev, unit: event.target.value }))} placeholder="Đơn vị" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" />
                        <select value={formData.status} onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value as InventoryStatus }))} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none">
                            <option value="available">Còn hàng</option>
                            <option value="out_of_stock">Hết hàng</option>
                        </select>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        <input type="number" min="0" step="0.01" value={formData.quantity} onChange={(event) => setFormData((prev) => ({ ...prev, quantity: event.target.value }))} placeholder="Tồn kho" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" />
                        <input type="number" min="0" step="0.01" value={formData.minQuantity} onChange={(event) => setFormData((prev) => ({ ...prev, minQuantity: event.target.value }))} placeholder="Tồn tối thiểu" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" />
                        <input type="number" min="0" step="0.01" value={formData.costPrice} onChange={(event) => setFormData((prev) => ({ ...prev, costPrice: event.target.value }))} placeholder="Giá nhập" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" />
                    </div>
                    <input type="text" value={formData.supplierName} onChange={(event) => setFormData((prev) => ({ ...prev, supplierName: event.target.value }))} placeholder="Nhà cung cấp" className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none" />
                    {errorMessage ? <div className="rounded-2xl border border-[rgba(157,49,49,0.18)] bg-[rgba(157,49,49,0.08)] px-4 py-3 text-sm text-[var(--danger)]">{errorMessage}</div> : null}
                    {successMessage ? <div className="rounded-2xl border border-[rgba(46,125,91,0.18)] bg-[rgba(46,125,91,0.08)] px-4 py-3 text-sm text-[var(--foreground)]">{successMessage}</div> : null}
                    <button type="submit" disabled={isSubmitting} className="w-full rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-70">{isSubmitting ? 'Đang tạo nguyên liệu...' : 'Thêm Nguyên Liệu'}</button>
                </form>
            </SectionCard>

            <SectionCard title="Danh Sách Nguyên Liệu" description="Có phân trang và chỉ hiện detail khi bạn bấm vào nguyên liệu.">
                {isLoading ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-6 text-sm text-[var(--muted)]">Đang tải kho nguyên liệu...</div>
                ) : (
                    <div className="grid gap-3">
                        {paginatedItems.map((item) => {
                            const isExpanded = expandedItemId === item.id;
                            return (
                                <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                                    <button type="button" onClick={() => setExpandedItemId(isExpanded ? null : item.id)} className="flex w-full items-center justify-between gap-3 text-left">
                                        <div>
                                            <p className="font-medium text-[var(--foreground)]">{item.name}</p>
                                            <p className="mt-1 text-sm text-[var(--muted)]">{displayNumber(item.quantity)} {item.unit} trong kho</p>
                                        </div>
                                        <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)]">{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
                                    </button>
                                    {isExpanded ? (
                                        <div className="mt-3 border-t border-[var(--border)] pt-3 text-sm text-[var(--muted)]">
                                            <p>Trạng thái: {getStatusLabel(item.status)}</p>
                                            <p>Tồn tối thiểu: {displayNumber(item.min_quantity ?? item.minQuantity)}</p>
                                            <p>Giá nhập: {formatCurrency(item.cost_price ?? item.costPrice)}</p>
                                            <p>Nhà cung cấp: {item.supplier_name ?? item.supplierName ?? 'Chưa có'}</p>
                                            <div className="mt-3 flex gap-2">
                                                <button onClick={() => openEditModal(item)} className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--foreground)]">Sửa</button>
                                                <button onClick={() => handleDelete(item.id)} className="rounded-2xl border border-[rgba(157,49,49,0.18)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">Xóa</button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                        {inventoryItems.length > 0 ? (
                            <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3">
                                <p className="text-sm text-[var(--muted)]">Trang {currentPage}/{totalPages} • {inventoryItems.length} nguyên liệu</p>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">Trang trước</button>
                                    <button type="button" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">Trang sau</button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </SectionCard>

            {showEditModal && editingItem ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-[var(--foreground)]">Cập Nhật Nguyên Liệu</h3>
                            <button type="button" onClick={closeEditModal} className="text-sm text-[var(--muted)]">Đóng</button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
                            <input className="w-full rounded-2xl border border-[var(--border)] p-3 text-sm" value={editFormData.name} onChange={(event) => setEditFormData((prev) => ({ ...prev, name: event.target.value }))} />
                            <div className="grid grid-cols-2 gap-4">
                                <input className="rounded-2xl border border-[var(--border)] p-3 text-sm" value={editFormData.unit} onChange={(event) => setEditFormData((prev) => ({ ...prev, unit: event.target.value }))} />
                                <select className="rounded-2xl border border-[var(--border)] p-3 text-sm" value={editFormData.status} onChange={(event) => setEditFormData((prev) => ({ ...prev, status: event.target.value as InventoryStatus }))}>
                                    <option value="available">Còn hàng</option>
                                    <option value="out_of_stock">Hết hàng</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <input type="number" className="rounded-xl border border-[var(--border)] p-2" value={editFormData.quantity} onChange={(event) => setEditFormData((prev) => ({ ...prev, quantity: event.target.value }))} />
                                <input type="number" className="rounded-xl border border-[var(--border)] p-2" value={editFormData.minQuantity} onChange={(event) => setEditFormData((prev) => ({ ...prev, minQuantity: event.target.value }))} />
                                <input type="number" className="rounded-xl border border-[var(--border)] p-2" value={editFormData.costPrice} onChange={(event) => setEditFormData((prev) => ({ ...prev, costPrice: event.target.value }))} />
                            </div>
                            <input className="w-full rounded-2xl border border-[var(--border)] p-3 text-sm" value={editFormData.supplierName} onChange={(event) => setEditFormData((prev) => ({ ...prev, supplierName: event.target.value }))} />
                            <div className="flex gap-3 pt-4">
                                <button type="submit" disabled={isSubmitting} className="flex-1 rounded-2xl bg-black py-3 text-sm font-semibold text-white">{isSubmitting ? 'Đang lưu...' : 'Cập Nhật'}</button>
                                <button type="button" onClick={closeEditModal} className="flex-1 rounded-2xl border border-[var(--border)] py-3 text-sm font-semibold">Hủy</button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
