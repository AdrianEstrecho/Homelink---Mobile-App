import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideAward,
  LucideBadgeCheck,
  LucideChevronRight,
  LucideLayoutGrid,
  LucideSearch,
  LucideShieldCheck,
  LucideSlidersHorizontal,
  LucideTag,
  LucideX,
} from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { Service } from '../../core/product.model';
import { RevealDirective } from '../../shared/reveal.directive';
import { categoryAccent } from '../../shared/category-accent';
import { ErrorState } from '../../shared/error-state/error-state';
import { ServiceCard } from '../../shared/service-card/service-card';
import { ServiceCategoryIcon } from '../../shared/service-category-icon/service-category-icon';
import { CategorySkeleton } from '../../shared/skeleton/category-skeleton/category-skeleton';
import { ServiceCardSkeleton } from '../../shared/skeleton/service-card-skeleton/service-card-skeleton';

const TRUST_POINTS = [
  { icon: 'shield', label: 'Verified Technicians' },
  { icon: 'tag', label: 'Upfront Pricing' },
  { icon: 'award', label: 'Satisfaction Guaranteed' },
] as const;

type QuickFilterKey = 'quick' | 'halfDay' | 'fullDay';

const QUICK_FILTERS: { key: QuickFilterKey; label: string }[] = [
  { key: 'quick', label: 'Quick (≤ 2h)' },
  { key: 'halfDay', label: 'Half-Day (2-4h)' },
  { key: 'fullDay', label: 'Full-Day (4h+)' },
];

interface LoadState<T> {
  data: T[];
  loading: boolean;
  error: boolean;
}

@Component({
  selector: 'app-services',
  imports: [
    FormsModule,
    RevealDirective,
    ErrorState,
    ServiceCard,
    ServiceCategoryIcon,
    CategorySkeleton,
    ServiceCardSkeleton,
    LucideSearch,
    LucideLayoutGrid,
    LucideShieldCheck,
    LucideTag,
    LucideAward,
    LucideX,
    LucideSlidersHorizontal,
    LucideBadgeCheck,
    LucideChevronRight,
  ],
  templateUrl: './services.html',
  styleUrl: './services.css',
})
export class Services {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected readonly trustPoints = TRUST_POINTS;
  protected readonly quickFilters = QUICK_FILTERS;

  private queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly category = () => this.queryParamMap().get('category') ?? '';

  protected search = signal('');
  protected readonly debouncedSearch = signal('');
  protected readonly searchFocused = signal(false);

  protected readonly activeFilters = signal<Set<QuickFilterKey>>(new Set());
  protected readonly showFilters = signal(false);

  protected readonly categories = signal<LoadState<string>>({ data: [], loading: true, error: false });
  protected readonly services = signal<LoadState<Service>>({ data: [], loading: true, error: false });

  protected readonly filteredServices = computed(() => {
    const filters = this.activeFilters();
    let list = this.services().data;
    if (filters.has('quick')) list = list.filter((s) => s.duration_hours <= 2);
    if (filters.has('halfDay')) list = list.filter((s) => s.duration_hours > 2 && s.duration_hours <= 4);
    if (filters.has('fullDay')) list = list.filter((s) => s.duration_hours > 4);
    return list;
  });

  protected readonly matchedCategory = computed(() => {
    const query = this.debouncedSearch().trim().toLowerCase();
    if (!query) return null;
    const category = this.categories().data.find((c) => c.toLowerCase().startsWith(query));
    if (!category) return null;
    return { name: category, count: this.services().data.filter((s) => s.category === category).length };
  });

  protected readonly categoryAccent = categoryAccent;

  constructor() {
    this.api
      .get<string[]>('/services/categories')
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
      this.loadServices(params);
    });
  }

  private loadServices(params: URLSearchParams): void {
    this.services.update((s) => ({ ...s, loading: true, error: false }));
    this.api
      .get<Service[]>(`/services?${params}`)
      .then((data) => this.services.set({ data, loading: false, error: false }))
      .catch(() => this.services.set({ data: [], loading: false, error: true }));
  }

  retryServices(): void {
    const params = new URLSearchParams();
    if (this.category()) params.set('category', this.category());
    if (this.debouncedSearch()) params.set('search', this.debouncedSearch());
    this.loadServices(params);
  }

  setCategory(value: string | null): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: value },
      queryParamsHandling: 'merge',
    });
  }

  onSearchFocus(): void {
    this.searchFocused.set(true);
  }

  onSearchBlur(): void {
    this.searchFocused.set(false);
  }

  clearSearch(): void {
    this.search.set('');
    this.debouncedSearch.set('');
  }

  cancelSearch(): void {
    this.clearSearch();
    this.searchFocused.set(false);
  }

  toggleFilter(key: QuickFilterKey): void {
    this.activeFilters.update((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  toggleFilterPanel(): void {
    this.showFilters.update((v) => !v);
  }
}
