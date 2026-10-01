import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideCalendarDays,
  LucideChevronRight,
  LucideClock,
  LucideHardHat,
  LucideMapPin,
  LucideSearch,
  LucideSlidersHorizontal,
  LucideTruck,
  LucideX,
} from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { Booking } from '../../core/booking.model';
import { formatTimeAmPm } from '../../core/format.util';
import { PricePipe } from '../../core/price.pipe';
import { scrollAppToTop } from '../../core/scroll-top.util';
import { ToastService } from '../../core/toast.service';
import { BookingDetailsModal } from '../../shared/booking-details-modal/booking-details-modal';
import { CancelReasonModal } from '../../shared/cancel-reason-modal/cancel-reason-modal';
import { FilterDrawer, FilterOption } from '../../shared/filter-drawer/filter-drawer';
import { Pagination } from '../../shared/pagination/pagination';
import { ServiceCategoryIcon } from '../../shared/service-category-icon/service-category-icon';
import { StatusTabs } from '../../shared/status-tabs/status-tabs';
import { TrackingModal } from '../../shared/tracking-modal/tracking-modal';

/** Booking cards are tall — date, service, schedule, address, technician, price — so five is
 *  about one screenful. Past that the list pages rather than growing. */
const PAGE_SIZE = 5;

/** A booking whose service lost its category shouldn't vanish from every filter. */
const categoryOf = (b: Booking) => b.service_category || 'Other';

type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

/** Badge and wording per status. Whole class strings, because Tailwind only sees class names
 *  written out in source. */
const STATUS_META: Record<BookingStatus, { label: string; pill: string; empty: string }> = {
  pending: { label: 'Pending', pill: 'bg-amber-100 text-amber-800', empty: 'No bookings waiting to be confirmed.' },
  confirmed: { label: 'Confirmed', pill: 'bg-blue-100 text-blue-800', empty: 'No confirmed visits coming up.' },
  in_progress: { label: 'In progress', pill: 'bg-indigo-100 text-indigo-800', empty: 'No services in progress right now.' },
  completed: { label: 'Completed', pill: 'bg-emerald-600 text-white', empty: 'No completed bookings yet.' },
  cancelled: { label: 'Cancelled', pill: 'bg-red-100 text-red-700', empty: 'No cancelled bookings.' },
};

/** BOOKING_STEPS in backend/utils/tracking.js, in the customer's words. */
const PROGRESS_STEPS = ['Requested', 'Confirmed', 'In progress', 'Completed'];
const PROGRESS_INDEX: Partial<Record<BookingStatus, number>> = { pending: 0, confirmed: 1, in_progress: 2, completed: 3 };

const ALL = 'all';
const STATUS_ORDER: BookingStatus[] = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

@Component({
  selector: 'app-bookings',
  imports: [
    DatePipe,
    PricePipe,
    CancelReasonModal,
    BookingDetailsModal,
    FilterDrawer,
    TrackingModal,
    Pagination,
    ServiceCategoryIcon,
    StatusTabs,
    LucideCalendarDays,
    LucideChevronRight,
    LucideClock,
    LucideHardHat,
    LucideMapPin,
    LucideSearch,
    LucideSlidersHorizontal,
    LucideTruck,
    LucideX,
  ],
  templateUrl: './bookings.html',
  styleUrl: './bookings.css',
})
export class Bookings {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected readonly formatTimeAmPm = formatTimeAmPm;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly progressSteps = PROGRESS_STEPS;
  protected readonly bookings = signal<Booking[]>([]);
  protected readonly loaded = signal(false);
  protected readonly selectedBooking = signal<Booking | null>(null);
  protected readonly trackingBooking = signal<Booking | null>(null);
  protected readonly cancelTarget = signal<Booking | null>(null);

  protected readonly search = signal('');
  protected readonly filtersOpen = signal(false);

  protected readonly cancelModal = viewChild(CancelReasonModal);

  // Status, category and page live in the URL, the same way the catalog carries its filters, so
  // a filtered view survives back navigation.
  private queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly activeStatus = computed(() => {
    const requested = this.queryParamMap().get('status');
    return requested && (STATUS_ORDER as string[]).includes(requested) ? requested : ALL;
  });
  protected readonly activeCategory = computed(() => this.queryParamMap().get('category') ?? '');
  protected readonly page = computed(() => Math.max(1, Number(this.queryParamMap().get('page')) || 1));

