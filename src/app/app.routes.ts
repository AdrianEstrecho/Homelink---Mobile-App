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
    path: 'account/profile',
    loadComponent: () => import('./features/account/profile-page/profile-page').then((m) => m.ProfilePage),
    canActivate: [roleGuard(['customer'])],
  },
  {
    path: 'account/address',
    loadComponent: () => import('./features/account/address-page/address-page').then((m) => m.AddressPage),
    canActivate: [roleGuard(['customer'])],
  },
  {
    path: 'account/payment',
    loadComponent: () => import('./features/account/payment-page/payment-page').then((m) => m.PaymentPage),
    canActivate: [roleGuard(['customer'])],
  },
  {
    path: 'account/notifications',
    loadComponent: () =>
      import('./features/account/notifications-page/notifications-page').then((m) => m.NotificationsPage),
    canActivate: [roleGuard(['customer'])],
  },
  {
    path: 'account/security',
    loadComponent: () => import('./features/account/security-page/security-page').then((m) => m.SecurityPage),
    canActivate: [roleGuard(['customer'])],
  },
  {
    path: 'account/reviews',
    loadComponent: () => import('./features/account/reviews-page/reviews-page').then((m) => m.ReviewsPage),
    canActivate: [roleGuard(['customer'])],
  },
  {
    path: 'account/support',
    loadComponent: () => import('./features/account/support-page/support-page').then((m) => m.SupportPage),
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
    path: 'services/:slug/book',
    loadComponent: () => import('./features/service-book/service-book').then((m) => m.ServiceBook),
    canActivate: [roleGuard(['customer'])],
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
    path: 'cart',
    loadComponent: () => import('./features/cart/cart').then((m) => m.Cart),
    canActivate: [roleGuard(['customer'])],
  },
  {
    path: 'wishlist',
    loadComponent: () => import('./features/wishlist/wishlist').then((m) => m.Wishlist),
    canActivate: [roleGuard(['customer'])],
  },
  {
    path: 'checkout',
    loadComponent: () => import('./features/checkout/checkout').then((m) => m.Checkout),
    canActivate: [roleGuard(['customer'])],
  },
  {
    path: 'checkout/return',
    loadComponent: () =>
      import('./features/checkout/checkout-return/checkout-return').then((m) => m.CheckoutReturn),
    canActivate: [roleGuard(['customer'])],
  },
  {
    path: 'orders',
    loadComponent: () => import('./features/orders/orders').then((m) => m.Orders),
    canActivate: [roleGuard(['customer'])],
  },
  {
    path: 'bookings',
    loadComponent: () => import('./features/bookings/bookings').then((m) => m.Bookings),
    canActivate: [roleGuard(['customer'])],
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
    path: 'admin/login',
    loadComponent: () => import('./features/admin/admin-login/admin-login').then((m) => m.AdminLogin),
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/shell/admin-shell').then((m) => m.AdminShell),
    canActivate: [roleGuard(['admin'], '/admin/login')],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard').then((m) => m.AdminDashboard),
      },
      {
        path: 'products',
        loadComponent: () => import('./features/admin/products/admin-products').then((m) => m.AdminProducts),
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/admin/orders/admin-orders').then((m) => m.AdminOrders),
      },
      {
        path: 'bookings',
        loadComponent: () => import('./features/admin/bookings/admin-bookings').then((m) => m.AdminBookings),
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/users/admin-users').then((m) => m.AdminUsers),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
