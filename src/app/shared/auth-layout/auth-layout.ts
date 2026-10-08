import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideChevronLeft } from '@lucide/angular';
import { LogoMark } from '../logo-mark/logo-mark';

@Component({
  selector: 'app-auth-layout',
  imports: [LogoMark, RouterLink, LucideChevronLeft],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
})
export class AuthLayout {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly backTo = input<string>();
  readonly backLabel = input('Back to login');
}
