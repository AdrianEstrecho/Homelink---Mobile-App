import { Component, computed, input, output } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';

/** Ported from frontend/src/components/Pagination.jsx. Renders nothing for a single page. */
@Component({
  selector: 'app-pagination',
  imports: [LucideChevronLeft, LucideChevronRight],
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly total = input.required<number>();
  readonly pageSize = input.required<number>();

  readonly pageChange = output<number>();

  protected readonly start = computed(() => (this.page() - 1) * this.pageSize() + 1);
  protected readonly end = computed(() => Math.min(this.page() * this.pageSize(), this.total()));
}
