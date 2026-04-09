'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Plus, Save, Trash2, X } from 'lucide-react';

import { SectionCard } from '@/components/section-card';
import catalogService from '@/services/catalog.service';
import type { InventoryItem, Product, Recipe } from '@/types/api';

interface RecipeInput {
    id: string;
    inventoryId: string;
    quantityUsed: string;
}

interface GroupedRecipe {
    product: NonNullable<Recipe['products']>;
    ingredients: Recipe[];
}

const RECIPES_PER_PAGE = 5;

function displayNumber(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === '') {
        return '0';
    }

    return String(value);
}

function createEmptyRecipeRow(): RecipeInput {
    return {
        id: crypto.randomUUID(),
        inventoryId: '',
        quantityUsed: '',
    };
}

export default function RecipesPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [recipesList, setRecipesList] = useState<Recipe[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingRecipe, setIsSavingRecipe] = useState<number | null>(null);
    const [isDeletingRecipe, setIsDeletingRecipe] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');
    const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);
    const [editingQuantity, setEditingQuantity] = useState('');
    const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [recipes, setRecipes] = useState<RecipeInput[]>([createEmptyRecipeRow()]);

    const loadData = async () => {
        const [productsResponse, inventoryResponse, recipesResponse] = await Promise.all([
            catalogService.getProducts(),
            catalogService.getInventory(),
            catalogService.getRecipes(),
        ]);

        setProducts(productsResponse);
        setInventoryItems(inventoryResponse);
        setRecipesList(recipesResponse);
    };

    useEffect(() => {
        const initialize = async () => {
            try {
                await loadData();
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Không thể tải dữ liệu công thức.');
            } finally {
                setIsLoading(false);
            }
        };

        void initialize();
    }, []);

    const groupedRecipes = useMemo(() => {
        return Object.values(
            recipesList.reduce<Record<number, GroupedRecipe>>((accumulator, recipe) => {
                const product = recipe.products;

                if (!product) {
                    return accumulator;
                }

                if (!accumulator[product.id]) {
                    accumulator[product.id] = {
                        product,
                        ingredients: [],
                    };
                }

                accumulator[product.id].ingredients.push(recipe);
                return accumulator;
            }, {}),
        );
    }, [recipesList]);

    const totalPages = Math.max(1, Math.ceil(groupedRecipes.length / RECIPES_PER_PAGE));
    const paginatedGroups = groupedRecipes.slice(
        (currentPage - 1) * RECIPES_PER_PAGE,
        currentPage * RECIPES_PER_PAGE,
    );

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    useEffect(() => {
        if (!expandedProductId) {
            return;
        }

        const expandedStillExists = groupedRecipes.some((group) => group.product.id === expandedProductId);

        if (!expandedStillExists) {
            setExpandedProductId(null);
        }
    }, [expandedProductId, groupedRecipes]);

    const addRecipeRow = () => {
        setRecipes((prev) => [...prev, createEmptyRecipeRow()]);
    };

    const removeRecipeRow = (id: string) => {
        setRecipes((prev) => (prev.length > 1 ? prev.filter((recipe) => recipe.id !== id) : prev));
    };

    const updateRecipeRow = (id: string, field: 'inventoryId' | 'quantityUsed', value: string) => {
        setRecipes((prev) => prev.map((recipe) => (recipe.id === id ? { ...recipe, [field]: value } : recipe)));
    };

    const resetForm = () => {
        setSelectedProductId('');
        setRecipes([createEmptyRecipeRow()]);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!selectedProductId) {
            setErrorMessage('Vui lòng chọn sản phẩm trước.');
            return;
        }

        const normalizedRecipes = recipes.map((recipe) => ({
            inventoryId: Number(recipe.inventoryId),
            quantityUsed: Number(recipe.quantityUsed),
        }));

        const hasInvalidRecipe = normalizedRecipes.some(
            (recipe) =>
                Number.isNaN(recipe.inventoryId) ||
                recipe.inventoryId <= 0 ||
                Number.isNaN(recipe.quantityUsed) ||
                recipe.quantityUsed <= 0,
        );

        if (hasInvalidRecipe) {
            setErrorMessage('Vui lòng nhập đầy đủ và đúng cho từng dòng nguyên liệu.');
            return;
        }

        setIsSubmitting(true);

        try {
            const updatedProduct = await catalogService.createRecipe({
                productId: Number(selectedProductId),
                recipes: normalizedRecipes,
            });

            setProducts((prev) => prev.map((product) => (product.id === updatedProduct.id ? updatedProduct : product)));
            await loadData();
            resetForm();
            setExpandedProductId(Number(selectedProductId));
            setSuccessMessage('Lưu công thức thành công.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu công thức.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEditingRecipe = (recipe: Recipe) => {
        setEditingRecipeId(recipe.id);
        setEditingQuantity(String(recipe.quantity_used));
        setErrorMessage('');
        setSuccessMessage('');
    };

    const cancelEditingRecipe = () => {
        setEditingRecipeId(null);
        setEditingQuantity('');
    };

    const handleUpdateRecipe = async (recipeId: number) => {
        const quantity = Number(editingQuantity);

        if (Number.isNaN(quantity) || quantity <= 0) {
            setErrorMessage('Số lượng sử dụng phải lớn hơn 0.');
            return;
        }

        setIsSavingRecipe(recipeId);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const updatedRecipe = await catalogService.updateRecipe(recipeId, {
                quantity_used: quantity,
            });

            setRecipesList((prev) =>
                prev.map((recipe) =>
                    recipe.id === recipeId
                        ? {
                              ...recipe,
                              ...updatedRecipe,
                              products: recipe.products ?? updatedRecipe.products,
                              inventory: recipe.inventory ?? updatedRecipe.inventory,
                          }
                        : recipe,
                ),
            );
            setSuccessMessage('Đã cập nhật nguyên liệu trong công thức.');
            cancelEditingRecipe();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật công thức.');
        } finally {
            setIsSavingRecipe(null);
        }
    };

    const handleDeleteRecipe = async (recipe: Recipe) => {
        if (!confirm(`Xóa nguyên liệu "${recipe.inventory.name}" khỏi công thức "${recipe.products?.name ?? 'sản phẩm'}"?`)) {
            return;
        }

        setIsDeletingRecipe(recipe.id);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            await catalogService.deleteRecipe(recipe.id);
            setRecipesList((prev) => prev.filter((item) => item.id !== recipe.id));

            if (editingRecipeId === recipe.id) {
                cancelEditingRecipe();
            }

            setSuccessMessage('Đã xóa nguyên liệu khỏi công thức.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa công thức.');
        } finally {
            setIsDeletingRecipe(null);
        }
    };

    const toggleExpandedProduct = (productId: number) => {
        setExpandedProductId((prev) => (prev === productId ? null : productId));
        cancelEditingRecipe();
    };

    const handlePageChange = (nextPage: number) => {
        setCurrentPage(nextPage);
        cancelEditingRecipe();

        const nextGroups = groupedRecipes.slice((nextPage - 1) * RECIPES_PER_PAGE, nextPage * RECIPES_PER_PAGE);

        if (!nextGroups.some((group) => group.product.id === expandedProductId)) {
            setExpandedProductId(null);
        }
    };

    return (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <SectionCard
                title="Tạo Công Thức"
                description="Chọn một sản phẩm đã có, sau đó khai báo các nguyên liệu cần cho một đơn vị sản phẩm."
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">Sản phẩm</span>
                        <select
                            value={selectedProductId}
                            onChange={(event) => setSelectedProductId(event.target.value)}
                            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
                        >
                            <option value="">Chọn sản phẩm</option>
                            {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel-strong)] p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-[var(--foreground)]">Nguyên liệu</p>
                                <p className="mt-1 text-sm text-[var(--muted)]">
                                    Mỗi dòng tương ứng với một nguyên liệu trong công thức.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={addRecipeRow}
                                className="flex items-center gap-2 rounded-2xl border border-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-white"
                            >
                                <Plus className="h-4 w-4" />
                                Thêm Nguyên Liệu
                            </button>
                        </div>

                        <div className="mt-4 space-y-3">
                            {recipes.map((recipe, index) => (
                                <div
                                    key={recipe.id}
                                    className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_auto]"
                                >
                                    <label className="block">
                                        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                                            Nguyên liệu {index + 1}
                                        </span>
                                        <select
                                            value={recipe.inventoryId}
                                            onChange={(event) =>
                                                updateRecipeRow(recipe.id, 'inventoryId', event.target.value)
                                            }
                                            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-sm outline-none"
                                        >
                                            <option value="">Chọn nguyên liệu trong kho</option>
                                            {inventoryItems.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} ({item.unit}) - tồn {displayNumber(item.quantity)}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="block">
                                        <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                                            Số lượng dùng
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={recipe.quantityUsed}
                                            onChange={(event) =>
                                                updateRecipeRow(recipe.id, 'quantityUsed', event.target.value)
                                            }
                                            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-sm outline-none"
                                        />
                                    </label>

                                    <div className="flex items-end">
                                        <button
                                            type="button"
                                            onClick={() => removeRecipeRow(recipe.id)}
                                            disabled={recipes.length === 1}
                                            className="flex items-center gap-2 rounded-2xl border border-[rgba(157,49,49,0.18)] px-4 py-3 text-sm font-semibold text-[var(--danger)] transition hover:bg-[rgba(157,49,49,0.08)] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Xóa
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                        disabled={isSubmitting || products.length === 0 || inventoryItems.length === 0}
                        className="w-full rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isSubmitting ? 'Đang lưu công thức...' : 'Lưu Công Thức'}
                    </button>
                </form>
            </SectionCard>

            <SectionCard
                title="Danh Sách Công Thức"
                description="Danh sách được phân trang, và chỉ hiện chi tiết nguyên liệu khi bạn bấm vào món tương ứng."
            >
                {isLoading ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-6 text-sm text-[var(--muted)]">
                        Đang tải công thức...
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {paginatedGroups.map((group) => {
                            const isExpanded = expandedProductId === group.product.id;

                            return (
                                <div key={group.product.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                                    <button
                                        type="button"
                                        onClick={() => toggleExpandedProduct(group.product.id)}
                                        className="flex w-full items-center justify-between gap-3 text-left"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-medium text-[var(--foreground)]">{group.product.name}</p>
                                            <p className="mt-1 text-xs text-[var(--muted)]">
                                                SKU: {group.product.sku || 'Chưa có SKU'} • {group.ingredients.length} nguyên liệu
                                            </p>
                                        </div>
                                        <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] text-[var(--foreground)]">
                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </span>
                                    </button>

                                    {isExpanded ? (
                                        <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
                                            {group.ingredients.map((ingredient) => {
                                                const isEditing = editingRecipeId === ingredient.id;

                                                return (
                                                    <div
                                                        key={ingredient.id}
                                                        className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] p-3"
                                                    >
                                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                            <div>
                                                                <p className="text-sm font-semibold text-[var(--foreground)]">
                                                                    {ingredient.inventory.name}
                                                                </p>
                                                                <p className="mt-1 text-sm text-[var(--muted)]">
                                                                    Đơn vị: {ingredient.inventory.unit}
                                                                </p>
                                                            </div>

                                                            <div className="flex flex-col gap-2 md:items-end">
                                                                {isEditing ? (
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            step="0.01"
                                                                            value={editingQuantity}
                                                                            onChange={(event) => setEditingQuantity(event.target.value)}
                                                                            className="w-32 rounded-2xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleUpdateRecipe(ingredient.id)}
                                                                            disabled={isSavingRecipe === ingredient.id}
                                                                            className="flex items-center gap-2 rounded-2xl bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60"
                                                                        >
                                                                            <Save className="h-4 w-4" />
                                                                            {isSavingRecipe === ingredient.id ? 'Đang lưu...' : 'Lưu'}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={cancelEditingRecipe}
                                                                            className="flex items-center gap-2 rounded-2xl border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-white"
                                                                        >
                                                                            <X className="h-4 w-4" />
                                                                            Hủy
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm text-[var(--muted)]">
                                                                        Số lượng dùng: {ingredient.quantity_used} {ingredient.inventory.unit}
                                                                    </p>
                                                                )}

                                                                {!isEditing ? (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => startEditingRecipe(ingredient)}
                                                                            className="flex items-center gap-2 rounded-2xl border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-white"
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                            Sửa
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteRecipe(ingredient)}
                                                                            disabled={isDeletingRecipe === ingredient.id}
                                                                            className="flex items-center gap-2 rounded-2xl border border-[rgba(157,49,49,0.18)] px-3 py-2 text-sm font-semibold text-[var(--danger)] transition hover:bg-[rgba(157,49,49,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                            {isDeletingRecipe === ingredient.id ? 'Đang xóa...' : 'Xóa'}
                                                                        </button>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}

                        {groupedRecipes.length > 0 ? (
                            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-[var(--muted)]">
                                    Trang {currentPage}/{totalPages} • {groupedRecipes.length} món có công thức
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--panel)] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Trang trước
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="rounded-2xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--panel)] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Trang sau
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {recipesList.length === 0 ? (
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-6 text-center text-sm text-[var(--muted)]">
                                Chưa có công thức nào.
                            </div>
                        ) : null}
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
