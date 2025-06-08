import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Star, Clock, Phone, Globe, Filter } from "lucide-react";
import { Link } from "wouter";
import StoreCard from "@/components/StoreCard";
import type { Store } from "@shared/schema";

export default function Stores() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const { data: stores, isLoading } = useQuery({
    queryKey: ["/api/stores"],
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search functionality could be implemented here
  };

  const filteredStores = Array.isArray(stores) ? stores.filter((store: Store) => {
    const matchesSearch = searchQuery === "" ||
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.address?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  }) : [];

  const getStoreHours = () => {
    const currentHour = new Date().getHours();
    if (currentHour >= 9 && currentHour < 21) {
      return { status: "Open", color: "bg-green-100 text-green-800" };
    }
    return { status: "Closed", color: "bg-red-100 text-red-800" };
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Stores</h1>
        <p className="text-muted-foreground">
          Discover local stores and businesses in your area
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8">
        <form onSubmit={handleSearch} className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search stores by name, description, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Search
          </Button>
        </form>
      </div>

      {/* Stores Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6">
                <Skeleton className="h-48 w-full mb-4" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredStores.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredStores.map((store) => (
            <Card key={store.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  {/* Store Logo and Name */}
                  <div className="flex flex-col space-y-3">
                    <div className="w-full h-32 sm:h-40 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                      <img
                        src={store.logo || "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200"}
                        alt={store.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200";
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs sm:text-sm font-semibold truncate max-w-[120px]">{store.name}</h3>
                    </div>
                    {store.rating && (
                      <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                        <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 mr-1" />
                        <span>{store.rating} ({store.totalReviews})</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center space-y-2 mb-4">
                    <div className="flex justify-center space-x-4">
                      {store.address && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" title={store.address}>
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      {store.phone && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" title={store.phone}>
                          <Phone className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      {store.website && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Visit Website">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{getStoreHours().status}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/stores/${store.id}`} className="flex-1">
                      <Button className="w-full text-xs sm:text-sm" size="sm">
                        View Store
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No stores found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? `No stores match your search for "${searchQuery}"`
                : "No stores are available at the moment"
              }
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
              >
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="mt-12 text-center">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-8">
            <h3 className="text-xl font-semibold mb-2">Want to list your store?</h3>
            <p className="text-muted-foreground mb-4">
              Join our platform and reach more customers in your area
            </p>
            <Link href="/register">
              <Button>
                Get Started
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}