import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideLoaderCircle, LucideLock, LucideLogIn, LucideShieldCheck } from '@lucide/angular';

import { AuthService } from '../../../core/auth.service';
import { AuthIllustration } from '../../../shared/auth-illustration/auth-illustration';
import { AuthLayout } from '../../../shared/auth-layout/auth-layout';

/**
 * Google sign-in is deferred (see mobile port plan, Phase 2) — it needs a
 * native Capacitor plugin and the user's own Android OAuth credentials, so
 * it simply isn't rendered here yet, mirroring Login.jsx's own
 * `googleConfigured` guard permanently evaluating false.
 */
@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, AuthLayout, AuthIllustration, LucideLock, LucideShieldCheck, LucideLogIn, LucideLoaderCircle],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected email = '';
  protected password = '';
  protected readonly error = signal('');
  protected readonly loading = signal(false);

  async onSubmit(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const user = await this.auth.login(this.email, this.password);
      if (user.role !== 'customer') {
        this.auth.logout();
        throw new Error("This account isn't a customer account. Please sign in via the HomeLink web portal.");
      }
      this.router.navigateByUrl('/');
    } catch (err) {
      this.error.set((err as Error).message);
      this.loading.set(false);
    }
  }
}
