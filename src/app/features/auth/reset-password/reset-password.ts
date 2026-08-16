import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideCircleCheck, LucideKeyRound, LucideLock } from '@lucide/angular';

import { ApiService } from '../../../core/api.service';
import { PasswordResetFlowService } from '../../../core/password-reset-flow.service';
import { isPasswordValid } from '../../../core/password.util';
import { AuthIllustration } from '../../../shared/auth-illustration/auth-illustration';
import { AuthLayout } from '../../../shared/auth-layout/auth-layout';
import { PasswordRequirements } from '../../../shared/password-requirements/password-requirements';

@Component({
  selector: 'app-reset-password',
  imports: [
    FormsModule,
    RouterLink,
    AuthLayout,
    AuthIllustration,
    PasswordRequirements,
    LucideKeyRound,
    LucideLock,
    LucideCircleCheck,
  ],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  private api = inject(ApiService);
  private resetFlow = inject(PasswordResetFlowService);
  private router = inject(Router);

  protected readonly pending = this.resetFlow.current;

  protected password = '';
  protected confirmPassword = '';
  protected readonly passwordTouched = signal(false);
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly done = signal(false);

  get passwordsMatch(): boolean {
    return this.confirmPassword.length === 0 || this.password === this.confirmPassword;
  }

  async onSubmit(): Promise<void> {
    const { email, code } = this.pending() ?? {};
    if (!email || !code) return;
    this.error.set('');

    if (!isPasswordValid(this.password)) {
      this.error.set('Password does not meet the requirements below.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }

    this.loading.set(true);
    try {
      await this.api.post('/auth/reset-password', { email, code, password: this.password });
      this.done.set(true);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  goToLogin(): void {
    this.resetFlow.clear();
    this.router.navigateByUrl('/login');
  }
}
