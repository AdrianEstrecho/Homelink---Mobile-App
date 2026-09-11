import { Component } from '@angular/core';

import { ProfileTab } from '../tabs/profile-tab/profile-tab';

@Component({
  selector: 'app-profile-page',
  imports: [ProfileTab],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage {}