  /** Only the service categories this customer has actually booked are offered. */
  protected readonly categoryOptions = computed<FilterOption[]>(() => {
    const counts = new Map<string, number>();
    for (const b of this.bookings()) counts.set(categoryOf(b), (counts.get(categoryOf(b)) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => ({ key, label: key, count }));
  });

  /** Search and category narrow the list first; the status counts are taken over what's left. */
  private readonly searched = computed(() => {
    const terms = this.search().trim().toLowerCase().split(/\s+/).filter(Boolean);
    const category = this.activeCategory();
    return this.bookings().filter((b) => {
      if (category && categoryOf(b) !== category) return false;
      if (!terms.length) return true;
      const haystack = this.searchText(b);
      return terms.every((t) => haystack.includes(t));
    });
  });
  protected readonly statusOptions = computed<FilterOption[]>(() => {
    const list = this.searched();
    return [
      { key: ALL, label: 'All', count: list.length },
      ...STATUS_ORDER.map((s) => ({ key: s, label: STATUS_META[s].label, count: list.filter((b) => b.status === s).length })),
    ];
  });
  protected readonly visible = computed(() => {
    const status = this.activeStatus();
    return status === ALL ? this.searched() : this.searched().filter((b) => b.status === status);
  });
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.visible().length / PAGE_SIZE)));
  protected readonly paginated = computed(() => this.visible().slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE));
  // The tabs are how you move around the list, not a filter to clear — only category counts here.
  protected readonly activeFilterCount = computed(() => (this.activeCategory() ? 1 : 0));
  protected readonly isFiltering = computed(() => this.activeFilterCount() > 0 || !!this.search().trim());

  constructor() {
    this.api
      .get<Booking[]>('/bookings/my')
      .then((data) => this.bookings.set(data))
      .catch(() => {})
      .finally(() => this.loaded.set(true));

    // A stale ?page= can point past the end of the list; fall back to the last real page rather
    // than an empty column. Waits for the list, or a deep link would be clamped away first.
    effect(() => {
      if (this.loaded() && this.page() > this.totalPages()) this.setQuery({ page: this.totalPages() <= 1 ? null : String(this.totalPages()) });
    });
  }

  private searchText(b: Booking): string {
    return [
      b.id.slice(0, 8),
      b.service_name,
      categoryOf(b),
      b.address,
      b.notes ?? '',
      b.employee_first_name ?? '',
      b.employee_last_name ?? '',
      this.meta(b).label,
    ]
      .join(' ')
      .toLowerCase();
  }

  private setQuery(params: Record<string, string | null>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
  }

  /** Any filter change starts the list over: page 3 of everything may be past the end of one status. */
  selectStatus(key: string): void {
    this.setQuery({ status: key === ALL ? null : key, page: null });
  }

  selectCategory(key: string): void {
    this.setQuery({ category: key || null, page: null });
  }

  onSearch(value: string): void {
    this.search.set(value);
    if (this.queryParamMap().has('page')) this.setQuery({ page: null });
  }

  /** Clears the search and category; the status tab stays where the customer put it. */
  clearAll(): void {
    this.onSearch('');
    this.selectCategory('');
  }

  emptyMessage(): string {
    if (this.bookings().length === 0) return 'No bookings yet.';
    if (this.isFiltering()) return 'No bookings match your search and filters.';
    const status = this.activeStatus();
    return status === ALL ? 'No bookings yet.' : STATUS_META[status as BookingStatus].empty;
  }

  handlePageChange(next: number): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { page: next <= 1 ? null : next }, queryParamsHandling: 'merge' });
    scrollAppToTop();
  }

  meta(b: Booking) {
    return STATUS_META[b.status as BookingStatus] ?? STATUS_META.pending;
  }

  progressIndex(b: Booking): number {
    return PROGRESS_INDEX[b.status as BookingStatus] ?? -1;
  }

  /** scheduled_date is a plain YYYY-MM-DD in PH local time — built as a local date so a UTC
   *  parse can't shift it to the day before. */
  scheduledDate(b: Booking): Date | null {
    const [y, m, d] = (b.scheduled_date || '').split('-').map(Number);
    return y && m && d ? new Date(y, m - 1, d) : null;
  }

  technician(b: Booking): string | null {
    return b.employee_first_name ? `${b.employee_first_name} ${b.employee_last_name ?? ''}`.trim() : null;
  }

  async submitCancel(reason: string): Promise<void> {
    const booking = this.cancelTarget();
    if (!booking) return;
    try {
      await this.api.put(`/bookings/${booking.id}/cancel`, { reason });
      this.bookings.update((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: 'cancelled', cancel_reason: reason } : b)));
      this.selectedBooking.update((prev) => (prev && prev.id === booking.id ? { ...prev, status: 'cancelled', cancel_reason: reason } : prev));
      this.cancelTarget.set(null);
      this.toast.showToast({
        icon: 'x-circle',
        iconClass: 'bg-red-100 text-red-600',
        title: 'Booking cancelled',
        description: booking.service_name,
      });
    } catch (err) {
      this.cancelModal()?.showError((err as Error).message);
    }
  }
}
