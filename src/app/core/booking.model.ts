export interface Booking {
  id: string;
  user_id: string;
  service_id: string;
  service_name: string;
  service_category: string;
  service_image: string;
  scheduled_date: string;
  scheduled_time: string;
  address: string;
  notes?: string;
  price: number;
  discount: number;
  status: string;
  payment_status: string;
  payment_method?: string | null;
  completion_notes?: string | null;
  cancel_reason?: string | null;
  employee_first_name?: string | null;
  employee_last_name?: string | null;
  created_at: string;
}

export interface AvailabilitySlot {
  time: string;
  available: boolean;
}

export interface DiscountPreview {
  firstTime: { type: 'percent' | 'fixed'; value: number; label: string } | null;
  holiday: { type: 'percent' | 'fixed'; value: number; label: string } | null;
}
