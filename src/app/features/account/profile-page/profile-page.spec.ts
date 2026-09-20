import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../../core/auth.service';
import { User } from '../../../core/user.model';
import { ProfilePage } from './profile-page';

const BASE: User = {
  id: 'u1',
  email: 'customer@demo.com',
  firstName: 'Juan',
  lastName: 'Cruz',
  role: 'customer',
  createdAt: '2026-01-05T00:00:00.000Z',
  notifyOrders: true,
  notifyBookings: true,
  notifyPromotions: false,
};

function mountWith(user: User) {
  TestBed.inject(AuthService).user.set(user);
  const fixture = TestBed.createComponent(ProfilePage);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('ProfilePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('scores a profile missing its phone and address as incomplete', () => {
    const { el } = mountWith(BASE);
    // name + email + notification prefs = 3 of 5.
    expect(el.textContent).toContain('60%');
    expect(el.textContent).toContain('3 of 5 complete');
    expect(el.textContent).toContain('Mobile number');
    expect(el.textContent).toContain('Default address');
  });

  it('scores a fully filled profile at 100%', () => {
    const { el } = mountWith({ ...BASE, phone: '09171234567', address: '12 Mabini St, Quezon City' });
    expect(el.textContent).toContain('100%');
    expect(el.textContent).toContain('5 of 5 complete');
    expect(el.textContent).toContain('Everything we need is on file');
  });

  it('shows the initials and member-since date in the identity header', () => {
    const { el } = mountWith(BASE);
    expect(el.textContent).toContain('JC');
    expect(el.textContent).toContain('January 2026');
    expect(el.textContent).toContain('Verified customer');
  });
});
