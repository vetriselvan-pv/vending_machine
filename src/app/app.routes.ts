import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'layout',
    loadComponent: () => import('./common/layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./page/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'transfer',
        loadComponent: () => import('./page/transfer/transfer.component').then((m) => m.TransferComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./page/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },
  {
    path: "login",
    loadComponent: () => import('./page/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: "",
    redirectTo: "login",
    pathMatch: "full",
  }
];
