import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { LucideCamera, LucideLoaderCircle, LucideTrash2, LucideUpload } from '@lucide/angular';

import { AuthService } from '../../core/auth.service';
import { ACCEPTED_IMAGE_TYPES, squareAvatar, validateImageFile } from '../../core/image-upload.util';
import { ToastService } from '../../core/toast.service';

/**
 * Ported from frontend/src/components/account/EditableAvatar.jsx — the signed-in user's avatar
 * with a camera button on its bottom edge. With no photo yet the button opens the file picker
 * straight away; once there is one it offers a new photo or removing it. On a phone that choice
 * is a bottom action sheet rather than the web's side popover. `avatarClass` sets the avatar's
 * size, shape and fallback colours; the projected content (the initials) shows when there's no
 * photo.
 */
@Component({
  selector: 'app-editable-avatar',
  imports: [LucideCamera, LucideLoaderCircle, LucideUpload, LucideTrash2],
  templateUrl: './editable-avatar.html',
})
export class EditableAvatar {
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  readonly avatarClass = input('');
  /** Extra classes for the camera button, e.g. a ring matching the surface behind it. */
  readonly buttonClass = input('ring-white');

  protected readonly avatar = computed(() => this.auth.user()?.avatar ?? null);
  protected readonly menuOpen = signal(false);
  protected readonly busy = signal(false);
  protected readonly accept = ACCEPTED_IMAGE_TYPES.join(',');

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  private fail(description: string): void {
    this.toast.showToast({ icon: 'x-circle', iconClass: 'bg-red-100 text-red-600', title: 'Photo not updated', description });
  }

  private async save(getAvatar: () => Promise<string | null>, title: string): Promise<void> {
    this.menuOpen.set(false);
    this.busy.set(true);
    try {
      await this.auth.updateAvatar(await getAvatar());
      this.toast.showToast({ icon: 'check', iconClass: 'bg-teal-100 text-teal-700', title });
    } catch (err) {
      this.fail((err as Error).message || 'Check your connection and try again.');
    } finally {
      this.busy.set(false);
    }
  }

  onButton(): void {
    if (this.avatar()) this.menuOpen.set(true);
    else this.pickFile();
  }

  pickFile(): void {
    this.menuOpen.set(false);
    this.fileInput().nativeElement.click();
  }

  removePhoto(): void {
    this.save(async () => null, 'Profile photo removed');
  }

  onFile(event: Event): void {
    const el = event.target as HTMLInputElement;
    const file = el.files?.[0];
    el.value = ''; // lets the same file be picked again after a failure
    if (!file) return;
    // The photo is cropped and shrunk before upload, so a full-size phone shot is fine here.
    const problem = validateImageFile(file, 15);
    if (problem) {
      this.fail(problem);
      return;
    }
    this.save(() => squareAvatar(file), 'Profile photo updated');
  }
}
