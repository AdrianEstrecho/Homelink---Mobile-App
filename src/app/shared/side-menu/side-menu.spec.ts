import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { SideMenuService } from '../../core/side-menu.service';
import { SideMenu } from './side-menu';

function setup() {
  const fixture = TestBed.createComponent(SideMenu);
  const menu = TestBed.inject(SideMenuService);
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, menu, el };
}

describe('SideMenu', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SideMenu],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('stays out of the DOM until it is opened', () => {
    const { fixture, el } = setup();
    fixture.detectChanges();
    expect(el.querySelector('.drawer-panel')).toBeNull();
  });

  it('renders the public sections for a signed-out visitor', () => {
    const { fixture, menu, el } = setup();
    menu.open();
    fixture.detectChanges();

    const titles = [...el.querySelectorAll('.drawer-section-title')].map((n) => n.textContent?.trim());
    expect(titles).toContain('Browse');
    expect(titles).toContain('Discover HomeLink');
    // Orders/cart/wishlist are customer-only and must not be advertised to a guest.
    expect(titles).not.toContain('My HomeLink');
    expect(el.textContent).toContain('Sign In');
  });

  it("reveals the customer's own section once signed in", () => {
    const auth = TestBed.inject(AuthService);
    auth.user.set({
      id: 'u1',
      email: 'customer@demo.com',
      firstName: 'Juan',
      lastName: 'Cruz',
      role: 'customer',
      createdAt: '2026-01-05T00:00:00.000Z',
      notifyOrders: true,
      notifyBookings: true,
      notifyPromotions: false,
    });

    const { fixture, menu, el } = setup();
    menu.open();
    fixture.detectChanges();

    const titles = [...el.querySelectorAll('.drawer-section-title')].map((n) => n.textContent?.trim());
    expect(titles).toContain('My HomeLink');
    expect(el.textContent).toContain('My Orders');
    expect(el.textContent).toContain('Log Out');
  });

  it('links to every Discover HomeLink page', () => {
    const { fixture, menu, el } = setup();
    menu.open();
    fixture.detectChanges();

    const hrefs = [...el.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(
      expect.arrayContaining(['/about', '/about/history', '/about/services', '/about/app', '/about/developers']),
    );
  });

  it('plays the exit animation before leaving the DOM', async () => {
    const { fixture, menu, el } = setup();
    menu.open();
    fixture.detectChanges();

    fixture.componentInstance.close();
    fixture.detectChanges();
    // Still mounted, now marked for exit.
    expect(el.querySelector('.drawer-out')).toBeTruthy();

    await new Promise((r) => setTimeout(r, 300));
    fixture.detectChanges();
    expect(menu.isOpen()).toBe(false);
    expect(el.querySelector('.drawer-panel')).toBeNull();
  });
});
