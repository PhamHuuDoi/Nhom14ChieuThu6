import axiosInstance from "@/lib/axios"
import type {
  ApiResponse,
  CheckoutData,
  Order,
  OrdersResponse,
} from "@/types/api"

const ORDER_ENDPOINTS = {
  CHECKOUT: "/user/orders/checkout",
  GET_ORDERS: "/user/orders",
  GET_ORDER_BY_ID: (id: string) => `/user/orders/${id}`,
  CANCEL_ORDER: (id: string) => `/user/orders/${id}/cancel`,
  CONFIRM_RECEIVED: (id: string) => `/user/orders/${id}/confirm-received`,
}

export interface GetOrdersParams {
  page?: number
  limit?: number
  status?: string
}

const getPayload = <T>(response: ApiResponse<T>): T => response.metadata ?? response.data!

const normalizeOrder = (order: Order & { users?: Order["user"] }): Order => ({
  ...order,
  user: order.user ?? order.users,
})

export const orderService = {
  /**
   * Create new order from cart (checkout)
   */
  async checkout(data: CheckoutData): Promise<Order> {
    const response = await axiosInstance.post<ApiResponse<Order>>(
      ORDER_ENDPOINTS.CHECKOUT,
      data
    )
    return normalizeOrder(getPayload(response.data) as Order & { users?: Order["user"] })
  },

  /**
   * Get user's orders with optional pagination and filters
   */
  async getOrders(params?: GetOrdersParams): Promise<OrdersResponse> {
    const response = await axiosInstance.get<ApiResponse<Order[]>>(
      `${ORDER_ENDPOINTS.GET_ORDERS}/my-orders`,
      { params }
    )
    const orders = getPayload(response.data).map((order) =>
      normalizeOrder(order as Order & { users?: Order["user"] })
    )
    return { orders, total: orders.length }
  },

  /**
   * Get single order by ID
   */
  async getOrderById(id: string): Promise<Order> {
    const response = await axiosInstance.get<ApiResponse<Order>>(
      ORDER_ENDPOINTS.GET_ORDER_BY_ID(id)
    )
    return normalizeOrder(getPayload(response.data) as Order & { users?: Order["user"] })
  },

  /**
   * Cancel an order
   */
  async cancelOrder(id: string): Promise<Order> {
    const response = await axiosInstance.post<ApiResponse<Order>>(
      ORDER_ENDPOINTS.CANCEL_ORDER(id)
    )
    return normalizeOrder(getPayload(response.data) as Order & { users?: Order["user"] })
  },

  async confirmReceived(id: string): Promise<Order> {
    const response = await axiosInstance.post<ApiResponse<Order>>(
      ORDER_ENDPOINTS.CONFIRM_RECEIVED(id)
    )
    return normalizeOrder(getPayload(response.data) as Order & { users?: Order["user"] })
  },
}

export default orderService
