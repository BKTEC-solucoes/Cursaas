import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { AdminDashboardComponent } from './pages/dashboard.component';
import { AdminCursosComponent } from './pages/cursos.component';
import { AdminAulasComponent } from './pages/aulas.component';
import { AdminAulaFormComponent } from './pages/aula-form.component';
import { AdminProvasComponent } from './pages/provas.component';
import { AdminProvaFormComponent } from './pages/prova-form.component';
import { AdminProvaResultadosComponent } from './pages/prova-resultados.component';
import { AdminNotasComponent } from './pages/notas.component';
import { AdminPresencaComponent } from './pages/presenca.component';
import { AdminAlunosComponent } from './pages/alunos.component';
import { AdminAdministradoresComponent } from './pages/administradores.component';
import { permissionGuard } from '../../core/guards/permission.guard';
import { AdminSolicitacoesComponent } from './pages/solicitacoes.component';

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
        component: AdminCursosComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['cursos:read'] }
      },
      {
        path: 'aulas',
        component: AdminAulasComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['aulas:read'] }
      },
      {
        path: 'aulas/nova',
        component: AdminAulaFormComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['aulas:write'] }
      },
      {
        path: 'aulas/:id/editar',
        component: AdminAulaFormComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['aulas:write'] }
      },
      {
        path: 'provas',
        component: AdminProvasComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['provas:read'] }
      },
      {
        path: 'provas/nova',
        component: AdminProvaFormComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['provas:write'] }
      },
      {
        path: 'provas/:id/editar',
        component: AdminProvaFormComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['provas:write'] }
      },
      {
        path: 'provas/:id/resultados',
        component: AdminProvaResultadosComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['provas:read'] }
      },
      {
        path: 'notas',
        component: AdminNotasComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['notas:read'] }
      },
      {
        path: 'presenca',
        component: AdminPresencaComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['presenca:read'] }
      },
      {
        path: 'alunos',
        component: AdminAlunosComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['alunos:read'] }
      },
      {
        path: 'administradores',
        component: AdminAdministradoresComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['administradores:read'] }
      },
      {
        path: 'solicitacoes',
        component: AdminSolicitacoesComponent
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
