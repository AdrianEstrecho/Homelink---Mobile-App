import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Location } from '@angular/common';
import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideCheck,
  LucideLoaderCircle,
  LucideLock,
  LucideShieldCheck,
  LucideShoppingBag,
  LucideSparkles,
  LucideTruck,
  LucideX,
} from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CartItem, CartService } from '../../core/cart.service';
import { Order, PendingOrder } from '../../core/order.model';
import { orderCharges } from '../../core/order-charges.util';
import { isOfflinePayment } from '../../core/payment-methods';
import { pollPaymentStatus } from '../../core/payment-polling.util';
import { PricePipe } from '../../core/price.pipe';
import { Product } from '../../core/product.model';
import { ActivePromos, AppliedVoucher, calcDiscount } from '../../core/promo.model';
import { SiteSettingsService } from '../../core/site-settings.service';
import { WishlistService } from '../../core/wishlist.service';
import { AddressPicker } from '../../shared/address-picker/address-picker';
import { OrderDetailsModal } from '../../shared/order-details-modal/order-details-modal';
import { PaymentMethodPicker } from '../../shared/payment-method-picker/payment-method-picker';

interface CheckoutSessionResponse {
  pendingCheckoutId: string;
  checkoutUrl: string;
}

@Component({
  selector: 'app-checkout',
  imports: [
    FormsModule,
    RouterLink,
    AddressPicker,
    PaymentMethodPicker,
    OrderDetailsModal,
    PricePipe,
    LucideShoppingBag,
    LucideSparkles,
    LucideCheck,
    LucideX,
    LucideLock,
    LucideShieldCheck,
    LucideTruck,
    LucideLoaderCircle,
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private cart = inject(CartService);
  private wishlist = inject(WishlistService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  protected readonly settings = inject(SiteSettingsService).settings;

  // "Buy Now" from a product page lands here as ?buy=<slug>&qty=<n>: only that product is
  // ordered, and the cart is left exactly as it was. It's carried in the URL (not router state)
  // so PayMongo's cancel redirect can bring the customer back to this same single-item checkout.
  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly buySlug = computed(() => this.queryParamMap().get('buy'));
  private readonly buyQty = computed(() => Math.max(1, parseInt(this.queryParamMap().get('qty') ?? '', 10) || 1));
  /** null = loading, false = unavailable. */
  protected readonly buyNowProduct = signal<Product | null | false>(null);

  private readonly buyNowItem = computed<CartItem | null>(() => {
    const p = this.buyNowProduct();
    if (!p || p.stock <= 0) return null;
    return {
      productId: p.id,
      name: p.name,
      price: p.price,
      image: p.image,
      slug: p.slug,
      stock: p.stock,
      quantity: Math.min(this.buyQty(), p.stock),
    };
  });

  protected readonly items = computed(() => {
    if (!this.buySlug()) return this.cart.items();
    const item = this.buyNowItem();
    return item ? [item] : [];
  });
  protected readonly subtotal = computed(() => {
    if (!this.buySlug()) return this.cart.total();
    const item = this.buyNowItem();
    return item ? item.price * item.quantity : 0;
  });

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
  protected readonly charges = computed(() =>
    orderCharges(Math.max(0, this.subtotal() - this.holidayAmt() - this.voucherAmt()), this.settings()),
  );
  protected readonly orderTotal = computed(() => this.charges().total);
  // A store with no shipping fee set has nothing to say about shipping, not "Free" on every order.
  protected readonly chargesShipping = computed(() => Number(this.settings().shippingFee) > 0);

  protected readonly billedTo = computed(() => {
    const u = this.auth.user();
    return u ? { name: `${u.firstName} ${u.lastName}`, email: u.email } : null;
  });

  constructor() {
    effect(() => {
      const slug = this.buySlug();
      if (!slug) return;
      this.buyNowProduct.set(null);
      this.api
        .get<Product>(`/products/${encodeURIComponent(slug)}`)
        .then((p) => this.buyNowProduct.set(p))
        .catch(() => this.buyNowProduct.set(false));
    });

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
      shipping_fee: this.charges().shippingFee,
      tax: this.charges().tax,
      tax_rate: this.charges().taxRate,
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
      // Bank transfer and cash on delivery create the order immediately (payment_status
      // 'pending' — settled later by staff verifying the deposit, or by the order being
      // marked delivered).
      if (isOfflinePayment(pending.payment_method)) {
        const order = await this.api.post<Order>('/orders', {
          items: pending.items.map((i) => ({ productId: i.id, quantity: i.quantity })),
          shippingAddress: pending.shipping_address,
          paymentMethod: pending.payment_method,
          promoCode: pending.promo_code || undefined,
        });
        this.finishOrder();
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
        buyNow: Boolean(this.buySlug()),
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
      this.finishOrder();
      this.confirmedOrder.set(result.order);
    } else if (result.status === 'failed') {
      this.error.set(result.error || 'Payment could not be completed. Please try again.');
    } else {
      this.error.set("We couldn't confirm this payment in time. Check your order history in a moment.");
    }
  }

  /** A Buy Now order never included the cart, so only a cart checkout empties it. */
  private finishOrder(): void {
    if (!this.buySlug()) this.cart.clearCart();
    this.wishlist.refresh(); // the server drops ordered products from the wishlist
    this.pendingOrder.set(null);
  }

  goToHome(): void {
    // replaceUrl: the order is placed and the cart is cleared, so /checkout is a dead
    // end now — swap it out of history instead of leaving it for the back button to land on.
    this.router.navigateByUrl('/', { replaceUrl: true });
  }

  goToOrders(): void {
    // Make Orders' back button land on Profile, same as reaching it from Account — silently
    // rewrite the current history entry to /account (Location.replaceState touches only the
    // browser's history, it doesn't trigger a Router navigation/render) before pushing /orders
    // on top, so back pops to /account instead of the now-dead /checkout screen.
    this.location.replaceState('/account');
    this.router.navigateByUrl('/orders');
  }
}
