import { Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideLoaderCircle, LucideCircleX } from '@lucide/angular';

import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { Booking } from '../../../core/booking.model';
import { pollBookingPaymentStatus } from '../../../core/payment-polling.util';
import { BookingDetailsModal } from '../../../shared/booking-details-modal/booking-details-modal';

type ReturnState = 'processing' | 'succeeded' | 'failed' | 'timeout';

/**
 * PayMongo lands the browser back here after a GCash or 3D-Secure card
 * redirect (web flow only — the native flow polls in-place in ServiceBook,
 * same split as CheckoutReturn/Checkout for orders). Ported from
 * frontend/src/pages/BookingReturn.jsx.
 */
@Component({
  selector: 'app-booking-return',
  imports: [RouterLink, BookingDetailsModal, LucideLoaderCircle, LucideCircleX],
  templateUrl: './booking-return.html',
  styleUrl: './booking-return.css',
})
export class BookingReturn {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private auth = inject(AuthService);

  private queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });
  private pendingBookingId = computed(() => this.queryParamMap().get('pbid'));

  protected readonly state = signal<ReturnState>('processing');
  protected readonly booking = signal<Booking | null>(null);
  protected readonly errorMsg = signal('');

  protected readonly billedTo = computed(() => {
    const u = this.auth.user();
    return u ? { name: `${u.firstName} ${u.lastName}`, email: u.email } : null;
  });

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

  goToHome(): void {
    // replaceUrl: this return page (and the PayMongo redirect before it) is a dead end
    // once payment is confirmed — swap it out of history so back doesn't land here again.
    this.router.navigateByUrl('/', { replaceUrl: true });
  }

  goToBookings(): void {
    // Make Bookings' back button land on Profile, same as reaching it from Account — silently
    // rewrite the current history entry to /account before pushing /bookings on top, so back
    // pops to /account instead of this now-dead return page.
    this.location.replaceState('/account');
    this.router.navigateByUrl('/bookings');
  }
}
