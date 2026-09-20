import { Injectable, signal } from '@angular/core';

/**
 * Shared open/closed state for the app's primary navigation drawer. The
 * trigger (the topbar hamburger in Navbar) and the drawer itself (SideMenu,
 * rendered once by the app shell) live in different components, so the state
 * can't sit in either of them.
 */
@Injectable({ providedIn: 'root' })
export class SideMenuService {
  readonly isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    this.isOpen.update((v) => !v);
  }
}
