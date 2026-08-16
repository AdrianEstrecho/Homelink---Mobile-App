import { Routes } from '@angular/router';

import { roleGuard } from './core/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'account',
    loadComponent: () => import('./features/account/account').then((m) => m.Account),
    canActivate: [roleGuard(['customer'])],
  },
  {
    path: 'products',
    loadComponent: () => import('./features/products/products').then((m) => m.Products),
  },
  {
    path: 'products/:slug',
    loadComponent: () =>
      import('./features/products/product-detail/product-detail').then((m) => m.ProductDetail),
  },
  {
    path: 'services',
    loadComponent: () => import('./features/services/services').then((m) => m.Services),
  },
  {
    path: 'gallery',
    loadComponent: () => import('./features/gallery/gallery').then((m) => m.Gallery),
  },
  {
    path: 'location',
    loadComponent: () => import('./features/location/location').then((m) => m.Location),
  },
  {
    path: 'policies',
    loadComponent: () => import('./features/policies/policies').then((m) => m.Policies),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'verify-reset-code',
    loadComponent: () =>
      import('./features/auth/verify-reset-code/verify-reset-code').then((m) => m.VerifyResetCode),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'terms',
    loadComponent: () => import('./features/auth/terms/terms').then((m) => m.Terms),
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
