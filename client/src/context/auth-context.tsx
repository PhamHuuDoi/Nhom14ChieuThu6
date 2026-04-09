'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import authService from '@/services/auth.service';
import type { LoginData, RegisterData, User } from '@/types/api';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (data: LoginData) => Promise<User>;
    register: (data: RegisterData) => Promise<User>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<User | null>;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
            return currentUser;
        } catch {
            setUser(null);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    const login = useCallback(async (data: LoginData) => {
        const loggedInUser = await authService.login(data);
        setUser(loggedInUser);
        return loggedInUser;
    }, []);

    const register = useCallback(async (data: RegisterData) => {
        const registeredUser = await authService.register(data);
        setUser(registeredUser);
        return registeredUser;
    }, []);

    const logout = useCallback(async () => {
        await authService.logout();
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({
            user,
            isLoading,
            login,
            register,
            logout,
            refreshUser,
            setUser,
        }),
        [user, isLoading, login, register, logout, refreshUser, setUser],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}
