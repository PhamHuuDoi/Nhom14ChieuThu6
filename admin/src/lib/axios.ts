import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios"

const getReadableErrorMessage = (error: AxiosError) => {
  const responseData = error.response?.data as
    | { message?: string; errors?: Record<string, string[]> }
    | string
    | undefined

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData.trim()
  }

  if (
    responseData &&
    typeof responseData === "object" &&
    typeof responseData.message === "string" &&
    responseData.message.trim()
  ) {
    return responseData.message.trim()
  }

  if (
    responseData &&
    typeof responseData === "object" &&
    responseData.errors &&
    typeof responseData.errors === "object"
  ) {
    const firstFieldError = Object.values(responseData.errors)
      .flat()
      .find((message) => typeof message === "string" && message.trim())

    if (firstFieldError) {
      return firstFieldError.trim()
    }
  }

  if (typeof error.message === "string" && error.message.trim()) {
    return error.message.trim()
  }

  return "Something went wrong. Please try again."
}

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
})

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const shouldSkipAuthRedirect =
      (error.config as InternalAxiosRequestConfig & {
        skipAuthRedirect?: boolean
      } | null)?.skipAuthRedirect ?? false

    if (error.response?.status === 401 && typeof window !== "undefined") {
      const currentPath = window.location.pathname
      const isAuthPage = currentPath === "/login"

      if (!isAuthPage && !shouldSkipAuthRedirect) {
        window.location.href = "/login"
      }
    }

    return Promise.reject(new Error(getReadableErrorMessage(error)))
  }
)

export default axiosInstance
