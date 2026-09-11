import { Component } from '@angular/core';

import { ReviewsTab } from '../tabs/reviews-tab/reviews-tab';

@Component({
  selector: 'app-reviews-page',
  imports: [ReviewsTab],
  templateUrl: './reviews-page.html',
  styleUrl: './reviews-page.css',
})
export class ReviewsPage {}
