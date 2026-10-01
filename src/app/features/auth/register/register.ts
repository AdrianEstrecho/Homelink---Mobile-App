import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { LucideArrowRight, LucideCheck, LucideChevronLeft, LucideMailCheck, LucideUserPlus } from '@lucide/angular';

import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { isPasswordValid, passwordRules } from '../../../core/password.util';
import { AuthLayout } from '../../../shared/auth-layout/auth-layout';
import { CodeInput } from '../../../shared/code-input/code-input';
import { GoogleSigninButton } from '../../../shared/google-signin-button/google-signin-button';
import { PasswordInput } from '../../../shared/password-input/password-input';
import { PasswordRequirements } from '../../../shared/password-requirements/password-requirements';
import { ResendCode } from '../../../shared/resend-code/resend-code';
import { TermsModal } from '../../../shared/terms-modal/terms-modal';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_LENGTH = 8;

// The verification code is emailed when leaving step 1, so it's already waiting in the inbox by
// the time the password step is done. The code is only checked server-side by /auth/register,
// which is why entering it is the last step: a wrong code fails right where it was typed.
const STEPS = [
  { key: 'details', label: 'Your details' },
  { key: 'password', label: 'Password' },
  { key: 'verify', label: 'Verify email' },
] as const;

interface RegisterFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  code: string;
}

type FieldErrors = Partial<Record<keyof RegisterFormState | 'terms', string>>;

/** Ported from frontend/src/pages/Register.jsx — a three-step sign-up (details → password →
 *  verify email) with a progress bar per step. The backend rejects registration without a
 *  verified-email `code` (see POST /auth/register). */
