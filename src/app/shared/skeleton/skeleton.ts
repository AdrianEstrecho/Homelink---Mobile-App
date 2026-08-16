import { Component } from '@angular/core';

/**
 * Ported from frontend/src/components/Skeleton.jsx's `Skeleton` export. Any
 * `class="..."` a caller writes on `<app-skeleton>` merges onto this host
 * element automatically (Angular's default behavior), alongside the base
 * `skeleton` class here — so this needs no template/inner div at all,
 * matching React's single-`<div>` output exactly.
 */
@Component({
  selector: 'app-skeleton',
  imports: [],
  template: '',
  host: { class: 'skeleton' },
})
export class Skeleton {}
