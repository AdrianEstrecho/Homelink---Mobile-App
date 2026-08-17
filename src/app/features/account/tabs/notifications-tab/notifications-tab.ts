import { Component, inject, signal } from '@angular/core';
import { LucideCalendar, LucideCheck, LucideMegaphone, LucidePackage } from '@lucide/angular';

import { ApiService } from '../../../../core/api.service';
import { AuthService } from '../../../../core/auth.service';

interface NotificationPrefs {
  notifyOrders: boolean;
  notifyBookings: boolean;
  notifyPromotions: boolean;
}

const OPTIONS: { key: keyof NotificationPrefs; icon: 'package' | 'calendar' | 'megaphone'; title: string; desc: string }[] = [
  { key: 'notifyOrders', icon: 'package', title: 'Order updates', desc: 'Confirmation, shipping, and delivery status for your orders.' },
  { key: 'notifyBookings', icon: 'calendar', title: 'Booking reminders', desc: 'Confirmations and reminders for your service appointments.' },
  { key: 'notifyPromotions', icon: 'megaphone', title: 'Promotions & offers', desc: 'Seasonal discounts, vouchers, and new product announcements.' },
];

@Component({
  selector: 'app-notifications-tab',
  imports: [LucidePackage, LucideCalendar, LucideMegaphone, LucideCheck],
  templateUrl: './notifications-tab.html',
  styleUrl: './notifications-tab.css',
})
export class NotificationsTab {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  protected readonly options = OPTIONS;

  protected readonly prefs = signal<NotificationPrefs>({
    notifyOrders: this.auth.user()?.notifyOrders ?? true,
    notifyBookings: this.auth.user()?.notifyBookings ?? true,
    notifyPromotions: this.auth.user()?.notifyPromotions ?? true,
  });
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);

  toggle(key: keyof NotificationPrefs): void {
    this.prefs.update((p) => ({ ...p, [key]: !p[key] }));
  }

  async handleSave(): Promise<void> {
    this.saving.set(true);
    await this.api.put('/auth/notifications', this.prefs());
    await this.auth.refreshUser();
    this.saving.set(false);
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }
}
