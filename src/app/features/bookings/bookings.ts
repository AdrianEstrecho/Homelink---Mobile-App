import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideLayoutGrid, LucideTruck } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { Booking } from '../../core/booking.model';
import { formatTimeAmPm, statusColor } from '../../core/format.util';
import { PricePipe } from '../../core/price.pipe';
import { scrollAppToTop } from '../../core/scroll-top.util';
import { ToastService } from '../../core/toast.service';
import { BookingDetailsModal } from '../../shared/booking-details-modal/booking-details-modal';
import { CancelReasonModal } from '../../shared/cancel-reason-modal/cancel-reason-modal';
import { Pagination } from '../../shared/pagination/pagination';
import { ServiceCategoryIcon } from '../../shared/service-category-icon/service-category-icon';
import { TrackingModal } from '../../shared/tracking-modal/tracking-modal';

/** Booking cards are tall — service, schedule, address, technician, price — so five is about one
 *  screenful. Past that the list pages rather than growing. */
const PAGE_SIZE = 5;

/** A booking whose service lost its category shouldn't vanish from every tab. */
const categoryOf = (b: Booking) => b.service_category || 'Other';

const ALL = '';

@Component({
  selector: 'app-bookings',
  imports: [PricePipe, CancelReasonModal, BookingDetailsModal, TrackingModal, Pagination, ServiceCategoryIcon, LucideLayoutGrid, LucideTruck],
  templateUrl: './bookings.html',
  styleUrl: './bookings.css',
})
export class Bookings {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected readonly statusColor = statusColor;
  protected readonly formatTimeAmPm = formatTimeAmPm;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly all = ALL;
  protected readonly bookings = signal<Booking[]>([]);
  protected readonly loaded = signal(false);
  protected readonly selectedBooking = signal<Booking | null>(null);
  protected readonly trackingBooking = signal<Booking | null>(null);
  protected readonly cancelTarget = signal<Booking | null>(null);

  protected readonly cancelModal = viewChild(CancelReasonModal);

  /** Only the categories this customer has actually booked get a tab — a filter offering
   *  Plumbing to someone who has only booked an aircon clean is a row of dead ends. */
  protected readonly categories = computed(() => {
    const counts = new Map<string, number>();
    for (const b of this.bookings()) counts.set(categoryOf(b), (counts.get(categoryOf(b)) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([category, count]) => ({ category, count }));
  });

  // Category and page both live in the URL, the same way the catalog carries its filters, so a
  // filtered view survives back navigation. A category with no bookings falls back to All —
  // which also covers the first render, before /bookings/my has answered.
  private queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly activeCategory = computed(() => {
    const requested = this.queryParamMap().get('category') || ALL;
    return this.categories().some((c) => c.category === requested) ? requested : ALL;
  });
  protected readonly page = computed(() => Math.max(1, Number(this.queryParamMap().get('page')) || 1));

  protected readonly visible = computed(() => {
    const active = this.activeCategory();
    return active === ALL ? this.bookings() : this.bookings().filter((b) => categoryOf(b) === active);
  });
  // A customer's own bookings are few enough to page on the device — /bookings/my hands over the
  // whole list in one request.
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.visible().length / PAGE_SIZE)));
  protected readonly paginated = computed(() => this.visible().slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE));

  constructor() {
    this.api
      .get<Booking[]>('/bookings/my')
      .then((data) => this.bookings.set(data))
      .catch(() => {})
      .finally(() => this.loaded.set(true));

    // A stale ?page= can point past the end of the list; fall back to the last real page rather
    // than an empty column. Waits for the list, or a deep link would be clamped away first.
    effect(() => {
      if (this.loaded() && this.page() > this.totalPages()) this.setPage(this.totalPages(), true);
    });
  }

  /** Page 1 is the bare URL rather than ?page=1. */
  private setPage(next: number, replaceUrl = false): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: next <= 1 ? null : next },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  handlePageChange(next: number): void {
    this.setPage(next);
    scrollAppToTop();
  }

  /** Switching category starts over: page 3 of everything may be past the end of one category. */
  selectCategory(category: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: category === ALL ? null : category, page: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  statusLabel(status: string): string {
    return status.replace('_', ' ');
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
