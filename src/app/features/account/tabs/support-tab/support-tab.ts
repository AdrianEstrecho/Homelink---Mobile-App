import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideLifeBuoy, LucideSend } from '@lucide/angular';

import { ApiService } from '../../../../core/api.service';
import { SupportMessage } from '../../../../core/account.model';
import { formatTicketNo } from '../../../../core/ticket-number.util';
import { Select, SelectOption } from '../../../../shared/select/select';

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'support', label: 'Support Inquiry' },
  { value: 'complaint', label: 'Complaint' },
];

const STATUS_STYLE: Record<string, string> = { open: 'bg-amber-100 text-amber-800', resolved: 'bg-green-100 text-green-800' };

@Component({
  selector: 'app-support-tab',
  imports: [FormsModule, Select, DatePipe, LucideLifeBuoy, LucideSend],
  templateUrl: './support-tab.html',
  styleUrl: './support-tab.css',
})
export class SupportTab {
  private api = inject(ApiService);

  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly statusStyle = STATUS_STYLE;
  protected readonly formatTicketNo = formatTicketNo;

  protected readonly messages = signal<SupportMessage[] | null>(null);
  protected readonly type = signal('support');
  protected readonly subject = signal('');
  protected readonly message = signal('');
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  constructor() {
    this.load();
  }

  private load(): void {
    this.api
      .get<SupportMessage[]>('/support/my')
      .then((data) => this.messages.set(data))
      .catch(() => this.messages.set([]));
  }

  async submit(): Promise<void> {
    if (!this.subject().trim() || !this.message().trim()) {
      this.error.set('Please fill in both the subject and message.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      await this.api.post('/support', { type: this.type(), subject: this.subject(), message: this.message() });
      this.subject.set('');
      this.message.set('');
      this.type.set('support');
      this.load();
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.saving.set(false);
    }
  }
}
