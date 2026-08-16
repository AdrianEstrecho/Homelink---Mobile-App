import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideUser } from '@lucide/angular';

/**
 * Simplified port of frontend/src/components/Hero.jsx — the scroll-pinned
 * parallax house/clouds treatment is dropped (see mobile port plan: it's
 * tied to multi-megabyte assets not worth shipping in a first APK). Copy,
 * CTAs, and the fade-up entrance animation are kept.
 */
@Component({
  selector: 'app-hero',
  imports: [RouterLink, LucideArrowRight, LucideUser],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
})
export class Hero {}
