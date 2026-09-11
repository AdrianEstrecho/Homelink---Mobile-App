import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output, OnInit, signal } from '@angular/core';
import { LucidePhone, LucideTruck, LucideUser, LucideX } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { TrackingData } from '../../core/tracking.model';
import { StatusStepper } from '../status-stepper/status-stepper';
import { LatLng, TrackingMap } from '../tracking-map/tracking-map';

const ORDER_STEPS = ['pending', 'processing', 'shipped', 'delivered'];
const BOOKING_STEPS = ['pending', 'confirmed', 'in_progress', 'completed'];
const ORDER_LABELS: Record<string, string> = { pending: 'Order Placed', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered' };
const BOOKING_LABELS: Record<string, string> = { pending: 'Requested', confirmed: 'Technician Assigned', in_progress: 'In Progress', completed: 'Completed' };

// Distance-only ETA (no real courier to query) — once 'shipped', interpolate the product's map
// position between office and destination based on how much of the estimated transit has
// elapsed since the shipped timestamp in the timeline.
function interpolatedOrderPosition(data: TrackingData): LatLng | null {
  if (data.status !== 'shipped' || !data.origin || !data.destination) return null;
  const shippedEntry = [...data.timeline].reverse().find((e) => e.status === 'shipped');
  if (!shippedEntry || !data.etaDays) return null;
  const elapsedMs = Date.now() - new Date(shippedEntry.at).getTime();
  const totalMs = data.etaDays * 24 * 60 * 60 * 1000;
  const fraction = Math.max(0, Math.min(1, elapsedMs / totalMs));
  return {
    lat: data.origin.lat + (data.destination.lat - data.origin.lat) * fraction,
    lng: data.origin.lng + (data.destination.lng - data.origin.lng) * fraction,
  };
}

/**
 * Ported from frontend/src/components/TrackingModal.jsx — shared by My Orders'
 * "Track Order" and (future) My Bookings' equivalent.
 */
@Component({
  selector: 'app-tracking-modal',
  imports: [DatePipe, StatusStepper, TrackingMap, LucideX, LucideTruck, LucideUser, LucidePhone],
  templateUrl: './tracking-modal.html',
  styleUrl: './tracking-modal.css',
})
export class TrackingModal implements OnInit {
  private api = inject(ApiService);

  readonly kind = input.required<'order' | 'booking'>();
  readonly id = input.required<string>();
  readonly title = input<string>();

  readonly closed = output<void>();

  protected readonly data = signal<TrackingData | null>(null);
  protected readonly error = signal(false);

  protected readonly steps = computed(() => (this.kind() === 'order' ? ORDER_STEPS : BOOKING_STEPS));
  protected readonly labels = computed(() => (this.kind() === 'order' ? ORDER_LABELS : BOOKING_LABELS));
  protected readonly movingPoint = computed(() => {
    const d = this.data();
    return d && this.kind() === 'order' ? interpolatedOrderPosition(d) : null;
  });
  protected readonly technicianLocation = computed(() => {
    const d = this.data();
    return d && this.kind() === 'booking' ? (d.technicianLocation ?? null) : null;
  });

  ngOnInit(): void {
    this.api
      .get<TrackingData>(`/${this.kind()}s/${this.id()}/tracking`)
      .then((d) => this.data.set(d))
      .catch(() => this.error.set(true));
  }
}
