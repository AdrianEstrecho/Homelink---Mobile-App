import { Component } from '@angular/core';

import { NotificationsTab } from '../tabs/notifications-tab/notifications-tab';

@Component({
  selector: 'app-notifications-page',
  imports: [NotificationsTab],
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.css',
})
export class NotificationsPage {}
