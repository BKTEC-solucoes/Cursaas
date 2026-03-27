import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LojasComponent } from './lojas/lojas.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes').then(m => m.AUTH_ROUTES)
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
    data: { roles: ['aluno'] },
    loadChildren: () => import('./features/aluno/aluno.routes').then(m => m.ALUNO_ROUTES)
  },
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];
