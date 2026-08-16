import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';

/**
 * Placeholder for now — the full account shell + 7 tabs (Profile, Addresses,
 * Security, Notifications, Payment, Reviews, Support) lands in Phase 6 of
 * the mobile port. This exists early so the Navbar's logged-in state has a
 * real destination to link to.
 */
@Component({
  selector: 'app-account',
  imports: [],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected readonly user = this.auth.user;

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
