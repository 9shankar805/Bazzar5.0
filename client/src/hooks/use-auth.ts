import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    email: string;
    fullName: string;
    role: 'admin' | 'store_owner' | 'customer';
    permissions: string[];
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    token: string | null;
    setUser: (user: User | null) => void;
    setToken: (token: string | null) => void;
    logout: () => void;
}

export const useAuth = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isAdmin: false,
            token: null,
            setUser: (user) => set({
                user,
                isAuthenticated: !!user,
                isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
            }),
            setToken: (token) => set({ token }),
            logout: () => set({
                user: null,
                isAuthenticated: false,
                isAdmin: false,
                token: null,
            }),
        }),
        {
            name: 'auth-storage',
        }
    )
);

// Helper function to check if user has required permissions
export const hasPermission = (user: User | null, requiredPermissions: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return requiredPermissions.every(permission => user.permissions.includes(permission));
};

// Helper function to check if user has admin access
export const hasAdminAccess = (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'super_admin';
}; 