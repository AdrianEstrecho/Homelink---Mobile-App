import { Component } from '@angular/core';

import { ReturnsTab } from '../tabs/returns-tab/returns-tab';

@Component({
  selector: 'app-returns-page',
  imports: [ReturnsTab],
  templateUrl: './returns-page.html',
  styleUrl: './returns-page.css',
})
export class ReturnsPage {}
