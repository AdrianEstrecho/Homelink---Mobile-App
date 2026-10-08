import { Pipe, PipeTransform } from '@angular/core';

import { formatPrice } from './format.util';

// Impure so a currency symbol changed in Platform Settings redraws every price once
// /promos/storefront answers — formatPrice reads it from module state, not from the input.
@Pipe({ name: 'homelinkPrice', pure: false })
export class PricePipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatPrice(value ?? 0);
  }
}
