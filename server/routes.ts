import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema, insertStoreSchema, insertProductSchema, insertOrderSchema, insertCartItemSchema,
  insertWishlistItemSchema, insertAdminSchema, insertWebsiteVisitSchema, insertNotificationSchema,
  insertOrderTrackingSchema, insertReturnPolicySchema, insertReturnSchema, insertCategorySchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware to track website visits
  app.use(async (req, res, next) => {
    try {
      const visitData = {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        page: req.path,
        referrer: req.get('Referrer'),
        sessionId: (req as any).sessionID || 'anonymous',
        userId: req.body?.userId || null
      };

      await storage.recordVisit(visitData);
    } catch (error) {
      // Continue even if visit tracking fails
    }
    next();
  });

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const user = await storage.createUser(userData);

      // Don't send password back
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Registration error details:", error);
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Don't send password back
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Store routes
  app.get("/api/stores", async (req, res) => {
    try {
      const stores = await storage.getAllStores();
      res.json(stores);
    } catch (error) {
      console.error("Store fetch error:", error);
      res.status(500).json({ error: "Failed to fetch stores" });
    }
  });

  app.get("/api/stores/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const store = await storage.getStore(id);

      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }

      res.json(store);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch store" });
    }
  });

  app.get("/api/stores/owner/:ownerId", async (req, res) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      const stores = await storage.getStoresByOwnerId(ownerId);
      res.json(stores);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stores for owner" });
    }
  });

  app.get("/api/stores/nearby", async (req, res) => {
    try {
      const { lat, lon } = req.query;

      if (!lat || !lon) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      const userLat = parseFloat(lat as string);
      const userLon = parseFloat(lon as string);

      if (isNaN(userLat) || isNaN(userLon)) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }

      const storesWithDistance = await storage.getStoresWithDistance(userLat, userLon);
      res.json(storesWithDistance);
    } catch (error) {
      console.error("Nearby stores fetch error:", error);
      res.status(500).json({ error: "Failed to fetch nearby stores" });
    }
  });

  app.post("/api/stores", async (req, res) => {
    try {
      const storeData = insertStoreSchema.parse(req.body);

      // Check if user already has a store
      const existingStores = await storage.getStoresByOwnerId(storeData.ownerId);
      if (existingStores.length > 0) {
        return res.status(400).json({
          error: "You can only create one store per account"
        });
      }

      // Check if store name already exists
      const allStores = await storage.getAllStores();
      const nameExists = allStores.some(store =>
        store.name.toLowerCase() === storeData.name.toLowerCase()
      );
      if (nameExists) {
        return res.status(400).json({
          error: "A store with this name already exists"
        });
      }

      const store = await storage.createStore(storeData);
      res.json(store);
    } catch (error) {
      console.error("Store creation error:", error);
      res.status(400).json({
        error: "Invalid store data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const { search, category, storeId } = req.query;

      let products;
      if (search) {
        products = await storage.searchProducts(search as string);
      } else if (category) {
        products = await storage.getProductsByCategory(parseInt(category as string));
      } else if (storeId) {
        products = await storage.getProductsByStoreId(parseInt(storeId as string));
      } else {
        products = await storage.getAllProducts();
      }

      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.json(product);
    } catch (error) {
      console.error("Product creation error:", error);
      res.status(400).json({
        error: "Invalid product data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const product = await storage.updateProduct(id, updates);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      res.status(400).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProduct(id);

      if (!deleted) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Category routes
  app.get("/api/categories", async (req, res) => {
    try {
      let categories = await storage.getAllCategories();

      // If no categories exist, create default ones
      if (categories.length === 0) {
        const defaultCategories = [
          { name: "Electronics", slug: "electronics" },
          { name: "Clothing", slug: "clothing" },
          { name: "Home & Garden", slug: "home-garden" },
          { name: "Books", slug: "books" },
          { name: "Sports", slug: "sports" },
          { name: "Beauty", slug: "beauty" },
          { name: "Toys", slug: "toys" },
          { name: "Health", slug: "health" },
          { name: "Automotive", slug: "automotive" },
          { name: "Garden", slug: "garden" }
        ];

        for (const category of defaultCategories) {
          await storage.createCategory(category);
        }

        categories = await storage.getAllCategories();
      }

      res.json(categories);
    } catch (error) {
      console.error("Categories fetch error:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Category creation error:", error);
      res.status(400).json({
        error: "Invalid category data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const category = await storage.updateCategory(id, updates);

      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      res.json(category);
    } catch (error) {
      res.status(400).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCategory(id);

      if (!deleted) {
        return res.status(404).json({ error: "Category not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Cart routes
  app.get("/api/cart/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const cartItems = await storage.getCartItems(userId);

      // Get product details for each cart item
      const cartWithProducts = await Promise.all(
        cartItems.map(async (item) => {
          const product = await storage.getProduct(item.productId);
          return { ...item, product };
        })
      );

      res.json(cartWithProducts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cart" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    try {
      const cartItemData = insertCartItemSchema.parse(req.body);
      const cartItem = await storage.addToCart(cartItemData);
      res.json(cartItem);
    } catch (error) {
      res.status(400).json({ error: "Invalid cart item data" });
    }
  });

  app.put("/api/cart/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { quantity } = req.body;
      const cartItem = await storage.updateCartItem(id, quantity);

      if (!cartItem) {
        return res.status(404).json({ error: "Cart item not found" });
      }

      res.json(cartItem);
    } catch (error) {
      res.status(400).json({ error: "Failed to update cart item" });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.removeFromCart(id);

      if (!deleted) {
        return res.status(404).json({ error: "Cart item not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove cart item" });
    }
  });

  app.delete("/api/cart/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const cleared = await storage.clearCart(userId);

      if (!cleared) {
        return res.status(404).json({ error: "Failed to clear cart" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear cart" });
    }
  });

  // Wishlist routes
  app.get("/api/wishlist/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const wishlistItems = await storage.getWishlistItems(userId);
      res.json(wishlistItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wishlist items" });
    }
  });

  app.post("/api/wishlist", async (req, res) => {
    try {
      const validatedData = insertWishlistItemSchema.parse(req.body);
      const wishlistItem = await storage.addToWishlist(validatedData);
      res.status(201).json(wishlistItem);
    } catch (error) {
      res.status(400).json({ error: "Invalid wishlist item data" });
    }
  });

  app.delete("/api/wishlist/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.removeFromWishlist(id);

      if (!deleted) {
        return res.status(404).json({ error: "Wishlist item not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove wishlist item" });
    }
  });

  app.get("/api/wishlist/:userId/check/:productId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const productId = parseInt(req.params.productId);
      const isInWishlist = await storage.isInWishlist(userId, productId);
      res.json({ isInWishlist });
    } catch (error) {
      res.status(500).json({ error: "Failed to check wishlist status" });
    }
  });

  // Order routes
  app.get("/api/orders/customer/:customerId", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const orders = await storage.getOrdersByCustomerId(customerId);

      // Get order items for each order
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const items = await storage.getOrderItems(order.id);
          return { ...order, items };
        })
      );

      res.json(ordersWithItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/store/:storeId", async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const orders = await storage.getOrdersByStoreId(storeId);

      // Get order items for each order
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const items = await storage.getOrderItems(order.id);
          return { ...order, items };
        })
      );

      res.json(ordersWithItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { order, items } = req.body;
      console.log("Order request:", { order, items });

      // Create order with location data
      const orderData = insertOrderSchema.parse(order);
      const createdOrder = await storage.createOrder(orderData);

      // Create order items and collect store owners for notifications
      const storeOwners = new Set<number>();
      const orderItems = await Promise.all(
        items.map(async (item: any) => {
          const orderItem = await storage.createOrderItem({
            ...item,
            orderId: createdOrder.id
          });

          // Get store info for notifications
          const store = await storage.getStore(item.storeId);
          if (store) {
            storeOwners.add(store.ownerId);
          }

          return orderItem;
        })
      );

      // Create order tracking
      await storage.createOrderTracking({
        orderId: createdOrder.id,
        status: "pending",
        description: "Order placed successfully"
      });

      // Send notifications to store owners with customer location details
      for (const ownerId of Array.from(storeOwners)) {
        const locationInfo = orderData.latitude && orderData.longitude
          ? `Customer Location: ${orderData.latitude}, ${orderData.longitude}`
          : "Location not provided";

        await storage.createNotification({
          userId: ownerId,
          title: "New Order Received",
          message: `New order #${createdOrder.id} from ${orderData.customerName}. Address: ${orderData.shippingAddress}. ${locationInfo}. Phone: ${orderData.phone}`,
          type: "success"
        });
      }

      // Send confirmation notification to customer
      await storage.createNotification({
        userId: orderData.customerId,
        title: "Order Confirmed",
        message: `Your order #${createdOrder.id} has been confirmed and is being processed`,
        type: "success"
      });

      // Clear user's cart
      await storage.clearCart(order.customerId);

      res.json({ order: createdOrder, items: orderItems });
    } catch (error) {
      console.error("Order creation error:", error);
      res.status(400).json({ error: "Failed to create order" });
    }
  });

  app.put("/api/orders/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const order = await storage.updateOrderStatus(id, status);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      res.status(400).json({ error: "Failed to update order status" });
    }
  });

  // User profile routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Don't send password back
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const user = await storage.updateUser(id, updates);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Don't send password back
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ error: "Failed to update user" });
    }
  });

  // Admin authentication routes
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const admin = await storage.getAdminByEmail(email);

      if (!admin || admin.password !== password) {
        return res.status(401).json({ error: "Invalid admin credentials" });
      }

      const { password: _, ...adminWithoutPassword } = admin;
      res.json({ admin: adminWithoutPassword });
    } catch (error) {
      res.status(500).json({ error: "Admin login failed" });
    }
  });

  app.post("/api/admin/create", async (req, res) => {
    try {
      const adminData = insertAdminSchema.parse(req.body);
      const admin = await storage.createAdmin(adminData);

      const { password, ...adminWithoutPassword } = admin;
      res.json({ admin: adminWithoutPassword });
    } catch (error) {
      res.status(400).json({ error: "Failed to create admin" });
    }
  });

  // Admin analytics routes
  app.get("/api/admin/analytics/stats", async (req, res) => {
    try {
      const stats = await storage.getVisitStats();
      res.json(stats);
    } catch (error) {
      console.error("Analytics stats error:", error);
      res.status(500).json({ error: "Failed to fetch analytics stats" });
    }
  });

  app.get("/api/admin/analytics/visits", async (req, res) => {
    try {
      const visits = await storage.getPageViews();
      res.json(visits);
    } catch (error) {
      console.error("Analytics visits error:", error);
      res.status(500).json({ error: "Failed to fetch analytics visits" });
    }
  });

  // Notifications routes
  app.post("/api/notifications", async (req, res) => {
    try {
      const notificationData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(notificationData);
      res.json(notification);
    } catch (error) {
      res.status(400).json({ error: "Failed to create notification" });
    }
  });

  app.get("/api/notifications/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.put("/api/notifications/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.put("/api/notifications/user/:userId/read-all", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const success = await storage.markAllNotificationsAsRead(userId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Order tracking routes
  app.post("/api/orders/:orderId/tracking", async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { status, description, location } = req.body;

      const tracking = await storage.updateOrderTracking(orderId, status, description, location);

      // Create notification for customer
      const order = await storage.getOrder(orderId);
      if (order) {
        await storage.createNotification({
          userId: order.customerId,
          title: "Order Status Updated",
          message: `Your order #${orderId} status has been updated to: ${status}`,
          type: "info",
          orderId: orderId
        });
      }

      res.json(tracking);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order tracking" });
    }
  });

  app.get("/api/orders/:orderId/tracking", async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const tracking = await storage.getOrderTracking(orderId);
      res.json(tracking);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order tracking" });
    }
  });

  // Return policy routes
  app.post("/api/stores/:storeId/return-policy", async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const policyData = { ...insertReturnPolicySchema.parse(req.body), storeId };
      const policy = await storage.createReturnPolicy(policyData);
      res.json(policy);
    } catch (error) {
      res.status(400).json({ error: "Failed to create return policy" });
    }
  });

  app.get("/api/stores/:storeId/return-policy", async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const policy = await storage.getReturnPolicy(storeId);
      res.json(policy);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch return policy" });
    }
  });

  app.put("/api/stores/:storeId/return-policy", async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const updates = req.body;
      const policy = await storage.updateReturnPolicy(storeId, updates);
      res.json(policy);
    } catch (error) {
      res.status(500).json({ error: "Failed to update return policy" });
    }
  });

  // Returns routes
  app.post("/api/returns", async (req, res) => {
    try {
      const returnData = insertReturnSchema.parse(req.body);
      const returnItem = await storage.createReturn(returnData);

      // Create notification for store owner
      const orderItem = await storage.getOrderItems(returnData.orderId);
      if (orderItem.length > 0) {
        const store = await storage.getStore(orderItem[0].storeId);
        if (store) {
          await storage.createNotification({
            userId: store.ownerId,
            title: "New Return Request",
            message: `A return request has been submitted for order #${returnData.orderId}`,
            type: "warning",
            orderId: returnData.orderId
          });
        }
      }

      res.json(returnItem);
    } catch (error) {
      res.status(400).json({ error: "Failed to create return request" });
    }
  });

  app.get("/api/returns/customer/:customerId", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const returns = await storage.getReturnsByCustomer(customerId);
      res.json(returns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer returns" });
    }
  });

  app.get("/api/returns/store/:storeId", async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      const returns = await storage.getReturnsByStore(storeId);
      res.json(returns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch store returns" });
    }
  });

  app.put("/api/returns/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const returnItem = await storage.updateReturnStatus(id, status);

      if (returnItem) {
        // Create notification for customer
        await storage.createNotification({
          userId: returnItem.customerId,
          title: "Return Status Updated",
          message: `Your return request status has been updated to: ${status}`,
          type: "info",
          orderId: returnItem.orderId
        });
      }

      res.json(returnItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to update return status" });
    }
  });

  // Store distance calculation routes
  app.get("/api/stores/nearby", async (req, res) => {
    try {
      const { lat, lon } = req.query;
      if (!lat || !lon) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      const userLat = parseFloat(lat as string);
      const userLon = parseFloat(lon as string);
      const storesWithDistance = await storage.getStoresWithDistance(userLat, userLon);

      res.json(storesWithDistance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch nearby stores" });
    }
  });

  // Enhanced order creation with notifications
  app.post("/api/orders/enhanced", async (req, res) => {
    try {
      const { order, items } = req.body;
      const orderData = insertOrderSchema.parse(order);

      // Create the order
      const createdOrder = await storage.createOrder(orderData);

      // Create order items and notify store owners
      const storeOwners = new Set<number>();
      for (const item of items) {
        await storage.createOrderItem({
          orderId: createdOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          storeId: item.storeId
        });

        // Track store owners for notifications
        const store = await storage.getStore(item.storeId);
        if (store) {
          storeOwners.add(store.ownerId);
        }
      }

      // Clear customer's cart
      await storage.clearCart(orderData.customerId);

      // Create order tracking
      await storage.createOrderTracking({
        orderId: createdOrder.id,
        status: "pending",
        description: "Order placed successfully"
      });

      // Send notifications to store owners
      for (const ownerId of Array.from(storeOwners)) {
        await storage.createNotification({
          userId: ownerId,
          title: "New Order Received",
          message: `New order #${createdOrder.id} received from ${orderData.customerName}`,
          type: "success",
          orderId: createdOrder.id
        });
      }

      // Send confirmation notification to customer
      await storage.createNotification({
        userId: orderData.customerId,
        title: "Order Confirmed",
        message: `Your order #${createdOrder.id} has been confirmed and is being processed`,
        type: "success",
        orderId: createdOrder.id
      });

      res.json({ order: createdOrder, success: true });
    } catch (error) {
      console.error("Enhanced order creation error:", error);
      res.status(400).json({ error: "Failed to create order" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
