import { Component, input, output } from '@angular/core';
import { LucideRotateCw, LucideTriangleAlert } from '@lucide/angular';

@Component({
  selector: 'app-error-state',
  imports: [LucideTriangleAlert, LucideRotateCw],
  templateUrl: './error-state.html',
  styleUrl: './error-state.css',
})
export class ErrorState {
  readonly message = input("Couldn't load this right now.");
  readonly retry = output<void>();
}
