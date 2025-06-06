declare module '@/types/analytics' {
    export interface AnalyticsData {
        totalRevenue: number;
        totalOrders: number;
        averageOrderValue: number;
        conversionRate: number;
        dailySales: Array<{
            date: string;
            amount: number;
        }>;
    }

    export interface UserStats {
        activeUsers: number;
        roleDistribution: Array<{
            name: string;
            value: number;
        }>;
    }

    export interface ProductStats {
        topProducts: Array<{
            name: string;
            sales: number;
        }>;
    }

    export interface Visit {
        page: string;
        visitedAt: string;
        ipAddress: string;
    }
} 