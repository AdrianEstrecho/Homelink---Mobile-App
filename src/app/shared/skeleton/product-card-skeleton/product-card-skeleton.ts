import { Component } from '@angular/core';

import { Skeleton } from '../skeleton';

@Component({
  selector: 'app-product-card-skeleton',
  imports: [Skeleton],
  templateUrl: './product-card-skeleton.html',
  styleUrl: './product-card-skeleton.css',
})
export class ProductCardSkeleton {}
