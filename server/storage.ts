import {
  users, stores, categories, products, orders, orderItems, cartItems, wishlistItems,
  admins, websiteVisits, notifications, orderTracking, returnPolicies, returns,
  type User, type InsertUser, type Store, type InsertStore,
  type Category, type InsertCategory, type Product, type InsertProduct,
  type Order, type InsertOrder, type OrderItem, type InsertOrderItem,
  type CartItem, type InsertCartItem, type WishlistItem, type InsertWishlistItem,
  type Admin, type InsertAdmin, type WebsiteVisit, type InsertWebsiteVisit,
  type Notification, type InsertNotification, type OrderTracking, type InsertOrderTracking,
  type ReturnPolicy, type InsertReturnPolicy, type Return, type InsertReturn
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ilike, or, desc, count, sql, gte } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Store operations
  getStore(id: number): Promise<Store | undefined>;
  getStoresByOwnerId(ownerId: number): Promise<Store[]>;
  getAllStores(): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, updates: Partial<InsertStore>): Promise<Store | undefined>;

  // Category operations
  getAllCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Product operations
  getProduct(id: number): Promise<Product | undefined>;
  getProductsByStoreId(storeId: number): Promise<Product[]>;
  getAllProducts(): Promise<Product[]>;
  getProductsByCategory(categoryId: number): Promise<Product[]>;
  searchProducts(query: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Order operations
  getOrder(id: number): Promise<Order | undefined>;
  getOrdersByCustomerId(customerId: number): Promise<Order[]>;
  getOrdersByStoreId(storeId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;

  // Order item operations
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;

  // Cart operations
  getCartItems(userId: number): Promise<CartItem[]>;
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: number): Promise<boolean>;
  clearCart(userId: number): Promise<boolean>;

  // Wishlist operations
  getWishlistItems(userId: number): Promise<WishlistItem[]>;
  addToWishlist(wishlistItem: InsertWishlistItem): Promise<WishlistItem>;
  removeFromWishlist(id: number): Promise<boolean>;
  isInWishlist(userId: number, productId: number): Promise<boolean>;

  // Admin operations
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;

  // Website visit tracking
  recordVisit(visit: InsertWebsiteVisit): Promise<WebsiteVisit>;
  getVisitStats(days?: number): Promise<any>;
  getPageViews(page?: string): Promise<WebsiteVisit[]>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<boolean>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;

  // Order tracking
  createOrderTracking(tracking: InsertOrderTracking): Promise<OrderTracking>;
  getOrderTracking(orderId: number): Promise<OrderTracking[]>;
  updateOrderTracking(orderId: number, status: string, description?: string, location?: string): Promise<OrderTracking>;

  // Return policy
  createReturnPolicy(policy: InsertReturnPolicy): Promise<ReturnPolicy>;
  getReturnPolicy(storeId: number): Promise<ReturnPolicy | undefined>;
  updateReturnPolicy(storeId: number, updates: Partial<InsertReturnPolicy>): Promise<ReturnPolicy | undefined>;

  // Returns
  createReturn(returnItem: InsertReturn): Promise<Return>;
  getReturn(id: number): Promise<Return | undefined>;
  getReturnsByCustomer(customerId: number): Promise<Return[]>;
  getReturnsByStore(storeId: number): Promise<Return[]>;
  updateReturnStatus(id: number, status: string): Promise<Return | undefined>;

  // Distance calculation between stores and user location
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
  getStoresWithDistance(userLat: number, userLon: number): Promise<(Store & { distance: number })[]>;
}

