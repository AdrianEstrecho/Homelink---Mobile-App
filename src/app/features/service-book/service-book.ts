import { Component, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAward, LucideCalendar, LucideClock, LucideShieldCheck, LucideTimer } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { AvailabilitySlot, DiscountPreview } from '../../core/booking.model';
import { PricePipe } from '../../core/price.pipe';
import { calcDiscount } from '../../core/promo.model';
import { Service } from '../../core/product.model';
import { AddressPicker } from '../../shared/address-picker/address-picker';
import { ErrorState } from '../../shared/error-state/error-state';
import { PaymentMethodPicker } from '../../shared/payment-method-picker/payment-method-picker';
import { SafeImage } from '../../shared/safe-image/safe-image';
import { Skeleton } from '../../shared/skeleton/skeleton';

@Component({
  selector: 'app-service-book',
  imports: [ErrorState, Skeleton, SafeImage, AddressPicker, PaymentMethodPicker, PricePipe, LucideCalendar, LucideClock, LucideShieldCheck, LucideAward, LucideTimer],
  templateUrl: './service-book.html',
  styleUrl: './service-book.css',
})
export class ServiceBook {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private slugParam = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly addressPicker = viewChild(AddressPicker);
  protected readonly paymentPicker = viewChild(PaymentMethodPicker);

  protected readonly service = signal<Service | null>(null);
  protected readonly loadError = signal(false);
  protected readonly discounts = signal<DiscountPreview | null>(null);

  protected readonly date = signal('');
  protected readonly time = signal('');
  protected readonly slots = signal<AvailabilitySlot[]>([]);
  protected readonly notes = signal('');

  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected readonly todayIso = new Date().toISOString().split('T')[0];

  protected readonly base = () => this.service()?.base_price ?? 0;
  protected readonly firstTimeAmt = () => calcDiscount(this.base(), this.discounts()?.firstTime ?? null);
  protected readonly holidayAmt = () => calcDiscount(this.base() - this.firstTimeAmt(), this.discounts()?.holiday ?? null);
  protected readonly total = () => Math.max(0, this.base() - this.firstTimeAmt() - this.holidayAmt());

  constructor() {
    effect(() => {
      const slug = this.slugParam().get('slug');
      if (slug) this.loadService(slug);
    });

    this.api
      .get<DiscountPreview>('/bookings/discount-preview')
      .then((data) => this.discounts.set(data))
      .catch(() => this.discounts.set({ firstTime: null, holiday: null }));

    effect(() => {
      const d = this.date();
      if (!d) return;
      this.api
        .get<AvailabilitySlot[]>(`/bookings/availability?date=${d}`)
        .then((data) => this.slots.set(data))
        .catch(() => this.slots.set([]));
    });
  }

  private loadService(slug: string): void {
    this.service.set(null);
    this.loadError.set(false);
    this.api
      .get<Service>(`/services/${slug}`)
      .then((data) => this.service.set(data))
      .catch(() => this.loadError.set(true));
  }

  retry(): void {
    const slug = this.slugParam().get('slug');
    if (slug) this.loadService(slug);
  }

  onDateChange(value: string): void {
    this.date.set(value);
    this.time.set('');
  }

  async handleSubmit(): Promise<void> {
    if (!this.date() || !this.time()) {
      this.error.set('Please pick a date and time.');
      return;
    }
    const selectedAddress = this.addressPicker()?.validate();
    if (!selectedAddress) {
      this.error.set('Please select or add a service address.');
      return;
    }
    const payment = this.paymentPicker()?.validate();
    if (!payment) return;

    const service = this.service();
    if (!service) return;

    this.loading.set(true);
    this.error.set('');
    try {
      await this.api.post('/bookings', {
        serviceId: service.id,
        scheduledDate: this.date(),
        scheduledTime: this.time(),
        address: selectedAddress.fullAddress,
        notes: this.notes(),
        paymentMethod: payment.method,
      });
      this.router.navigateByUrl('/bookings');
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
