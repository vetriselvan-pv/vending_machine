import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'layout',
    loadComponent: () =>
      import('./common/layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./page/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'transfer',
        loadComponent: () =>
          import('./page/transfer/transfer.component').then(
            (m) => m.TransferComponent
          ),
      },
      {
        path: 'stocks',
        loadComponent: () =>
          import('./page/stock-management/stock-management.component').then(
            (m) => m.StockManagementComponent
          ),
      },
      {
        path: 'vendor',
        loadComponent: () =>
          import('./page/vendor-assign/vendor-assign.component').then(
            (m) => m.VendorAssignComponent
          ),
      },
      {
        path: 'accept-delivery',
        loadComponent: () =>
          import('./page/accept-delivery/accept-delivery.component').then(
            (m) => m.AcceptDeliveryComponent
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./page/profile/profile.component').then(
            (m) => m.ProfileComponent
          ),
      },
      {
        path: 'more',
        loadComponent: () =>
          import('./page/more/more.component').then((m) => m.MoreComponent),
      },
    ],
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./page/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
  },
  {
    path: 'splash',
    loadComponent: () =>
      import('./page/splash/splash.component').then((m) => m.SplashComponent),
  },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./page/onboarding/onboarding.component').then(
        (m) => m.OnboardingComponent
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./page/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    redirectTo: 'onboarding',
    pathMatch: 'full',
  },
];
