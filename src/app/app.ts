import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideAlertOctagon } from '@lucide/angular';

import { ErrorStateService } from './core/error-state.service';
import { Footer } from './shared/footer/footer';
import { Navbar } from './shared/navbar/navbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, LucideAlertOctagon],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly errorState = inject(ErrorStateService);

  reload(): void {
    window.location.reload();
  }
}
