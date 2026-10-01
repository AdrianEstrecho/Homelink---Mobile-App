import { Component, DestroyRef, ElementRef, inject, input, output, signal } from '@angular/core';

/** How long to sit on a keystroke before asking — one request per typed word, but a pause still
 *  feels answered immediately. The street field raises it, since its answer crosses the network. */
const DEBOUNCE_MS = 180;

/** Province, city and barangay come from an in-memory index in a few milliseconds, so a loading
 *  state on every keystroke would only flicker. Nothing is shown until a lookup has been
 *  outstanding this long — in practice only the street geocoder ever reaches it. */
const SPINNER_DELAY_MS = 400;

let nextId = 0;

/**
 * Ported from frontend/src/components/AutocompleteInput.jsx: a text input that offers
 * suggestions without ever insisting on one. Every Philippine address has entries no register
 * spells the same way — subdivisions, phases, sitios, purok numbers — so this stays an ordinary
 * input: whatever is typed is kept as typed unless a suggestion is deliberately chosen.
 *
 * Searching only runs from the user's own typing or focus, never from `value` changing under it —
 * so a barangay pick that rewrites the city and province fields doesn't send those two looking.
 */
@Component({
  selector: 'app-autocomplete-input',
  templateUrl: './autocomplete-input.html',
  styleUrl: './autocomplete-input.css',
  host: {
    '(document:mousedown)': 'onDocumentPointer($event)',
    '(document:touchstart)': 'onDocumentPointer($event)',
  },
})
export class AutocompleteInput<T = Record<string, unknown>> {
  private host = inject(ElementRef<HTMLElement>);

  readonly value = input('');
  readonly fetchSuggestions = input.required<(query: string) => Promise<T[]>>();
  readonly getLabel = input<(item: T) => string>((item) => String((item as { name?: string }).name ?? ''));
  readonly getDescription = input<(item: T) => string>(() => '');
  readonly minChars = input(1);
  readonly debounceMs = input(DEBOUNCE_MS);
  readonly placeholder = input('');
  readonly inputId = input<string>();
  readonly inputMode = input<string>('text');
  readonly emptyMessage = input('No matches. You can type it in yourself.');
  /** Shown when the lookup itself failed rather than came back empty. */
  readonly errorMessage = input<string>();

  readonly valueChange = output<string>();
  /** Fires only on a real pick, never on plain typing. */
  readonly selected = output<T>();

  protected readonly listId = `ac-list-${++nextId}`;
  protected readonly items = signal<T[]>([]);
  protected readonly open = signal(false);
  protected readonly spinner = signal(false);
  /** A query finished — the empty message may only depend on this, or it would flash
   *  "no matches" during the first keystrokes of every successful search. */
  protected readonly searched = signal(false);
  protected readonly failed = signal(false);
  protected readonly active = signal(-1);

  private debounceTimer?: ReturnType<typeof setTimeout>;
  private spinnerTimer?: ReturnType<typeof setTimeout>;
  /** Bumped per lookup, so the reply of a request a later keystroke made obsolete is dropped. */
  private generation = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelPending());
  }

  protected longEnough(): boolean {
    return (this.value() || '').trim().length >= this.minChars();
  }

  protected showEmpty(): boolean {
    return this.open() && this.longEnough() && this.searched() && !this.items().length && !this.spinner();
  }

  protected showList(): boolean {
    return this.open() && (this.items().length > 0 || this.showEmpty() || this.spinner());
  }

  onInput(text: string): void {
    this.valueChange.emit(text);
    this.open.set(true);
    this.search(text);
  }

  onFocus(): void {
    this.open.set(true);
    this.search(this.value());
  }

  onKeyDown(event: KeyboardEvent): void {
    const items = this.items();
    if (!this.open() || !items.length) {
      if (event.key === 'ArrowDown' && items.length) this.open.set(true);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.active.update((i) => (i + 1) % items.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.active.update((i) => (i <= 0 ? items.length : i) - 1);
    } else if (event.key === 'Enter') {
      // Only intercept Enter on a highlighted suggestion, so it still submits the form otherwise.
      if (this.active() >= 0) {
        event.preventDefault();
        this.choose(items[this.active()]);
      }
    } else if (event.key === 'Escape') {
      this.open.set(false);
      this.active.set(-1);
    }
  }

  onDocumentPointer(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  choose(item: T): void {
    this.cancelPending();
    this.valueChange.emit(this.getLabel()(item));
    this.selected.emit(item);
    this.open.set(false);
    this.items.set([]);
    this.searched.set(false);
    this.failed.set(false);
    this.active.set(-1);
  }

  private cancelPending(): void {
    this.generation++;
    clearTimeout(this.debounceTimer);
    clearTimeout(this.spinnerTimer);
  }

  private search(raw: string): void {
    this.cancelPending();
    const query = (raw || '').trim();
    if (query.length < this.minChars()) {
      this.items.set([]);
      this.spinner.set(false);
      this.searched.set(false);
      this.failed.set(false);
      return;
    }

    const gen = this.generation;
    // Timed from the keystroke rather than from when the request goes out, so the promise is the
    // same on every field: nothing is said for 400ms, and after that the wait is acknowledged.
    this.spinnerTimer = setTimeout(() => {
      if (gen === this.generation) this.spinner.set(true);
    }, SPINNER_DELAY_MS);

    this.debounceTimer = setTimeout(async () => {
      try {
        const results = await this.fetchSuggestions()(query);
        if (gen !== this.generation) return;
        this.items.set(results || []);
        this.active.set(-1);
        this.searched.set(true);
        this.failed.set(false);
      } catch {
        if (gen !== this.generation) return;
        this.items.set([]);
        this.searched.set(true);
        this.failed.set(true);
      } finally {
        if (gen === this.generation) {
          clearTimeout(this.spinnerTimer);
          this.spinner.set(false);
        }
      }
    }, this.debounceMs());
  }
}
