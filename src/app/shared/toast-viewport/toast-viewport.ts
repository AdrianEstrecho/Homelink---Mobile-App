import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCheck, LucideX } from '@lucide/angular';

import { ToastService } from '../../core/toast.service';
import { SafeImage } from '../safe-image/safe-image';

@Component({
  selector: 'app-toast-viewport',
  imports: [RouterLink, SafeImage, LucideCheck, LucideX],
  templateUrl: './toast-viewport.html',
  styleUrl: './toast-viewport.css',
})
export class ToastViewport {
  protected toastService = inject(ToastService);
  protected readonly toasts = this.toastService.toasts;

  dismiss(id: string): void {
    this.toastService.dismissToast(id);
  }
}
