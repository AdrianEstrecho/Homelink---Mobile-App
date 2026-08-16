import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideKeyRound, LucideMail } from '@lucide/angular';

import { ApiService } from '../../../core/api.service';
import { PasswordResetFlowService } from '../../../core/password-reset-flow.service';
import { AuthIllustration } from '../../../shared/auth-illustration/auth-illustration';
import { AuthLayout } from '../../../shared/auth-layout/auth-layout';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, AuthLayout, AuthIllustration, LucideKeyRound, LucideMail],
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
    this.loading.set(true);
    this.error.set('');
    try {
      await this.api.post('/auth/forgot-password', { email: this.email });
      this.resetFlow.setEmail(this.email);
      this.router.navigateByUrl('/verify-reset-code');
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
