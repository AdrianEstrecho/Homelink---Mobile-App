import { Component, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideCheck, LucideCopy, LucideCreditCard, LucideLandmark, LucideQrCode, LucideShieldCheck, LucideSmartphone } from '@lucide/angular';

import { Select, SelectOption } from '../select/select';

export type PaymentMethodValue = 'card' | 'gcash' | 'qrph' | 'bank';

interface CardForm {
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvc: string;
}

export interface ValidatedPayment {
  method: PaymentMethodValue;
  card?: { cardNumber: string; expMonth: number; expYear: number; cvc: string };
  gcashNumber?: string;
}

const PAYMENT_METHODS: { value: PaymentMethodValue; label: string; description: string; icon: 'card' | 'gcash' | 'qrph' | 'bank' }[] = [
  { value: 'card', label: 'Credit / Debit Card', description: 'Visa, Mastercard & more', icon: 'card' },
  { value: 'gcash', label: 'GCash', description: 'Pay with your wallet', icon: 'gcash' },
  { value: 'qrph', label: 'QR Ph', description: 'Scan with any app', icon: 'qrph' },
  { value: 'bank', label: 'Bank Transfer', description: 'Direct bank deposit', icon: 'bank' },
];

const PAYMENT_METHOD_OPTIONS: SelectOption[] = PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label }));

const BANK_DETAILS = { bank: 'BDO Unibank', accountName: 'HomeLink Home Improvement Inc.', accountNumber: '0012 3456 7890' };

const emptyCardForm: CardForm = { cardNumber: '', expMonth: '', expYear: '', cvc: '' };
const monthOptions: SelectOption[] = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1).padStart(2, '0') }));
const currentYear = new Date().getFullYear();
const yearOptions: SelectOption[] = Array.from({ length: 12 }, (_, i) => ({ value: String(currentYear + i), label: String(currentYear + i) }));

/**
 * Ported from frontend/src/components/PaymentMethodPicker.jsx — same
 * public-validate()-method pattern as AddressPicker.
 */
@Component({
  selector: 'app-payment-method-picker',
  imports: [FormsModule, Select, LucideCreditCard, LucideSmartphone, LucideQrCode, LucideLandmark, LucideShieldCheck, LucideCopy, LucideCheck],
  templateUrl: './payment-method-picker.html',
  styleUrl: './payment-method-picker.css',
})
export class PaymentMethodPicker {
  readonly stepNumber = input(2);

  protected readonly paymentMethods = PAYMENT_METHODS;
  protected readonly paymentMethodOptions = PAYMENT_METHOD_OPTIONS;
  protected readonly monthOptions = monthOptions;
  protected readonly yearOptions = yearOptions;
  protected readonly bankDetails = BANK_DETAILS;

  protected readonly method = signal<PaymentMethodValue>('card');
  protected readonly cardForm = signal<CardForm>(emptyCardForm);
  protected readonly cardError = signal('');
  protected readonly gcashNumber = signal('');
  protected readonly gcashError = signal('');
  protected readonly bankCopied = signal(false);

  onMethodChange(value: string): void {
    this.method.set(value as PaymentMethodValue);
  }

  updateCard<K extends keyof CardForm>(key: K, value: CardForm[K]): void {
    this.cardForm.update((f) => ({ ...f, [key]: value }));
  }

  onCvcInput(value: string): void {
    this.updateCard('cvc', value.replace(/\D/g, ''));
  }

  onGcashInput(value: string): void {
    this.gcashNumber.set(value);
    this.gcashError.set('');
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

  validate(): ValidatedPayment | null {
    const method = this.method();
    if (method === 'card') {
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
      if (!/^\d{3,4}$/.test(this.cardForm().cvc)) {
        this.cardError.set('Enter a valid CVC');
        return null;
      }
      this.cardError.set('');
      return { method, card: { cardNumber: digits, expMonth: month, expYear: year, cvc: this.cardForm().cvc } };
    }
    if (method === 'gcash') {
      const digits = this.gcashNumber().replace(/\s/g, '');
      if (!/^09\d{9}$/.test(digits)) {
        this.gcashError.set('Enter a valid GCash number (e.g. 09171234567).');
        return null;
      }
      this.gcashError.set('');
      return { method, gcashNumber: digits };
    }
    // 'qrph' and 'bank' need no client-side form data — PayMongo's hosted page (qrph) or the
    // static bank details below (bank) are all that's shown for those two.
    return { method };
  }
}
