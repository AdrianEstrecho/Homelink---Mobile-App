export interface OrderItem {
  id: string;
  product_id: string;
  name: string;
  image: string;
  slug: string;
  brand?: string | null;
  /** The product's top-level catalog category (name and slug), for the My Orders filter. */
  category?: string | null;
  category_slug?: string | null;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  status: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  total: number;
  promo_code?: string | null;
  shipping_address: string;
  payment_method: string;
  created_at: string;
  cancel_reason?: string | null;
  items: OrderItem[];
  /** Server-computed: delivered, inside the return window, and with units not already claimed. */
  canReturn?: boolean;
  /** Server-computed: a live return or a full refund — files the order under Returns. */
  returned?: boolean;
  /** Set when the customer marks a delivered order completed; it can't be returned after that. */
  completed_at?: string | null;
}

/** A not-yet-placed order preview, built client-side for the review step. */
export interface PendingOrder {
  items: { id: string; name: string; image: string; price: number; quantity: number }[];
  shipping_address: string;
  payment_method: string;
  promo_code: string | null;
  subtotal: number;
  discount: number;
  total: number;
}
