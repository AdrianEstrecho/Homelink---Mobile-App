import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideHeart } from '@lucide/angular';

import { WishlistService } from '../../core/wishlist.service';
import { ProductCard } from '../../shared/product-card/product-card';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-wishlist',
  imports: [RouterLink, ProductCard, RevealDirective, LucideHeart],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.css',
})
export class Wishlist {
  protected wishlist = inject(WishlistService);
  protected readonly items = this.wishlist.items;
}
