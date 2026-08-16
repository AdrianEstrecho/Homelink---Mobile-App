export type UserRole = 'customer' | 'employee' | 'admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  role: UserRole;
  position?: string | null;
  createdAt: string;
  notifyOrders: boolean;
  notifyBookings: boolean;
  notifyPromotions: boolean;
}
