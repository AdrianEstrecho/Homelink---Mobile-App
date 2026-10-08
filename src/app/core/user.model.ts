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
  /** Profile photo as a base64 data URL (a small square JPEG), or null for initials. */
  avatar?: string | null;
  notifyOrders: boolean;
  notifyBookings: boolean;
  notifyPromotions: boolean;
  twoFactorEnabled?: boolean;
}
