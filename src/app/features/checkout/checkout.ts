import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideCheck, LucideLock, LucideShieldCheck, LucideShoppingBag, LucideSparkles, LucideTruck, LucideX } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { Order, PendingOrder } from '../../core/order.model';
import { pollPaymentStatus } from '../../core/payment-polling.util';
import { PricePipe } from '../../core/price.pipe';
import { ActivePromos, AppliedVoucher, calcDiscount } from '../../core/promo.model';
import { AddressPicker } from '../../shared/address-picker/address-picker';
import { OrderDetailsModal } from '../../shared/order-details-modal/order-details-modal';
import { PaymentMethodPicker } from '../../shared/payment-method-picker/payment-method-picker';

interface CheckoutSessionResponse {
  pendingCheckoutId: string;
  checkoutUrl: string;
}

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink, AddressPicker, PaymentMethodPicker, OrderDetailsModal, PricePipe, LucideShoppingBag, LucideSparkles, LucideCheck, LucideX, LucideLock, LucideShieldCheck, LucideTruck],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private cart = inject(CartService);
  private router = inject(Router);

  protected readonly items = this.cart.items;
  protected readonly subtotal = this.cart.total;

  protected readonly addressPicker = viewChild(AddressPicker);
  protected readonly paymentPicker = viewChild(PaymentMethodPicker);

  protected readonly activePromos = signal<ActivePromos | null>(null);
  protected readonly promoInput = signal('');
  protected readonly appliedPromo = signal<AppliedVoucher | null>(null);
  protected readonly promoError = signal('');
  protected readonly applyingPromo = signal(false);

  protected readonly error = signal('');
  protected readonly pendingOrder = signal<PendingOrder | null>(null);
  protected readonly placingOrder = signal(false);
  protected readonly confirmedOrder = signal<Order | null>(null);

  protected readonly holidayPromo = computed(() => this.activePromos()?.holiday ?? null);
  protected readonly holidayAmt = computed(() => calcDiscount(this.subtotal(), this.holidayPromo()));
  protected readonly voucherAmt = computed(() => {
    const promo = this.appliedPromo();
    return promo ? calcDiscount(this.subtotal() - this.holidayAmt(), promo) : 0;
  });
  protected readonly orderTotal = computed(() => Math.max(0, this.subtotal() - this.holidayAmt() - this.voucherAmt()));

  protected readonly billedTo = computed(() => {
    const u = this.auth.user();
    return u ? { name: `${u.firstName} ${u.lastName}`, email: u.email } : null;
  });

  constructor() {
    this.api
      .get<ActivePromos>('/promos/active')
      .then((data) => this.activePromos.set(data))
      .catch(() => this.activePromos.set({ holiday: null, vouchers: [] }));
  }

  onPromoInput(value: string): void {
    this.promoInput.set(value.toUpperCase());
    this.promoError.set('');
  }

  async applyPromo(): Promise<void> {
    if (!this.promoInput().trim()) return;
    this.applyingPromo.set(true);
    this.promoError.set('');
    try {
      const res = await this.api.post<{ discountType: 'percent' | 'fixed'; discountValue: number }>('/promos/validate-voucher', {
        code: this.promoInput().trim(),
        amount: this.subtotal(),
      });
      this.appliedPromo.set({ code: this.promoInput().trim().toUpperCase(), type: res.discountType, value: res.discountValue });
      this.promoInput.set('');
    } catch (err) {
      this.promoError.set((err as Error).message);
    } finally {
      this.applyingPromo.set(false);
    }
  }

  removePromo(): void {
    this.appliedPromo.set(null);
    this.promoError.set('');
  }

  handleReview(): void {
    const selectedAddress = this.addressPicker()?.validate();
    if (!selectedAddress) {
      this.error.set('Please select or add a shipping address.');
      return;
    }
    const payment = this.paymentPicker()?.validate();
    if (!payment) return;

    this.error.set('');
    this.pendingOrder.set({
      items: this.items().map((i) => ({ id: i.productId, name: i.name, image: i.image, price: i.price, quantity: i.quantity })),
      shipping_address: selectedAddress.fullAddress,
      payment_method: payment.method,
      promo_code: this.appliedPromo()?.code ?? null,
      subtotal: this.subtotal(),
      discount: this.holidayAmt() + this.voucherAmt(),
      total: this.orderTotal(),
    });
  }

  editOrder(): void {
    this.pendingOrder.set(null);
    this.error.set('');
  }

  async handleConfirmOrder(): Promise<void> {
    const pending = this.pendingOrder();
    if (!pending) return;

    this.placingOrder.set(true);
    this.error.set('');
    try {
      if (pending.payment_method === 'bank') {
        const order = await this.api.post<Order>('/orders', {
          items: pending.items.map((i) => ({ productId: i.id, quantity: i.quantity })),
          shippingAddress: pending.shipping_address,
          paymentMethod: 'bank',
          promoCode: pending.promo_code || undefined,
        });
        this.cart.clearCart();
        this.pendingOrder.set(null);
        this.confirmedOrder.set(order);
        return;
      }

      // Card, GCash, and QR Ph all hand off to PayMongo's hosted Checkout Session (v2) — created
      // server-side (it holds the PayMongo secret key), so only the chosen method is sent here.
      // PayMongo's own page collects the actual payment details (card number, GCash login, QR
      // scan); we never see or store them. Mirrors frontend/src/pages/Checkout.jsx's
      // handleConfirmOrder().
      const { pendingCheckoutId, checkoutUrl } = await this.api.post<CheckoutSessionResponse>('/payments/checkout-session', {
        items: pending.items.map((i) => ({ productId: i.id, quantity: i.quantity })),
        shippingAddress: pending.shipping_address,
        paymentMethod: pending.payment_method,
        promoCode: pending.promo_code || undefined,
      });

      await this.openCheckoutSession(checkoutUrl, pendingCheckoutId);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.placingOrder.set(false);
    }
  }

  private async openCheckoutSession(checkoutUrl: string, pendingCheckoutId: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // Leaving the page — CheckoutReturn picks up from here once PayMongo redirects back.
      window.location.href = checkoutUrl;
      return;
    }

    // Native: open a separate in-app browser tab rather than navigating our own
    // WebView away. It doesn't need to redirect back into the app at all — we
    // just keep polling underneath and dismiss it once we know the result.
    // Browser must be a plain static import (not dynamically imported/returned
    // through an async function) -- a Capacitor plugin proxy object flowing
    // through a Promise's resolved value triggers JS's "thenable assimilation"
    // (Promise machinery calls .then() on anything that looks thenable), and
    // Capacitor's proxy throws "Browser.then() is not implemented on android"
    // when that happens. Confirmed via on-device testing (Phase 8) -- this
    // never surfaces in `ng serve`, since Capacitor.isNativePlatform() is
    // false there and this whole branch never runs.
    await Browser.open({ url: checkoutUrl });
    const result = await pollPaymentStatus(this.api, pendingCheckoutId);
    await Browser.close();

    if (result.status === 'succeeded') {
      this.cart.clearCart();
      this.pendingOrder.set(null);
      this.confirmedOrder.set(result.order);
    } else if (result.status === 'failed') {
      this.error.set(result.error || 'Payment could not be completed. Please try again.');
    } else {
      this.error.set("We couldn't confirm this payment in time. Check your order history in a moment.");
    }
  }

  goToOrders(): void {
    // replaceUrl: the order is placed and the cart is cleared, so /checkout is a dead
    // end now — swap it out of history instead of leaving it for the back button to land on.
    this.router.navigateByUrl('/orders', { replaceUrl: true });
  }
}
