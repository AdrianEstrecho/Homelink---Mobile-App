import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideHouse, LucideMail, LucideMapPin, LucidePhone } from '@lucide/angular';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, LucideHouse, LucideMail, LucideMapPin, LucidePhone],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  protected readonly year = new Date().getFullYear();
}
