import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import StoreCard from "@/components/StoreCard";
import type { Product, Store } from "@shared/schema";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import FoodDeliveryBg from "../assets/food-delivery-illustration.jpg";
import Slider1Bg from "../assets/slider1.jpg";
import Slider2Bg from "../assets/slider2.jpg";
import Slider3Bg from "../assets/slider3.jpg";
import { useEffect, useState } from "react";

export default function Homepage() {
  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: stores } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
  });

  const featuredProducts = products?.slice(0, 6) || [];
  const popularStores = stores?.slice(0, 4) || [];

  // Countdown logic for Slide 3
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60); // 24 hours in seconds

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = String(Math.floor(timeLeft / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');

  return (
    <div className="min-h-screen">
      {/* Hero Slider Section */}
      <section className="relative h-[40vh] sm:h-[50vh] lg:h-[60vh] overflow-hidden">
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={0}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          className="h-full"
        >
          {/* Slide 1 - Fast Delivery */}
          <SwiperSlide>
            <div className="relative h-full flex items-center justify-center">
              <img
                src={Slider2Bg}
                alt="Fast delivery illustration"
                className="absolute inset-0 w-full h-full object-cover z-0"
                style={{ filter: 'brightness(0.7)' }}
              />
              <div className="absolute inset-0 bg-black/40 z-10"></div>
              <div className="relative text-center text-white px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto z-20">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                  From Click to Doorstep — In Just One Hour
                </h1>
                <p className="text-base sm:text-lg md:text-xl mb-6 font-medium opacity-90">
                  Shop fast. Get it faster.
                </p>
                <Link href="/products">
                  <Button size="lg" className="bg-white text-black hover:bg-gray-100 text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold">
                    Shop Now
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </SwiperSlide>

          {/* Slide 2 - Food Delivery */}
          <SwiperSlide>
            <div className="relative h-full flex items-center justify-center">
              <img
                src={Slider1Bg}
                alt="Food delivery illustration"
                className="absolute inset-0 w-full h-full object-cover z-0"
                style={{ filter: 'brightness(0.7)' }}
              />
              <div className="absolute inset-0 bg-black/40 z-10"></div>
              <div className="relative text-center text-white px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto z-20">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
                  Hot & Fresh – Tasty Food at Your Doorstep
                </h1>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 font-medium opacity-90">
                  Delicious meals delivered within the hour.
                </p>
                <Link href="/products?category=1">
                  <Button size="lg" className="bg-white text-black hover:bg-gray-100 text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold">
                    Order Now
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </SwiperSlide>

          {/* Slide 3 - Limited Offers */}
          <SwiperSlide>
            <div className="relative h-full flex items-center justify-center">
              <img
                src={Slider3Bg}
                alt="Limited offer background"
                className="absolute inset-0 w-full h-full object-cover z-0"
                style={{ filter: 'brightness(0.7)' }}
              />
              <div className="absolute inset-0 bg-black/40 z-10"></div>
              <div className="relative text-center text-white px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto z-20 flex flex-col items-center">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight animate-pulse">
                  Grab the Offer Fast – Limited Time Only!
                </h1>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 font-medium opacity-90">
                  Deals you can't miss.
                </p>
                {/* Countdown Timer */}
                <div className="flex space-x-4 mb-8">
                  <div className="flex flex-col items-center">
                    <span className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold animate-bounce">{hours}</span>
                    <span className="text-xs sm:text-sm mt-1">Hours</span>
                  </div>
                  <span className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold animate-bounce">{minutes}</span>
                    <span className="text-xs sm:text-sm mt-1">Minutes</span>
                  </div>
                  <span className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold animate-bounce">{seconds}</span>
                    <span className="text-xs sm:text-sm mt-1">Seconds</span>
                  </div>
                </div>
                <Link href="/products">
                  <Button size="lg" className="bg-white text-black hover:bg-gray-100 text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold animate-pulse">
                    Grab Deal
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </SwiperSlide>
        </Swiper>
      </section>

      {/* Categories */}
      <section className="py-8 sm:py-12 lg:py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-10 gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Shop by Category</h2>
            <Link href="/categories">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white w-full sm:w-auto">
                View All Categories
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { name: "Electronics", icon: "📱", href: "/products?category=1" },
              { name: "Clothing", icon: "👕", href: "/products?category=2" },
              { name: "Home & Garden", icon: "🏠", href: "/products?category=3" },
              { name: "Books", icon: "📚", href: "/products?category=4" },
            ].map((category) => (
              <Link key={category.name} href={category.href}>
                <div className="category-card text-center p-4 sm:p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{category.icon}</div>
                  <div className="text-xs sm:text-sm font-semibold text-foreground">{category.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-8 sm:py-12 lg:py-16 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-10 gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Featured Products</h2>
            <Link href="/products">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white w-full sm:w-auto">
                View All Products
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Popular Stores */}
      <section className="py-8 sm:py-12 lg:py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 sm:mb-10 text-center">Popular Local Stores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {popularStores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        </div>
      </section>

      {/* Flash Deals Banner */}
      <section className="py-8 bg-accent">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="text-white">
            <h2 className="text-2xl font-bold mb-2">⚡ Flash Deals - Up to 50% Off!</h2>
            <p className="text-lg mb-4">Limited time offers on selected products</p>
            <Link href="/products">
              <Button variant="outline" className="bg-white text-accent hover:bg-gray-100">
                Shop Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
