import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideLayoutGrid, LucideSearch } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { Category, Product } from '../../core/product.model';
import { RevealDirective } from '../../shared/reveal.directive';
import { CategoryIcon } from '../../shared/category-icon/category-icon';
import { ErrorState } from '../../shared/error-state/error-state';
import { ProductCard } from '../../shared/product-card/product-card';
import { CategorySkeleton } from '../../shared/skeleton/category-skeleton/category-skeleton';
import { ProductCardSkeleton } from '../../shared/skeleton/product-card-skeleton/product-card-skeleton';
import { Select, SelectOption } from '../../shared/select/select';

const SORT_OPTIONS: SelectOption[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name: A to Z' },
];

interface LoadState<T> {
  data: T[];
  loading: boolean;
  error: boolean;
}

@Component({
  selector: 'app-products',
  imports: [FormsModule, RevealDirective, CategoryIcon, ErrorState, ProductCard, CategorySkeleton, ProductCardSkeleton, Select, LucideSearch, LucideLayoutGrid],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected readonly sortOptions = SORT_OPTIONS;

  private queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly category = () => this.queryParamMap().get('category') ?? '';
  protected readonly sort = () => this.queryParamMap().get('sort') ?? 'featured';

  protected search = signal(this.queryParamMap().get('search') ?? '');
  protected readonly debouncedSearch = signal(this.search());

  protected readonly categories = signal<LoadState<Category>>({ data: [], loading: true, error: false });
  protected readonly products = signal<LoadState<Product>>({ data: [], loading: true, error: false });

  constructor() {
    this.api
      .get<Category[]>('/products/categories')
      .then((data) => this.categories.set({ data, loading: false, error: false }))
      .catch(() => this.categories.set({ data: [], loading: false, error: true }));

    effect((onCleanup) => {
      const value = this.search();
      const t = setTimeout(() => this.debouncedSearch.set(value), 300);
      onCleanup(() => clearTimeout(t));
    });

    effect(() => {
      const params = new URLSearchParams();
      if (this.category()) params.set('category', this.category());
      if (this.debouncedSearch()) params.set('search', this.debouncedSearch());
      if (this.sort() !== 'featured') params.set('sort', this.sort());
      this.loadProducts(params);
    });
  }

  private loadProducts(params: URLSearchParams): void {
    this.products.update((s) => ({ ...s, loading: true, error: false }));
    this.api
      .get<Product[]>(`/products?${params}`)
      .then((data) => this.products.set({ data, loading: false, error: false }))
      .catch(() => this.products.set({ data: [], loading: false, error: true }));
  }

  retryProducts(): void {
    const params = new URLSearchParams();
    if (this.category()) params.set('category', this.category());
    if (this.debouncedSearch()) params.set('search', this.debouncedSearch());
    if (this.sort() !== 'featured') params.set('sort', this.sort());
    this.loadProducts(params);
  }

  private mergeQueryParams(patch: Record<string, string | null>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: patch,
      queryParamsHandling: 'merge',
    });
  }

  setCategory(slug: string | null): void {
    this.mergeQueryParams({ category: slug });
  }

  setSort(value: string): void {
    this.mergeQueryParams({ sort: value === 'featured' ? null : value });
  }

  onSearchSubmit(event: Event): void {
    event.preventDefault();
    this.mergeQueryParams({ search: this.search() || null });
    this.debouncedSearch.set(this.search());
  }

  onSearchInput(value: string): void {
    this.search.set(value);
  }
}
