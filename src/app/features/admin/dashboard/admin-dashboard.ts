import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArchive,
  LucideArrowRight,
  LucideCalendar,
  LucideChevronRight,
  LucideCircleCheck,
  LucideClipboardCheck,
  LucideCloudOff,
  LucideLogIn,
  LucideMessageSquare,
  LucidePackage,
  LucidePackageX,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideRotateCcw,
  LucideShoppingCart,
  LucideTrash2,
  LucideTrendingDown,
  LucideTrendingUp,
  LucideTriangleAlert,
  LucideUserX,
  LucideUsers,
} from '@lucide/angular';

import { AdminAuditLog, AdminDashboardData, AdminUser } from '../../../core/admin.model';
import { ApiService } from '../../../core/api.service';
import { ACTION_META, AuditCategory, describeAudit, timeAgo } from '../../../core/audit-actions';
import { AuthService } from '../../../core/auth.service';
import { currencySymbol, formatPrice, statusColor } from '../../../core/format.util';
import { ToastService } from '../../../core/toast.service';
import { CountUp } from '../../../shared/count-up/count-up';

// Pipeline stages step light -> dark through one brand-blue ramp (the further along, the
// darker); cancelled leaves the pipeline, so it gets its own hue. Checked for colour-blind
// separation — the badge colours (statusColor) can't be reused here, their blue and purple
// are indistinguishable under deuteranopia.
const PIPELINE = [
  { status: 'pending', label: 'Pending', color: '#88acdc' },
  { status: 'processing', label: 'Processing', color: '#4f80c4' },
  { status: 'shipped', label: 'Shipped', color: '#24589f' },
  { status: 'delivered', label: 'Delivered', color: '#0f2b5b' },
  { status: 'cancelled', label: 'Cancelled', color: '#d94a4a' },
] as const;

const CATEGORY_STYLE: Record<AuditCategory, string> = {
  create: 'bg-green-100 text-green-600',
  update: 'bg-amber-100 text-amber-600',
  delete: 'bg-red-100 text-red-600',
  login: 'bg-blue-100 text-blue-600',
  archive: 'bg-purple-100 text-purple-600',
};

// Revenue chart geometry, in the SVG's own 300x100 viewBox. The line sits on a baseline 2
// units above the bottom edge and the best month peaks RISE units above it, leaving headroom
// for the peak annotation.
const CHART_W = 300;
const CHART_H = 100;
const BASELINE = 98;
const RISE = 76;

type AttentionIcon = 'orders' | 'bookings' | 'unassigned' | 'approvals' | 'returns' | 'support' | 'stock';
type TotalIcon = 'orders' | 'bookings' | 'customers' | 'products';

const compactPeso = (n: number) =>
  `${currencySymbol()}${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)}`;
// Title-block cells are a third of a phone's width: past eight digits a figure goes compact rather
// than being cut off.
const cellPeso = (n: number) => (n >= 10_000_000 ? compactPeso(n) : formatPrice(n));
const monthName = (key: string) =>
  new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1).toLocaleString('en-US', { month: 'short' });
