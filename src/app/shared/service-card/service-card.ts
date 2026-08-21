import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideClock, LucideWrench } from '@lucide/angular';

import { PricePipe } from '../../core/price.pipe';
import { Service } from '../../core/product.model';
import { SafeImage } from '../safe-image/safe-image';

@Component({
  selector: 'app-service-card',
  imports: [RouterLink, SafeImage, DecimalPipe, PricePipe, LucideWrench, LucideClock],
  templateUrl: './service-card.html',
  styleUrl: './service-card.css',
})
export class ServiceCard {
  readonly service = input.required<Service>();
}
