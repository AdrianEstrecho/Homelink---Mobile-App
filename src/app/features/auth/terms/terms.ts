import { Component } from '@angular/core';
import { LucideFileText } from '@lucide/angular';

import { termsSections } from '../../../core/terms-content';

@Component({
  selector: 'app-terms',
  imports: [LucideFileText],
  templateUrl: './terms.html',
  styleUrl: './terms.css',
})
export class Terms {
  protected readonly sections = termsSections;
}
