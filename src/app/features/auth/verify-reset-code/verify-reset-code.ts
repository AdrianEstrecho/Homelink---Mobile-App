import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideShieldCheck } from '@lucide/angular';

import { ApiService } from '../../../core/api.service';
import { PasswordResetFlowService } from '../../../core/password-reset-flow.service';
import { AuthIllustration } from '../../../shared/auth-illustration/auth-illustration';
import { AuthLayout } from '../../../shared/auth-layout/auth-layout';

@Component({
  selector: 'app-verify-reset-code',
  imports: [FormsModule, RouterLink, AuthLayout, AuthIllustration, LucideShieldCheck],
  templateUrl: './verify-reset-code.html',
  styleUrl: './verify-reset-code.css',
})
export class VerifyResetCode {
  private api = inject(ApiService);
  private resetFlow = inject(PasswordResetFlowService);
  private router = inject(Router);

  protected readonly pending = this.resetFlow.current;

  protected code = '';
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly resent = signal(false);

  onCodeInput(value: string): void {
    this.code = value.toUpperCase();
  }

  async onSubmit(): Promise<void> {
    const email = this.pending()?.email;
    if (!email) return;
    this.error.set('');
    this.loading.set(true);
    try {
      await this.api.post('/auth/verify-reset-code', { email, code: this.code });
      this.resetFlow.setVerified(email, this.code);
      this.router.navigateByUrl('/reset-password');
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async onResend(): Promise<void> {
    const email = this.pending()?.email;
    if (!email) return;
    this.error.set('');
    this.resent.set(false);
    try {
      await this.api.post('/auth/forgot-password', { email });
      this.resent.set(true);
    } catch (err) {
      this.error.set((err as Error).message);
    }
  }
}
