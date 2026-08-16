import { Component } from '@angular/core';

/**
 * Decorative mock-UI card graphic for auth pages. Ported from
 * frontend/src/components/AuthIllustration.jsx — React passes the icon/badge
 * as component props; here callers project them directly via content slots
 * (see auth-illustration.html's [icon]/[badge] selectors), which is the more
 * idiomatic Angular equivalent of "pass a component as a prop".
 */
@Component({
  selector: 'app-auth-illustration',
  imports: [],
  templateUrl: './auth-illustration.html',
  styleUrl: './auth-illustration.css',
})
export class AuthIllustration {}
