import { Component, input, output } from '@angular/core';
import { LucideCheck, LucideLayoutGrid, LucideSlidersHorizontal, LucideX } from '@lucide/angular';

import { CategoryIcon } from '../category-icon/category-icon';
import { ServiceCategoryIcon } from '../service-category-icon/service-category-icon';

export interface FilterOption {
  key: string;
  label: string;
  count: number;
}

/**
 * Side sheet holding the category filter for My Orders and My Bookings. Status stays on the page
 * as tabs; this is the narrower "what kind of thing" cut. Purely presentational: the page owns
 * the filter state and gets every pick back through the outputs.
 */
@Component({
  selector: 'app-filter-drawer',
  imports: [CategoryIcon, ServiceCategoryIcon, LucideX, LucideCheck, LucideLayoutGrid, LucideSlidersHorizontal],
  templateUrl: './filter-drawer.html',
  styleUrl: './filter-drawer.css',
  host: {
    '(document:keydown.escape)': 'closed.emit()',
  },
})
export class FilterDrawer {
  readonly title = input('Filter by category');
  readonly categories = input<FilterOption[]>([]);
  /** '' means every category. */
  readonly activeCategory = input('');
  /** Which icon set the category rows use — the product and service catalogs name theirs differently. */
  readonly categoryKind = input<'product' | 'service'>('product');
  readonly resultCount = input(0);

  readonly categoryChange = output<string>();
  readonly closed = output<void>();
}
