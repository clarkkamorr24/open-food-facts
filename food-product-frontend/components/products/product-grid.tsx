"use client";

import { ProductCard } from "@/components/products/product-card";
import type { Product } from "@/types/product";

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id} className="h-full">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
