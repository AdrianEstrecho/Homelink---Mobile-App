import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { LucideCreditCard, LucideMapPin, LucideStickyNote, LucideTruck, LucideUser, LucideX } from '@lucide/angular';

import { Booking } from '../../core/booking.model';
import { PricePipe } from '../../core/price.pipe';
import { statusColor } from '../../core/format.util';
import { SafeImage } from '../safe-image/safe-image';

/**
 * Ported from frontend/src/components/BookingDetailsModal.jsx — the My Bookings
 * equivalent of OrderDetailsModal, opened by tapping a booking row.
 */
@Component({
  selector: 'app-booking-details-modal',
  imports: [DatePipe, SafeImage, PricePipe, LucideX, LucideMapPin, LucideCreditCard, LucideUser, LucideStickyNote, LucideTruck],
  templateUrl: './booking-details-modal.html',
  styleUrl: './booking-details-modal.css',
})
export class BookingDetailsModal {
  readonly booking = input.required<Booking>();
  readonly showCancel = input(false);
  readonly showTrack = input(false);

  readonly closed = output<void>();
  readonly cancelRequested = output<void>();
  readonly trackRequested = output<void>();

  protected readonly statusColor = statusColor;

  subtotal(): number {
    const b = this.booking();
    return Number(b.price) + Number(b.discount || 0);
  }
}
