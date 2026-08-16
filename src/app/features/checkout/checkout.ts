import { Capacitor } from '@capacitor/core';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideCheck, LucideLock, LucideShieldCheck, LucideShoppingBag, LucideSparkles, LucideTruck, LucideX } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { Order, PendingOrder } from '../../core/order.model';
import { PaymongoService } from '../../core/paymongo.service';
import { pollPaymentStatus } from '../../core/payment-polling.util';
import { PricePipe } from '../../core/price.pipe';
import { ActivePromos, AppliedVoucher, calcDiscount } from '../../core/promo.model';
import { AddressPicker } from '../../shared/address-picker/address-picker';
import { OrderDetailsModal } from '../../shared/order-details-modal/order-details-modal';
import { PaymentMethodPicker, ValidatedPayment } from '../../shared/payment-method-picker/payment-method-picker';

interface PaymentIntentResponse {
  pendingCheckoutId: string;
  paymentIntentId: string;
  clientKey: string;
}

async function loadBrowserPlugin() {
  const mod = await import('@capacitor/browser');
  return mod.Browser;
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
  private paymongo = inject(PaymongoService);
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
  protected paymentDetails: ValidatedPayment | null = null;
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
    this.paymentDetails = payment;
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
    this.paymentDetails = null;
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

      const { pendingCheckoutId, paymentIntentId, clientKey } = await this.api.post<PaymentIntentResponse>('/payments/intent', {
        items: pending.items.map((i) => ({ productId: i.id, quantity: i.quantity })),
        shippingAddress: pending.shipping_address,
        paymentMethod: pending.payment_method,
        promoCode: pending.promo_code || undefined,
      });

      const user = this.auth.user();
      const billing = {
        name: user ? `${user.firstName} ${user.lastName}` : undefined,
        email: user?.email,
        phone: pending.payment_method === 'gcash' ? this.paymentDetails?.gcashNumber : user?.phone,
      };

      const paymentMethodId =
        pending.payment_method === 'card'
          ? await this.paymongo.createPaymentMethod({
              type: 'card',
              details: {
                card_number: this.paymentDetails!.card!.cardNumber,
                exp_month: this.paymentDetails!.card!.expMonth,
                exp_year: this.paymentDetails!.card!.expYear,
                cvc: this.paymentDetails!.card!.cvc,
              },
              billing,
            })
          : await this.paymongo.createPaymentMethod({ type: 'gcash', billing });

      // See mobile port plan §3.5: the web app's return_url points back at its own
      // /checkout/return; on native we keep pointing at the deployed web app too
      // (not an Angular-hosted URL), since the redirect chain needs a real, always-
      // resolvable HTTPS final hop even though we dismiss the in-app browser before
      // the user ever sees it land there.
      const returnUrl = `${window.location.origin}/checkout/return?pcid=${pendingCheckoutId}`;
      const attached = await this.paymongo.attachPaymentIntent({ paymentIntentId, paymentMethodId, clientKey, returnUrl });

      if (attached.status === 'succeeded') {
        const result = await this.api.get<{ order: Order }>(`/payments/status/${pendingCheckoutId}`);
        this.cart.clearCart();
        this.pendingOrder.set(null);
        this.confirmedOrder.set(result.order);
      } else if (attached.nextAction?.redirect?.url) {
        await this.handleRedirect(attached.nextAction.redirect.url, pendingCheckoutId);
      } else {
        this.error.set(attached.lastPaymentError?.detail || 'Payment could not be completed. Please try again.');
      }
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.placingOrder.set(false);
    }
  }

  private async handleRedirect(redirectUrl: string, pendingCheckoutId: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // Leaving the page — CheckoutReturn picks up from here once PayMongo redirects back.
      window.location.href = redirectUrl;
      return;
    }

    // Native: open a separate in-app browser tab rather than navigating our own
    // WebView away. It doesn't need to redirect back into the app at all — we
    // just keep polling underneath and dismiss it once we know the result.
    const Browser = await loadBrowserPlugin();
    await Browser.open({ url: redirectUrl });
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
    this.router.navigateByUrl('/orders');
  }
}
