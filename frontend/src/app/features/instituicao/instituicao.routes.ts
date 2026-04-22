import { Routes } from '@angular/router';
import { InstituicaoLayoutComponent } from './layout/instituicao-layout.component';
import { InstituicaoDashboardComponent } from './pages/dashboard.component';
import { InstituicaoPerfilComponent } from './pages/perfil.component';
import { InstituicaoAlunosComponent } from './pages/alunos.component';
import { InstituicaoSolicitacoesComponent } from './pages/solicitacoes.component';
import { InstituicaoCursosComponent } from './pages/cursos.component';
import { InstituicaoAulasComponent } from './pages/aulas.component';
import { InstituicaoNotasComponent } from './pages/notas.component';
import { InstituicaoAulaFormComponent } from './pages/aula-form.component';
import { InstituicaoTemaComponent } from './pages/tema.component';

export const INSTITUICAO_ROUTES: Routes = [
  {
    path: '',
    component: InstituicaoLayoutComponent,
    children: [
      { path: 'dashboard',          component: InstituicaoDashboardComponent },
      { path: 'perfil',             component: InstituicaoPerfilComponent },
      { path: 'alunos',             component: InstituicaoAlunosComponent },
      { path: 'solicitacoes',       component: InstituicaoSolicitacoesComponent },
      { path: 'cursos',             component: InstituicaoCursosComponent },
      { path: 'aulas',              component: InstituicaoAulasComponent },
      { path: 'aulas/nova',         component: InstituicaoAulaFormComponent },
      { path: 'aulas/:id/editar',   component: InstituicaoAulaFormComponent },
      { path: 'notas',              component: InstituicaoNotasComponent },
      { path: 'tema',               component: InstituicaoTemaComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];
