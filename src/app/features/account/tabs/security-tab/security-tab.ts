import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCheck, LucideCircleCheck, LucideKeyRound, LucideLoaderCircle, LucideLock, LucideShieldCheck, LucideShieldOff } from '@lucide/angular';

import { ApiService } from '../../../../core/api.service';
import { AuthService } from '../../../../core/auth.service';
import { isPasswordValid } from '../../../../core/password.util';
import { CodeInput } from '../../../../shared/code-input/code-input';
import { ConfirmDialog } from '../../../../shared/confirm-dialog/confirm-dialog';
import { PasswordInput } from '../../../../shared/password-input/password-input';
import { PasswordRequirements } from '../../../../shared/password-requirements/password-requirements';
import { ResendCode } from '../../../../shared/resend-code/resend-code';
import { Switch } from '../../../../shared/switch/switch';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type FieldErrors = Partial<Record<keyof PasswordForm, string>>;

const CODE_LENGTH = 8;
const emptyForm: PasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

/** Ported from frontend/src/components/account/SecurityTab.jsx. */
@Component({
  selector: 'app-security-tab',
  imports: [
    RouterLink,
    PasswordInput,
    PasswordRequirements,
    CodeInput,
    ResendCode,
    ConfirmDialog,
    Switch,
    LucideLock,
    LucideKeyRound,
    LucideCircleCheck,
    LucideShieldCheck,
    LucideShieldOff,
    LucideCheck,
    LucideLoaderCircle,
  ],
  templateUrl: './security-tab.html',
  styleUrl: './security-tab.css',
})
export class SecurityTab {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  protected readonly codeLength = CODE_LENGTH;
  protected readonly email = computed(() => this.auth.user()?.email ?? '');

  // --- Change password ---
  protected readonly form = signal<PasswordForm>(emptyForm);
  protected readonly fieldErrors = signal<FieldErrors>({});
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal(false);
  protected readonly passwordsMatch = computed(
    () => this.form().confirmPassword.length > 0 && this.form().newPassword === this.form().confirmPassword,
  );

  // --- Two-factor ---
  protected readonly twoFactorEnabled = computed(() => !!this.auth.user()?.twoFactorEnabled);
  protected readonly stage = signal<'idle' | 'code'>('idle');
  protected readonly code = signal('');
  protected readonly codeSentAt = signal(0);
  protected readonly busy = signal(false);
  protected readonly twoFactorError = signal('');
  protected readonly confirmingOff = signal(false);
  protected readonly justEnabled = signal(false);

  updateField<K extends keyof PasswordForm>(key: K, value: PasswordForm[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
    this.fieldErrors.update((fe) => ({ ...fe, [key]: undefined }));
    this.success.set(false);
  }

  // Same rules the backend enforces (validatePasswordStrength), checked here first so a weak
  // password is caught while typing instead of after a round trip.
  async handleSubmit(): Promise<void> {
    const f = this.form();
    const errs: FieldErrors = {};
    if (!f.currentPassword) errs.currentPassword = 'Enter your current password.';
    if (!isPasswordValid(f.newPassword)) errs.newPassword = 'Your new password needs to meet every requirement below.';
    else if (f.newPassword === f.currentPassword) errs.newPassword = 'Choose a password different from your current one.';
    if (!f.confirmPassword) errs.confirmPassword = 'Re-enter your new password.';
    else if (!this.passwordsMatch()) errs.confirmPassword = "Passwords don't match.";
    this.fieldErrors.set(errs);
    this.error.set('');
    if (Object.keys(errs).length) return;

    this.saving.set(true);
    try {
      await this.api.put('/auth/change-password', { currentPassword: f.currentPassword, newPassword: f.newPassword });
      this.form.set(emptyForm);
      this.success.set(true);
    } catch (err) {
      const message = (err as Error).message;
      // A wrong current password belongs to that field, not to a generic alert under the form.
      if (/current password is incorrect/i.test(message)) {
        this.fieldErrors.set({ currentPassword: "That's not your current password." });
      } else {
        this.error.set(message);
      }
    } finally {
      this.saving.set(false);
    }
  }

  private async sendCode(): Promise<void> {
    await this.auth.sendTwoFactorSetupCode();
    this.codeSentAt.set(Date.now());
    this.code.set('');
  }

  // Turning it on needs the emailed code first, so the switch only starts that flow. Turning it
  // off needs no code (nothing for a stolen one to bypass) — just a confirmation, so a stray
  // tap can't quietly drop the protection.
  async handleToggle(): Promise<void> {
    this.twoFactorError.set('');
    this.justEnabled.set(false);
    if (this.twoFactorEnabled()) {
      this.confirmingOff.set(true);
      return;
    }
    this.busy.set(true);
    try {
      await this.sendCode();
      this.stage.set('code');
    } catch (err) {
      this.twoFactorError.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  // ResendCode wants a rejection on failure; the alert below shows the message.
  protected readonly handleResend = async (): Promise<void> => {
    this.twoFactorError.set('');
    try {
      await this.sendCode();
    } catch (err) {
      this.twoFactorError.set((err as Error).message);
      throw err;
    }
  };

  onCodeChange(next: string): void {
    this.code.set(next);
    if (this.twoFactorError()) this.twoFactorError.set('');
  }

  async verify(value = this.code()): Promise<void> {
    if (this.busy()) return;
    if (value.length !== CODE_LENGTH) {
      this.twoFactorError.set(`Enter all ${CODE_LENGTH} characters of the code.`);
      return;
    }
    this.twoFactorError.set('');
    this.busy.set(true);
    try {
      await this.auth.setTwoFactorEnabled(true, value);
      this.stage.set('idle');
      this.code.set('');
      this.justEnabled.set(true);
    } catch (err) {
      this.twoFactorError.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async turnOff(): Promise<void> {
    this.confirmingOff.set(false);
    this.busy.set(true);
    try {
      await this.auth.setTwoFactorEnabled(false);
    } catch (err) {
      this.twoFactorError.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  cancelSetup(): void {
    this.stage.set('idle');
    this.code.set('');
    this.twoFactorError.set('');
  }
}
