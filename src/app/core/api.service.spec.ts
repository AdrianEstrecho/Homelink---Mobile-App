import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { ApiError, ApiService, isTransientApiError } from './api.service';
import { ServerStatusService } from './server-status.service';

const URL = `${environment.apiUrl}/products`;

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;
  let status: ServerStatusService;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
    status = TestBed.inject(ServerStatusService);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function failWith(flush: (req: ReturnType<HttpTestingController['expectOne']>) => void): Promise<ApiError> {
    const pending = api.get(URL.slice(environment.apiUrl.length)).catch((e: ApiError) => e);
    flush(http.expectOne(URL));
    return (await pending) as ApiError;
  }

  it('turns "no response at all" into a plain message and asks /health before saying the server is down', async () => {
    const checkNow = vi.spyOn(status, 'checkNow').mockResolvedValue(false);
    const err = await failWith((req) => req.error(new ProgressEvent('error'), { status: 0 }));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('network');
    expect(err.message).toContain("We can't reach HomeLink right now");
    expect(checkNow).toHaveBeenCalled();
    expect(isTransientApiError(err)).toBe(true);
  });

  it("treats a 5xx that isn't our JSON as the proxy in front of a down server", async () => {
    const checkNow = vi.spyOn(status, 'checkNow').mockResolvedValue(false);
    const err = await failWith((req) => req.flush('<html>Bad Gateway</html>', { status: 502, statusText: 'Bad Gateway' }));
    expect(err.code).toBe('unavailable');
    expect(err.message).toBe('HomeLink is temporarily unavailable. Please try again in a moment.');
    expect(checkNow).toHaveBeenCalled();
  });

  it("keeps the server's own message for a busy database, and counts the server as reachable", async () => {
    const checkNow = vi.spyOn(status, 'checkNow');
    const message = 'HomeLink is having trouble connecting right now. Please try again in a moment.';
    const err = await failWith((req) => req.flush({ error: message, code: 'db_unavailable' }, { status: 503, statusText: 'Service Unavailable' }));
    expect(err.message).toBe(message);
    expect(err.code).toBe('db_unavailable');
    expect(err.status).toBe(503);
    expect(isTransientApiError(err)).toBe(true);
    expect(checkNow).not.toHaveBeenCalled();
  });

  it('passes a 4xx through as-is and not as transient', async () => {
    const err = await failWith((req) => req.flush({ error: 'Email already registered' }, { status: 400, statusText: 'Bad Request' }));
    expect(err.message).toBe('Email already registered');
    expect(err.status).toBe(400);
    expect(isTransientApiError(err)).toBe(false);
  });

  it('flags a request as slow after 10s and clears it once answered', async () => {
    const pending = api.get('/products');
    vi.advanceTimersByTime(9_999);
    expect(status.kind()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(status.kind()).toBe('slow');
    http.expectOne(URL).flush([]);
    await pending;
    expect(status.kind()).toBeNull();
  });

  it("doesn't flag requests that are slow by nature", async () => {
    const pending = api.post('/assistant/chat', {}, { expectSlow: true });
    vi.advanceTimersByTime(30_000);
    expect(status.slow()).toBe(false);
    http.expectOne(`${environment.apiUrl}/assistant/chat`).flush({ reply: 'hi' });
    await pending;
  });
});
