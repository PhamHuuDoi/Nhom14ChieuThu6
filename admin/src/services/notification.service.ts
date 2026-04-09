import axiosInstance from '@/lib/axios';
import type { ApiResponse, Notification } from '@/types/api';

const getPayload = <T>(response: ApiResponse<T>): T => response.metadata ?? response.data!;

const notificationService = {
    async getAdminNotifications(): Promise<Notification[]> {
        const response = await axiosInstance.get<ApiResponse<Notification[]>>('/admin/notifications');
        return getPayload(response.data);
    },

    async markAdminNotificationAsRead(id: number): Promise<Notification> {
        const response = await axiosInstance.patch<ApiResponse<Notification>>(`/admin/notifications/${id}/read`);
        return getPayload(response.data);
    },

    async markAllAdminNotificationsAsRead(): Promise<{ count: number }> {
        const response = await axiosInstance.patch<ApiResponse<{ count: number }>>('/admin/notifications/read-all');
        return getPayload(response.data);
    },

    async deleteAdminNotification(id: number): Promise<Notification> {
        const response = await axiosInstance.delete<ApiResponse<Notification>>(`/admin/notifications/${id}`);
        return getPayload(response.data);
    },

    async clearAdminNotifications(): Promise<{ count: number }> {
        const response = await axiosInstance.delete<ApiResponse<{ count: number }>>('/admin/notifications');
        return getPayload(response.data);
    },
};

export default notificationService;
