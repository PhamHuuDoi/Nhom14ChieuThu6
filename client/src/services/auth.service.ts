import axiosInstance from "@/lib/axios"
import type {
  ApiResponse,
  AuthResponse,
  LoginData,
  RegisterData,
  User,
} from "@/types/api"

const AUTH_ENDPOINTS = {
  LOGIN: "/user/login",
  REGISTER: "/user/register",
  CURRENT_USER: "/user/auth",
  UPDATE_PROFILE: "/user/profile",
  LOGOUT: "/user/logout",
  RESET_PASSWORD: "/user/reset-password",
  VERIFY_RESET_PASSWORD: "/user/verify-reset-password",
  GOOGLE: "/user/google",
}

const resolveApiBaseUrl = () => {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim()

  if (!configuredBaseUrl) {
    return "http://localhost:5000/api"
  }

  const isRelativeApiPath = configuredBaseUrl.startsWith("/")

  if (isRelativeApiPath && typeof window !== "undefined") {
    const { hostname } = window.location
    const isLocalHost =
      hostname === "localhost" || hostname === "127.0.0.1"

    if (isLocalHost) {
      return "http://localhost:5000/api"
    }
  }

  return configuredBaseUrl
}

const getPayload = <T>(response: ApiResponse<T>): T => response.metadata ?? response.data!

export const authService = {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await axiosInstance.post<ApiResponse<AuthResponse>>(
      AUTH_ENDPOINTS.LOGIN,
      data
    )

    return getPayload(response.data)
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await axiosInstance.post<ApiResponse<AuthResponse>>(
      AUTH_ENDPOINTS.REGISTER,
      data
    )

    return getPayload(response.data)
  },

  async getCurrentUser(): Promise<User> {
    const response = await axiosInstance.get<ApiResponse<User>>(
      AUTH_ENDPOINTS.CURRENT_USER,
      {
        skipAuthRedirect: true,
      } as never
    )

    return getPayload(response.data)
  },

  async updateProfile(data: {
    name: string
    phone?: string
    address?: string
    latitude?: number
    longitude?: number
  }): Promise<User> {
    const response = await axiosInstance.put<ApiResponse<User>>(
      AUTH_ENDPOINTS.UPDATE_PROFILE,
      data
    )

    return getPayload(response.data)
  },

  async logout(): Promise<void> {
    await axiosInstance.get(AUTH_ENDPOINTS.LOGOUT)
  },

  async requestPasswordReset(data: {
    oldPassword: string
    newPassword: string
  }): Promise<boolean> {
    const response = await axiosInstance.post<ApiResponse<boolean>>(
      AUTH_ENDPOINTS.RESET_PASSWORD,
      data
    )

    return getPayload(response.data)
  },

  async verifyPasswordReset(data: { otp: string }): Promise<boolean> {
    const response = await axiosInstance.post<ApiResponse<boolean>>(
      AUTH_ENDPOINTS.VERIFY_RESET_PASSWORD,
      data
    )

    return getPayload(response.data)
  },

  loginWithGoogle(): void {
    const baseUrl = resolveApiBaseUrl()

    window.location.href = `${baseUrl}${AUTH_ENDPOINTS.GOOGLE}`
  },
}

export default authService
