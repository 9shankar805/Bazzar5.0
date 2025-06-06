declare module '@/hooks/use-auth' {
    interface User {
        id: string;
        email: string;
        fullName: string;
        role: 'customer' | 'store_owner' | 'admin' | 'super_admin';
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

    export const useAuth: () => AuthState;
    export const hasPermission: (requiredPermissions: string[]) => boolean;
    export const hasAdminAccess: () => boolean;
} 