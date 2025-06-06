declare module '@/types/admin' {
    export interface AdminAuth {
        email: string;
        password: string;
    }

    export interface AdminUser {
        id: string;
        email: string;
        fullName: string;
        role: 'super_admin' | 'admin';
        permissions: string[];
        lastLogin: string;
    }

    export interface AdminSettings {
        general: {
            siteName: string;
            siteDescription: string;
            maintenanceMode: boolean;
        };
        notifications: {
            emailNotifications: boolean;
            orderNotifications: boolean;
            userNotifications: boolean;
        };
        security: {
            twoFactorAuth: boolean;
            sessionTimeout: number;
            passwordPolicy: {
                minLength: number;
                requireSpecialChars: boolean;
                requireNumbers: boolean;
            };
        };
    }
} 