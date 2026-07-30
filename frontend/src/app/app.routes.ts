import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { publicGuard } from './core/guards/public.guard';
import { roleGuard } from './core/guards/role.guard';
import { LojasComponent } from './lojas/lojas.component';
import { themeResolver } from './core/resolvers/theme.resolver';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { LoginComponent } from './auth/pages/login.component';
import { DashboardRedirectComponent } from './core/components/dashboard-redirect.component';

export const routes: Routes = [
  {
    path: '',
    component: LandingPageComponent,
    canActivate: [publicGuard],
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [publicGuard]
  },
  {
    path: 'dashboard',
    component: DashboardRedirectComponent,
    canActivate: [authGuard]
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    // Marketplace público de uma faculdade. SEM guard: é a vitrine que a
    // instituição divulga, e o tenant vem do slug na URL, não de sessão.
    path: 'f/:slug',
    loadComponent: () =>
      import('./marketplace/marketplace.component').then(m => m.MarketplaceComponent)
  },
  {
    path: 'lojas',
    canActivate: [authGuard],
    component: LojasComponent
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },
  {
    path: 'aluno',
    canActivate: [authGuard, roleGuard],
    resolve: { theme: themeResolver },
    data: { roles: ['aluno'] },
    loadChildren: () => import('./features/aluno/aluno.routes').then(m => m.ALUNO_ROUTES)
  },
  {
    path: 'instituicao',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['instituicao'] },
    loadChildren: () => import('./features/instituicao/instituicao.routes').then(m => m.INSTITUICAO_ROUTES)
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
