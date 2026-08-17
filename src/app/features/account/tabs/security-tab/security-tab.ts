import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideCircleCheck, LucideKeyRound, LucideLock } from '@lucide/angular';

import { ApiService } from '../../../../core/api.service';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const emptyForm: PasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

@Component({
  selector: 'app-security-tab',
  imports: [FormsModule, LucideLock, LucideKeyRound, LucideCircleCheck],
  templateUrl: './security-tab.html',
  styleUrl: './security-tab.css',
})
export class SecurityTab {
  private api = inject(ApiService);

  protected readonly form = signal<PasswordForm>(emptyForm);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal(false);

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
}
