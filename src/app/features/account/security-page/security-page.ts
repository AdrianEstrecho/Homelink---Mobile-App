import { Component } from '@angular/core';

import { SecurityTab } from '../tabs/security-tab/security-tab';

@Component({
  selector: 'app-security-page',
  imports: [SecurityTab],
  templateUrl: './security-page.html',
  styleUrl: './security-page.css',
})
export class SecurityPage {}
