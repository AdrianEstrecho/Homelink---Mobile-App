export interface Product {
  id: string;
  slug: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  stock: number;
  featured: boolean;
  category_id?: string;
  category_name?: string;
  category_slug?: string;
  avg_rating?: number;
  review_count?: number;
  specifications?: Record<string, string>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  product_count: number;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category: string;
  base_price: number;
  duration_hours: number;
  image: string;
}
