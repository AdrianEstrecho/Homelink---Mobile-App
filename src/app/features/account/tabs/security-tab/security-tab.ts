import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideCircleCheck, LucideKeyRound, LucideLock, LucideShieldCheck } from '@lucide/angular';

import { ApiService } from '../../../../core/api.service';
import { AuthService } from '../../../../core/auth.service';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const emptyForm: PasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

@Component({
  selector: 'app-security-tab',
  imports: [FormsModule, LucideLock, LucideKeyRound, LucideCircleCheck, LucideShieldCheck],
  templateUrl: './security-tab.html',
  styleUrl: './security-tab.css',
})
export class SecurityTab {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  protected readonly form = signal<PasswordForm>(emptyForm);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal(false);

  protected readonly twoFactorEnabled = computed(() => !!this.auth.user()?.twoFactorEnabled);
  protected readonly twoFactorSaving = signal(false);
  protected readonly twoFactorError = signal('');
  protected readonly setupStage = signal<'idle' | 'code'>('idle');
  protected readonly setupCode = signal('');
  protected readonly setupResent = signal(false);

  updateField<K extends keyof PasswordForm>(key: K, value: PasswordForm[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
    this.success.set(false);
  }

  async handleSubmit(): Promise<void> {
    this.error.set('');
    this.success.set(false);
    if (this.form().newPassword !== this.form().confirmPassword) {
      this.error.set('New password and confirmation do not match');
      return;
    }
    this.saving.set(true);
    try {
      await this.api.put('/auth/change-password', this.form());
      this.form.set(emptyForm);
      this.success.set(true);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.saving.set(false);
    }
  }

  /** Turning it off is immediate — nothing here for a stolen code to bypass. Turning it on needs
   *  the emailed code first, so the toggle just starts that flow. */
  async toggleTwoFactor(): Promise<void> {
    this.twoFactorError.set('');
    this.twoFactorSaving.set(true);
    try {
      if (this.twoFactorEnabled()) {
        await this.auth.setTwoFactorEnabled(false);
      } else {
        await this.auth.sendTwoFactorSetupCode();
        this.setupStage.set('code');
      }
    } catch (err) {
      this.twoFactorError.set((err as Error).message);
    } finally {
      this.twoFactorSaving.set(false);
    }
  }

  onSetupCodeInput(value: string): void {
    this.setupCode.set(value.toUpperCase());
  }

  async verifyAndEnable(): Promise<void> {
    this.twoFactorError.set('');
    this.twoFactorSaving.set(true);
    try {
      await this.auth.setTwoFactorEnabled(true, this.setupCode());
      this.cancelSetup();
    } catch (err) {
      this.twoFactorError.set((err as Error).message);
    } finally {
      this.twoFactorSaving.set(false);
    }
  }

  async resendSetupCode(): Promise<void> {
    this.twoFactorError.set('');
    this.setupResent.set(false);
    try {
      await this.auth.sendTwoFactorSetupCode();
      this.setupResent.set(true);
    } catch (err) {
      this.twoFactorError.set((err as Error).message);
    }
  }

  cancelSetup(): void {
    this.setupStage.set('idle');
    this.setupCode.set('');
    this.setupResent.set(false);
    this.twoFactorError.set('');
  }
}
