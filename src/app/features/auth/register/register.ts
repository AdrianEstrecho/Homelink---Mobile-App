import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { LucideCheckCircle2, LucideUserPlus } from '@lucide/angular';

import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { isPasswordValid } from '../../../core/password.util';
import { AuthLayout } from '../../../shared/auth-layout/auth-layout';
import { GoogleSigninButton } from '../../../shared/google-signin-button/google-signin-button';
import { PasswordInput } from '../../../shared/password-input/password-input';
import { PasswordRequirements } from '../../../shared/password-requirements/password-requirements';
import { TermsModal } from '../../../shared/terms-modal/terms-modal';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Ported from frontend/src/pages/Register.jsx — the backend rejects registration
 *  without a verified-email `code` (see POST /auth/register), which this mobile
 *  form previously never collected. */
@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, AuthLayout, PasswordInput, PasswordRequirements, TermsModal, GoogleSigninButton, LucideUserPlus, LucideCheckCircle2],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  protected firstName = '';
  protected lastName = '';
  protected email = '';
  protected phone = '';
  protected password = '';
  protected confirmPassword = '';
  protected code = '';

  protected readonly acceptedTerms = signal(false);
  protected readonly showTerms = signal(false);
  protected readonly passwordTouched = signal(false);
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly googleSupported = !Capacitor.isNativePlatform();

  protected readonly codeSent = signal(false);
  protected readonly sendingCode = signal(false);
  protected readonly resent = signal(false);
  protected readonly verifyError = signal('');

  get passwordsMatch(): boolean {
    return this.confirmPassword.length === 0 || this.password === this.confirmPassword;
  }

  get emailValid(): boolean {
    return EMAIL_PATTERN.test(this.email);
  }

  async confirmEmail(): Promise<void> {
    this.verifyError.set('');
    if (!this.emailValid) {
      this.verifyError.set('Enter a valid email first.');
      return;
    }
    this.sendingCode.set(true);
    try {
      await this.api.post('/auth/send-verification-code', { email: this.email });
      this.codeSent.set(true);
    } catch (err) {
      this.verifyError.set((err as Error).message);
    } finally {
      this.sendingCode.set(false);
    }
  }

  async resendCode(): Promise<void> {
    this.verifyError.set('');
    this.resent.set(false);
    try {
      await this.api.post('/auth/send-verification-code', { email: this.email });
      this.resent.set(true);
    } catch (err) {
      this.verifyError.set((err as Error).message);
    }
  }

  changeEmail(): void {
    this.codeSent.set(false);
    this.resent.set(false);
    this.verifyError.set('');
    this.code = '';
  }

  onCodeInput(value: string): void {
    this.code = value.toUpperCase();
  }

  async onGoogleCredential(credential: string): Promise<void> {
    this.error.set('');
    this.loading.set(true);
    try {
      const result = await this.auth.loginWithGoogle(credential);
      if (result.requires2FA) {
        // This Google account matches an existing HomeLink account that has 2FA turned on —
        // send them to Login instead, which has the code-entry stage this page doesn't.
        this.error.set('This Google account already has a HomeLink account with two-factor authentication enabled. Please sign in from the Login page instead.');
        this.loading.set(false);
        return;
      }
      this.router.navigateByUrl('/');
    } catch (err) {
      this.error.set((err as Error).message || 'Google sign-up failed');
      this.loading.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    this.error.set('');

    if (!this.codeSent() || !this.code.trim()) {
      this.error.set('Please confirm your email and enter the verification code first.');
      return;
    }
    if (!isPasswordValid(this.password)) {
      this.error.set('Password does not meet the requirements below.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }
    if (!this.acceptedTerms()) {
      this.error.set('You must agree to the Terms & Conditions to create an account.');
      return;
    }

    this.loading.set(true);
    try {
      await this.auth.register({
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        phone: this.phone,
        password: this.password,
        acceptedTerms: this.acceptedTerms(),
        code: this.code,
      });
      this.router.navigateByUrl('/');
    } catch (err) {
      this.error.set((err as Error).message);
      this.loading.set(false);
    }
  }
}
