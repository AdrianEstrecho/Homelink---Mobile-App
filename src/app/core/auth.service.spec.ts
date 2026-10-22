import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { User } from './user.model';

const ME = `${environment.apiUrl}/auth/me`;
const USER = { id: 'u1', email: 'student@demo.com', firstName: 'Ana', lastName: 'Reyes', role: 'customer' } as User;

class MemoryTokens {
  value: string | null = 'saved-token';
  get = async () => this.value;
  set = async (t: string) => void (this.value = t);
  clear = async () => void (this.value = null);
}

describe('AuthService session bootstrap', () => {
  let tokens: MemoryTokens;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    tokens = new MemoryTokens();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: TokenStorageService, useValue: tokens }],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  async function nextMe() {
    for (let i = 0; i < 50; i++) {
      const [req] = http.match(ME);
      if (req) return req;
      await Promise.resolve();
    }
    throw new Error('no /auth/me request');
  }

  const busy = { error: 'HomeLink is having trouble connecting right now.', code: 'db_unavailable' };

  it('keeps the saved session when the server is too busy to confirm it, then restores it', async () => {
    const auth = TestBed.inject(AuthService);
    (await nextMe()).flush(busy, { status: 503, statusText: 'Service Unavailable' });
    await auth.authReady;
    expect(tokens.value).toBe('saved-token');
    expect(auth.user()).toBeNull();

    await vi.advanceTimersByTimeAsync(5_000);
    (await nextMe()).flush(USER);
    await vi.advanceTimersByTimeAsync(0);
    expect(auth.user()?.email).toBe('student@demo.com');
  });

  it('signs out when the server answers that the token is no good', async () => {
    const auth = TestBed.inject(AuthService);
    (await nextMe()).flush({ error: 'User not found' }, { status: 404, statusText: 'Not Found' });
    await auth.authReady;
    expect(tokens.value).toBeNull();
  });

  it('stops retrying once someone signs in another way', async () => {
    const auth = TestBed.inject(AuthService);
    (await nextMe()).flush(busy, { status: 503, statusText: 'Service Unavailable' });
    await auth.authReady;
    tokens.value = 'fresh-login-token';
    await vi.advanceTimersByTimeAsync(5_000);
    expect(http.match(ME)).toHaveLength(0);
  });
});
