'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import catalogService from '@/services/catalog.service';
import uploadService from '@/services/upload.service';
import type { Category, Product } from '@/types/api';

type ProductStatus = 'available' | 'out_of_stock' | 'discontinued';

type ProductFormData = {
  name: string;
  categoryId: string;
  price: string;
  image: string;
  description: string;
  sku: string;
  status: ProductStatus;
};

const EMPTY_FORM: ProductFormData = {
  name: '',
  categoryId: '',
  price: '',
  image: '',
  description: '',
  sku: '',
  status: 'available',
};

const ITEMS_PER_PAGE = 5;

function formatCurrency(amount: number) {
  return `${Math.round(amount).toLocaleString('vi-VN')} vnđ`;
}

function getStatusLabel(status: ProductStatus) {
  if (status === 'out_of_stock') return 'Hết hàng';
  if (status === 'discontinued') return 'Ngừng bán';
  return 'Đang bán';
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editErrorMessage, setEditErrorMessage] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [formData, setFormData] = useState<ProductFormData>(EMPTY_FORM);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState<ProductFormData>(EMPTY_FORM);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const enrichProductCategory = (product: Product, categoryId: number | string) => {
    if (product.categories?.id) {
      return product;
    }

    const matchedCategory = categories.find((category) => category.id === Number(categoryId));
    if (!matchedCategory) {
      return product;
    }

    return {
      ...product,
      categories: {
        id: matchedCategory.id,
        name: matchedCategory.name,
      },
    };
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingProduct(null);
    setEditFormData(EMPTY_FORM);
    setEditErrorMessage('');
    setSelectedImageFile(null);
    setUploadedImageUrl('');
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesResponse, productsResponse] = await Promise.all([
          catalogService.getCategories(),
          catalogService.getProducts(),
        ]);
        setCategories(categoriesResponse);
        setProducts(productsResponse);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Không thể tải danh sách sản phẩm.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  useEffect(() => {
    if (!showEditModal) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeEditModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showEditModal]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);

    return products.filter((product) => {
      const matchesSearch =
        !normalizedQuery ||
        normalizeText(product.name).includes(normalizedQuery) ||
        normalizeText(product.description || '').includes(normalizedQuery) ||
        normalizeText(product.sku || '').includes(normalizedQuery) ||
        normalizeText(product.categories?.name || '').includes(normalizedQuery);
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      const matchesCategory =
        categoryFilter === 'all' || product.categories?.id?.toString() === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [categoryFilter, products, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = useMemo(
    () => filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredProducts, currentPage],
  );

  useEffect(() => {
    setCurrentPage(1);
    if (!filteredProducts.some((product) => product.id === expandedProductId)) {
      setExpandedProductId(null);
    }
  }, [categoryFilter, expandedProductId, filteredProducts, searchQuery, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const resetCreateForm = () => {
    setFormData(EMPTY_FORM);
    setSelectedImageFile(null);
    setUploadedImageUrl('');
  };

  const handleImageUpload = async () => {
    if (!selectedImageFile) {
      if (showEditModal) {
        setEditErrorMessage('Vui lòng chọn ảnh trước khi tải lên.');
      } else {
        setErrorMessage('Vui lòng chọn ảnh trước khi tải lên.');
      }
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setEditErrorMessage('');
    setIsUploadingImage(true);

    try {
      const uploadedImage = await uploadService.uploadProductImage(selectedImageFile);
      setUploadedImageUrl(uploadedImage.url);

      if (editingProduct) {
        setEditFormData((prev) => ({ ...prev, image: uploadedImage.url }));
      } else {
        setFormData((prev) => ({ ...prev, image: uploadedImage.url }));
      }

      if (!showEditModal) {
        setSuccessMessage('Tải ảnh lên thành công.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải ảnh lên.';
      if (showEditModal) {
        setEditErrorMessage(message);
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.name.trim()) return setErrorMessage('Vui lòng nhập tên sản phẩm.');
    if (!formData.categoryId) return setErrorMessage('Vui lòng chọn danh mục.');
    if (!formData.price || Number(formData.price) <= 0) {
      return setErrorMessage('Vui lòng nhập giá hợp lệ.');
    }

    setIsSubmitting(true);

    try {
      const createdProduct = await catalogService.createProduct({
        name: formData.name.trim(),
        categoryId: Number(formData.categoryId),
        price: Number(formData.price),
        image: formData.image.trim() || undefined,
        description: formData.description.trim() || undefined,
        sku: formData.sku.trim() || undefined,
        status: formData.status,
      });

      const normalizedCreatedProduct = enrichProductCategory(createdProduct, formData.categoryId);
      setProducts((prev) => [normalizedCreatedProduct, ...prev]);
      setExpandedProductId(normalizedCreatedProduct.id);
      resetCreateForm();
      setSuccessMessage('Tạo sản phẩm thành công.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tạo sản phẩm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name,
      categoryId: product.categories?.id?.toString() ?? '',
      price: product.price.toString(),
      image: product.image ?? '',
      description: product.description ?? '',
      sku: product.sku ?? '',
      status: product.status,
    });
    setUploadedImageUrl(product.image ?? '');
    setSelectedImageFile(null);
    setShowEditModal(true);
    setEditErrorMessage('');
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditErrorMessage('');

    if (!editingProduct) return;
    if (!editFormData.name.trim()) return setEditErrorMessage('Vui lòng nhập tên sản phẩm.');
    if (!editFormData.categoryId) return setEditErrorMessage('Vui lòng chọn danh mục.');
    if (!editFormData.price || Number(editFormData.price) <= 0) {
      return setEditErrorMessage('Vui lòng nhập giá hợp lệ.');
    }

    setIsSubmitting(true);

    try {
      const updatedProduct = await catalogService.updateProduct(editingProduct.id, {
        name: editFormData.name.trim(),
        categoryId: Number(editFormData.categoryId),
        price: Number(editFormData.price),
        image: editFormData.image.trim() || null,
        description: editFormData.description.trim() || null,
        sku: editFormData.sku.trim() || null,
        status: editFormData.status,
      });

      const normalizedUpdatedProduct = enrichProductCategory(updatedProduct, editFormData.categoryId);
      setProducts((prev) =>
        prev.map((item) => (item.id === normalizedUpdatedProduct.id ? normalizedUpdatedProduct : item)),
      );
      setSuccessMessage('Cập nhật sản phẩm thành công.');
      closeEditModal();
    } catch (error) {
      setEditErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật sản phẩm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Bạn có chắc muốn xóa sản phẩm "${product.name}"?`)) return;

    setIsDeleting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await catalogService.deleteProduct(product.id);
      setProducts((prev) => prev.filter((item) => item.id !== product.id));
      if (expandedProductId === product.id) setExpandedProductId(null);
      setSuccessMessage('Xóa sản phẩm thành công.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa sản phẩm.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const nextPageItems = filteredProducts.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    if (!nextPageItems.some((item) => item.id === expandedProductId)) {
      setExpandedProductId(null);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <SectionCard
        title="Tạo Sản Phẩm"
        description="Sản phẩm được tạo riêng tại đây và liên kết với danh mục đã có."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={formData.name}
            onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
            placeholder="Tên sản phẩm"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <select
              value={formData.categoryId}
              onChange={(event) => setFormData((prev) => ({ ...prev, categoryId: event.target.value }))}
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">Chọn danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="0"
              value={formData.price}
              onChange={(event) => setFormData((prev) => ({ ...prev, price: event.target.value }))}
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              placeholder="Giá bán"
            />

            <input
              type="text"
              value={formData.sku}
              onChange={(event) => setFormData((prev) => ({ ...prev, sku: event.target.value }))}
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              placeholder="Mã SKU"
            />

            <select
              value={formData.status}
              onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value as ProductStatus }))}
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="available">Đang bán</option>
              <option value="out_of_stock">Hết hàng</option>
              <option value="discontinued">Ngừng bán</option>
            </select>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-strong)] p-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Ảnh sản phẩm</p>
            <div className="mt-3 flex flex-col gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setSelectedImageFile(event.target.files?.[0] || null)}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={handleImageUpload}
                disabled={!selectedImageFile || isUploadingImage}
                className="w-fit rounded-2xl border border-[var(--foreground)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] disabled:opacity-60"
              >
                {isUploadingImage ? 'Đang tải ảnh...' : 'Tải ảnh lên'}
              </button>
            </div>

            {uploadedImageUrl ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-3">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[var(--panel-strong)]">
                  <Image src={uploadedImageUrl} alt="Ảnh sản phẩm" fill className="object-cover" unoptimized />
                </div>
              </div>
            ) : null}
          </div>

          <textarea
            value={formData.description}
            onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
            rows={4}
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
            placeholder="Mô tả"
          />

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
            disabled={isSubmitting || categories.length === 0}
            className="w-full rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
          >
            {isSubmitting ? 'Đang tạo sản phẩm...' : 'Thêm Sản Phẩm'}
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="Danh Sách Sản Phẩm"
        description="Tìm kiếm, lọc nhanh và chỉ mở chi tiết khi bạn bấm vào đúng sản phẩm cần xem."
      >
        {isLoading ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-6 text-sm text-[var(--muted)]">
            Đang tải sản phẩm...
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-4 md:grid-cols-[1.3fr_0.8fr_0.8fr]">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm theo tên, SKU, mô tả hoặc danh mục"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              />
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | ProductStatus)}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="available">Đang bán</option>
                <option value="out_of_stock">Hết hàng</option>
                <option value="discontinued">Ngừng bán</option>
              </select>
            </div>

            {paginatedProducts.map((product) => {
              const isExpanded = expandedProductId === product.id;

              return (
                <div key={product.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-[var(--foreground)]">{product.name}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {product.categories?.name || 'Chưa phân loại'} - {formatCurrency(product.price)}
                      </p>
                    </div>
                    <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)]">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="mt-3 border-t border-[var(--border)] pt-3">
                      <div className="space-y-2 text-sm text-[var(--muted)]">
                        <p>SKU: {product.sku || 'Chưa có SKU'}</p>
                        <p>Trạng thái: {getStatusLabel(product.status)}</p>
                        {product.description ? <p>Mô tả: {product.description}</p> : null}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
                          disabled={isDeleting}
                          className="rounded-2xl border border-[rgba(157,49,49,.18)] px-4 py-3 text-sm font-semibold text-[var(--danger)] disabled:opacity-50"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-4 py-8 text-center text-sm text-[var(--muted)]">
                Không có sản phẩm phù hợp với bộ lọc hiện tại.
              </div>
            ) : null}

            {filteredProducts.length > 0 ? (
              <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3">
                <p className="text-sm text-[var(--muted)]">
                  Trang {currentPage}/{totalPages} • {filteredProducts.length} sản phẩm phù hợp
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

      {showEditModal && editingProduct ? (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 backdrop-blur-sm" onClick={closeEditModal}>
          <div className="flex min-h-full items-center justify-center">
            <div
              className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeEditModal}
                className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-2xl border border-[var(--border)] bg-white text-[var(--muted)] transition hover:text-[var(--foreground)]"
                aria-label="Đóng cửa sổ chỉnh sửa"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-6 flex items-center justify-between rounded-t-2xl border-b border-[var(--border)] bg-white px-6 py-4 pr-20">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">Sửa sản phẩm</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Bấm Esc, nhấn vào nền tối hoặc dùng nút thoát để đóng form.
                  </p>
                </div>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(event) => setEditFormData((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 text-sm outline-none"
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <select
                    value={editFormData.categoryId}
                    onChange={(event) => setEditFormData((prev) => ({ ...prev, categoryId: event.target.value }))}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 text-sm outline-none"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="0"
                    value={editFormData.price}
                    onChange={(event) => setEditFormData((prev) => ({ ...prev, price: event.target.value }))}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    type="text"
                    value={editFormData.sku}
                    onChange={(event) => setEditFormData((prev) => ({ ...prev, sku: event.target.value }))}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 text-sm outline-none"
                  />

                  <select
                    value={editFormData.status}
                    onChange={(event) => setEditFormData((prev) => ({ ...prev, status: event.target.value as ProductStatus }))}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 text-sm outline-none"
                  >
                    <option value="available">Đang bán</option>
                    <option value="out_of_stock">Hết hàng</option>
                    <option value="discontinued">Ngừng bán</option>
                  </select>
                </div>

                <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-strong)] p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Ảnh sản phẩm</p>
                  <div className="mt-3 flex flex-col gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => setSelectedImageFile(event.target.files?.[0] || null)}
                      className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleImageUpload}
                      disabled={!selectedImageFile || isUploadingImage}
                      className="w-fit rounded-2xl border border-[var(--foreground)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] disabled:opacity-60"
                    >
                      {isUploadingImage ? 'Đang tải ảnh...' : 'Tải ảnh mới'}
                    </button>
                  </div>

                  {uploadedImageUrl ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-3">
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[var(--panel-strong)]">
                        <Image src={uploadedImageUrl} alt="Ảnh sản phẩm" fill className="object-cover" unoptimized />
                      </div>
                    </div>
                  ) : null}
                </div>

                <textarea
                  value={editFormData.description}
                  onChange={(event) => setEditFormData((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 text-sm outline-none"
                />

                {editErrorMessage ? (
                  <div className="rounded-2xl border border-[rgba(157,49,49,0.18)] bg-[rgba(157,49,49,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
                    {editErrorMessage}
                  </div>
                ) : null}

                <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 border-t border-[var(--border)] bg-white px-6 py-4">
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
                    >
                      {isSubmitting ? 'Đang lưu...' : 'Cập nhật'}
                    </button>
                    <button
                      type="button"
                      onClick={closeEditModal}
                      className="flex-1 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-semibold"
                    >
                      Thoát chỉnh sửa
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
