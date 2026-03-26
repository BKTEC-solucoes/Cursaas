import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login.component';
import { AceitarConviteComponent } from './pages/aceitar-convite.component';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'convite',
    component: AceitarConviteComponent
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
