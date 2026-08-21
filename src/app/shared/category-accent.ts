export interface CategoryAccent {
  bg: string;
  text: string;
  ring: string;
  border: string;
}

const CATEGORY_ACCENTS: CategoryAccent[] = [
  { bg: 'bg-brand-orange/10', text: 'text-brand-orange', ring: 'ring-brand-orange/20', border: 'border-brand-orange/50' },
  { bg: 'bg-brand-teal/10', text: 'text-brand-teal', ring: 'ring-brand-teal/20', border: 'border-brand-teal/50' },
  { bg: 'bg-brand-blue/10', text: 'text-brand-blue', ring: 'ring-brand-blue/20', border: 'border-brand-blue/50' },
  { bg: 'bg-brand-navy/10', text: 'text-brand-navy', ring: 'ring-brand-navy/20', border: 'border-brand-navy/50' },
];

export function categoryAccent(index: number): CategoryAccent {
  return CATEGORY_ACCENTS[index % CATEGORY_ACCENTS.length];
}
