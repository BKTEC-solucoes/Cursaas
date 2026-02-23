import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { AdminDashboardComponent } from './pages/dashboard.component';
import { AdminCursosComponent } from './pages/cursos.component';
import { AdminAulasComponent } from './pages/aulas.component';
import { AdminProvasComponent } from './pages/provas.component';
import { AdminProvaFormComponent } from './pages/prova-form.component';
import { AdminProvaResultadosComponent } from './pages/prova-resultados.component';
import { AdminNotasComponent } from './pages/notas.component';
import { AdminPresencaComponent } from './pages/presenca.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      {
        path: 'dashboard',
        component: AdminDashboardComponent
      },
      {
        path: 'cursos',
        component: AdminCursosComponent
      },
      {
        path: 'aulas',
        component: AdminAulasComponent
      },
      {
        path: 'provas',
        component: AdminProvasComponent
      },
      {
        path: 'provas/nova',
        component: AdminProvaFormComponent
      },
      {
        path: 'provas/:id/editar',
        component: AdminProvaFormComponent
      },
      {
        path: 'provas/:id/resultados',
        component: AdminProvaResultadosComponent
      },
      {
        path: 'notas',
        component: AdminNotasComponent
      },
      {
        path: 'presenca',
        component: AdminPresencaComponent
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
