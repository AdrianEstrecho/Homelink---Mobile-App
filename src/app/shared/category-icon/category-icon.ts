import { Component, input } from '@angular/core';
import {
  LucideAirVent,
  LucideCamera,
  LucideDroplets,
  LucideHammer,
  LucideLightbulb,
  LucidePackage,
  LucideRefrigerator,
  LucideSmartphone,
  LucideSun,
  LucideZap,
} from '@lucide/angular';

/** Ported from frontend/src/constants/categoryIcons.js. */
@Component({
  selector: 'app-category-icon',
  imports: [
    LucideAirVent,
    LucideSun,
    LucideCamera,
    LucideZap,
    LucideDroplets,
    LucideSmartphone,
    LucideRefrigerator,
    LucideLightbulb,
    LucideHammer,
    LucidePackage,
  ],
  templateUrl: './category-icon.html',
  styleUrl: './category-icon.css',
})
export class CategoryIcon {
  readonly slug = input<string>();
  readonly iconClass = input('', { alias: 'class' });
}
