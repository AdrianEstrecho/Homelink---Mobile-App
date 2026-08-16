import { Pipe, PipeTransform } from '@angular/core';

import { formatPrice } from './format.util';

@Pipe({ name: 'homelinkPrice' })
export class PricePipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatPrice(value ?? 0);
  }
}
