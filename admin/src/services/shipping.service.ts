import axiosInstance from "@/lib/axios"
import type { ApiResponse, StoreLocation } from "@/types/api"

const getPayload = <T>(response: ApiResponse<T>): T =>
  response.metadata ?? response.data!

const shippingService = {
  async getStoreLocations(): Promise<StoreLocation[]> {
    const response = await axiosInstance.get<ApiResponse<StoreLocation[]>>(
      "/admin/store-locations"
    )

    return getPayload(response.data)
  },

  async createStoreLocation(data: {
    name: string
    phone?: string
    address: string
    latitude?: number | null
    longitude?: number | null
  }): Promise<StoreLocation> {
    const response = await axiosInstance.post<ApiResponse<StoreLocation>>(
      "/admin/store-locations",
      data
    )

    return getPayload(response.data)
  },

  async setPrimaryStoreLocation(id: number): Promise<StoreLocation> {
    const response = await axiosInstance.patch<ApiResponse<StoreLocation>>(
      `/admin/store-locations/${id}/primary`
    )

    return getPayload(response.data)
  },
}

export default shippingService
