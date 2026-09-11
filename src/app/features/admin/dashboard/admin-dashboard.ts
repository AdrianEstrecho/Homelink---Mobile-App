import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAlertTriangle,
  LucideArrowRight,
  LucideCalendar,
  LucideDollarSign,
  LucideShoppingCart,
  LucideUsers,
} from '@lucide/angular';

import { AdminDashboardData } from '../../../core/admin.model';
import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { formatPrice, statusColor } from '../../../core/format.util';

const STATUS_ORDER = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
const STATUS_BAR_FILL: Record<string, string> = {
  pending: 'bg-yellow-400',
  processing: 'bg-blue-400',
  shipped: 'bg-purple-400',
  delivered: 'bg-green-400',
  cancelled: 'bg-red-400',
};

type StatIcon = 'revenue' | 'customers' | 'orders' | 'bookings';

/** Mobile analog of frontend/src/pages/admin/Dashboard.jsx — stat cards, order-status
 * breakdown, and a recent orders/bookings switcher, as vertical cards instead of a
 * two-column desktop grid. The revenue line chart (RevenueChart.jsx) is swapped for a
 * lightweight bar list (recentMonths below); the "Recent Activity" audit-log feed isn't
 * ported since the Audit Log page itself is out of the Core Ops scope for this pass.
 */
@Component({
  selector: 'app-admin-dashboard',
  imports: [
    RouterLink,
    LucideDollarSign,
    LucideUsers,
    LucideShoppingCart,
    LucideCalendar,
    LucideAlertTriangle,
    LucideArrowRight,
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  protected readonly formatPrice = formatPrice;
  protected readonly statusColor = statusColor;
  protected readonly user = this.auth.user;
  protected readonly data = signal<AdminDashboardData | null>(null);
  protected readonly recentTab = signal<'orders' | 'bookings'>('orders');

  protected readonly statCards = computed(() => {
    const d = this.data();
    if (!d) return [] as { label: string; value: string; icon: StatIcon }[];
    return [
      { label: 'Total Revenue', value: formatPrice(d.stats.revenue), icon: 'revenue' as StatIcon },
      { label: 'Customers', value: String(d.stats.totalCustomers), icon: 'customers' as StatIcon },
      { label: 'Total Orders', value: String(d.stats.totalOrders), icon: 'orders' as StatIcon },
      { label: 'Bookings', value: String(d.stats.totalBookings), icon: 'bookings' as StatIcon },
    ];
  });

  protected readonly statusRows = computed(() => {
    const d = this.data();
    if (!d) return [];
    const total = d.orderStatusBreakdown.reduce((s, r) => s + r.count, 0) || 1;
    return STATUS_ORDER.map((status) => ({
      status,
      count: d.orderStatusBreakdown.find((r) => r.status === status)?.count ?? 0,
    }))
      .filter((r) => r.count > 0 || STATUS_ORDER.indexOf(r.status) < 2)
      .map((r) => ({
        ...r,
        pct: Math.round((r.count / total) * 100),
        fill: STATUS_BAR_FILL[r.status] ?? 'bg-gray-400',
      }));
  });

  protected readonly recentMonths = computed(() => {
    const months = this.data()?.salesByMonth ?? [];
    const last6 = months.slice(-6);
    const max = Math.max(1, ...last6.map((m) => m.revenue));
    return last6.map((m) => ({
      ...m,
      pct: Math.max(4, Math.round((m.revenue / max) * 100)),
      label: m.month.slice(5),
    }));
  });

  constructor() {
    this.api
      .get<AdminDashboardData>('/admin/dashboard')
      .then((d) => this.data.set(d))
      .catch(() => {});
  }
}