@Component({
  selector: 'app-register',
  imports: [
    FormsModule,
    RouterLink,
    AuthLayout,
    CodeInput,
    PasswordInput,
    PasswordRequirements,
    ResendCode,
    TermsModal,
    GoogleSigninButton,
    LucideArrowRight,
    LucideCheck,
    LucideChevronLeft,
    LucideMailCheck,
    LucideUserPlus,
  ],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  protected readonly steps = STEPS;
  protected readonly codeLength = CODE_LENGTH;
  protected readonly googleSupported = !Capacitor.isNativePlatform();

  protected readonly step = signal(0);
  protected readonly direction = signal<'forward' | 'back'>('forward');
  protected readonly form = signal<RegisterFormState>({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', code: '' });
  protected readonly fieldErrors = signal<FieldErrors>({});
  /** The email belongs to an existing account — shown with a "Sign in instead" link. */
  protected readonly emailTaken = signal(false);
  protected readonly acceptedTerms = signal(false);
  protected readonly showTerms = signal(false);
  protected readonly codeSentTo = signal('');
  protected readonly codeSentAt = signal(0);
  protected readonly sendingCode = signal(false);
  protected readonly error = signal('');
  protected readonly loading = signal(false);

  protected readonly emailValid = computed(() => EMAIL_PATTERN.test(this.form().email.trim()));
  protected readonly passwordsMatch = computed(() => {
    const f = this.form();
    return f.confirmPassword.length > 0 && f.password === f.confirmPassword;
  });
  protected readonly confirmMismatch = computed(() => {
    const f = this.form();
    return !!f.confirmPassword && !this.passwordsMatch() && f.confirmPassword.length >= f.password.length;
  });

  /** How much of each step is filled in — the current step's bar tracks it. */
  protected readonly progress = computed(() => {
    const f = this.form();
    return [
      [f.firstName.trim(), f.lastName.trim(), this.emailValid()].filter(Boolean).length / 3,
      (passwordRules.filter((rule) => rule.test(f.password)).length + (this.passwordsMatch() ? 1 : 0) + (this.acceptedTerms() ? 1 : 0)) /
        (passwordRules.length + 2),
      f.code.length / CODE_LENGTH,
    ];
  });

  protected readonly subtitle = computed(() => {
    switch (this.step()) {
      case 0:
        return 'Shop home products and book installers with one account.';
      case 1:
        return 'Choose a password you’ll use to sign in.';
      default:
        return `Enter the ${CODE_LENGTH}-character code we sent to ${this.codeSentTo()}.`;
    }
  });

  /** Bound as an input on ResendCode, so it has to carry its own `this`. */
  protected readonly resendCode = async (): Promise<void> => {
    this.error.set('');
    try {
      await this.api.post('/auth/send-verification-code', { email: this.form().email });
      this.codeSentAt.set(Date.now());
    } catch (err) {
      this.error.set((err as Error).message);
      throw err;
    }
  };

  barWidth(i: number): number {
    if (i < this.step()) return 100;
    if (i === this.step()) return Math.max(8, this.progress()[i] * 100);
    return 0;
  }

  updateField<K extends keyof RegisterFormState>(key: K, value: RegisterFormState[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
    this.fieldErrors.update((fe) => ({ ...fe, [key]: undefined }));
    if (key === 'email') this.emailTaken.set(false);
  }

  goTo(index: number): void {
    this.direction.set(index > this.step() ? 'forward' : 'back');
    this.step.set(index);
    this.error.set('');
    this.fieldErrors.set({});
  }

  /** A step bar is only a way back — finished steps can be revisited, later ones can't be skipped to. */
  selectStep(index: number): void {
    if (index < this.step()) this.goTo(index);
  }

  // Ticking the box doesn't accept on its own — it opens the terms for the user to actually read;
  // only the modal's Accept button (after scrolling through) sets acceptedTerms.
  onTermsCheckbox(checked: boolean, el: HTMLInputElement): void {
    if (checked) {
      el.checked = false;
      this.showTerms.set(true);
    } else {
      this.acceptedTerms.set(false);
    }
  }

  acceptTerms(): void {
    this.acceptedTerms.set(true);
    this.showTerms.set(false);
    this.fieldErrors.update((fe) => ({ ...fe, terms: undefined }));
  }

  declineTerms(): void {
    this.acceptedTerms.set(false);
    this.showTerms.set(false);
  }

  async submitDetails(): Promise<void> {
    const f = this.form();
    const errs: FieldErrors = {};
    if (!f.firstName.trim()) errs.firstName = 'Enter your first name.';
    if (!f.lastName.trim()) errs.lastName = 'Enter your last name.';
    if (!f.email.trim()) errs.email = 'Enter your email.';
    else if (!this.emailValid()) errs.email = 'Enter a valid email, like name@example.com.';
    if (Object.keys(errs).length) {
      this.fieldErrors.set(errs);
      return;
    }

    // Coming back to this step without changing the email: the code already sent is still
    // good, and sending another would invalidate it.
    const normalizedEmail = f.email.trim().toLowerCase();
    if (this.codeSentTo() === normalizedEmail) {
      this.goTo(1);
      return;
    }

    this.sendingCode.set(true);
    this.error.set('');
    try {
      await this.api.post('/auth/send-verification-code', { email: f.email });
      this.codeSentTo.set(normalizedEmail);
      this.codeSentAt.set(Date.now());
      this.form.update((prev) => ({ ...prev, code: '' }));
      this.goTo(1);
    } catch (err) {
      const message = (err as Error).message;
      if (/already registered/i.test(message)) {
        this.emailTaken.set(true);
      } else {
        this.error.set(message);
      }
    } finally {
      this.sendingCode.set(false);
    }
  }

  submitPassword(): void {
    const f = this.form();
    const errs: FieldErrors = {};
    if (!isPasswordValid(f.password)) errs.password = 'Your password needs to meet every requirement below.';
    if (!f.confirmPassword) errs.confirmPassword = 'Re-enter your password.';
    else if (!this.passwordsMatch()) errs.confirmPassword = "Passwords don't match.";
    if (!this.acceptedTerms()) errs.terms = 'Read and accept the Terms & Conditions to continue.';
    if (Object.keys(errs).length) {
      this.fieldErrors.set(errs);
      return;
    }
    this.goTo(2);
  }

  onCodeChange(code: string): void {
    this.form.update((f) => ({ ...f, code }));
    this.fieldErrors.set({});
    if (this.error()) this.error.set('');
  }

  async createAccount(code = this.form().code): Promise<void> {
    if (this.loading()) return;
    if (code.length < CODE_LENGTH) {
      this.fieldErrors.set({ code: `Enter all ${CODE_LENGTH} characters of the code.` });
      return;
    }
    const f = this.form();
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.register({
        firstName: f.firstName,
        lastName: f.lastName,
        email: f.email,
        phone: f.phone,
        password: f.password,
        acceptedTerms: this.acceptedTerms(),
        code,
      });
      this.router.navigateByUrl('/');
    } catch (err) {
      this.error.set((err as Error).message);
      this.loading.set(false);
    }
  }

  async onGoogleCredential(credential: string): Promise<void> {
    this.error.set('');
    this.loading.set(true);
    try {
      const result = await this.auth.loginWithGoogle(credential);
      if (result.requires2FA) {
        // This Google account matches an existing HomeLink account that has 2FA turned on —
        // send them to Login instead, which has the code-entry stage this page doesn't.
        this.error.set('This Google account already has a HomeLink account with two-factor authentication on. Sign in from the Login page instead.');
        this.loading.set(false);
        return;
      }
      this.router.navigateByUrl('/');
    } catch (err) {
      this.error.set((err as Error).message || 'Google sign-up failed. Try again, or sign up with your email.');
      this.loading.set(false);
    }
  }
}
