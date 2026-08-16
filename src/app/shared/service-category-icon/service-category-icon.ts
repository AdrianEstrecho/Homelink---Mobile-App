import { Component, input } from '@angular/core';
import { LucideAirVent, LucideCamera, LucideDroplets, LucideSun, LucideWrench, LucideZap } from '@lucide/angular';

/** Ported from frontend/src/constants/serviceCategoryIcons.js. */
@Component({
  selector: 'app-service-category-icon',
  imports: [LucideAirVent, LucideSun, LucideCamera, LucideZap, LucideDroplets, LucideWrench],
  templateUrl: './service-category-icon.html',
  styleUrl: './service-category-icon.css',
})
export class ServiceCategoryIcon {
  readonly category = input<string>();
  readonly iconClass = input('', { alias: 'class' });
}
