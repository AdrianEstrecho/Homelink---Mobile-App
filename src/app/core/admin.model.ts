// Admin-only slice of the backend's /api/admin surface — ported from the web
// admin panel (see backend/routes/admin.js) for the mobile app's admin pages
// (Dashboard, Products, Services, Orders, Returns, Bookings, Users, Vouchers,
// Support). Field names mirror the raw SQL row shape returned by those
// endpoints (snake_case), same as order.model.ts / booking.model.ts do for the
// customer-facing endpoints.
import { RefundStatus, ReturnKind, ReturnStatus } from './returns.util';

export interface AdminStats {
  totalCustomers: number;
  totalEmployees: number;
  totalProducts: number;
  totalOrders: number;
  totalBookings: number;
  revenue: number;
  pendingOrders: number;
  pendingBookings: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface AdminOrderSummary {
  id: string;
  status: string;
  total: number;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface AdminBookingSummary {
  id: string;
  status: string;
  price: number;
  service_name: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface AdminDashboardData {
  stats: AdminStats;
  orderStatusBreakdown: { status: string; count: number }[];
  salesByMonth: { month: string; revenue: number }[];
  recentOrders: AdminOrderSummary[];
  recentBookings: AdminBookingSummary[];
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  category_name?: string | null;
  category_parent_id?: string | null;
  main_category_id?: string | null;
  main_category_name?: string | null;
  subcategory_name?: string | null;
  price: number;
  stock: number;
  image: string;
  featured: boolean;
  brand?: string | null;
  model?: string | null;
  warranty?: string | null;
  /** Arrive already parsed (backend shapeProduct): label -> value, and a list of lines. */
  specifications?: Record<string, string> | null;
  highlights?: string[] | null;
  discount: number;
  status: 'active' | 'inactive';
  archived: boolean;
  created_at: string;
}

/** A row of GET /admin/services. specifications/highlights/requirements arrive already parsed. */
export interface AdminService {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  base_price: number;
  duration_hours: number;
  image: string;
  discount: number;
  status: 'active' | 'inactive';
  specifications?: Record<string, string> | null;
  highlights?: string[] | null;
  requirements?: string[] | null;
  warranty?: string | null;
  archived: boolean;
}

export interface AdminOrderItem {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface AdminOrder {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  total: number;
  promo_code?: string | null;
  shipping_address?: string;
  payment_method?: string;
  cancel_reason?: string | null;
  /** Set once the customer confirms a delivered order — returns are closed after that. */
  completed_at?: string | null;
  /** Created after payment even though something ran out mid-checkout; staff must follow up. */
  needs_review?: boolean | number | null;
  review_reason?: string | null;
  created_at: string;
  items: AdminOrderItem[];
}

export interface AdminReturnItem {
  quantity: number;
  unit_price: number;
  product_id: string;
  name: string;
  archived: boolean | number;
}

/** A row of GET /admin/returns — returns and cancellation refunds share the one queue. */
export interface AdminReturn {
  id: string;
  order_id: string;
  kind: ReturnKind;
  reason: string;
  status: ReturnStatus;
  refund_amount: number;
  refund_status: RefundStatus;
  review_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  payment_method: string;
  reviewer_first?: string | null;
  reviewer_last?: string | null;
  photo_count: number;
  items: AdminReturnItem[];
}

export interface AdminReturnsResponse {
  returns: AdminReturn[];
  counts: { status: ReturnStatus; count: number | string }[];
  kindCounts: { kind: ReturnKind; count: number | string }[];
}

export interface AdminVoucher {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order: number;
  max_uses: number;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean | number;
}

export interface AdminSupportReply {
  id: string;
  body: string;
  created_at: string;
  author_first_name: string;
  author_last_name: string;
}

export interface AdminSupportMessage {
  id: string;
  ticket_number: number;
  type: 'support' | 'complaint';
  subject: string;
  message: string;
  status: 'open' | 'resolved';
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  replies: AdminSupportReply[];
}

/** A row of GET /admin/approvals/mine — only entity_type/entity_id/status are read here. */
export interface AdminChangeRequest {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  status: 'pending' | 'approved' | 'rejected';
}

/** A row of GET /admin/audit-logs. details is the action-specific payload logActivity stored. */
export interface AdminAuditLog {
  id: string;
  action: string;
  details: Record<string, any> | null;
  created_at: string;
  first_name?: string | null;
  last_name?: string | null;
}

export interface AdminBooking {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  service_id: string;
  service_name: string;
  employee_id: string | null;
  emp_first?: string | null;
  emp_last?: string | null;
  status: string;
  payment_status: string;
  scheduled_date: string;
  scheduled_time: string;
  price: number;
  address?: string;
  notes?: string | null;
}

export type AdminUserRole = 'customer' | 'employee' | 'admin';

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  address?: string | null;
  role: AdminUserRole;
  position: string | null;
  staff_code?: string | null;
  archived: boolean;
  created_at: string;
}

export const EMPLOYEE_POSITIONS = [
  'inventory_clerk',
  'booking_coordinator',
  'installer',
  'accounting',
  'hr',
  'general_staff',
] as const;

export const POSITION_LABELS: Record<string, string> = {
  inventory_clerk: 'Inventory Clerk',
  booking_coordinator: 'Booking Coordinator',
  installer: 'Installer / Technician',
  accounting: 'Accounting',
  hr: 'Human Resources',
  general_staff: 'General Staff',
};
