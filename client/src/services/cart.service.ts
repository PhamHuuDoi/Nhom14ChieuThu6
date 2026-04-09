import axiosInstance from "@/lib/axios"
import type {
  AddToCartData,
  ApiResponse,
  Cart,
  CartItem,
  UpdateCartQuantityData,
} from "@/types/api"

const CART_ENDPOINTS = {
  GET_CART: "/user/cart",
  ADD_TO_CART: "/user/cart/items",
  UPDATE_QUANTITY: (id: string) => `/user/cart/items/${id}`,
  REMOVE_ITEM: (id: string) => `/user/cart/items/${id}`,
  CLEAR_CART: "/user/cart/clear",
}

const getPayload = <T>(response: ApiResponse<T>): T => response.metadata ?? response.data!

export const cartService = {
  /**
   * Get current user's cart
   */
  async getCart(): Promise<Cart> {
    const response = await axiosInstance.get<ApiResponse<Cart>>(
      CART_ENDPOINTS.GET_CART
    )
    return getPayload(response.data)
  },

  /**
   * Add product to cart
   */
  async addToCart(data: AddToCartData): Promise<CartItem> {
    const response = await axiosInstance.post<ApiResponse<CartItem>>(
      CART_ENDPOINTS.ADD_TO_CART,
      data
    )
    return getPayload(response.data)
  },

  /**
   * Update cart item quantity
   */
  async updateCartQuantity(
    id: string,
    data: UpdateCartQuantityData
  ): Promise<CartItem | null> {
    const response = await axiosInstance.patch<ApiResponse<CartItem>>(
      CART_ENDPOINTS.UPDATE_QUANTITY(id),
      data
    )
    return getPayload(response.data)
  },

  /**
   * Remove item from cart
   */
  async removeFromCart(id: string): Promise<void> {
    await axiosInstance.delete(CART_ENDPOINTS.REMOVE_ITEM(id))
  },

  /**
   * Clear entire cart
   */
  async clearCart(): Promise<void> {
    await axiosInstance.delete(CART_ENDPOINTS.CLEAR_CART)
  },
}

export default cartService
