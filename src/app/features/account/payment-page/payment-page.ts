import { Component } from '@angular/core';

import { PaymentTab } from '../tabs/payment-tab/payment-tab';

@Component({
  selector: 'app-payment-page',
  imports: [PaymentTab],
  templateUrl: './payment-page.html',
  styleUrl: './payment-page.css',
})
export class PaymentPage {}
