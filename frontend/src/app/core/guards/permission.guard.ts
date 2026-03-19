import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionsService } from '../services/permissions.service';
import { Permission } from '../permissions';

/**
 * Guard de permissão granular (RBAC).
 *
 * Uso nas rotas:
 *   {
 *     path: 'administradores',
 *     component: AdminAdministradoresComponent,
 *     canActivate: [permissionGuard],
 *     data: { permissions: ['administradores:read'] as Permission[] }
 *   }
 */
export const permissionGuard: CanActivateFn = (route) => {
  const permissionsService = inject(PermissionsService);
  const router = inject(Router);

  const required = route.data['permissions'] as Permission[] | undefined;
  if (!required || required.length === 0) return true;

  if (permissionsService.canAll(...required)) return true;

  console.warn('[PermissionGuard] Acesso negado: permissões insuficientes.');
  router.navigate(['/admin']);
  return false;
};
