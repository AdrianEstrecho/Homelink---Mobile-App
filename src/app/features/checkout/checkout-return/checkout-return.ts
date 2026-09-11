import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideLoaderCircle, LucideCircleX } from '@lucide/angular';

import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { CartService } from '../../../core/cart.service';
import { Order } from '../../../core/order.model';
import { pollPaymentStatus } from '../../../core/payment-polling.util';
import { OrderDetailsModal } from '../../../shared/order-details-modal/order-details-modal';

type ReturnState = 'processing' | 'succeeded' | 'failed' | 'timeout';

/**
 * PayMongo lands the browser back here after a GCash or 3D-Secure card
 * redirect (web flow only — the native flow polls in-place in Checkout, see
 * mobile port plan §3.5). Ported from frontend/src/pages/CheckoutReturn.jsx.
 */
@Component({
  selector: 'app-checkout-return',
  imports: [RouterLink, OrderDetailsModal, LucideLoaderCircle, LucideCircleX],
  templateUrl: './checkout-return.html',
  styleUrl: './checkout-return.css',
})
export class CheckoutReturn {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private cart = inject(CartService);

  private queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });
  private pendingCheckoutId = computed(() => this.queryParamMap().get('pcid'));

  protected readonly state = signal<ReturnState>('processing');
  protected readonly order = signal<Order | null>(null);
  protected readonly errorMsg = signal('');

  protected readonly billedTo = computed(() => {
    const u = this.auth.user();
    return u ? { name: `${u.firstName} ${u.lastName}`, email: u.email } : null;
  });

  constructor() {
    const pcid = this.pendingCheckoutId();
    if (!pcid) {
      this.state.set('failed');
      return;
    }
    pollPaymentStatus(this.api, pcid).then((result) => {
      if (result.status === 'succeeded') {
        this.cart.clearCart();
        this.order.set(result.order);
        this.state.set('succeeded');
      } else if (result.status === 'failed') {
        this.errorMsg.set(result.error ?? '');
        this.state.set('failed');
      } else {
        this.state.set('timeout');
      }
    });
  }

  goToOrders(): void {
    // replaceUrl: this return page (and the PayMongo redirect before it) is a dead end
    // once payment is confirmed — swap it out of history so back doesn't land here again.
    this.router.navigateByUrl('/orders', { replaceUrl: true });
  }
}
