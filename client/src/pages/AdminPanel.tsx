import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import {
  Users, ShoppingBag, Store, TrendingUp, MapPin, Bell, Plus, Edit, Trash2,
  Settings, UserPlus, Package, Tag, FileText, AlertCircle, Shield,
  BarChart2, Calendar, DollarSign, CreditCard, MessageSquare,
  ShoppingCart, Truck, RefreshCw, Search, Filter, Camera,
  FormInput, Layout, Database, FileSpreadsheet,
  ClipboardList, Mail, ShieldAlert, Globe, Zap,
  FileImage, FileVideo, FileAudio, FileText as FileTextIcon,
  Download, Upload, Printer, Share2, Lock, Unlock,
  Eye, EyeOff, Key, UserCog, Store as StoreIcon, Package as PackageIcon
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Category, InsertCategory } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";
import type { AnalyticsData, UserStats, ProductStats, Visit } from "@/types/analytics";
import type { AdminAuth, AdminUser, AdminSettings } from "@/types/admin";

// Form-related interfaces
interface FormField {
  id: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'radio' | 'file' | 'date';
  label: string;
  required: boolean;
  options?: string[];
}

interface FormTemplate {
  id: string;
  name: string;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
}

interface MediaUpload {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  name: string;
  size: number;
  uploadedAt: string;
}

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: z.string().min(1, "Slug is required"),
});

type CategoryForm = z.infer<typeof categorySchema>;

const userSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.enum(["admin", "store_owner", "customer"]),
  status: z.enum(["active", "suspended", "banned"]),
});

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().min(0),
  categoryId: z.number(),
  stock: z.number().min(0),
  status: z.enum(["active", "draft", "archived"]),
});

const storeSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  status: z.enum(["active", "pending", "suspended"]),
});

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminData, setAdminData] = useState<AdminUser | null>(null);
  const [loginForm, setLoginForm] = useState<AdminAuth>({ email: "", password: "" });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showCamera, setShowCamera] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaUpload[]>([]);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [selectedFormTemplate, setSelectedFormTemplate] = useState<FormTemplate | null>(null);

  // Check if user is authorized to access admin panel
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const response = await fetch("/api/admin/verify", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
        });

        if (!response.ok) {
          throw new Error("Unauthorized access");
        }

        const data = await response.json();
        if (data.role !== "super_admin" && data.role !== "admin") {
          throw new Error("Insufficient permissions");
        }

        setIsAdminAuthenticated(true);
        setAdminData(data);
      } catch (error) {
        setIsAdminAuthenticated(false);
        setAdminData(null);
        setLocation("/"); // Redirect to home page
        toast({
          title: "Access Denied",
          description: "You don't have permission to access the admin panel",
          variant: "destructive",
        });
      }
    };

    checkAdminAccess();
  }, [setLocation, toast]);

  // Category form
  const categoryForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  // Admin authentication mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: AdminAuth) => {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error("Invalid admin credentials");
      }

      const data = await response.json();

      // Verify admin role
      if (data.role !== "super_admin" && data.role !== "admin") {
        throw new Error("Insufficient permissions");
      }

      // Store admin token
      localStorage.setItem("adminToken", data.token);
      return data;
    },
    onSuccess: (data) => {
      setIsAdminAuthenticated(true);
      setAdminData(data.admin);
      toast({
        title: "Success",
        description: "Admin login successful",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Queries with proper types
  const { data: salesData } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics/sales"],
    enabled: isAdminAuthenticated,
  });

  const { data: userStats } = useQuery<UserStats>({
    queryKey: ["/api/admin/analytics/users"],
    enabled: isAdminAuthenticated,
  });

  const { data: productStats } = useQuery<ProductStats>({
    queryKey: ["/api/admin/analytics/products"],
    enabled: isAdminAuthenticated,
  });

  const { data: visits } = useQuery<Visit[]>({
    queryKey: ["/api/admin/analytics/visits"],
    enabled: isAdminAuthenticated,
  });

  // Categories data
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: isAdminAuthenticated,
  });

  // Stores data
  const { data: stores = [] } = useQuery<any[]>({
    queryKey: ["/api/stores"],
    enabled: isAdminAuthenticated,
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: CategoryForm) => {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) throw new Error("Failed to create category");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      categoryForm.reset();
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CategoryForm }) => {
      const response = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update category");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setEditingCategory(null);
      categoryForm.reset();
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete category");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Enhanced mutations for new features
  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: number; status: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update user status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    },
  });

  const updateStoreStatusMutation = useMutation({
    mutationFn: async ({ storeId, status }: { storeId: number; status: string }) => {
      const response = await fetch(`/api/admin/stores/${storeId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update store status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      toast({
        title: "Success",
        description: "Store status updated successfully",
      });
    },
  });

  // New queries for additional features
  const { data: formTemplatesData } = useQuery({
    queryKey: ["/api/admin/form-templates"],
    enabled: isAdminAuthenticated,
  });

  const { data: mediaLibrary } = useQuery({
    queryKey: ["/api/admin/media"],
    enabled: isAdminAuthenticated,
  });

  // New mutations for additional features
  const createFormTemplateMutation = useMutation({
    mutationFn: async (template: Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await fetch("/api/admin/form-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (!response.ok) throw new Error("Failed to create form template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/form-templates"] });
      toast({
        title: "Success",
        description: "Form template created successfully",
      });
    },
  });

  const uploadMediaMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload media");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      toast({
        title: "Success",
        description: "Media uploaded successfully",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setIsAdminAuthenticated(false);
    setAdminData(null);
    setLoginForm({ email: "", password: "" });
    setLocation("/");
  };

  const handleCategorySubmit = (data: CategoryForm) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.setValue("name", category.name);
    categoryForm.setValue("slug", category.slug);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    categoryForm.reset();
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  // New handlers for additional features
  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Handle camera stream
      setShowCamera(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to access camera",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      await uploadMediaMutation.mutateAsync(file);
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Admin Panel</CardTitle>
            <CardDescription className="text-center">
              Enter your admin credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@sirahbazaar.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter admin password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Siraha Bazaar Admin</h1>
              <p className="text-sm text-gray-600">Welcome, {adminData?.fullName}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Button onClick={handleLogout} variant="outline">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-64 space-y-2">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  <Button
                    variant={selectedTab === "dashboard" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedTab("dashboard")}
                  >
                    <BarChart2 className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                  <Button
                    variant={selectedTab === "users" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedTab("users")}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Users
                  </Button>
                  <Button
                    variant={selectedTab === "products" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedTab("products")}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Products
                  </Button>
                  <Button
                    variant={selectedTab === "stores" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedTab("stores")}
                  >
                    <Store className="mr-2 h-4 w-4" />
                    Stores
                  </Button>
                  <Button
                    variant={selectedTab === "orders" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedTab("orders")}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Orders
                  </Button>
                  <Button
                    variant={selectedTab === "analytics" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedTab("analytics")}
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Analytics
                  </Button>
                  <Button
                    variant={selectedTab === "settings" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedTab("settings")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                  <Button
                    variant={selectedTab === "forms" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedTab("forms")}
                  >
                    <FormInput className="mr-2 h-4 w-4" />
                    Form Builder
                  </Button>
                  <Button
                    variant={selectedTab === "media" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedTab("media")}
                  >
                    <FileImage className="mr-2 h-4 w-4" />
                    Media Library
                  </Button>
                  <Button
                    variant={selectedTab === "templates" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedTab("templates")}
                  >
                    <Layout className="mr-2 h-4 w-4" />
                    Templates
                  </Button>
                  <Button
                    variant={selectedTab === "integrations" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedTab("integrations")}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Integrations
                  </Button>
                  <Button
                    variant={selectedTab === "backup" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedTab("backup")}
                  >
                    <Database className="mr-2 h-4 w-4" />
                    Backup & Restore
                  </Button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {selectedTab === "dashboard" && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{salesData?.totalRevenue || 0}</div>
                      <p className="text-xs text-muted-foreground">Last 30 days</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{userStats?.activeUsers || 0}</div>
                      <p className="text-xs text-muted-foreground">Currently online</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{salesData?.totalOrders || 0}</div>
                      <p className="text-xs text-muted-foreground">Last 30 days</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Stores</CardTitle>
                      <Store className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stores?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Currently active</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Sales Overview</CardTitle>
                      <CardDescription>Daily sales for the last 30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesData?.dailySales || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="amount" stroke="#8884d8" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>User Distribution</CardTitle>
                      <CardDescription>User roles distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={userStats?.roleDistribution || []}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                          >
                            {userStats?.roleDistribution?.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658'][index % 3]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest system activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {visits && Array.isArray(visits) && visits.slice(0, 5).map((visit: any, index: number) => (
                        <div key={index} className="flex items-center space-x-4">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{visit.page}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(visit.visitedAt).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="secondary">{visit.ipAddress}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedTab === "users" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>User Management</CardTitle>
                        <CardDescription>Manage all users and their permissions</CardDescription>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add User
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add New User</DialogTitle>
                            <DialogDescription>
                              Create a new user account with specific permissions
                            </DialogDescription>
                          </DialogHeader>
                          {/* Add user form */}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Input
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="banned">Banned</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* User rows */}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedTab === "products" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Product Management</CardTitle>
                        <CardDescription>Manage all products and their details</CardDescription>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Product
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add New Product</DialogTitle>
                            <DialogDescription>
                              Create a new product with all necessary details
                            </DialogDescription>
                          </DialogHeader>
                          {/* Add product form */}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Input
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Product rows */}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedTab === "stores" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Store Management</CardTitle>
                        <CardDescription>Manage all stores and their details</CardDescription>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Store
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add New Store</DialogTitle>
                            <DialogDescription>
                              Create a new store with all necessary details
                            </DialogDescription>
                          </DialogHeader>
                          {/* Add store form */}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Input
                            placeholder="Search stores..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stores.map((store: any) => (
                          <Card key={store.id} className="p-4">
                            <div className="flex items-start space-x-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{store.name}</h3>
                                <p className="text-sm text-gray-600 mb-2">{store.description}</p>
                                <div className="flex items-center text-sm text-gray-500 mb-1">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {store.address}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Phone: {store.phone || 'Not provided'}
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <Badge variant={store.isActive ? "default" : "secondary"}>
                                    {store.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <Settings className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem>Edit Store</DropdownMenuItem>
                                      <DropdownMenuItem>View Products</DropdownMenuItem>
                                      <DropdownMenuItem>View Orders</DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-red-600">
                                        Suspend Store
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedTab === "orders" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Order Management</CardTitle>
                        <CardDescription>Track and manage all orders</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline">
                          <Calendar className="mr-2 h-4 w-4" />
                          Date Range
                        </Button>
                        <Button variant="outline">
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Input
                            placeholder="Search orders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Store</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Order rows */}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedTab === "analytics" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{salesData?.totalRevenue || 0}</div>
                      <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{salesData?.totalOrders || 0}</div>
                      <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{salesData?.averageOrderValue || 0}</div>
                      <p className="text-xs text-muted-foreground">Last 30 days</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{salesData?.conversionRate || 0}%</div>
                      <p className="text-xs text-muted-foreground">Last 30 days</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Sales Trends</CardTitle>
                      <CardDescription>Daily sales for the last 30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesData?.dailySales || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="amount" stroke="#8884d8" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Products</CardTitle>
                      <CardDescription>Best selling products</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={productStats?.topProducts || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="sales" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Store Performance</CardTitle>
                    <CardDescription>Sales and orders by store</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Store</TableHead>
                          <TableHead>Total Sales</TableHead>
                          <TableHead>Orders</TableHead>
                          <TableHead>Average Order Value</TableHead>
                          <TableHead>Conversion Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Store performance rows */}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedTab === "settings" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>System Settings</CardTitle>
                    <CardDescription>Configure system-wide settings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">General Settings</h3>
                        <div className="grid gap-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Maintenance Mode</Label>
                              <p className="text-sm text-gray-500">
                                Enable maintenance mode to temporarily disable the platform
                              </p>
                            </div>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Enable Registration</Label>
                              <p className="text-sm text-gray-500">
                                Allow new users to register on the platform
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Enable Store Applications</Label>
                              <p className="text-sm text-gray-500">
                                Allow new stores to apply for registration
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Notification Settings</h3>
                        <div className="grid gap-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Email Notifications</Label>
                              <p className="text-sm text-gray-500">
                                Send email notifications for important events
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Order Notifications</Label>
                              <p className="text-sm text-gray-500">
                                Notify store owners about new orders
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>System Alerts</Label>
                              <p className="text-sm text-gray-500">
                                Receive alerts about system issues
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Security Settings</h3>
                        <div className="grid gap-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Two-Factor Authentication</Label>
                              <p className="text-sm text-gray-500">
                                Require 2FA for admin accounts
                              </p>
                            </div>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Session Timeout</Label>
                              <p className="text-sm text-gray-500">
                                Automatically log out inactive users
                              </p>
                            </div>
                            <Select defaultValue="30">
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select timeout" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="15">15 minutes</SelectItem>
                                <SelectItem value="30">30 minutes</SelectItem>
                                <SelectItem value="60">1 hour</SelectItem>
                                <SelectItem value="120">2 hours</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedTab === "forms" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Form Builder</CardTitle>
                        <CardDescription>Create and manage custom forms</CardDescription>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Form
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Create New Form</DialogTitle>
                            <DialogDescription>
                              Design a custom form with various field types
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Form Name</Label>
                                <Input placeholder="Enter form name" />
                              </div>
                              <div>
                                <Label>Form Type</Label>
                                <Select>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select form type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="product">Product Form</SelectItem>
                                    <SelectItem value="store">Store Form</SelectItem>
                                    <SelectItem value="custom">Custom Form</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Form Fields</Label>
                              <div className="border rounded-lg p-4 space-y-4">
                                {/* Form field builder UI */}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Input
                            placeholder="Search forms..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="product">Product Forms</SelectItem>
                            <SelectItem value="store">Store Forms</SelectItem>
                            <SelectItem value="custom">Custom Forms</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {formTemplates.map((template) => (
                          <Card key={template.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold">{template.name}</h3>
                                <p className="text-sm text-gray-500">
                                  {template.fields.length} fields
                                </p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem>Edit Form</DropdownMenuItem>
                                  <DropdownMenuItem>Preview Form</DropdownMenuItem>
                                  <DropdownMenuItem>Duplicate Form</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600">
                                    Delete Form
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedTab === "media" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Media Library</CardTitle>
                        <CardDescription>Manage all media files</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleCameraCapture}>
                          <Camera className="mr-2 h-4 w-4" />
                          Use Camera
                        </Button>
                        <Button>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Files
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Input
                            placeholder="Search media..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="image">Images</SelectItem>
                            <SelectItem value="video">Videos</SelectItem>
                            <SelectItem value="audio">Audio</SelectItem>
                            <SelectItem value="document">Documents</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {mediaFiles.map((file) => (
                          <Card key={file.id} className="p-2">
                            <div className="aspect-square relative rounded-md overflow-hidden">
                              {file.type === 'image' && (
                                <img
                                  src={file.url}
                                  alt={file.name}
                                  className="object-cover w-full h-full"
                                />
                              )}
                              {file.type === 'video' && (
                                <video
                                  src={file.url}
                                  className="object-cover w-full h-full"
                                />
                              )}
                              {file.type === 'audio' && (
                                <div className="flex items-center justify-center h-full bg-gray-100">
                                  <FileAudio className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                              {file.type === 'document' && (
                                <div className="flex items-center justify-center h-full bg-gray-100">
                                  <FileTextIcon className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="p-2">
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedTab === "templates" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Template Management</CardTitle>
                        <CardDescription>Manage email and notification templates</CardDescription>
                      </div>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Template
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">Order Confirmation</h3>
                              <p className="text-sm text-gray-500">Email template</p>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">Welcome Email</h3>
                              <p className="text-sm text-gray-500">Email template</p>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">Password Reset</h3>
                              <p className="text-sm text-gray-500">Email template</p>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedTab === "integrations" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Integrations</CardTitle>
                    <CardDescription>Manage third-party integrations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">Payment Gateway</h3>
                              <p className="text-sm text-gray-500">Configure payment methods</p>
                            </div>
                            <Switch />
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">Email Service</h3>
                              <p className="text-sm text-gray-500">Configure email delivery</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">Analytics</h3>
                              <p className="text-sm text-gray-500">Configure analytics tools</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedTab === "backup" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Backup & Restore</CardTitle>
                    <CardDescription>Manage system backups and restoration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="p-4">
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-semibold">Create Backup</h3>
                              <p className="text-sm text-gray-500">
                                Create a new system backup
                              </p>
                            </div>
                            <Button className="w-full">
                              <Database className="mr-2 h-4 w-4" />
                              Create Backup
                            </Button>
                          </div>
                        </Card>
                        <Card className="p-4">
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-semibold">Restore Backup</h3>
                              <p className="text-sm text-gray-500">
                                Restore from a previous backup
                              </p>
                            </div>
                            <Button variant="outline" className="w-full">
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Restore Backup
                            </Button>
                          </div>
                        </Card>
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-semibold">Recent Backups</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Size</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* Backup rows */}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}