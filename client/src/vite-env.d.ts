/// <reference types="vite/client" />

declare module '*.jpg' {
    const src: string;
    export default src;
}

declare module '*.jpeg' {
    const src: string;
    export default src;
}

declare module '*.png' {
    const src: string;
    export default src;
}

declare module '*.svg' {
    const src: string;
    export default src;
}

declare module '@shared/schema' {
    export interface User {
        id: string;
        email: string;
        name: string;
        fullName: string;
        phone?: string;
        address?: string;
        createdAt?: string;
        role: 'customer' | 'store_owner' | 'admin' | 'super_admin';
        permissions?: string[];
        lastLogin?: string;
    }

    export interface Product {
        id: string;
        name: string;
        description: string;
        price: number;
        originalPrice?: number;
        images: string[];
        categoryId: string | number;
        storeId: string;
        stock?: number;
        isFastSell?: boolean;
        isOnOffer?: boolean;
        offerPercentage?: number;
        offerEndDate?: string;
        specifications?: string[];
        features?: string[];
        tags?: string[];
        isActive?: boolean;
        rating?: number;
        totalReviews?: number;
        createdAt?: string;
    }

    export interface Store {
        id: string;
        name: string;
        description: string;
        address: string;
        images: string[];
        ownerId: string;
        logo?: string;
        coverImage?: string;
        phone?: string;
        rating?: number;
        totalReviews?: number;
        isActive?: boolean;
        latitude?: number;
        longitude?: number;
    }

    export interface Notification {
        id: string | number;
        userId: string | number;
        message: string;
        createdAt: string;
        read: boolean;
    }

    export interface Order {
        id: string;
        customerId: string;
        storeId: string;
        items: OrderItem[];
        total: number;
        status: string;
        createdAt: string;
        updatedAt?: string;
    }

    export interface OrderItem {
        id: string;
        orderId: string;
        productId: string;
        quantity: number;
        price: number;
        product?: Product;
    }

    export interface Category {
        id: string | number;
        name: string;
        description?: string;
        image?: string;
    }

    export interface ReturnPolicy {
        id: string;
        storeId: string;
        description: string;
        days: number;
    }

    export interface Return {
        id: string;
        orderId: string;
        productId: string;
        reason: string;
        status: string;
        createdAt: string;
    }

    export interface CartItemWithProduct {
        id: string;
        productId: string;
        quantity: number;
        product: Product;
    }

    export interface WishlistItemWithProduct {
        id: string;
        productId: string;
        product: Product;
    }

    export interface CartItem {
        id: string;
        productId: string;
        quantity: number;
    }

    export interface WishlistItem {
        id: string;
        productId: string;
    }

    export interface InsertCategory {
        name: string;
        description?: string;
        image?: string;
    }
} 