import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, input, output } from '@angular/core';
import {
  LucideCircleCheck,
  LucideCreditCard,
  LucideDownload,
  LucideMapPin,
  LucidePrinter,
  LucideX,
} from '@lucide/angular';

import { PricePipe } from '../../core/price.pipe';
import { Order, PendingOrder } from '../../core/order.model';
import { downloadReceiptPdf, ReceiptPerson } from '../../core/receipt-pdf.util';
import { statusColor } from '../../core/format.util';
import { SafeImage } from '../safe-image/safe-image';

/**
 * Ported from frontend/src/components/OrderDetailsModal.jsx — three modes:
 * plain view (Orders page), `previewing` (Checkout's review step, backed by
 * a PendingOrder that has no id/status/created_at yet), and `justConfirmed`
 * (the post-payment receipt). Print uses the same .printing-active/.print-area
 * CSS as the React version (ported into global styles.css in Phase 0).
 */
@Component({
  selector: 'app-order-details-modal',
  imports: [DatePipe, SafeImage, PricePipe, LucideX, LucideMapPin, LucideCreditCard, LucidePrinter, LucideDownload, LucideCircleCheck],
  templateUrl: './order-details-modal.html',
  styleUrl: './order-details-modal.css',
})
export class OrderDetailsModal {
  readonly order = input.required<Order | PendingOrder>();
  readonly person = input<ReceiptPerson | null>(null);
  readonly personLabel = input('Customer');
  readonly justConfirmed = input(false);
  readonly previewing = input(false);
  readonly confirmLoading = input(false);
  readonly error = input<string>();
  readonly showCancel = input(false);

  readonly closed = output<void>();
  readonly confirmed = output<void>();
  readonly cancelRequested = output<void>();

  protected readonly statusColor = statusColor;

  constructor() {
    const cleanup = () => document.body.classList.remove('printing-active');
    window.addEventListener('afterprint', cleanup);
    inject(DestroyRef).onDestroy(() => {
      cleanup();
      window.removeEventListener('afterprint', cleanup);
    });
  }

  asOrder(): Order {
    return this.order() as Order;
  }

  isPending(): boolean {
    return this.asOrder().status === 'pending';
  }

  handlePrint(): void {
    document.body.classList.add('printing-active');
    window.print();
  }

  handleDownload(): void {
    downloadReceiptPdf(this.asOrder(), this.person(), this.personLabel());
  }
}
