import { AfterViewInit, Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';

const sanitize = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Ported from frontend/src/components/auth/CodeInput.jsx — segmented entry for the 8-character
 * email codes. It's one real <input> laid invisibly over the cells rather than one input per
 * character, so paste (including "ABCD-EFGH" with a dash), one-time-code autofill, mobile
 * keyboards and screen readers all see an ordinary text field; the cells only mirror its value.
 * Emits `completed` with the full code as soon as the last cell fills.
 */
@Component({
  selector: 'app-code-input',
  templateUrl: './code-input.html',
  styleUrl: './code-input.css',
})
export class CodeInput implements AfterViewInit {
  readonly value = input('');
  readonly length = input(8);
  readonly invalid = input(false);
  readonly disabled = input(false);
  readonly autofocus = input(false);
  readonly inputId = input<string>();
  readonly labelledBy = input<string>();
  readonly describedBy = input<string>();

  readonly valueChange = output<string>();
  readonly completed = output<string>();

  protected readonly focused = signal(false);
  protected readonly cells = computed(() => Array.from({ length: this.length() }, (_, i) => i));
  protected readonly activeIndex = computed(() => Math.min(this.value().length, this.length() - 1));

  private readonly inputEl = viewChild.required<ElementRef<HTMLInputElement>>('field');

  ngAfterViewInit(): void {
    if (this.autofocus()) this.inputEl().nativeElement.focus();
  }

  onInput(el: HTMLInputElement): void {
    const next = sanitize(el.value).slice(0, this.length());
    // Write the cleaned value straight back: [value] won't re-render when the sanitized string
    // equals the last one it bound, which would leave a typed dash or space in the field.
    if (el.value !== next) el.value = next;
    const wasComplete = this.value().length === this.length();
    this.valueChange.emit(next);
    if (next.length === this.length() && !wasComplete) this.completed.emit(next);
  }

  /** The caret is invisible, so keep it pinned to the end — otherwise a tap could drop it
   *  mid-value and typing would land in a cell out of order. */
  pinCaret(): void {
    const el = this.inputEl().nativeElement;
    const end = el.value.length;
    if (el.selectionStart !== end || el.selectionEnd !== end) el.setSelectionRange(end, end);
  }

  onFocus(): void {
    this.focused.set(true);
    this.pinCaret();
  }

  cellTone(i: number): string {
    const char = this.value()[i];
    const active = this.focused() && i === this.activeIndex();
    if (this.invalid()) return 'border-red-300 bg-red-50/60';
    if (active) return 'border-brand-orange bg-white shadow-[0_0_0_4px_rgba(255,107,53,0.14)]';
    if (char) return 'border-brand-navy/25 bg-white';
    return 'border-gray-200 bg-gray-50';
  }
}
