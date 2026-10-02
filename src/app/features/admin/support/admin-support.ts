import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideLifeBuoy, LucideSend } from '@lucide/angular';

import { AdminChangeRequest, AdminSupportMessage } from '../../../core/admin.model';
import { ApiService } from '../../../core/api.service';
import { formatDateTime, timeAgo } from '../../../core/audit-actions';
import { formatTicketNo } from '../../../core/ticket-number.util';

const TYPE_STYLE: Record<string, string> = { support: 'bg-blue-100 text-blue-800', complaint: 'bg-red-100 text-red-800' };
const STATUS_STYLE: Record<string, string> = { open: 'bg-amber-100 text-amber-800', resolved: 'bg-green-100 text-green-800' };
const PENDING_STYLE = 'bg-purple-100 text-purple-800';

/**
 * Mobile analog of frontend/src/pages/admin/SupportMessages.jsx. Marking a
 * ticket resolved only *proposes* it (a change_requests row, even for an
 * admin) until it's approved on the Approvals page — that page is web-only
 * for now, so a requested resolution shows "Pending HR Approval" here until
 * someone signs it off there.
 */
@Component({
  selector: 'app-admin-support',
  imports: [FormsModule, LucideLifeBuoy, LucideSend],
  templateUrl: './admin-support.html',
  styleUrl: './admin-support.css',
})
export class AdminSupport {
  private api = inject(ApiService);

  protected readonly formatTicketNo = formatTicketNo;
  protected readonly formatDateTime = formatDateTime;
  protected readonly timeAgo = timeAgo;
  protected readonly typeStyle = TYPE_STYLE;

  protected readonly messages = signal<AdminSupportMessage[]>([]);
  protected readonly requests = signal<AdminChangeRequest[]>([]);
  protected readonly loaded = signal(false);
  protected readonly tab = signal<'open' | 'resolved'>('open');
  protected readonly drafts = signal<Record<string, string>>({});
  protected readonly sendingId = signal<string | null>(null);
  protected readonly error = signal('');

  protected readonly openCount = computed(() => this.messages().filter((m) => m.status === 'open').length);
  protected readonly resolvedCount = computed(() => this.messages().filter((m) => m.status === 'resolved').length);
  protected readonly filtered = computed(() => this.messages().filter((m) => m.status === this.tab()));

  // Whether a ticket's resolution is awaiting sign-off isn't a column on the ticket itself —
  // it's derived from a pending change_requests row this user raised.
  private readonly pendingIds = computed(
    () => new Set(this.requests().filter((r) => r.status === 'pending').map((r) => r.entity_id)),
  );

  constructor() {
    this.load();
    this.loadRequests();
  }

  private load(): void {
    this.api
      .get<AdminSupportMessage[]>('/admin/support-messages')
      .then((m) => {
        this.messages.set(m);
        this.loaded.set(true);
      })
      .catch(() => {});
  }

  private loadRequests(): void {
    this.api
      .get<AdminChangeRequest[]>('/admin/approvals/mine')
      .then((rows) => this.requests.set(rows.filter((r) => r.entity_type === 'support')))
      .catch(() => {});
  }

  isPending(id: string): boolean {
    return this.pendingIds().has(id);
  }

  statusBadge(m: AdminSupportMessage): { label: string; style: string } {
    if (this.isPending(m.id)) return { label: 'Pending HR Approval', style: PENDING_STYLE };
    return { label: m.status === 'open' ? 'Open' : 'Resolved', style: STATUS_STYLE[m.status] };
  }

  draftOf(id: string): string {
    return this.drafts()[id] || '';
  }

  setDraft(id: string, value: string): void {
    this.drafts.update((d) => ({ ...d, [id]: value }));
  }

  async sendReply(id: string): Promise<void> {
    const body = this.draftOf(id).trim();
    if (!body || this.sendingId()) return;
    this.sendingId.set(id);
    this.error.set('');
    try {
      await this.api.post(`/admin/support-messages/${id}/reply`, { body });
      this.setDraft(id, '');
      this.load();
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.sendingId.set(null);
    }
  }

  async requestResolve(id: string): Promise<void> {
    this.error.set('');
    try {
      await this.api.put(`/admin/support-messages/${id}/resolve`);
      this.loadRequests();
    } catch (err) {
      this.error.set((err as Error).message);
    }
  }

  async reopen(id: string): Promise<void> {
    this.error.set('');
    try {
      await this.api.put(`/admin/support-messages/${id}/reopen`);
      this.load();
      this.loadRequests();
    } catch (err) {
      this.error.set((err as Error).message);
    }
  }
}
