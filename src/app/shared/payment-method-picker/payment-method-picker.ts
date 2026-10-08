import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideBanknote,
  LucideCheck,
  LucideCopy,
  LucideCreditCard,
  LucideLandmark,
  LucideLoaderCircle,
  LucidePlus,
  LucideQrCode,
  LucideShieldCheck,
  LucideSmartphone,
  LucideWallet,
} from '@lucide/angular';

import { SavedPaymentMethod } from '../../core/account.model';
import { ApiService } from '../../core/api.service';
import { PAYMENT_METHODS, PaymentMethodValue } from '../../core/payment-methods';
import { Select, SelectOption } from '../select/select';

export type { PaymentMethodValue } from '../../core/payment-methods';

interface CardForm {
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvc: string;
}

export interface ValidatedPayment {
  method: PaymentMethodValue;
}

const BANK_DETAILS = { bank: 'BDO Unibank', accountName: 'HomeLink Home Improvement Inc.', accountNumber: '0012 3456 7890' };

const sanitizeGcashNumber = (raw: string): string => {
  let digits = raw.replace(/\D/g, '').slice(0, 11);
  while (digits && !'09'.startsWith(digits) && !digits.startsWith('09')) {
    digits = digits.slice(0, -1);
  }
  return digits;
};

// "4242424242424242" -> "4242 4242 4242 4242" as it's typed.
const formatCardNumber = (raw: string) => raw.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');

// A card stays valid through the last day of its expiry month.
const isCardExpired = (month: number, year: number): boolean => {
  const now = new Date();
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
};

const emptyCardForm: CardForm = { cardNumber: '', expMonth: '', expYear: '', cvc: '' };
const monthOptions: SelectOption[] = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1).padStart(2, '0') }));
const currentYear = new Date().getFullYear();
const yearOptions: SelectOption[] = Array.from({ length: 12 }, (_, i) => ({ value: String(currentYear + i), label: String(currentYear + i) }));

/**
 * Ported from frontend/src/components/PaymentMethodPicker.jsx — same
 * public-validate()-method pattern as AddressPicker. Mobile keeps a dropdown
 * for the method where the web lays out a grid of tiles.
 *
 * Gateway methods (card, GCash, QR Ph) can each be switched off in admin Platform Settings.
 * Until that list loads — or if it fails to — all of them show; the backend rejects a disabled
 * one at /checkout-session either way.
 */
@Component({
  selector: 'app-payment-method-picker',
  imports: [
    FormsModule,
    RouterLink,
    Select,
    LucideCreditCard,
    LucideSmartphone,
    LucideQrCode,
    LucideLandmark,
    LucideBanknote,
    LucideWallet,
    LucideShieldCheck,
    LucideCopy,
    LucideCheck,
    LucidePlus,
    LucideLoaderCircle,
  ],
  templateUrl: './payment-method-picker.html',
  styleUrl: './payment-method-picker.css',
})
export class PaymentMethodPicker {
  private api = inject(ApiService);

  readonly stepNumber = input(2);
  /** Cash on delivery is only offered where there's a delivery to pay for, so it's opt-in per
   *  page rather than part of the default list (the service booking form shares this picker). */
  readonly allowCashOnDelivery = input(false);

  private readonly enabledGateway = signal<string[] | null>(null);
  private readonly methods = computed(() => {
    const enabled = this.enabledGateway();
    return PAYMENT_METHODS.filter(
      (m) => (this.allowCashOnDelivery() || !m.deliveryOnly) && (!m.gateway || !enabled || enabled.includes(m.value)),
    );
  });
  protected readonly paymentMethodOptions = computed<SelectOption[]>(() => this.methods().map((m) => ({ value: m.value, label: m.label })));
  protected readonly monthOptions = monthOptions;
  protected readonly yearOptions = yearOptions;
  protected readonly bankDetails = BANK_DETAILS;

  private readonly chosen = signal<PaymentMethodValue>('card');
  // Bank transfer has no toggle, so the list is never empty — if the picked method gets
  // switched off (card is the default), fall back to whatever is listed first.
  protected readonly method = computed<PaymentMethodValue>(() => {
    const methods = this.methods();
    return methods.some((m) => m.value === this.chosen()) ? this.chosen() : methods[0].value;
  });
  protected readonly cardForm = signal<CardForm>(emptyCardForm);
  protected readonly cardError = signal('');

  // The same cards as the account's Payment page. null until loaded; a failed load just means
  // there's nothing to pick from, so the new-card form shows as it would for a first purchase.
  protected readonly savedCards = signal<SavedPaymentMethod[] | null>(null);
  /** Saved card id, 'new', or null for the default. */
  private readonly cardChoice = signal<string | null>(null);
  protected readonly saveNewCard = signal(true);
  protected readonly isCardExpired = isCardExpired;

