import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideCheck,
  LucideClock,
  LucideCopy,
  LucideMail,
  LucideMapPin,
  LucideNavigation,
  LucidePhone,
} from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { ErrorState } from '../../shared/error-state/error-state';
import { RevealDirective } from '../../shared/reveal.directive';
import { Skeleton } from '../../shared/skeleton/skeleton';

interface LocationInfo {
  lat: number;
  lng: number;
  address: string;
  mapsUrl: string;
}

const CONTACT = { phone: '(02) 8123-4567', phoneHref: 'tel:+6281234567', email: 'support@homelink.com' };

function getOpenStatus(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;
  return day !== 0 && hour >= 8 && hour < 18;
}

@Component({
  selector: 'app-location',
  imports: [RouterLink, ErrorState, RevealDirective, Skeleton, LucideMapPin, LucideNavigation, LucidePhone, LucideMail, LucideClock, LucideCopy, LucideCheck, LucideArrowRight],
  templateUrl: './location.html',
  styleUrl: './location.css',
})
export class Location {
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  protected readonly contact = CONTACT;
  protected readonly isOpen = getOpenStatus();

  protected readonly loc = signal<LocationInfo | null>(null);
  protected readonly error = signal(false);
  protected readonly copied = signal(false);

  constructor() {
    this.loadLocation();
  }

  loadLocation(): void {
    this.loc.set(null);
    this.error.set(false);
    this.api
      .get<LocationInfo>('/promos/location')
      .then((data) => this.loc.set(data))
      .catch(() => this.error.set(true));
  }

  mapEmbedUrl(): SafeResourceUrl | null {
    const loc = this.loc();
    if (!loc) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?q=${loc.lat},${loc.lng}&z=15&output=embed`
    );
  }

  copyAddress(): void {
    const loc = this.loc();
    if (!loc || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(loc.address)
      .then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 1500);
      })
      .catch(() => {});
  }
}
