// Admin-only slice of the backend's /api/admin surface — ported from the web
// admin panel (see backend/routes/admin.js) for the mobile app's Core Ops
// pages (Dashboard, Products, Orders, Bookings, Users). Field names mirror
// the raw SQL row shape returned by those endpoints (snake_case), same as
// order.model.ts / booking.model.ts do for the customer-facing endpoints.

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
}

export interface AdminBookingSummary {
  id: string;
  status: string;
  price: number;
  service_name: string;
  first_name: string;
  last_name: string;
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
  discount: number;
  status: 'active' | 'inactive';
  archived: boolean;
  created_at: string;
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
  total: number;
  shipping_address?: string;
  payment_method?: string;
  created_at: string;
  items: AdminOrderItem[];
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
