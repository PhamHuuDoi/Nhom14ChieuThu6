import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';

const resolveApiBaseUrl = () => {
    if (!process.env.NEXT_PUBLIC_API_URL) {
        throw new Error('Missing NEXT_PUBLIC_API_URL');
    }
    return process.env.NEXT_PUBLIC_API_URL;
};

const getReadableErrorMessage = (error: AxiosError) => {
    const responseData = error.response?.data as
        | { message?: string; errors?: Record<string, string[]> }
        | string
        | undefined;

    if (typeof responseData === 'string' && responseData.trim()) {
        return responseData.trim();
    }

    if (
        responseData &&
        typeof responseData === 'object' &&
        typeof responseData.message === 'string' &&
        responseData.message.trim()
    ) {
        return responseData.message.trim();
    }

    if (
        responseData &&
        typeof responseData === 'object' &&
        responseData.errors &&
        typeof responseData.errors === 'object'
    ) {
        const firstFieldError = Object.values(responseData.errors)
            .flat()
            .find((message) => typeof message === 'string' && message.trim());

        if (firstFieldError) {
            return firstFieldError.trim();
        }
    }

    if (typeof error.message === 'string' && error.message.trim()) {
        return error.message.trim();
    }

    return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
};

const axiosInstance = axios.create({
    timeout: 15000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        config.baseURL = resolveApiBaseUrl();
        console.log('[Axios Request]', config.method?.toUpperCase(), config.baseURL + config.url, config.params);
        return config;
    },
    (error: AxiosError) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        console.error('[Axios Error]', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url,
            fullUrl: `${error.config?.baseURL || ''}${error.config?.url || ''}`,
        });

        const shouldSkipAuthRedirect =
            (
                error.config as
                    | (InternalAxiosRequestConfig & {
                          skipAuthRedirect?: boolean;
                      })
                    | null
            )?.skipAuthRedirect ?? false;

        if (error.response?.status === 401 && typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            const isAuthPage = currentPath === '/login' || currentPath === '/register';

            if (!isAuthPage && !shouldSkipAuthRedirect) {
                window.location.href = '/login';
            }
        }

        const errorMessage = getReadableErrorMessage(error);
        return Promise.reject(new Error(errorMessage));
    },
);

export default axiosInstance;
