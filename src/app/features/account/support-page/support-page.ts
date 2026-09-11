import { Component } from '@angular/core';

import { SupportTab } from '../tabs/support-tab/support-tab';

@Component({
  selector: 'app-support-page',
  imports: [SupportTab],
  templateUrl: './support-page.html',
  styleUrl: './support-page.css',
})
export class SupportPage {}
