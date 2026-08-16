import { Component } from '@angular/core';
import { LucideHeadphones, LucideLock, LucideRefreshCw, LucideShield, LucideCircleX } from '@lucide/angular';

interface Policy {
  icon: 'refresh' | 'headphones' | 'lock' | 'x-circle';
  title: string;
  content: string;
}

const POLICIES: Policy[] = [
  { icon: 'refresh', title: 'Refund Policy', content: 'Customers are eligible for a refund if purchased products or services are not received or fulfilled. Refund requests must be submitted within 7 days of the expected delivery or service date. Refunds are processed within 5-10 business days to the original payment method.' },
  { icon: 'headphones', title: 'Service Support', content: 'Customers may report service-related issues to our support team for resolution. Contact us at support@homelink.com or call (02) 8123-4567. Our team responds within 24 hours on business days.' },
  { icon: 'lock', title: 'Data Privacy', content: 'All customer information, including personal contact details and payment data, is handled with strict confidentiality and protected by our security protocols. We comply with the Data Privacy Act and never share your data with third parties without consent.' },
  { icon: 'x-circle', title: 'Cancellation Policy', content: 'Customers may request to cancel orders for products or services, provided the request is submitted within the designated timeframe and meets our cancellation criteria. Product orders can be cancelled before shipping. Service bookings can be cancelled up to 24 hours before the scheduled appointment.' },
];

@Component({
  selector: 'app-policies',
  imports: [LucideShield, LucideRefreshCw, LucideHeadphones, LucideLock, LucideCircleX],
  templateUrl: './policies.html',
  styleUrl: './policies.css',
})
export class Policies {
  protected readonly policies = POLICIES;
}
