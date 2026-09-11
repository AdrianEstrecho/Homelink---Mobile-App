import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideLoaderCircle, LucideCircleX, LucideCircleCheck } from '@lucide/angular';

import { ApiService } from '../../../core/api.service';
import { Booking } from '../../../core/booking.model';
import { pollBookingPaymentStatus } from '../../../core/payment-polling.util';

type ReturnState = 'processing' | 'succeeded' | 'failed' | 'timeout';

/**
 * PayMongo lands the browser back here after a GCash or 3D-Secure card
 * redirect (web flow only — the native flow polls in-place in ServiceBook,
 * same split as CheckoutReturn/Checkout for orders). Ported from
 * frontend/src/pages/BookingReturn.jsx.
 */
@Component({
  selector: 'app-booking-return',
  imports: [RouterLink, LucideLoaderCircle, LucideCircleX, LucideCircleCheck],
  templateUrl: './booking-return.html',
  styleUrl: './booking-return.css',
})
export class BookingReturn {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });
  private pendingBookingId = computed(() => this.queryParamMap().get('pbid'));

  protected readonly state = signal<ReturnState>('processing');
  protected readonly booking = signal<Booking | null>(null);
  protected readonly errorMsg = signal('');

  constructor() {
    const pbid = this.pendingBookingId();
    if (!pbid) {
      this.state.set('failed');
      return;
    }
    pollBookingPaymentStatus(this.api, pbid).then((result) => {
      if (result.status === 'succeeded') {
        this.booking.set(result.booking);
        this.state.set('succeeded');
      } else if (result.status === 'failed') {
        this.errorMsg.set(result.error ?? '');
        this.state.set('failed');
      } else {
        this.state.set('timeout');
      }
    });
  }

  goToBookings(): void {
    this.router.navigateByUrl('/bookings');
  }
}
