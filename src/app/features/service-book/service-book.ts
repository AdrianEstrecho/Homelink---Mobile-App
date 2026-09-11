import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Component, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAward, LucideCalendar, LucideClock, LucideShieldCheck, LucideTimer } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { AvailabilitySlot, DiscountPreview } from '../../core/booking.model';
import { formatTimeAmPm } from '../../core/format.util';
import { pollBookingPaymentStatus } from '../../core/payment-polling.util';
import { PricePipe } from '../../core/price.pipe';
import { calcDiscount } from '../../core/promo.model';
import { Service } from '../../core/product.model';
import { AddressPicker } from '../../shared/address-picker/address-picker';
import { ErrorState } from '../../shared/error-state/error-state';
import { PaymentMethodPicker } from '../../shared/payment-method-picker/payment-method-picker';
import { SafeImage } from '../../shared/safe-image/safe-image';
import { Skeleton } from '../../shared/skeleton/skeleton';

interface BookingCheckoutSessionResponse {
  pendingBookingId: string;
  checkoutUrl: string;
}

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

  protected readonly formatTimeAmPm = formatTimeAmPm;

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
      const bookingParams = {
        serviceId: service.id,
        scheduledDate: this.date(),
        scheduledTime: this.time(),
        address: selectedAddress.fullAddress,
        notes: this.notes(),
      };

      // Only bank transfer is a plain, immediate POST — card, GCash, and QR Ph are real,
      // gateway-verified charges and have to go through PayMongo's hosted Checkout Session,
      // same as Checkout uses for orders.
      if (payment.method === 'bank') {
        await this.api.post('/bookings', { ...bookingParams, paymentMethod: 'bank' });
        // replaceUrl: the booking is placed, so this form is a dead end now — swap it
        // out of history instead of leaving it for the back button to land on.
        this.router.navigateByUrl('/bookings', { replaceUrl: true });
        return;
      }

      const { pendingBookingId, checkoutUrl } = await this.api.post<BookingCheckoutSessionResponse>('/bookings/checkout-session', {
        ...bookingParams,
        paymentMethod: payment.method,
      });

      await this.openCheckoutSession(checkoutUrl, pendingBookingId);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  private async openCheckoutSession(checkoutUrl: string, pendingBookingId: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // Leaving the page — BookingReturn picks up from here once PayMongo redirects back.
      window.location.href = checkoutUrl;
      return;
    }

    // Native: open a separate in-app browser tab rather than navigating our own WebView
    // away — see Checkout.openCheckoutSession for why. We just poll underneath and
    // dismiss it once we know the result.
    await Browser.open({ url: checkoutUrl });
    const result = await pollBookingPaymentStatus(this.api, pendingBookingId);
    await Browser.close();

    if (result.status === 'succeeded') {
      // replaceUrl: the booking is placed, so this form is a dead end now — swap it
      // out of history instead of leaving it for the back button to land on.
      this.router.navigateByUrl('/bookings', { replaceUrl: true });
    } else if (result.status === 'failed') {
      this.error.set(result.error || 'Payment could not be completed. Please try again.');
    } else {
      this.error.set("We couldn't confirm this payment in time. Check My Bookings in a moment.");
    }
  }
}