  private readonly usableCards = computed(() =>
    (this.savedCards() ?? []).filter((c) => !isCardExpired(Number(c.exp_month), Number(c.exp_year))),
  );
  protected readonly selectedCard = computed(() => {
    const usable = this.usableCards();
    const choice = this.cardChoice();
    if (choice === 'new' || usable.some((c) => c.id === choice)) return choice;
    return (usable.find((c) => c.is_default) ?? usable[0])?.id ?? 'new';
  });
  protected readonly gcashNumber = signal('');
  protected readonly gcashError = signal('');
  protected readonly bankCopied = signal(false);

  constructor() {
    this.api
      .get<{ gateway: string[] }>('/payments/methods')
      .then((r) => this.enabledGateway.set(r.gateway))
      .catch(() => {});
    this.api
      .get<SavedPaymentMethod[]>('/payment-methods/my')
      .then((cards) => this.savedCards.set(cards))
      .catch(() => this.savedCards.set([]));
  }

  onMethodChange(value: string): void {
    this.chosen.set(value as PaymentMethodValue);
  }

  chooseCard(choice: string): void {
    this.cardChoice.set(choice);
    this.cardError.set('');
  }

  updateCard<K extends keyof CardForm>(key: K, value: CardForm[K]): void {
    this.cardForm.update((f) => ({ ...f, [key]: value }));
    this.cardError.set('');
  }

  // Both inputs rewrite what was typed, so (like onGcashInput) the DOM value is forced back in
  // step when the cleaned-up value matches what ngModel last wrote.
  onCardNumberInput(value: string, inputEl: HTMLInputElement): void {
    const formatted = formatCardNumber(value);
    this.updateCard('cardNumber', formatted);
    if (inputEl.value !== formatted) inputEl.value = formatted;
  }

  onCvcInput(value: string, inputEl: HTMLInputElement): void {
    const digits = value.replace(/\D/g, '');
    this.updateCard('cvc', digits);
    if (inputEl.value !== digits) inputEl.value = digits;
  }

  onGcashInput(value: string, inputEl: HTMLInputElement): void {
    const sanitized = sanitizeGcashNumber(value);
    this.gcashNumber.set(sanitized);
    this.gcashError.set('');
    // Angular's [ngModel] binding skips writing back to the DOM when the sanitized
    // value equals what it last wrote (e.g. an invalid first digit sanitizes back to
    // the empty string it already was) — force the input's own value to stay in sync.
    if (inputEl.value !== sanitized) {
      inputEl.value = sanitized;
    }
  }

  copyBank(): void {
    if (!navigator.clipboard) return;
    navigator.clipboard
      .writeText(BANK_DETAILS.accountNumber.replace(/\s/g, ''))
      .then(() => {
        this.bankCopied.set(true);
        setTimeout(() => this.bankCopied.set(false), 1500);
      })
      .catch(() => {});
  }

  // Card number/CVC and the GCash number are collected here for a complete-feeling checkout
  // page, but PayMongo's hosted page is what actually collects payment credentials — these
  // values are validated for shape only and never sent to the payment flow, which only forwards
  // `method`. Ticking "save this card" stores just its brand, last 4 and expiry, the same as
  // adding one from the account's Payment page, so it shows up as a saved card next time.
  validate(): ValidatedPayment | null {
    const method = this.method();
    if (method === 'card') {
      const savedCards = this.savedCards();
      if (savedCards === null) {
        this.cardError.set('Still loading your saved cards — try again in a moment.');
        return null;
      }
      if (this.selectedCard() !== 'new') {
        this.cardError.set('');
        return { method };
      }

      const digits = this.cardForm().cardNumber.replace(/\D/g, '');
      if (digits.length < 12 || digits.length > 19) {
        this.cardError.set('Enter a valid card number');
        return null;
      }
      const month = Number(this.cardForm().expMonth);
      const year = Number(this.cardForm().expYear);
      if (!month || month < 1 || month > 12 || !year) {
        this.cardError.set('Enter a valid expiry date');
        return null;
      }
      if (isCardExpired(month, year)) {
        this.cardError.set('This card has expired');
        return null;
      }
      if (!/^\d{3,4}$/.test(this.cardForm().cvc)) {
        this.cardError.set('Enter a valid CVC');
        return null;
      }
      this.cardError.set('');

      const alreadySaved = savedCards.some(
        (c) => c.last4 === digits.slice(-4) && Number(c.exp_month) === month && Number(c.exp_year) === year,
      );
      if (this.saveNewCard() && !alreadySaved) {
        // Fire-and-forget: a card that fails to save shouldn't hold up the order itself.
        this.api.post('/payment-methods', { cardNumber: digits, expMonth: month, expYear: year }).catch(() => {});
      }
      return { method };
    }
    if (method === 'gcash') {
      const digits = this.gcashNumber().replace(/\s/g, '');
      if (!/^09\d{9}$/.test(digits)) {
        this.gcashError.set('Enter a valid GCash number (e.g. 09171234567).');
        return null;
      }
      this.gcashError.set('');
      return { method };
    }
    // 'qrph', 'bank' and 'cod' need no client-side form data — PayMongo's hosted page (qrph),
    // the static bank details (bank) or the cash-on-delivery notes (cod) are all that's shown.
    return { method };
  }
}
