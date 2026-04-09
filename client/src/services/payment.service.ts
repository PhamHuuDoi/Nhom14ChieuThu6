import axiosInstance from "@/lib/axios"
import type { ApiResponse, Order, PaymentMethod } from "@/types/api"

interface PaymentInitiationResponse extends Order {
  paymentUrl?: string | null
}

const getPayload = <T>(response: ApiResponse<T>): T => response.metadata ?? response.data!

export const paymentService = {
  async initiate(orderId: string | number, paymentMethod: Exclude<PaymentMethod, "cod">) {
    const response = await axiosInstance.post<ApiResponse<PaymentInitiationResponse>>(
      `/user/payments/${orderId}/initiate`,
      { paymentMethod }
    )

    return getPayload(response.data)
  },
}

export default paymentService
