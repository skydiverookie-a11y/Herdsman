import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./pages/registry-search/registry-search').then((m) => m.RegistrySearch),
      },
      {
        path: 'models',
        loadComponent: () =>
          import('./pages/local-models/local-models').then((m) => m.LocalModels),
      },
      {
        path: 'model/:name',
        loadComponent: () =>
          import('./pages/model-details/model-details').then((m) => m.ModelDetails),
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings').then((m) => m.Settings),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
