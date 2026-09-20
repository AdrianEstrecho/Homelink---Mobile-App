import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideCheck,
  LucideLock,
  LucideMail,
  LucideMapPin,
  LucidePencil,
  LucidePhone,
  LucideSave,
  LucideTriangleAlert,
  LucideUser,
  LucideX,
} from '@lucide/angular';

import { AuthService } from '../../../../core/auth.service';
import { ToastService } from '../../../../core/toast.service';

interface ProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
}

/** Philippine mobile number, in either local (09…) or international (+639…) form. */
const PH_MOBILE = /^(\+63|0)9\d{9}$/;

@Component({
  selector: 'app-profile-tab',
  imports: [
    FormsModule,
    LucideUser,
    LucideMail,
    LucidePhone,
    LucideMapPin,
    LucidePencil,
    LucideX,
    LucideSave,
    LucideLock,
    LucideCheck,
    LucideTriangleAlert,
  ],
  templateUrl: './profile-tab.html',
  styleUrl: './profile-tab.css',
})
export class ProfileTab {
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  protected readonly user = this.auth.user;

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal('');
  protected readonly form = signal<ProfileForm>(this.formFromUser());

  /** Fields the user has touched — errors stay hidden until then, and on submit. */
  protected readonly touched = signal<Partial<Record<keyof ProfileForm, boolean>>>({});

  protected readonly errors = computed(() => {
    const f = this.form();
    const e: Partial<Record<keyof ProfileForm, string>> = {};
    if (!f.firstName.trim()) e.firstName = 'First name is required.';
    if (!f.lastName.trim()) e.lastName = 'Last name is required.';
    if (f.phone.trim() && !PH_MOBILE.test(f.phone.replace(/[\s-]/g, ''))) {
      e.phone = 'Use a mobile number like 09171234567.';
    }
    return e;
  });

  protected readonly isValid = computed(() => Object.keys(this.errors()).length === 0);

  /** Nothing changed yet — keep Save inert rather than firing a no-op request. */
  protected readonly isDirty = computed(() => {
    const a = this.form();
    const b = this.formFromUser();
    return (
      a.firstName !== b.firstName || a.lastName !== b.lastName || a.phone !== b.phone || a.address !== b.address
    );
  });

  protected readonly fullName = computed(() => {
    const u = this.user();
    return `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim();
  });

  private formFromUser(): ProfileForm {
    const u = this.user();
    return {
      firstName: u?.firstName ?? '',
      lastName: u?.lastName ?? '',
      phone: u?.phone ?? '',
      address: u?.address ?? '',
    };
  }

  updateField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  markTouched(key: keyof ProfileForm): void {
    this.touched.update((t) => ({ ...t, [key]: true }));
  }

  showError(key: keyof ProfileForm): string {
    return this.touched()[key] ? (this.errors()[key] ?? '') : '';
  }

  startEdit(): void {
    this.form.set(this.formFromUser());
    this.touched.set({});
    this.saveError.set('');
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.form.set(this.formFromUser());
    this.touched.set({});
    this.saveError.set('');
    this.editing.set(false);
  }

  async handleSave(): Promise<void> {
    this.touched.set({ firstName: true, lastName: true, phone: true, address: true });
    if (!this.isValid() || this.saving()) return;

    const f = this.form();
    this.saving.set(true);
    this.saveError.set('');
    try {
      await this.auth.updateProfile({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        phone: f.phone.trim(),
        address: f.address.trim(),
      });
      this.editing.set(false);
      this.toast.showToast({
        id: 'profile-saved',
        icon: 'check',
        title: 'Profile updated',
        description: 'Your details have been saved.',
      });
    } catch (e) {
      this.saveError.set((e as Error).message || "Couldn't save your changes. Please try again.");
    } finally {
      this.saving.set(false);
    }
  }
}