const initialsOf = (first: string, last: string) => `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Mobile analog of frontend/src/pages/admin/Dashboard.jsx, reorganised around the question an
 * admin opens it with on a phone: what's waiting on me, and how is the store doing. The hero is
 * a blueprint "drawing sheet" with the month-by-month sales line (tap a month to read it in the
 * title block underneath); then the pending-work queue, totals, the order pipeline, the recent
 * orders/bookings switcher and the staff activity feed. The web feed's "View all" goes to the
 * Audit Trail page, which mobile doesn't have, so it's omitted.
 *
 * The chart plots each month's paid product orders plus paid bookings (salesByMonth's
 * `revenue` + `services`, as the web dashboard's stacked columns do), so it adds up to the same
 * thing as the all-time headline figure; the title block splits the focused month in two.
 * A red stock warning sits above everything whenever a product is at 5 units or fewer.
 */
@Component({
  selector: 'app-admin-dashboard',
  imports: [
    RouterLink,
    CountUp,
    LucideRefreshCw,
    LucideTrendingUp,
    LucideTrendingDown,
    LucideShoppingCart,
    LucideCalendar,
    LucideTriangleAlert,
    LucidePackageX,
    LucidePackage,
    LucideUsers,
    LucideChevronRight,
    LucideCircleCheck,
    LucideCloudOff,
    LucideArrowRight,
    LucidePlus,
    LucidePencil,
    LucideTrash2,
    LucideLogIn,
    LucideArchive,
    LucideUserX,
    LucideRotateCcw,
    LucideMessageSquare,
    LucideClipboardCheck,
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  protected readonly formatPrice = formatPrice;
  protected readonly currencySymbol = currencySymbol;
  protected readonly statusColor = statusColor;
  protected readonly user = this.auth.user;
  protected readonly data = signal<AdminDashboardData | null>(null);
  protected readonly loadError = signal(false);
  protected readonly refreshing = signal(false);
  protected readonly updatedAt = signal<Date | null>(null);
  protected readonly recentTab = signal<'orders' | 'bookings'>('orders');
  protected readonly activity = signal<AdminAuditLog[] | null>(null);
  protected readonly activityFailed = signal(false);
  /** Month the chart readout is pinned to; null follows the latest month. */
  protected readonly selectedMonth = signal<number | null>(null);
  private readonly staff = signal<AdminUser[]>([]);

  protected readonly greeting = computed(() => greetingFor((this.updatedAt() ?? new Date()).getHours()));
  protected readonly dateLabel = computed(() =>
    (this.updatedAt() ?? new Date()).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
  );
  protected readonly timeLabel = computed(
    () => this.updatedAt()?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) ?? '',
  );

  // Whole pesos for the count-up; the centavos are in every other figure on the page.
  protected readonly revenueFigure = computed(() =>
    Math.round(this.data()?.stats.revenue ?? 0).toLocaleString('en-US'),
  );

  protected readonly chart = computed(() => {
    const months = this.data()?.salesByMonth ?? [];
    if (months.length === 0) return null;
    const now = new Date();
    const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    // Months after this one are still in the payload (all zero); they keep their slot on the
    // axis but get no line, so the year reads as "in progress" instead of "crashed to zero".
    const lastIdx = Math.max(0, months.reduce((acc, m, i) => (m.month <= nowKey ? i : acc), -1));
    const total = (m: { revenue: number; services?: number }) => m.revenue + (m.services ?? 0);
    const max = Math.max(...months.slice(0, lastIdx + 1).map(total));
    const slot = CHART_W / months.length;
    const points = months
      .slice(0, lastIdx + 1)
      .map((m, i) => ({ x: slot * (i + 0.5), y: BASELINE - (max > 0 ? total(m) / max : 0) * RISE }));
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const first = points[0];
    const last = points[points.length - 1];
    return {
      year: months[0].month.slice(0, 4),
      nowKey,
      lastIdx,
      line,
      area: points.length > 1 ? `${line} L${last.x.toFixed(1)} ${CHART_H} L${first.x.toFixed(1)} ${CHART_H} Z` : '',
      peak: max > 0 ? { y: BASELINE - RISE, pct: ((BASELINE - RISE) / CHART_H) * 100, label: compactPeso(max) } : null,
      ytd: months.slice(0, lastIdx + 1).reduce((s, m) => s + total(m), 0),
      months: months.map((m, i) => ({
        key: m.month,
        name: monthName(m.month),
        initial: monthName(m.month)[0],
        revenue: total(m),
        products: m.revenue,
        services: m.services ?? 0,
        plotted: i <= lastIdx,
        xPct: ((i + 0.5) / months.length) * 100,
        yPct: ((points[i]?.y ?? BASELINE) / CHART_H) * 100,
      })),
    };
  });

  protected readonly focusMonth = computed(() => {
    const c = this.chart();
    if (!c) return 0;
    const s = this.selectedMonth();
    return s !== null && s <= c.lastIdx ? s : c.lastIdx;
  });

  // The hero's three-cell title block: the focused month, how it compares with the month before,
  // and the year so far. A month still in progress is only days into its total, so it shows last
  // month's figure to read against instead of a percentage change that would always look like a
  // collapse.
  protected readonly readout = computed(() => {
    const c = this.chart();
    if (!c) return null;
    const i = this.focusMonth();
    const m = c.months[i];
    const prev = i > 0 ? c.months[i - 1] : null;
    const inProgress = m.key === c.nowKey;
    let compare: { label: string; text: string; dir: 'up' | 'down' | null };
    if (!prev) {
      compare = { label: 'vs last month', text: '—', dir: null };
    } else if (inProgress) {
      compare = { label: `${prev.name} total`, text: cellPeso(prev.revenue), dir: null };
    } else if (prev.revenue > 0) {
      const pct = Math.round(((m.revenue - prev.revenue) / prev.revenue) * 100);
      compare = {
        label: `vs ${prev.name}`,
        text: pct > 0 ? `+${pct}%` : pct < 0 ? `−${-pct}%` : 'No change',
        dir: pct > 0 ? 'up' : pct < 0 ? 'down' : null,
      };
    } else {
      compare = { label: `vs ${prev.name}`, text: m.revenue > 0 ? `Up from ${currencySymbol()}0` : 'No change', dir: m.revenue > 0 ? 'up' : null };
    }
    return {
      monthLabel: inProgress ? `${m.name} so far` : `${m.name} ${c.year}`,
      value: cellPeso(m.revenue),
      compare,
      ytd: cellPeso(c.ytd),
      products: formatPrice(m.products),
      services: formatPrice(m.services),
    };
  });

  protected readonly attention = computed(() => {
    const s = this.data()?.stats;
    if (!s) return [];
    // The web dashboard's punch list. Counts an older backend doesn't send drop off the list.
    // Approvals have no page in the app, so that row only reports the count.
    const rows: { icon: AttentionIcon; label: string; hint: string; count: number | undefined; link: string | null; query: Record<string, string> | null }[] = [
      { icon: 'orders', label: 'Pending orders', hint: 'Waiting to be processed', count: s.pendingOrders, link: '/admin/orders', query: { status: 'pending' } },
      { icon: 'bookings', label: 'Pending bookings', hint: 'Waiting to be confirmed', count: s.pendingBookings, link: '/admin/bookings', query: { status: 'pending' } },
      { icon: 'unassigned', label: 'Unassigned bookings', hint: 'No technician yet', count: s.unassignedBookings, link: '/admin/bookings', query: null },
      { icon: 'returns', label: 'Return requests', hint: 'Waiting for review', count: s.pendingReturns, link: '/admin/returns', query: null },
      { icon: 'support', label: 'Support messages', hint: 'Still open', count: s.openSupport, link: '/admin/support', query: null },
      { icon: 'approvals', label: 'Approvals', hint: 'Approve these in the web admin', count: s.pendingApprovals, link: null, query: null },
      { icon: 'stock', label: 'Low or out of stock', hint: '5 or fewer units left', count: s.lowStockCount + s.outOfStockCount, link: '/admin/products', query: null },
    ];
    return rows
      .filter((r): r is typeof r & { count: number } => typeof r.count === 'number' && !Number.isNaN(r.count));
  });

  protected readonly attentionTotal = computed(() => this.attention().reduce((n, a) => n + a.count, 0));

  // The red warning above everything: only while some product is at 5 units or fewer, listing
  // the emptiest ones (up to 8), each opening Products filtered to it.
  protected readonly stockAlert = computed(() => {
    const d = this.data();
    if (!d) return null;
    const low = d.stats.lowStockCount ?? 0;
    const out = d.stats.outOfStockCount ?? 0;
    const total = low + out;
    if (total === 0) return null;
    const products = d.lowStockProducts ?? [];
    return {
      summary: [out > 0 && `${out.toLocaleString('en-US')} out of stock`, low > 0 && `${low.toLocaleString('en-US')} running low`]
        .filter(Boolean)
        .join(' · '),
      products,
      more: total - products.length,
    };
  });

  protected readonly totals = computed(() => {
    const s = this.data()?.stats;
    if (!s) return [];
    return [
      { icon: 'orders' as TotalIcon, label: 'Orders', value: s.totalOrders, hint: 'All time' },
      { icon: 'bookings' as TotalIcon, label: 'Bookings', value: s.totalBookings, hint: 'All time' },
      { icon: 'customers' as TotalIcon, label: 'Customers', value: s.totalCustomers, hint: `${s.totalEmployees} ${s.totalEmployees === 1 ? 'employee' : 'employees'} on staff` },
      { icon: 'products' as TotalIcon, label: 'Products', value: s.totalProducts, hint: 'In the catalog' },
    ].map((t) => ({ ...t, display: t.value.toLocaleString('en-US') }));
  });

  protected readonly pipeline = computed(() => {
    const breakdown = this.data()?.orderStatusBreakdown ?? [];
    const rows = PIPELINE.map((p) => ({ ...p, count: breakdown.find((r) => r.status === p.status)?.count ?? 0 }));
    const total = rows.reduce((s, r) => s + r.count, 0);
    const withPct = rows.map((r) => {
      const pct = total ? Math.round((r.count / total) * 100) : 0;
      // A handful of orders out of thousands still exists — say so rather than "0%".
      return { ...r, display: r.count.toLocaleString('en-US'), pct: r.count > 0 && pct === 0 ? '<1%' : `${pct}%` };
    });
    return {
      total,
      rows: withPct,
      segments: withPct.filter((r) => r.count > 0),
      summary: withPct.map((r) => `${r.label} ${r.count}`).join(', '),
    };
  });

  protected readonly recentRows = computed(() => {
    const d = this.data();
    if (!d) return [];
    if (this.recentTab() === 'orders') {
      return d.recentOrders.map((o) => ({
        id: o.id,
        name: `${o.first_name} ${o.last_name}`,
        initials: initialsOf(o.first_name, o.last_name),
        detail: `#${o.id.slice(0, 8).toUpperCase()}`,
        when: timeAgo(o.created_at),
        status: o.status,
        statusLabel: o.status,
        amount: formatPrice(o.total),
      }));
    }
    return d.recentBookings.map((b) => ({
      id: b.id,
      name: `${b.first_name} ${b.last_name}`,
      initials: initialsOf(b.first_name, b.last_name),
      detail: b.service_name,
      when: timeAgo(b.created_at),
      status: b.status,
      statusLabel: b.status.replace('_', ' '),
      amount: formatPrice(b.price),
    }));
  });

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

  constructor() {
    this.load();
    this.api
      .get<AdminUser[]>('/admin/users')
      .then((users) => this.staff.set(users.filter((u) => u.role !== 'customer')))
      .catch(() => {});
  }

  /** First load, the hero's refresh button and the error state's retry all come through here. A
   * failed refresh keeps the figures already on screen and says so, rather than blanking them. */
  protected load(): void {
    if (this.refreshing()) return;
    this.refreshing.set(true);
    this.loadError.set(false);
    this.api
      .get<AdminDashboardData>('/admin/dashboard')
      .then((d) => {
        this.data.set(d);
        this.updatedAt.set(new Date());
      })
      .catch(() => {
        if (!this.data()) {
          this.loadError.set(true);
          return;
        }
        this.toast.showToast({
          id: 'admin-dashboard-refresh',
          icon: 'x-circle',
          iconClass: 'bg-red-100 text-red-600',
          title: "Couldn't refresh the dashboard",
          description: `Showing figures from ${this.timeLabel()}.`,
        });
      })
      .finally(() => this.refreshing.set(false));
    this.api
      .get<AdminAuditLog[]>('/admin/audit-logs?limit=6')
      .then((a) => {
        this.activity.set(a);
        this.activityFailed.set(false);
      })
      .catch(() => this.activityFailed.set(this.activity() === null));
  }
}
