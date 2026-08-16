import { Component, input } from '@angular/core';
import { LucideCheck, LucideX } from '@lucide/angular';

import { passwordRules } from '../../core/password.util';

@Component({
  selector: 'app-password-requirements',
  imports: [LucideCheck, LucideX],
  templateUrl: './password-requirements.html',
  styleUrl: './password-requirements.css',
})
export class PasswordRequirements {
  readonly password = input('');
  protected readonly rules = passwordRules;

  isMet(test: (pw: string) => boolean): boolean {
    return test(this.password() || '');
  }
}
