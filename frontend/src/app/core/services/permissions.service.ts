import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import {
  AdminRole,
  Permission,
  ROLE_PERMISSIONS,
  ADMIN_ROLE_LABELS,
} from '../permissions';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  constructor(private authService: AuthService) {}

  /** Retorna o AdminRole do usuário logado, ou null se não for admin. */
  getAdminRole(): AdminRole | null {
    const user = this.authService.getCurrentUser();
    if (!user) return null;
    return (user.admin_role as AdminRole) ?? null;
  }

  /**
   * Verifica se o usuário tem uma permissão específica.
   * Admins sem admin_role definido (account legado) recebem acesso total.
   */
  can(permission: Permission): boolean {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'admin') return false;

    const role = user.admin_role as AdminRole | null;
    // Legado: admin sem sub-papel → acesso total
    if (!role) return true;

    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
  }

  /** Verifica se o usuário possui ao menos uma das permissões informadas. */
  canAny(...permissions: Permission[]): boolean {
    return permissions.some(p => this.can(p));
  }

  /** Verifica se o usuário possui todas as permissões informadas. */
  canAll(...permissions: Permission[]): boolean {
    return permissions.every(p => this.can(p));
  }

  /** Rótulo legível do papel do admin logado. */
  getRoleLabel(): string {
    const role = this.getAdminRole();
    return role ? ADMIN_ROLE_LABELS[role] : 'Administrador';
  }
}
