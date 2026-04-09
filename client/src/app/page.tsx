import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { FeaturedProducts } from "@/components/featured-products";
import { BestSellers } from "@/components/best-sellers";
import { StoreLocations } from "@/components/store-locations";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <FeaturedProducts />
      <BestSellers />
      <StoreLocations />
      <Footer />
    </main>
  );
}
