/** A row of GET /faqs — managed by staff from the admin CMS. */
export interface Faq {
  id: string;
  question: string;
  answer: string;
  sort_order?: number;
}
