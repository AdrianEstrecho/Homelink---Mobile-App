import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Ported from frontend/src/components/Select.jsx — a custom (non-native)
 * dropdown. React hand-rolls positioning + a document click listener via a
 * portal; here CDK Overlay's `cdkConnectedOverlay` handles positioning,
 * scroll/resize tracking, and outside-click dismissal (`overlayOutsideClick`)
 * natively, which is why the mobile port plan chose CDK over a hand port.
 */
@Component({
  selector: 'app-select',
  imports: [OverlayModule, LucideChevronDown],
  templateUrl: './select.html',
  styleUrl: './select.css',
})
export class Select {
  readonly value = input<string>();
  readonly options = input.required<SelectOption[]>();
  readonly placeholder = input('Select...');
  readonly disabled = input(false);
  readonly wrapClass = input('', { alias: 'class' });

  readonly valueChange = output<string>();

  protected readonly open = signal(false);
  protected readonly triggerWidth = signal(0);
  protected readonly triggerRef = viewChild.required<ElementRef<HTMLElement>>('trigger');

  protected readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
  ];

  selectedLabel(): string {
    return this.options().find((o) => o.value === this.value())?.label ?? this.placeholder();
  }

  hasSelection(): boolean {
    return this.options().some((o) => o.value === this.value());
  }

  toggle(): void {
    if (this.disabled()) return;
    this.triggerWidth.set(this.triggerRef().nativeElement.offsetWidth);
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
  }

  selectOption(value: string): void {
    this.valueChange.emit(value);
    this.close();
  }
}
