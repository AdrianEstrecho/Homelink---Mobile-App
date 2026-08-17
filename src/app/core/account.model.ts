export interface SavedPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  product_name?: string;
  product_image?: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface ReviewableProduct {
  id: string;
  name: string;
  image: string;
  slug: string;
  order_id: string;
}

export interface SupportReply {
  id: string;
  message_id: string;
  body: string;
  created_at: string;
}

export interface SupportMessage {
  id: string;
  type: 'support' | 'complaint';
  subject: string;
  message: string;
  status: 'open' | 'resolved';
  ticket_number: number;
  created_at: string;
  replies: SupportReply[];
}
