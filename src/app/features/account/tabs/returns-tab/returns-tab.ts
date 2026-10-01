import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideImage, LucidePackageCheck } from '@lucide/angular';

import { ApiService } from '../../../../core/api.service';
import { paymentMethodLabel } from '../../../../core/payment-methods';
import { PricePipe } from '../../../../core/price.pipe';
import {
  caseRef,
  isCancellation,
  KIND_LABEL,
  KIND_STYLE,
  orderRef,
  refundStatusLabel,
  RETURN_STATUS_STYLE,
  ReturnRequest,
  statusHint,
  statusLabel,
} from '../../../../core/returns.util';
import { SafeImage } from '../../../../shared/safe-image/safe-image';

interface ReturnPhoto {
  id: string;
  image: string;
}

/**
 * Ported from frontend/src/components/account/ReturnsTab.jsx — items sent back, and refunds for
 * orders cancelled after paying, in one list. Photos are left out of GET /returns/my (they're
 * base64 and would make the list multi-megabyte), so each card fetches its own on demand, once.
 */
@Component({
  selector: 'app-returns-tab',
  imports: [DatePipe, RouterLink, PricePipe, SafeImage, LucidePackageCheck, LucideImage],
  templateUrl: './returns-tab.html',
  styleUrl: './returns-tab.css',
})
export class ReturnsTab {
  private api = inject(ApiService);

  protected readonly returns = signal<ReturnRequest[] | null>(null);
  /** return id -> its photos once fetched; `null` while that fetch is in flight. */
  protected readonly photos = signal<Record<string, ReturnPhoto[] | null>>({});

  protected readonly caseRef = caseRef;
  protected readonly orderRef = orderRef;
  protected readonly isCancellation = isCancellation;
  protected readonly kindLabel = KIND_LABEL;
  protected readonly kindStyle = KIND_STYLE;
  protected readonly statusStyle = RETURN_STATUS_STYLE;
  protected readonly statusLabel = statusLabel;
  protected readonly statusHint = statusHint;
  protected readonly refundStatusLabel = refundStatusLabel;
  protected readonly paymentMethodLabel = paymentMethodLabel;

  constructor() {
    this.api
      .get<ReturnRequest[]>('/returns/my')
      .then((data) => this.returns.set(data))
      .catch(() => this.returns.set([]));
  }

  photosShown(id: string): boolean {
    return id in this.photos();
  }

  showPhotos(id: string): void {
    if (this.photosShown(id)) return;
    this.photos.update((p) => ({ ...p, [id]: null }));
    this.api
      .get<ReturnPhoto[]>(`/returns/${id}/photos`)
      .then((list) => this.photos.update((p) => ({ ...p, [id]: list })))
      .catch(() => this.photos.update((p) => ({ ...p, [id]: [] })));
  }
}
