import { Component } from '@angular/core';

import { AddressesTab } from '../tabs/addresses-tab/addresses-tab';

@Component({
  selector: 'app-address-page',
  imports: [AddressesTab],
  templateUrl: './address-page.html',
  styleUrl: './address-page.css',
})
export class AddressPage {}
