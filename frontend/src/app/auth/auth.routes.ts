import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login.component';
import { RegisterComponent } from './pages/register.component';
import { RegisterAlunoComponent } from './pages/register-aluno.component';
import { RegisterInstituicaoComponent } from './pages/register-instituicao.component';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'register/aluno',
    component: RegisterAlunoComponent
  },
  {
    path: 'register/instituicao',
    component: RegisterInstituicaoComponent
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
