import axiosInstance from '@/lib/axios';
import type { ApiResponse, Category, Coupon, DashboardData, InventoryItem, Order, Product, Recipe, User } from '@/types/api';

const getPayload = <T>(response: ApiResponse<T>): T => response.metadata ?? response.data!;

const normalizeOrder = (order: Order & { users?: Order['user'] }): Order => ({
    ...order,
    user: order.user ?? order.users,
});

const catalogService = {
    async getCategories(): Promise<Category[]> {
        const response = await axiosInstance.get<ApiResponse<Category[]>>('/admin/categories');

        return getPayload(response.data);
    },

    async getDashboard(): Promise<DashboardData> {
        const response = await axiosInstance.get<ApiResponse<DashboardData>>('/admin/dashboard');
        const payload = getPayload(response.data);

        return {
            ...payload,
            recentOrders: (payload.recentOrders ?? []).map((order) =>
                normalizeOrder(order as Order & { users?: Order['user'] })
            ),
        };
    },

    async getCoupons(): Promise<Coupon[]> {
        const response = await axiosInstance.get<ApiResponse<Coupon[]>>('/admin/coupons');
        return getPayload(response.data);
    },

    async createCoupon(data: {
        code: string;
        name: string;
        description?: string;
        discountType: 'percentage' | 'fixed';
        discountValue: number;
        minOrderValue?: number;
        maxDiscountAmount?: number;
        usageLimit?: number;
        startsAt?: string;
        expiresAt?: string;
        status?: 'active' | 'inactive';
    }): Promise<Coupon> {
        const response = await axiosInstance.post<ApiResponse<Coupon>>('/admin/coupons', data);
        return getPayload(response.data);
    },

    async updateCoupon(id: number, data: Partial<Coupon> & {
        discountType?: 'percentage' | 'fixed';
        discountValue?: number;
        minOrderValue?: number;
        maxDiscountAmount?: number;
        usageLimit?: number;
        startsAt?: string;
        expiresAt?: string;
    }): Promise<Coupon> {
        const response = await axiosInstance.put<ApiResponse<Coupon>>(`/admin/coupons/${id}`, data);
        return getPayload(response.data);
    },

    async toggleCouponStatus(id: number): Promise<Coupon> {
        const response = await axiosInstance.patch<ApiResponse<Coupon>>(`/admin/coupons/${id}/status`);
        return getPayload(response.data);
    },

    async deleteCoupon(id: number): Promise<void> {
        await axiosInstance.delete(`/admin/coupons/${id}`);
    },

    async createCategory(data: { name: string; status?: 'active' | 'inactive' }): Promise<Category> {
        const response = await axiosInstance.post<ApiResponse<Category>>('/admin/categories', data);

        return getPayload(response.data);
    },

    async getProducts(): Promise<Product[]> {
        const response = await axiosInstance.get<
            ApiResponse<{
                products: Product[];
                total: number;
                page: number;
                limit: number;
            }>
        >('/admin/products');

        const payload = getPayload(response.data);

        return Array.isArray(payload) ? payload : (payload.products ?? []);
    },

    async getInventory(): Promise<InventoryItem[]> {
        const response = await axiosInstance.get<ApiResponse<InventoryItem[]>>('/admin/inventory');

        return getPayload(response.data);
    },

    async createInventory(data: {
        name: string;
        unit: string;
        quantity?: number;
        minQuantity?: number;
        costPrice?: number;
        supplierName?: string;
        status?: 'available' | 'out_of_stock';
    }): Promise<InventoryItem> {
        const response = await axiosInstance.post<ApiResponse<InventoryItem>>('/admin/inventory', data);

        return getPayload(response.data);
    },

    async createProduct(data: {
        name: string;
        categoryId: number;
        price: number;
        image?: string;
        description?: string;
        sku?: string;
        status?: 'available' | 'out_of_stock' | 'discontinued';
    }): Promise<Product> {
        const response = await axiosInstance.post<ApiResponse<Product>>('/admin/products', data);

        return getPayload(response.data);
    },

    async getRecipes(): Promise<Recipe[]> {
        const response = await axiosInstance.get<ApiResponse<Recipe[]>>('/admin/recipes');

        return getPayload(response.data);
    },

    async createRecipe(data: {
        productId: number;
        recipes: Array<{
            inventoryId: number;
            quantityUsed: number;
        }>;
    }): Promise<Product> {
        const response = await axiosInstance.post<ApiResponse<Product>>('/admin/recipes', data);

        return getPayload(response.data);
    },

    async getUsers(): Promise<User[]> {
        const response = await axiosInstance.get<ApiResponse<User[]>>('/admin/users');

        return getPayload(response.data);
    },

    async updateUserRole(id: number, role: 'customer' | 'admin'): Promise<User> {
        const response = await axiosInstance.patch<ApiResponse<User>>(`/admin/users/${id}`, { role });
        return getPayload(response.data);
    },

    async deleteUser(id: number): Promise<void> {
        await axiosInstance.delete(`/admin/users/${id}`);
    },

    async getOrders(): Promise<Order[]> {
        const response = await axiosInstance.get<ApiResponse<Order[]>>('/admin/orders');
        return getPayload(response.data).map((order) => normalizeOrder(order as Order & { users?: Order['user'] }));
    },

    async updateOrderStatus(id: number, status: Order['order_status']): Promise<Order> {
            const response = await axiosInstance.patch<ApiResponse<Order>>(`/admin/orders/${id}/status`, {
            status,
        });
        return normalizeOrder(getPayload(response.data) as Order & { users?: Order['user'] });
    },

    async updateOrderPaymentStatus(id: number, paymentStatus: Order['payment_status']): Promise<Order> {
        const response = await axiosInstance.patch<ApiResponse<Order>>(`/admin/orders/${id}/payment`, {
            paymentStatus,
        });
        return normalizeOrder(getPayload(response.data) as Order & { users?: Order['user'] });
    },

    async updateCategory(id: number, data: Partial<Category>): Promise<Category> {
        const response = await axiosInstance.put<ApiResponse<Category>>(`/admin/categories/${id}`, data);
        return getPayload(response.data);
    },

    async deleteCategory(id: number): Promise<void> {
        await axiosInstance.delete(`/admin/categories/${id}`);
    },

    async updateProduct(id: number, data: {
        name?: string;
        categoryId?: number;
        price?: number;
        image?: string | null;
        description?: string | null;
        sku?: string | null;
        status?: 'available' | 'out_of_stock' | 'discontinued';
    }): Promise<Product> {
        const response = await axiosInstance.put<ApiResponse<Product>>(`/admin/products/${id}`, data);
        return getPayload(response.data);
    },

    async toggleProductStatus(id: number): Promise<Product> {
        const response = await axiosInstance.patch<ApiResponse<Product>>(`/admin/products/${id}/status`);
        return getPayload(response.data);
    },

    async deleteProduct(id: number): Promise<void> {
        await axiosInstance.delete(`/admin/products/${id}`);
    },

    async updateInventory(id: number, data: Partial<InventoryItem>): Promise<InventoryItem> {
        const response = await axiosInstance.put<ApiResponse<InventoryItem>>(`/admin/inventory/${id}`, data);
        return getPayload(response.data);
    },

    async toggleInventoryStatus(id: number): Promise<InventoryItem> {
        const response = await axiosInstance.patch<ApiResponse<InventoryItem>>(`/admin/inventory/${id}/status`);
        return getPayload(response.data);
    },

    async deleteInventory(id: number): Promise<void> {
        await axiosInstance.delete(`/admin/inventory/${id}`);
    },

    async updateRecipe(id: number, data: { quantity_used: number }): Promise<Recipe> {
        const response = await axiosInstance.put<ApiResponse<Recipe>>(`/admin/recipes/${id}`, data);
        return getPayload(response.data);
    },

    async deleteRecipe(id: number): Promise<void> {
        await axiosInstance.delete(`/admin/recipes/${id}`);
    },
};

export default catalogService;