export class DatabaseStorage implements IStorage {

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updatedUser;
  }

  // Store operations
  async getStore(id: number): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store;
  }

  async getStoresByOwnerId(ownerId: number): Promise<Store[]> {
    return await db.select().from(stores).where(eq(stores.ownerId, ownerId));
  }

  async getAllStores(): Promise<Store[]> {
    return await db.select().from(stores);
  }

  async createStore(store: InsertStore): Promise<Store> {
    const [newStore] = await db.insert(stores).values(store).returning();
    return newStore;
  }

  async updateStore(id: number, updates: Partial<InsertStore>): Promise<Store | undefined> {
    const [updatedStore] = await db.update(stores).set(updates).where(eq(stores.id, id)).returning();
    return updatedStore;
  }

  // Category operations
  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updatedCategory] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Product operations
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductsByStoreId(storeId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.storeId, storeId));
  }

  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.categoryId, categoryId));
  }

  async searchProducts(query: string): Promise<Product[]> {
    return await db.select().from(products).where(
      or(
        ilike(products.name, `%${query}%`),
        ilike(products.description, `%${query}%`)
      )
    );
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Order operations
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByCustomerId(customerId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt));
  }

  async getOrdersByStoreId(storeId: number): Promise<Order[]> {
    // Use a simple approach - get all orders and filter on the backend for now
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

    // Filter orders that have items from this store
    const storeOrders = [];
    for (const order of allOrders) {
      const orderItemsForStore = await db.select().from(orderItems)
        .where(and(eq(orderItems.orderId, order.id), eq(orderItems.storeId, storeId)));

      if (orderItemsForStore.length > 0) {
        storeOrders.push(order);
      }
    }

    return storeOrders;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [updatedOrder] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return updatedOrder;
  }

  // Order item operations
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const [newOrderItem] = await db.insert(orderItems).values(orderItem).returning();
    return newOrderItem;
  }

  // Cart operations
  async getCartItems(userId: number): Promise<CartItem[]> {
    return await db.select().from(cartItems).where(eq(cartItems.userId, userId));
  }

  async addToCart(cartItem: InsertCartItem): Promise<CartItem> {
    // Check if item already exists in cart
    const existingItem = await db.select().from(cartItems)
      .where(and(eq(cartItems.userId, cartItem.userId), eq(cartItems.productId, cartItem.productId)));

    if (existingItem.length > 0) {
      // Update quantity
      const [updatedItem] = await db.update(cartItems)
        .set({ quantity: existingItem[0].quantity + cartItem.quantity })
        .where(eq(cartItems.id, existingItem[0].id))
        .returning();
      return updatedItem;
    } else {
      // Add new item
      const [newItem] = await db.insert(cartItems).values(cartItem).returning();
      return newItem;
    }
  }

  async updateCartItem(id: number, quantity: number): Promise<CartItem | undefined> {
    const [updatedItem] = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id)).returning();
    return updatedItem;
  }

  async removeFromCart(id: number): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.id, id));
    return (result.rowCount || 0) > 0;
  }

  async clearCart(userId: number): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.userId, userId));
    return (result.rowCount || 0) >= 0;
  }

  // Wishlist operations
  async getWishlistItems(userId: number): Promise<WishlistItem[]> {
    return await db.select().from(wishlistItems).where(eq(wishlistItems.userId, userId));
  }

  async addToWishlist(wishlistItem: InsertWishlistItem): Promise<WishlistItem> {
    // Check if item already exists in wishlist
    const existingItem = await db.select().from(wishlistItems)
      .where(and(eq(wishlistItems.userId, wishlistItem.userId), eq(wishlistItems.productId, wishlistItem.productId)));

    if (existingItem.length > 0) {
      return existingItem[0];
    } else {
      const [newItem] = await db.insert(wishlistItems).values(wishlistItem).returning();
      return newItem;
    }
  }

  async removeFromWishlist(id: number): Promise<boolean> {
    const result = await db.delete(wishlistItems).where(eq(wishlistItems.id, id));
    return (result.rowCount || 0) > 0;
  }

  async isInWishlist(userId: number, productId: number): Promise<boolean> {
    const result = await db.select().from(wishlistItems)
      .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)))
      .limit(1);
    return result.length > 0;
  }

  // Admin operations
  async getAdmin(id: number): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    return admin;
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const [newAdmin] = await db.insert(admins).values(admin).returning();
    return newAdmin;
  }

  // Website visit tracking
  async recordVisit(visit: InsertWebsiteVisit): Promise<WebsiteVisit> {
    const [newVisit] = await db.insert(websiteVisits).values(visit).returning();
    return newVisit;
  }

  async getVisitStats(days: number = 30): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);

    const [totalVisits] = await db
      .select({ count: count() })
      .from(websiteVisits)
      .where(gte(websiteVisits.visitedAt, thirtyDaysAgo));

    const [uniqueVisitors] = await db
      .select({ count: count(sql`DISTINCT ${websiteVisits.ipAddress}`) })
      .from(websiteVisits)
      .where(gte(websiteVisits.visitedAt, thirtyDaysAgo));

    const pageViews = await db
      .select({
        page: websiteVisits.page,
        count: count(),
      })
      .from(websiteVisits)
      .where(gte(websiteVisits.visitedAt, thirtyDaysAgo))
      .groupBy(websiteVisits.page)
      .orderBy(desc(count()));

    return {
      totalVisits: totalVisits.count,
      uniqueVisitors: uniqueVisitors.count,
      pageViews,
    };
  }

  async getPageViews(page?: string): Promise<WebsiteVisit[]> {
    const query = db
      .select()
      .from(websiteVisits)
      .orderBy(desc(websiteVisits.visitedAt));

    if (page) {
      query.where(eq(websiteVisits.page, page));
    }

    return await query;
  }

  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
    return result.rowCount > 0;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    const result = await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
    return result.rowCount >= 0;
  }

  // Order tracking
  async createOrderTracking(tracking: InsertOrderTracking): Promise<OrderTracking> {
    const [newTracking] = await db.insert(orderTracking).values(tracking).returning();
    return newTracking;
  }

  async getOrderTracking(orderId: number): Promise<OrderTracking[]> {
    return await db.select().from(orderTracking)
      .where(eq(orderTracking.orderId, orderId))
      .orderBy(desc(orderTracking.updatedAt));
  }

  async updateOrderTracking(orderId: number, status: string, description?: string, location?: string): Promise<OrderTracking> {
    const trackingData: InsertOrderTracking = {
      orderId,
      status,
      description,
      location
    };
    const [newTracking] = await db.insert(orderTracking).values(trackingData).returning();
    return newTracking;
  }

  // Return policy
  async createReturnPolicy(policy: InsertReturnPolicy): Promise<ReturnPolicy> {
    const [newPolicy] = await db.insert(returnPolicies).values(policy).returning();
    return newPolicy;
  }

  async getReturnPolicy(storeId: number): Promise<ReturnPolicy | undefined> {
    const [policy] = await db.select().from(returnPolicies).where(eq(returnPolicies.storeId, storeId));
    return policy;
  }

  async updateReturnPolicy(storeId: number, updates: Partial<InsertReturnPolicy>): Promise<ReturnPolicy | undefined> {
    const [updatedPolicy] = await db.update(returnPolicies).set(updates).where(eq(returnPolicies.storeId, storeId)).returning();
    return updatedPolicy;
  }

  // Returns
  async createReturn(returnItem: InsertReturn): Promise<Return> {
    const [newReturn] = await db.insert(returns).values(returnItem).returning();
    return newReturn;
  }

  async getReturn(id: number): Promise<Return | undefined> {
    const [returnItem] = await db.select().from(returns).where(eq(returns.id, id));
    return returnItem;
  }

  async getReturnsByCustomer(customerId: number): Promise<Return[]> {
    return await db.select().from(returns)
      .where(eq(returns.customerId, customerId))
      .orderBy(desc(returns.createdAt));
  }

  async getReturnsByStore(storeId: number): Promise<Return[]> {
    return await db.select().from(returns)
      .innerJoin(orderItems, eq(returns.orderItemId, orderItems.id))
      .where(eq(orderItems.storeId, storeId))
      .orderBy(desc(returns.createdAt));
  }

  async updateReturnStatus(id: number, status: string): Promise<Return | undefined> {
    const [updatedReturn] = await db.update(returns).set({ status }).where(eq(returns.id, id)).returning();
    return updatedReturn;
  }

  // Distance calculation between stores and user location
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  async getStoresWithDistance(userLat: number, userLon: number): Promise<(Store & { distance: number })[]> {
    const allStores = await this.getAllStores();
    return allStores.map(store => {
      const storeLat = parseFloat(store.latitude || "0");
      const storeLon = parseFloat(store.longitude || "0");
      const distance = this.calculateDistance(userLat, userLon, storeLat, storeLon);
      return { ...store, distance };
    }).sort((a, b) => a.distance - b.distance);
  }
}

export const storage = new DatabaseStorage();