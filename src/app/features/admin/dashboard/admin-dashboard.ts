import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAlertTriangle,
  LucideArchive,
  LucideArrowRight,
  LucideCalendar,
  LucideDollarSign,
  LucideLogIn,
  LucidePencil,
  LucidePlus,
  LucideShoppingCart,
  LucideTrash2,
  LucideUsers,
} from '@lucide/angular';

import { AdminAuditLog, AdminDashboardData, AdminUser } from '../../../core/admin.model';
import { ApiService } from '../../../core/api.service';
import { ACTION_META, AuditCategory, describeAudit, timeAgo } from '../../../core/audit-actions';
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

const CATEGORY_STYLE: Record<AuditCategory, string> = {
  create: 'bg-green-100 text-green-600',
  update: 'bg-amber-100 text-amber-600',
  delete: 'bg-red-100 text-red-600',
  login: 'bg-blue-100 text-blue-600',
  archive: 'bg-purple-100 text-purple-600',
};

/** Mobile analog of frontend/src/pages/admin/Dashboard.jsx — stat cards, order-status
 * breakdown, a recent orders/bookings switcher and the staff "Recent Activity" feed, as
 * vertical cards instead of a two-column desktop grid. The revenue line chart
 * (RevenueChart.jsx) is swapped for a lightweight bar list (recentMonths below). The web
 * feed's "View all" goes to the Audit Trail page, which mobile doesn't have, so it's omitted.
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
    LucidePlus,
    LucidePencil,
    LucideTrash2,
    LucideLogIn,
    LucideArchive,
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
  protected readonly activity = signal<AdminAuditLog[] | null>(null);
  private readonly staff = signal<AdminUser[]>([]);

  // booking.assign/unassign entries only carry an employee id, so they're named from the staff list.
  protected readonly activityRows = computed(() => {
    const staff = this.staff();
    const nameOf = (id: string) => {
      const match = staff.find((u) => u.id === id);
      return match && `${match.first_name} ${match.last_name}`;
    };
    return (this.activity() ?? []).map((log) => {
      const category = ACTION_META[log.action]?.category;
      return {
        id: log.id,
        category: category ?? 'update',
        style: category ? CATEGORY_STYLE[category] : 'bg-gray-100 text-gray-600',
        text: describeAudit(log.action, log.details, nameOf),
        by: log.first_name ? `${log.first_name} ${log.last_name}` : 'Deleted user',
        when: timeAgo(log.created_at),
      };
    });
  });

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
    this.api
      .get<AdminAuditLog[]>('/admin/audit-logs?limit=6')
      .then((a) => this.activity.set(a))
      .catch(() => this.activity.set([]));
    this.api
      .get<AdminUser[]>('/admin/users')
      .then((users) => this.staff.set(users.filter((u) => u.role !== 'customer')))
      .catch(() => {});
  }
}
