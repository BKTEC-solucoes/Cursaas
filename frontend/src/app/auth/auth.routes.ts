import { Routes } from '@angular/router';
import { RegisterComponent } from './pages/register.component';
import { RegisterAlunoComponent } from './pages/register-aluno.component';
import { RegisterInstituicaoComponent } from './pages/register-instituicao.component';
import { AceitarConviteComponent } from './pages/aceitar-convite.component';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    redirectTo: '/login',
    pathMatch: 'full'
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
    path: 'convite',
    component: AceitarConviteComponent
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  }
];
