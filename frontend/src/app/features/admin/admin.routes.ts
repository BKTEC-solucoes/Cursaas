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
import { InstituicaoTemaComponent } from '../instituicao/pages/tema.component';
import { permissionGuard } from '../../core/guards/permission.guard';
import { faculdadeAtivaGuard } from '../../core/guards/faculdade-ativa.guard';
import { AdminSolicitacoesComponent } from './pages/solicitacoes.component';
import { AdminInstituicoesComponent } from './pages/instituicoes.component';
import { AdminInstituicaoDetalheComponent } from './pages/instituicao-detalhe.component';
import { AdminCadastrosComponent } from './pages/cadastros.component';
import { SistemaSuperAdminsComponent } from './pages/sistema/super-admins.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    // `faculdadeAtivaGuard` fica nas rotas filhas, não aqui: quando não há
    // nenhuma faculdade cadastrada ele redireciona para /admin/instituicoes, e
    // no pai esse redirecionamento cairia no próprio guard, em loop.
    children: [
      {
        path: 'dashboard',
        component: AdminDashboardComponent,
        canActivate: [faculdadeAtivaGuard]
      },
      {
        path: 'cursos',
        component: AdminCursosComponent,
        canActivate: [faculdadeAtivaGuard, permissionGuard],
        data: { permissions: ['cursos:read'] }
      },
      {
        path: 'aulas',
        component: AdminAulasComponent,
        canActivate: [faculdadeAtivaGuard, permissionGuard],
        data: { permissions: ['aulas:read'] }
      },
      {
        path: 'aulas/nova',
        component: AdminAulaFormComponent,
        canActivate: [faculdadeAtivaGuard, permissionGuard],
        data: { permissions: ['aulas:write'] }
      },
      {
        path: 'aulas/:id/editar',
        component: AdminAulaFormComponent,
        canActivate: [faculdadeAtivaGuard, permissionGuard],
        data: { permissions: ['aulas:write'] }
      },
      {
        path: 'provas',
        component: AdminProvasComponent,
        canActivate: [faculdadeAtivaGuard, permissionGuard],
        data: { permissions: ['provas:read'] }
      },
      {
        path: 'provas/nova',
        component: AdminProvaFormComponent,
        canActivate: [faculdadeAtivaGuard, permissionGuard],
        data: { permissions: ['provas:write'] }
      },
      {
        path: 'provas/:id/editar',
        component: AdminProvaFormComponent,
        canActivate: [faculdadeAtivaGuard, permissionGuard],
        data: { permissions: ['provas:write'] }
      },
      {
        path: 'provas/:id/resultados',
        component: AdminProvaResultadosComponent,
        canActivate: [faculdadeAtivaGuard, permissionGuard],
        data: { permissions: ['provas:read'] }
      },
      {
        path: 'notas',
        component: AdminNotasComponent,
        canActivate: [faculdadeAtivaGuard, permissionGuard],
        data: { permissions: ['notas:read'] }
      },
      {
        path: 'presenca',
        component: AdminPresencaComponent,
        canActivate: [faculdadeAtivaGuard, permissionGuard],
        data: { permissions: ['presenca:read'] }
      },
      {
        path: 'alunos',
        component: AdminAlunosComponent,
        canActivate: [faculdadeAtivaGuard, permissionGuard],
        data: { permissions: ['alunos:read'] }
      },
      {
        path: 'administradores',
        component: AdminAdministradoresComponent,
        canActivate: [faculdadeAtivaGuard, permissionGuard],
        data: { permissions: ['administradores:read'] }
      },
      {
        path: 'tema',
        component: InstituicaoTemaComponent,
        canActivate: [faculdadeAtivaGuard, permissionGuard],
        data: { permissions: ['tema:read'] }
      },
      {
        path: 'solicitacoes',
        component: AdminSolicitacoesComponent,
        canActivate: [faculdadeAtivaGuard]
      },
      {
        path: 'cadastros',
        component: AdminCadastrosComponent,
        // Aprovar aluno é gestão da instituição: `/api/cadastro/admin/*`
        // responde 403 ao instrutor, então a tela abria vazia e com erro.
        canActivate: [faculdadeAtivaGuard, permissionGuard],
        data: { permissions: ['alunos:write'] }
      },
      // Gestão das instituições e do sistema: escopo global, fora de qualquer
      // faculdade — por isso sem `faculdadeAtivaGuard`, que existe para fixar a
      // instituição em gestão antes das telas de dentro dela.
      {
        path: 'instituicoes',
        component: AdminInstituicoesComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['instituicoes:read'] }
      },
      {
        path: 'instituicoes/:id',
        component: AdminInstituicaoDetalheComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['instituicoes:read'] }
      },
      {
        path: 'sistema/super-admins',
        component: SistemaSuperAdminsComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['sistema:read'] }
      },
      {
        path: 'sistema',
        redirectTo: 'sistema/super-admins',
        pathMatch: 'full'
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
