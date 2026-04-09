import axiosInstance from '@/lib/axios';
import type { ApiResponse, ShippingQuote, StoreLocation } from '@/types/api';

const SHIPPING_ENDPOINTS = {
  STORE_LOCATION: '/user/store-location',
  STORE_LOCATIONS: '/user/store-locations',
  LEGACY_STORE_LOCATION: '/shipping/store-location',
  LEGACY_STORE_LOCATIONS: '/shipping/store-locations',
  FEE: '/shipping/fee',
};

const getPayload = <T>(response: ApiResponse<T>): T => response.metadata ?? response.data!;

export const shippingService = {
  async getStoreLocation(): Promise<StoreLocation> {
    try {
      const response = await axiosInstance.get<ApiResponse<StoreLocation>>(SHIPPING_ENDPOINTS.STORE_LOCATION);
      return getPayload(response.data);
    } catch {
      const response = await axiosInstance.get<ApiResponse<StoreLocation>>(SHIPPING_ENDPOINTS.LEGACY_STORE_LOCATION);
      return getPayload(response.data);
    }
  },

  async getStoreLocations(): Promise<StoreLocation[]> {
    try {
      const response = await axiosInstance.get<ApiResponse<StoreLocation[]>>(
        SHIPPING_ENDPOINTS.STORE_LOCATIONS
      );
      return getPayload(response.data);
    } catch {
      const response = await axiosInstance.get<ApiResponse<StoreLocation[]>>(
        SHIPPING_ENDPOINTS.LEGACY_STORE_LOCATIONS
      );
      return getPayload(response.data);
    }
  },

  async getFee(payload: {
    customerLatitude: number;
    customerLongitude: number;
  }): Promise<ShippingQuote> {
    const response = await axiosInstance.post<ApiResponse<ShippingQuote>>(SHIPPING_ENDPOINTS.FEE, payload);
    return getPayload(response.data);
  },
};

export default shippingService;
