import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideKeyRound } from '@lucide/angular';

import { ApiService } from '../../../core/api.service';
import { PasswordResetFlowService } from '../../../core/password-reset-flow.service';
import { AuthLayout } from '../../../shared/auth-layout/auth-layout';

/** Password resets are only offered to Gmail accounts. */
const GMAIL_PATTERN = /^[^\s@]+@gmail\.com$/i;

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, AuthLayout, LucideKeyRound],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private api = inject(ApiService);
  private resetFlow = inject(PasswordResetFlowService);
  private router = inject(Router);

  protected email = '';
  protected readonly error = signal('');
  protected readonly loading = signal(false);

  async onSubmit(): Promise<void> {
    if (this.loading()) return;
    const email = this.email.trim();
    if (!email) {
      this.error.set('Enter your email.');
      return;
    }
    if (!GMAIL_PATTERN.test(email)) {
      this.error.set('Enter your Gmail address, ending in @gmail.com.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      // The server answers 404 "No HomeLink account uses this email." and sends nothing when no account matches.
      await this.api.post('/auth/forgot-password', { email });
      this.resetFlow.setEmail(email);
      this.router.navigateByUrl('/verify-reset-code');
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
