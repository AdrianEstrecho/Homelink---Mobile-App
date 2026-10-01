/**
 * Ported from frontend/src/utils/catalogSpecs.js. `specifications` arrives as a plain object of
 * label -> value. The admin editor writes human labels ("Cooling Capacity"), but older rows use
 * camelCase keys ("energyRating"), so both shapes have to render the same way.
 */
export interface SpecEntry {
  key: string;
  label: string;
  value: string;
}

export function specLabel(key: unknown): string {
  const raw = String(key ?? '').trim();
  if (!raw) return '';
  if (/[\s_-]/.test(raw)) return raw.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  return raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

/** Object key order is insertion order for string keys, so the order the admin arranged rows in
 *  is exactly the order the spec table renders. */
export function specEntries(specifications: unknown): SpecEntry[] {
  if (!specifications || typeof specifications !== 'object' || Array.isArray(specifications)) return [];
  return Object.entries(specifications as Record<string, unknown>)
    .filter(([key, value]) => String(key).trim() && value !== '' && value != null)
    .map(([key, value]) => ({ key, label: specLabel(key), value: String(value) }));
}

export function toHighlights(highlights: unknown): string[] {
  if (!Array.isArray(highlights)) return [];
  return highlights.map((h) => String(h ?? '').trim()).filter(Boolean);
}

/** Free-text descriptions are written as prose; honour the paragraph breaks staff typed instead
 *  of collapsing the whole thing into one block. */
export function paragraphs(text: string | null | undefined): string[] {
  return String(text || '')
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
