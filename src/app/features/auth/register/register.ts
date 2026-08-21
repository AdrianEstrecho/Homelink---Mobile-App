import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideUserPlus } from '@lucide/angular';

import { AuthService } from '../../../core/auth.service';
import { isPasswordValid } from '../../../core/password.util';
import { AuthLayout } from '../../../shared/auth-layout/auth-layout';
import { PasswordRequirements } from '../../../shared/password-requirements/password-requirements';
import { TermsModal } from '../../../shared/terms-modal/terms-modal';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, AuthLayout, PasswordRequirements, TermsModal, LucideUserPlus],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected firstName = '';
  protected lastName = '';
  protected email = '';
  protected phone = '';
  protected password = '';
  protected confirmPassword = '';

  protected readonly acceptedTerms = signal(false);
  protected readonly showTerms = signal(false);
  protected readonly passwordTouched = signal(false);
  protected readonly error = signal('');
  protected readonly loading = signal(false);

  get passwordsMatch(): boolean {
    return this.confirmPassword.length === 0 || this.password === this.confirmPassword;
  }

  async onSubmit(): Promise<void> {
    this.error.set('');

    if (!isPasswordValid(this.password)) {
      this.error.set('Password does not meet the requirements below.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }
    if (!this.acceptedTerms()) {
      this.error.set('You must agree to the Terms & Conditions to create an account.');
      return;
    }

    this.loading.set(true);
    try {
      await this.auth.register({
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        phone: this.phone,
        password: this.password,
        acceptedTerms: this.acceptedTerms(),
      });
      this.router.navigateByUrl('/');
    } catch (err) {
      this.error.set((err as Error).message);
      this.loading.set(false);
    }
  }
}
