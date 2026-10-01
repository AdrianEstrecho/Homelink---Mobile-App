import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideImagePlus, LucideLoaderCircle, LucideRotateCcw, LucideX } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { dataUrlBytes, downscaleImage, validateImageFile } from '../../core/image-upload.util';
import { Order } from '../../core/order.model';
import { PricePipe } from '../../core/price.pipe';
import { INELIGIBLE_MESSAGE, MAX_RETURN_PHOTOS, orderRef, ReturnableLine, ReturnEligibility } from '../../core/returns.util';
import { SafeImage } from '../safe-image/safe-image';

const MIN_REASON = 10;
// The server accepts 8MB of photos in total; stopping short of that here means the customer gets
// a real message instead of the bare "Request failed" a 413 would produce.
const MAX_TOTAL_BYTES = 7 * 1024 * 1024;

export interface CreatedReturn {
  id: string;
  ref: string;
  status: string;
}

/**
 * Ported from frontend/src/components/ReturnRequestModal.jsx. Sits at z-[110] like
 * CancelReasonModal, above the order details modal it opens from. Loads its own eligibility
 * rather than trusting the list's canReturn flag, since the remaining quantity may have been
 * used up elsewhere in the meantime.
 */
@Component({
  selector: 'app-return-request-modal',
  imports: [FormsModule, SafeImage, PricePipe, LucideRotateCcw, LucideX, LucideImagePlus, LucideLoaderCircle],
  templateUrl: './return-request-modal.html',
  styleUrl: './return-request-modal.css',
})
export class ReturnRequestModal implements OnInit {
  private api = inject(ApiService);

  readonly order = input.required<Order>();
  readonly closed = output<void>();
  readonly submitted = output<CreatedReturn>();

  protected readonly maxPhotos = MAX_RETURN_PHOTOS;
  protected readonly orderRef = orderRef;

  protected readonly data = signal<ReturnEligibility | null>(null);
  protected readonly picked = signal<Record<string, number>>({});
  protected readonly reason = signal('');
  protected readonly photos = signal<string[]>([]);
  protected readonly busy = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected readonly lines = computed(() => (this.data()?.lines ?? []).filter((l) => l.returnableQty > 0));
  protected readonly selected = computed(() =>
    this.lines()
      .filter((l) => (this.picked()[l.orderItemId] ?? 0) > 0)
      .map((l) => ({ ...l, quantity: this.picked()[l.orderItemId] })),
  );
  /** Discounts are shared out across lines in proportion to their value, as the server does. */
  protected readonly estimate = computed(() => {
    const order = this.order();
    return this.selected().reduce((sum, l) => {
      const lineTotal = l.quantity * l.unitPrice;
      const share = order.subtotal > 0 ? (lineTotal / order.subtotal) * (order.discount || 0) : 0;
      return sum + Math.max(0, lineTotal - share);
    }, 0);
  });
  protected readonly ineligibleMessage = computed(() => {
    const d = this.data();
    return (d?.reason && INELIGIBLE_MESSAGE[d.reason]) || this.error() || 'This order can’t be returned.';
  });

  ngOnInit(): void {
    this.api
      .get<ReturnEligibility>(`/returns/eligibility/${this.order().id}`)
      .then((d) => this.data.set(d))
      .catch((err) => {
        this.error.set((err as Error).message);
        this.data.set({ eligible: false, lines: [] });
      });
  }

  qtyOf(line: ReturnableLine): number {
    return this.picked()[line.orderItemId] ?? 0;
  }

  toggle(line: ReturnableLine): void {
    this.picked.update((p) => ({ ...p, [line.orderItemId]: (p[line.orderItemId] ?? 0) > 0 ? 0 : 1 }));
  }

  setQty(line: ReturnableLine, qty: number): void {
    this.picked.update((p) => ({ ...p, [line.orderItemId]: Math.max(1, Math.min(line.returnableQty, qty)) }));
  }

  onReasonInput(value: string): void {
    this.reason.set(value);
    if (this.error()) this.error.set('');
  }

  removePhoto(index: number): void {
    this.photos.update((list) => list.filter((_, i) => i !== index));
  }

  async onFilesPicked(inputEl: HTMLInputElement): Promise<void> {
    const files = [...(inputEl.files ?? [])].slice(0, MAX_RETURN_PHOTOS - this.photos().length);
    inputEl.value = '';
    if (!files.length) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const next = [...this.photos()];
      for (const file of files) {
        const invalid = validateImageFile(file);
        if (invalid) {
          this.error.set(invalid);
          continue;
        }
        next.push(await downscaleImage(file));
      }
      if (next.reduce((n, p) => n + dataUrlBytes(p), 0) > MAX_TOTAL_BYTES) {
        this.error.set('Those photos are too large together. Please use fewer or smaller images.');
        return;
      }
      this.photos.set(next);
    } finally {
      this.busy.set(false);
    }
  }

  close(): void {
    if (this.submitting()) return;
    this.closed.emit();
  }

  async submit(): Promise<void> {
    if (!this.selected().length) {
      this.error.set('Select at least one item to return.');
      return;
    }
    if (this.reason().trim().length < MIN_REASON) {
      this.error.set(`Please describe the problem in at least ${MIN_REASON} characters.`);
      return;
    }
    if (!this.photos().length) {
      this.error.set('Please attach at least one photo of the product.');
      return;
    }

    this.submitting.set(true);
    this.error.set('');
    try {
      const created = await this.api.post<CreatedReturn>('/returns', {
        orderId: this.order().id,
        reason: this.reason().trim(),
        items: this.selected().map((l) => ({ orderItemId: l.orderItemId, quantity: l.quantity })),
        photos: this.photos(),
      });
      this.submitted.emit(created);
    } catch (err) {
      this.error.set((err as Error).message);
      this.submitting.set(false);
    }
  }
}
