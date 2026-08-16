import { Component, input, output, signal } from '@angular/core';
import { LucideStar } from '@lucide/angular';

@Component({
  selector: 'app-star-rating',
  imports: [LucideStar],
  templateUrl: './star-rating.html',
  styleUrl: './star-rating.css',
})
export class StarRating {
  readonly value = input(0);
  readonly readOnly = input(false);
  readonly size = input('w-5 h-5');
  readonly valueChange = output<number>();

  protected readonly hover = signal(0);
  protected readonly stars = [1, 2, 3, 4, 5];

  display(): number {
    return this.hover() || this.value();
  }

  select(n: number): void {
    this.valueChange.emit(n);
  }
}
