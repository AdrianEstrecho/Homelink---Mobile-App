import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideLoaderCircle, LucideLogIn, LucideShieldCheck } from '@lucide/angular';

import { AuthService } from '../../../core/auth.service';

/**
 * Ported from frontend/src/pages/admin/AdminLogin.jsx, trimmed to the
 * admin-only scope decided for the mobile app (see AdminUsers/AdminShell) —
 * employee-position accounts are out of scope here, so any non-admin
 * credential is rejected outright rather than routed to an employee landing
 * page. No 2FA *stage* is built (unlike login.ts) since staff 2FA is rarer
 * to hit in practice, but /auth/login can still return `requires2FA` for an
 * admin who has it turned on — handled below by pointing them at the web
 * admin panel instead of leaving the response half-unread.
 */
@Component({
  selector: 'app-admin-login',
  imports: [FormsModule, RouterLink, LucideLogIn, LucideLoaderCircle, LucideShieldCheck],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.css',
})
export class AdminLogin {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected email = '';
  protected password = '';
  protected readonly error = signal('');
  protected readonly loading = signal(false);

  constructor() {
    this.auth.authReady.then(() => {
      if (this.auth.user()?.role === 'admin') this.router.navigateByUrl('/admin');
    });
  }

  async onSubmit(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.auth.login(this.email, this.password);
      if (result.requires2FA) {
        throw new Error('This account has two-factor authentication enabled — sign in from the web admin panel for now.');
      }
      if (result.user.role !== 'admin') {
        await this.auth.logout();
        throw new Error('This portal is for staff use only.');
      }
      this.router.navigateByUrl('/admin');
    } catch (err) {
      this.error.set((err as Error).message);
      this.loading.set(false);
    }
  }
}
