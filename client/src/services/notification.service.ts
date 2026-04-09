import axiosInstance from '@/lib/axios';
import type { ApiResponse, Notification } from '@/types/api';

const getPayload = <T>(response: ApiResponse<T>): T => response.metadata ?? response.data!;

const notificationService = {
  async getMyNotifications(): Promise<Notification[]> {
    const response = await axiosInstance.get<ApiResponse<Notification[]>>('/user/notifications')
    return getPayload(response.data)
  },

  async markAsRead(id: number): Promise<Notification> {
    const response = await axiosInstance.patch<ApiResponse<Notification>>(
      `/user/notifications/${id}/read`
    )
    return getPayload(response.data)
  },

  async markAllAsRead(): Promise<{ count: number }> {
    const response = await axiosInstance.patch<ApiResponse<{ count: number }>>('/user/notifications/read-all')
    return getPayload(response.data)
  },

  async deleteNotification(id: number): Promise<Notification> {
    const response = await axiosInstance.delete<ApiResponse<Notification>>(`/user/notifications/${id}`)
    return getPayload(response.data)
  },

  async clearNotifications(): Promise<{ count: number }> {
    const response = await axiosInstance.delete<ApiResponse<{ count: number }>>('/user/notifications')
    return getPayload(response.data)
  },
}

export default notificationService
