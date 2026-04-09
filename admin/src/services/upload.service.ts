import axiosInstance from "@/lib/axios"
import type { ApiResponse } from "@/types/api"

interface UploadImageResponse {
  url: string
  publicId: string
  width?: number
  height?: number
}

const getPayload = <T>(response: ApiResponse<T>): T =>
  response.metadata ?? response.data!

const uploadService = {
  async uploadProductImage(file: File): Promise<UploadImageResponse> {
    const formData = new FormData()
    formData.append("image", file)

    const response = await axiosInstance.post<ApiResponse<UploadImageResponse>>(
      "/admin/uploads/image",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    )

    return getPayload(response.data)
  },
}

export default uploadService
