import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideMail, LucideMapPin, LucidePencil, LucidePhone, LucideSave, LucideUser, LucideX } from '@lucide/angular';

import { AuthService } from '../../../../core/auth.service';

interface ProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
}

@Component({
  selector: 'app-profile-tab',
  imports: [FormsModule, LucideUser, LucideMail, LucidePhone, LucideMapPin, LucidePencil, LucideX, LucideSave],
  templateUrl: './profile-tab.html',
  styleUrl: './profile-tab.css',
})
export class ProfileTab {
  private auth = inject(AuthService);
  protected readonly user = this.auth.user;

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly form = signal<ProfileForm>(this.formFromUser());

  private formFromUser(): ProfileForm {
    const u = this.user();
    return { firstName: u?.firstName ?? '', lastName: u?.lastName ?? '', phone: u?.phone ?? '', address: u?.address ?? '' };
  }

  updateField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  startEdit(): void {
    this.form.set(this.formFromUser());
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.form.set(this.formFromUser());
    this.editing.set(false);
  }

  async handleSave(): Promise<void> {
    this.saving.set(true);
    await this.auth.updateProfile(this.form());
    this.saving.set(false);
    this.editing.set(false);
  }
}
