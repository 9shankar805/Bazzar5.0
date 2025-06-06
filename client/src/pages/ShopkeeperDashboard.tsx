import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Package,
  ShoppingCart,
  DollarSign,
  Star,
  Plus,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  Users,
  Clock,
  MapPin,
  X,
  Camera,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiPost, apiPut, apiDelete } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { Product, Order, OrderItem, Store, Category } from "@shared/schema";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  originalPrice: z.string().optional(),
  categoryId: z.number().min(1, "Category is required"),
  stock: z.number().min(0, "Stock must be 0 or greater"),
  imageUrl: z.string().url("Please enter a valid image URL").optional(),
  images: z.array(z.string()).default([]),
  isFastSell: z.boolean().default(false),
  isOnOffer: z.boolean().default(false),
  offerPercentage: z.number().min(0).max(100).default(0),
  offerEndDate: z.string().optional(),
  specifications: z.array(z.object({
    key: z.string(),
    value: z.string()
  })).default([]),
  features: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([])
});

const storeSchema = z.object({
  name: z.string().min(1, "Store name is required"),
  description: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  phone: z.string().optional(),
  logo: z.string().url("Please enter a valid logo URL").optional(),
  coverImage: z.string().url("Please enter a valid cover image URL").optional(),
  googleMapsLink: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;
type StoreForm = z.infer<typeof storeSchema>;

export default function ShopkeeperDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Check if user is a store owner
  if (!user || user.role !== "store_owner") {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">This page is only accessible to store owners.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Queries
  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: [`/api/stores`, { ownerId: user?.id }],
    queryFn: async () => {
      const response = await fetch(`/api/stores`);
      if (!response.ok) throw new Error('Failed to fetch stores');
      const allStores = await response.json();
      return allStores.filter((store: Store) => store.ownerId === user?.id);
    },
    enabled: !!user,
  });

  const currentStore = stores[0]; // Assuming one store per shopkeeper

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: [`/api/products/store/${currentStore?.id}`],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const response = await fetch(`/api/products/store/${currentStore.id}`);
      if (!response.ok) throw new Error('Failed to fetch store products');
      return response.json();
    },
    enabled: !!currentStore,
  });

  const { data: orders = [] } = useQuery<(Order & { items: OrderItem[] })[]>({
    queryKey: [`/api/orders/store/${currentStore?.id}`],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      const response = await fetch(`/api/orders/store/${currentStore.id}`);
      if (!response.ok) throw new Error('Failed to fetch store orders');
      return response.json();
    },
    enabled: !!currentStore,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  // Form for adding/editing products
  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      originalPrice: "",
      categoryId: 1,
      stock: 0,
      imageUrl: "",
      images: [],
      isFastSell: false,
      isOnOffer: false,
      offerPercentage: 0,
      offerEndDate: "",
      specifications: [],
      features: [],
      tags: [],
    },
  });

  // Form for creating stores
  const storeForm = useForm<StoreForm>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      phone: "",
      logo: "",
      coverImage: "",
    },
  });

  // Stats calculations
  const totalOrders = orders.length;
  const totalProducts = products.length;
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const pendingOrders = orders.filter(order => order.status === "pending").length;

  const handleAddProduct = async (data: ProductForm) => {
    if (!currentStore) return;

    try {
      const productData = {
        ...data,
        storeId: currentStore.id,
        price: data.price,
        originalPrice: data.originalPrice || undefined,
        images: data.imageUrl ? [data.imageUrl] : [],
        isFastSell: data.isFastSell || false,
        isOnOffer: data.isOnOffer || false,
        offerPercentage: data.offerPercentage || 0,
        offerEndDate: data.offerEndDate || undefined,
        specifications: data.specifications || [],
        features: data.features || [],
        tags: data.tags || [],
      };

      if (editingProduct) {
        await apiPut(`/api/products/${editingProduct.id}`, productData);
        toast({ title: "Product updated successfully" });
      } else {
        await apiPost("/api/products", productData);
        toast({ title: "Product added successfully" });
      }

      form.reset();
      setEditingProduct(null);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/products/store/${currentStore.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save product",
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || "",
      price: product.price,
      originalPrice: product.originalPrice || "",
      categoryId: product.categoryId || 0,
      stock: product.stock || 0,
      imageUrl: product.images?.[0] || "",
      images: product.images || [],
      isFastSell: product.isFastSell || false,
      isOnOffer: product.isOnOffer || false,
      offerPercentage: product.offerPercentage || 0,
      offerEndDate: product.offerEndDate || "",
      specifications: product.specifications || [],
      features: product.features || [],
      tags: product.tags || [],
    });
    setActiveTab("add-product");
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await apiDelete(`/api/products/${productId}`);
      toast({ title: "Product deleted successfully" });
      // Invalidate queries to refresh data
      if (currentStore) {
        queryClient.invalidateQueries({ queryKey: [`/api/products/store/${currentStore.id}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const handleCreateStore = async (data: StoreForm) => {
    try {
      const storeData = {
        ...data,
        ownerId: user!.id,
        phone: data.phone || null,
        description: data.description || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      };

      await apiPost("/api/stores", storeData);
      toast({ title: "Store created successfully" });
      storeForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stores", "owner", user!.id] });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create store",
        variant: "destructive",
      });
    }
  };

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by this browser",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Update form with coordinates
      storeForm.setValue("latitude", latitude.toString());
      storeForm.setValue("longitude", longitude.toString());

      // Generate Google Maps link
      const googleMapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
      storeForm.setValue("googleMapsLink", googleMapsLink);

      // Try to get address from coordinates using OpenStreetMap Nominatim
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
        );
        const data = await response.json();

        if (data.display_name) {
          // Get detailed address components
          const addressComponents = {
            houseNumber: data.address?.house_number || '',
            street: data.address?.road || '',
            city: data.address?.city || data.address?.town || data.address?.village || '',
            district: data.address?.county || data.address?.district || '',
            state: data.address?.state || '',
            country: data.address?.country || '',
            postcode: data.address?.postcode || ''
          };

          // Format address in a more readable way
          const address = [
            addressComponents.houseNumber && `${addressComponents.houseNumber} ${addressComponents.street}`,
            addressComponents.city,
            addressComponents.district,
            addressComponents.state,
            addressComponents.country
          ].filter(Boolean).join(', ');

          storeForm.setValue("address", address);
        }
      } catch (geocodeError) {
        console.log("Reverse geocoding failed, coordinates set without address");
        storeForm.setValue("address", "Location coordinates set but address lookup failed");
      }

      toast({
        title: "Location obtained successfully",
        description: `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      });
    } catch (error) {
      toast({
        title: "Error getting location",
        description: "Please ensure location access is enabled and try again",
        variant: "destructive",
      });
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleOrderStatusUpdate = async (orderId: number, status: string) => {
    try {
      await apiPut(`/api/orders/${orderId}/status`, { status });
      toast({ title: "Order status updated successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to access camera",
        variant: "destructive",
      });
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageUrl);
        setShowCamera(false);
        // Stop the camera stream
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const currentImages = form.getValues("images") || [];
        form.setValue("images", [...currentImages, base64String]);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Shopkeeper Dashboard</h1>
            <p className="text-muted-foreground">
              {currentStore ? `Managing ${currentStore.name}` : "Manage your store"}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${currentStore ? 'grid-cols-4' : 'grid-cols-2'}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {!currentStore && (
              <TabsTrigger value="create-store">Create Store</TabsTrigger>
            )}
            {currentStore && (
              <>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="add-product">
                  {editingProduct ? "Edit Product" : "Add Product"}
                </TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                      <p className="text-2xl font-bold">{totalProducts}</p>
                    </div>
                    <Package className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">{totalOrders}</p>
                    </div>
                    <ShoppingCart className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Orders</p>
                      <p className="text-2xl font-bold">{pendingOrders}</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Order #{order.id}</p>
                          <p className="text-sm text-muted-foreground">{order.customerName}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₹{Number(order.totalAmount).toLocaleString()}</p>
                          <Badge variant={
                            order.status === "delivered" ? "default" :
                              order.status === "shipped" ? "secondary" :
                                order.status === "processing" ? "outline" : "destructive"
                          }>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Store Tab */}
          <TabsContent value="create-store" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Your Store</CardTitle>
                <p className="text-muted-foreground">
                  Set up your store to start selling products on Siraha Bazaar
                </p>
              </CardHeader>
              <CardContent>
                <Form {...storeForm}>
                  <form onSubmit={storeForm.handleSubmit(handleCreateStore)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={storeForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Store Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your store name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={storeForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={storeForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Store Address *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter complete store address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGetLocation}
                          disabled={isGettingLocation}
                          className="flex items-center gap-2"
                        >
                          <MapPin className="h-4 w-4" />
                          {isGettingLocation ? "Getting Location..." : "Get My Location"}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Auto-fill coordinates and address
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={storeForm.control}
                          name="latitude"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Latitude (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 26.7271" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={storeForm.control}
                          name="longitude"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Longitude (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 87.2751" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={storeForm.control}
                        name="googleMapsLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Google Maps Link (Auto-generated)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Will be auto-filled when location is obtained"
                                {...field}
                                readOnly
                                className="bg-muted"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={storeForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Store Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your store and what you sell"
                              className="min-h-20"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={storeForm.control}
                        name="logo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Store Logo URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/logo.png" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={storeForm.control}
                        name="coverImage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cover Image URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/cover.jpg" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" className="btn-primary">
                      Create Store
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Manage Products</span>
                  <Button onClick={() => setActiveTab("add-product")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No products added yet</p>
                    <Button className="mt-4" onClick={() => setActiveTab("add-product")}>
                      Add Your First Product
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <img
                          src={product.images?.[0] || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Price: ₹{Number(product.price).toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Stock: {product.stock} units
                          </p>
                          <div className="flex gap-2 mt-2">
                            {product.isFastSell && (
                              <Badge variant="destructive" className="text-xs">
                                🔥 Fast Sell
                              </Badge>
                            )}
                            {product.isOnOffer && (
                              <Badge variant="secondary" className="text-xs">
                                🏷️ {product.offerPercentage}% OFF
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={product.isActive ? "default" : "secondary"}>
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add/Edit Product Tab */}
          <TabsContent value="add-product" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleAddProduct)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter product name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price (₹)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Enter price" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="originalPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Original Price (₹) - Optional</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Enter original price" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="stock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stock Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Enter quantity"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Images</FormLabel>
                            <FormControl>
                              <div className="space-y-4">
                                <div className="flex gap-4">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCameraCapture}
                                    className="flex-1"
                                  >
                                    <Camera className="h-4 w-4 mr-2" />
                                    Take Photo
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById('file-upload')?.click()}
                                    className="flex-1"
                                  >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Image
                                  </Button>
                                  <input
                                    id="file-upload"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleFileUpload}
                                  />
                                </div>

                                {showCamera && (
                                  <div className="relative">
                                    <video
                                      ref={videoRef}
                                      autoPlay
                                      playsInline
                                      className="w-full h-64 object-cover rounded-lg"
                                    />
                                    <Button
                                      type="button"
                                      onClick={captureImage}
                                      className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                                    >
                                      Capture
                                    </Button>
                                  </div>
                                )}

                                {capturedImage && (
                                  <div className="relative">
                                    <img
                                      src={capturedImage}
                                      alt="Captured"
                                      className="w-full h-64 object-cover rounded-lg"
                                    />
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="icon"
                                      className="absolute top-2 right-2"
                                      onClick={() => setCapturedImage(null)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  {form.getValues("images")?.map((image, index) => (
                                    <div key={index} className="relative">
                                      <img
                                        src={image}
                                        alt={`Product ${index + 1}`}
                                        className="w-full h-32 object-cover rounded-lg"
                                      />
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2"
                                        onClick={() => {
                                          const currentImages = form.getValues("images") || [];
                                          form.setValue(
                                            "images",
                                            currentImages.filter((_, i) => i !== index)
                                          );
                                        }}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="images"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Image URLs</FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                {field.value.map((url, index) => (
                                  <div key={index} className="flex gap-2">
                                    <Input
                                      type="url"
                                      placeholder="https://example.com/image.jpg"
                                      value={url}
                                      onChange={(e) => {
                                        const newUrls = [...field.value];
                                        newUrls[index] = e.target.value;
                                        field.onChange(newUrls);
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => {
                                        const newUrls = field.value.filter((_, i) => i !== index);
                                        field.onChange(newUrls);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => field.onChange([...field.value, ""])}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Image URL
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="specifications"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Specifications</FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                {field.value.map((spec, index) => (
                                  <div key={index} className="flex gap-2">
                                    <Input
                                      placeholder="Specification name"
                                      value={spec.key}
                                      onChange={(e) => {
                                        const newSpecs = [...field.value];
                                        newSpecs[index] = { ...spec, key: e.target.value };
                                        field.onChange(newSpecs);
                                      }}
                                    />
                                    <Input
                                      placeholder="Value"
                                      value={spec.value}
                                      onChange={(e) => {
                                        const newSpecs = [...field.value];
                                        newSpecs[index] = { ...spec, value: e.target.value };
                                        field.onChange(newSpecs);
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => {
                                        const newSpecs = field.value.filter((_, i) => i !== index);
                                        field.onChange(newSpecs);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => field.onChange([...field.value, { key: "", value: "" }])}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Specification
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="features"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Features</FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                {field.value.map((feature, index) => (
                                  <div key={index} className="flex gap-2">
                                    <Input
                                      placeholder="Enter feature"
                                      value={feature}
                                      onChange={(e) => {
                                        const newFeatures = [...field.value];
                                        newFeatures[index] = e.target.value;
                                        field.onChange(newFeatures);
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => {
                                        const newFeatures = field.value.filter((_, i) => i !== index);
                                        field.onChange(newFeatures);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => field.onChange([...field.value, ""])}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Feature
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Tags</FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  {field.value.map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                      {tag}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4 p-0"
                                        onClick={() => {
                                          const newTags = field.value.filter((_, i) => i !== index);
                                          field.onChange(newTags);
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </Badge>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Add a tag"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const input = e.target as HTMLInputElement;
                                        const value = input.value.trim();
                                        if (value && !field.value.includes(value)) {
                                          field.onChange([...field.value, value]);
                                          input.value = '';
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter product description"
                              className="min-h-20"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Special Features Section */}
                    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                      <h3 className="font-medium text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Special Features
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="isFastSell"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-medium">
                                  Fast Sell Product
                                </FormLabel>
                                <div className="text-sm text-muted-foreground">
                                  Mark as fast-selling/trending item
                                </div>
                              </div>
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="w-4 h-4"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="isOnOffer"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-medium">
                                  Special Offer
                                </FormLabel>
                                <div className="text-sm text-muted-foreground">
                                  Apply discount offer
                                </div>
                              </div>
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="w-4 h-4"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      {form.watch("isOnOffer") && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <FormField
                            control={form.control}
                            name="offerPercentage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Discount Percentage (%)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Enter discount percentage"
                                    min="0"
                                    max="100"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="offerEndDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Offer End Date</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-4">
                      <Button type="submit" className="btn-primary">
                        {editingProduct ? "Update Product" : "Add Product"}
                      </Button>
                      {editingProduct && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingProduct(null);
                            form.reset();
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold">Order #{order.id}</h3>
                            <p className="text-sm text-muted-foreground">
                              {order.customerName} • {order.phone}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg">
                              ₹{Number(order.totalAmount).toLocaleString()}
                            </p>
                            <Select
                              value={order.status}
                              onValueChange={(value) => handleOrderStatusUpdate(order.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="shipped">Shipped</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Separator className="my-3" />

                        <div>
                          <p className="text-sm font-medium mb-2">Delivery Address:</p>
                          <p className="text-sm text-muted-foreground">{order.shippingAddress}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
