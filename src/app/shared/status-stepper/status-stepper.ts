import { Component, computed, input } from '@angular/core';

/**
 * Ported from frontend/src/components/StatusStepper.jsx — shared by the order
 * and booking tracking views.
 */
@Component({
  selector: 'app-status-stepper',
  templateUrl: './status-stepper.html',
  styleUrl: './status-stepper.css',
})
export class StatusStepper {
  readonly steps = input.required<string[]>();
  readonly labels = input.required<Record<string, string>>();
  readonly currentStatus = input.required<string>();

  protected readonly currentIndex = computed(() => this.steps().indexOf(this.currentStatus()));
  protected readonly isDone = computed(() => this.currentStatus() === this.steps()[this.steps().length - 1]);

  protected stepClass(i: number): string {
    const current = this.currentIndex();
    if (i < current || (i === current && this.isDone())) return 'bg-green-100 text-green-700';
    if (i === current) return 'bg-brand-orange/15 text-brand-orange';
    return 'bg-gray-100 text-gray-400';
  }

  protected connectorClass(i: number): string {
    return i < this.currentIndex() ? 'bg-green-300' : 'bg-gray-200';
  }
}
