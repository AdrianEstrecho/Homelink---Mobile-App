import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { ApiError, ApiService } from '../../../core/api.service';
import { ForgotPassword } from './forgot-password';

async function submit(email: string) {
  const fixture = TestBed.createComponent(ForgotPassword);
  fixture.detectChanges();
  // ngModel only takes typing once its own async setup has run.
  await fixture.whenStable();
  const input = fixture.nativeElement.querySelector('input[name="email"]') as HTMLInputElement;
  input.value = email;
  input.dispatchEvent(new Event('input'));
  fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ForgotPassword', () => {
  let post: ReturnType<typeof vi.spyOn>;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
    post = vi.spyOn(TestBed.inject(ApiService), 'post').mockResolvedValue({});
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => vi.restoreAllMocks());

  it('turns away a non-Gmail address without asking the server', async () => {
    const el = await submit('juan@yahoo.com');
    expect(el.textContent).toContain('Enter your Gmail address, ending in @gmail.com.');
    expect(post).not.toHaveBeenCalled();
  });

  it('turns away an empty email without asking the server', async () => {
    const el = await submit('   ');
    expect(el.textContent).toContain('Enter your email.');
    expect(post).not.toHaveBeenCalled();
  });

  it('sends a Gmail address, trimmed, and moves on to the code screen', async () => {
    await submit('  Juan@Gmail.com ');
    expect(post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'Juan@Gmail.com' });
    expect(navigate).toHaveBeenCalledWith('/verify-reset-code');
  });

  it('stays put and says so when no account uses the email', async () => {
    post.mockRejectedValue(new ApiError('No HomeLink account uses this email.', undefined, 404));
    const el = await submit('nobody@gmail.com');
    expect(el.textContent).toContain('No HomeLink account uses this email.');
    expect(navigate).not.toHaveBeenCalled();
  });
});
