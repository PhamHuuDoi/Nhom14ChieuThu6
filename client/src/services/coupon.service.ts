import axiosInstance from "@/lib/axios"
import type { ApiResponse, CouponValidationResult } from "@/types/api"

const getPayload = <T>(response: ApiResponse<T>): T => response.metadata ?? response.data!

export const couponService = {
  async validate(code: string, subtotal: number): Promise<CouponValidationResult> {
    const response = await axiosInstance.post<ApiResponse<CouponValidationResult>>(
      "/user/coupons/validate",
      {
        code,
        subtotal,
      }
    )

    return getPayload(response.data)
  },
}

export default couponService
