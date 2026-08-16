import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideHouse } from '@lucide/angular';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, LucideHouse, LucideArrowLeft],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class NotFound {}
