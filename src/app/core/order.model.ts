export interface OrderItem {
  id: string;
  product_id: string;
  name: string;
  image: string;
  slug: string;
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
