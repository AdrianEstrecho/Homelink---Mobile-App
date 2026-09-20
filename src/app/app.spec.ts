import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // The shell's chrome (Navbar, SideMenu) uses routerLink, and its services
      // reach the API, so both have to be provided for the component to build.
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show the branded splash on launch', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-splash-screen')).toBeTruthy();
    expect(compiled.querySelector('.splash-wordmark')?.textContent).toContain('HomeLink');
  });

  it('should render the top app bar behind the splash', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).toBeTruthy();
  });
});
