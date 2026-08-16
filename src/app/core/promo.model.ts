export interface PromoDiscount {
  type: 'percent' | 'fixed';
  value: number;
  label: string;
}

export interface ActivePromos {
  holiday: PromoDiscount | null;
  vouchers: { code: string; discount_type: 'percent' | 'fixed'; discount_value: number; min_order: number }[];
}

export interface AppliedVoucher {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
}

export function calcDiscount(amount: number, promo: PromoDiscount | AppliedVoucher | null): number {
  if (!promo) return 0;
  return promo.type === 'percent' ? Math.round(((amount * promo.value) / 100) * 100) / 100 : Math.min(promo.value, amount);
}
