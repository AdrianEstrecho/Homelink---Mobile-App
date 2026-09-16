import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { LucideCircleCheck, LucideCreditCard, LucideMapPin, LucideStickyNote, LucideTruck, LucideUser, LucideX } from '@lucide/angular';

import { Booking } from '../../core/booking.model';
import { PricePipe } from '../../core/price.pipe';
import { ReceiptPerson } from '../../core/receipt-pdf.util';
import { statusColor } from '../../core/format.util';
import { SafeImage } from '../safe-image/safe-image';

/**
 * Ported from frontend/src/components/BookingDetailsModal.jsx — the My Bookings
 * equivalent of OrderDetailsModal, opened by tapping a booking row.
 *
 * `justConfirmed` (mobile-only addition, no React equivalent): the post-booking
 * receipt shown by ServiceBook/BookingReturn before the customer moves on, same
 * pattern as OrderDetailsModal's justConfirmed receipt for orders.
 */
@Component({
  selector: 'app-booking-details-modal',
  imports: [DatePipe, SafeImage, PricePipe, LucideX, LucideMapPin, LucideCreditCard, LucideUser, LucideStickyNote, LucideTruck, LucideCircleCheck],
  templateUrl: './booking-details-modal.html',
  styleUrl: './booking-details-modal.css',
})
export class BookingDetailsModal {
  readonly booking = input.required<Booking>();
  readonly showCancel = input(false);
  readonly showTrack = input(false);
  readonly justConfirmed = input(false);
  readonly person = input<ReceiptPerson | null>(null);
  readonly personLabel = input('Customer');

  readonly closed = output<void>();
  /** Emitted by "Continue to My Bookings" on the justConfirmed receipt — kept separate from
   *  `closed` (the X button) since the two need to land on different screens. */
  readonly continued = output<void>();
  readonly cancelRequested = output<void>();
  readonly trackRequested = output<void>();

  protected readonly statusColor = statusColor;

  subtotal(): number {
    const b = this.booking();
    return Number(b.price) + Number(b.discount || 0);
  }
}
