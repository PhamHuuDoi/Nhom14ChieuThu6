'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import catalogService from '@/services/catalog.service';
import type { Category } from '@/types/api';

const ITEMS_PER_PAGE = 5;

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        status: 'active' as 'active' | 'inactive',
    });
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editFormData, setEditFormData] = useState({
        name: '',
        status: 'active' as 'active' | 'inactive',
    });

    useEffect(() => {
        const loadCategories = async () => {
            try {
                setCategories(await catalogService.getCategories());
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Không thể tải danh sách danh mục.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadCategories();
    }, []);

    const totalPages = Math.max(1, Math.ceil(categories.length / ITEMS_PER_PAGE));
    const paginatedCategories = useMemo(
        () => categories.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
        [categories, currentPage],
    );

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!formData.name.trim()) {
            setErrorMessage('Vui lòng nhập tên danh mục.');
            return;
        }

        setIsSubmitting(true);

        try {
            const createdCategory = await catalogService.createCategory({
                name: formData.name.trim(),
                status: formData.status,
            });

            setCategories((prev) => [createdCategory, ...prev]);
            setExpandedCategoryId(createdCategory.id);
            setFormData({ name: '', status: 'active' });
            setSuccessMessage('Tạo danh mục thành công.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Không thể tạo danh mục.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (category: Category) => {
        setEditingCategory(category);
        setEditFormData({ name: category.name, status: category.status });
        setShowEditModal(true);
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setEditingCategory(null);
        setEditFormData({ name: '', status: 'active' });
    };

    const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingCategory || !editFormData.name.trim()) {
            setErrorMessage('Tên danh mục không được để trống.');
            return;
        }

        try {
            const updatedCategory = await catalogService.updateCategory(editingCategory.id, editFormData);
            setCategories((prev) => prev.map((cat) => (cat.id === editingCategory.id ? updatedCategory : cat)));
            setSuccessMessage('Cập nhật danh mục thành công.');
            closeEditModal();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật danh mục.');
        }
    };

    const handleDelete = async (category: Category) => {
        if (!confirm(`Bạn có chắc muốn xóa danh mục "${category.name}"?`)) return;

        setIsDeleting(true);
        try {
            await catalogService.deleteCategory(category.id);
            setCategories((prev) => prev.filter((cat) => cat.id !== category.id));
            if (expandedCategoryId === category.id) setExpandedCategoryId(null);
            setSuccessMessage('Xóa danh mục thành công.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa danh mục.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        const nextPageItems = categories.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
        if (!nextPageItems.some((item) => item.id === expandedCategoryId)) {
            setExpandedCategoryId(null);
        }
    };

    return (
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <SectionCard title="Tạo Danh Mục" description="Danh mục được quản lý riêng và có thể tái sử dụng khi tạo sản phẩm.">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Tên danh mục"
                        className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
                    />
                    <select
                        value={formData.status}
                        onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' }))}
                        className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
                    >
                        <option value="active">Đang hoạt động</option>
                        <option value="inactive">Ngưng hoạt động</option>
                    </select>
                    {errorMessage ? <div className="rounded-2xl border border-[rgba(157,49,49,0.18)] bg-[rgba(157,49,49,0.08)] px-4 py-3 text-sm text-[var(--danger)]">{errorMessage}</div> : null}
                    {successMessage ? <div className="rounded-2xl border border-[rgba(46,125,91,0.18)] bg-[rgba(46,125,91,0.08)] px-4 py-3 text-sm text-[var(--foreground)]">{successMessage}</div> : null}
                    <button type="submit" disabled={isSubmitting} className="w-full rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-70">
                        {isSubmitting ? 'Đang tạo danh mục...' : 'Thêm Danh Mục'}
                    </button>
                </form>
            </SectionCard>

            <SectionCard title="Danh Sách Danh Mục" description="Có phân trang và chỉ hiện detail khi bạn bấm vào đúng danh mục.">
                {isLoading ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-6 text-sm text-[var(--muted)]">Đang tải danh mục...</div>
                ) : (
                    <div className="grid gap-3">
                        {paginatedCategories.map((category) => {
                            const isExpanded = expandedCategoryId === category.id;
                            return (
                                <div key={category.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                                    <button type="button" onClick={() => setExpandedCategoryId(isExpanded ? null : category.id)} className="flex w-full items-center justify-between gap-3 text-left">
                                        <div>
                                            <p className="font-medium text-[var(--foreground)]">{category.name}</p>
                                            <p className="mt-1 text-sm text-[var(--muted)]">Mã danh mục: {category.id}</p>
                                        </div>
                                        <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)]">
                                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        </span>
                                    </button>
                                    {isExpanded ? (
                                        <div className="mt-3 border-t border-[var(--border)] pt-3">
                                            <p className="text-sm text-[var(--muted)]">Trạng thái: {category.status === 'active' ? 'Đang hoạt động' : 'Ngưng hoạt động'}</p>
                                            <div className="mt-3 flex gap-2">
                                                <button onClick={() => openEditModal(category)} className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--foreground)]">Sửa</button>
                                                <button onClick={() => handleDelete(category)} disabled={isDeleting} className="rounded-2xl border border-[rgba(157,49,49,0.18)] px-4 py-3 text-sm font-semibold text-[var(--danger)] disabled:opacity-50">Xóa</button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}

                        {categories.length > 0 ? (
                            <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3">
                                <p className="text-sm text-[var(--muted)]">Trang {currentPage}/{totalPages} • {categories.length} danh mục</p>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">Trang trước</button>
                                    <button type="button" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">Trang sau</button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </SectionCard>

            {showEditModal && editingCategory ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-[var(--foreground)]">Sửa danh mục</h3>
                            <button onClick={closeEditModal} className="text-sm text-[var(--muted)]">Đóng</button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="mt-6 space-y-4">
                            <input type="text" value={editFormData.name} onChange={(event) => setEditFormData((prev) => ({ ...prev, name: event.target.value }))} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 text-sm outline-none" />
                            <select value={editFormData.status} onChange={(event) => setEditFormData((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' }))} className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 text-sm outline-none">
                                <option value="active">Đang hoạt động</option>
                                <option value="inactive">Ngưng hoạt động</option>
                            </select>
                            <div className="flex gap-3">
                                <button type="submit" className="flex-1 rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white">Cập nhật</button>
                                <button type="button" onClick={closeEditModal} className="flex-1 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-semibold">Hủy</button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
