import { Routes } from '@angular/router';
import { AlunoLayoutComponent } from './layout/aluno-layout.component';
import { AlunoDashboardComponent } from './pages/dashboard.component';
import { AlunoCursosComponent } from './pages/cursos.component';
import { AulasListaComponent } from './pages/aulas-lista.component';
import { AulaDetailsComponent } from './pages/aula-details.component';
import { AlunoProvasComponent } from './pages/provas.component';
import { AlunoProvaResponderComponent } from './pages/prova-responder.component';
import { AlunoProvaResultadoComponent } from './pages/prova-resultado.component';
import { AlunoNotasComponent } from './pages/notas.component';
import { AlunoPresencaComponent } from './pages/presenca.component';

export const ALUNO_ROUTES: Routes = [
  {
    path: '',
    component: AlunoLayoutComponent,
    children: [
      {
        path: 'dashboard',
        component: AlunoDashboardComponent
      },
      {
        path: 'cursos',
        component: AlunoCursosComponent
      },
      {
        path: 'aulas',
        component: AulasListaComponent
      },
      {
        path: 'aulas/:id',
        component: AulaDetailsComponent
      },
      {
        path: 'provas',
        component: AlunoProvasComponent
      },
      {
        path: 'provas/:id/responder',
        component: AlunoProvaResponderComponent
      },
      {
        path: 'provas/:id/resultado',
        component: AlunoProvaResultadoComponent
      },
      {
        path: 'notas',
        component: AlunoNotasComponent
      },
      {
        path: 'presenca',
        component: AlunoPresencaComponent
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
