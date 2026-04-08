// =====================================================================
// RBAC — Mapa central de papéis e permissões do painel administrativo
// =====================================================================

export type AdminRole = 'super_admin' | 'instrutor';

/** Rótulos para exibição nos selects / tabelas */
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  instrutor:   'Instrutor',
};

export const ADMIN_ROLE_OPTIONS: { value: AdminRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'instrutor',   label: 'Instrutor' },
];

// Tokens de permissão granulares
export type Permission =
  | 'cursos:read'
  | 'cursos:write'
  | 'aulas:read'
  | 'aulas:write'
  | 'provas:read'
  | 'provas:write'
  | 'notas:read'
  | 'notas:write'
  | 'presenca:read'
  | 'presenca:write'
  | 'alunos:read'
  | 'alunos:write'
  | 'relatorios:read'
  | 'administradores:read'
  | 'administradores:write';

/**
 * Matriz de permissões por papel.
 * Altere aqui para ajustar o que cada tipo de admin pode fazer.
 *
 * | Permissão              | super_admin | instrutor |
 * |------------------------|:-----------:|:---------:|
 * | cursos:read            |      ✔      |     ✔     |
 * | cursos:write           |      ✔      |     ✔     |
 * | aulas:read             |      ✔      |     ✔     |
 * | aulas:write            |      ✔      |     ✔     |
 * | provas:read            |      ✔      |     ✔     |
 * | provas:write           |      ✔      |     ✔     |
 * | notas:read             |      ✔      |     ✔     |
 * | notas:write            |      ✔      |     ✔     |
 * | presenca:read          |      ✔      |     ✔     |
 * | presenca:write         |      ✔      |     ✔     |
 * | alunos:read            |      ✔      |     ✔     |
 * | alunos:write           |      ✔      |           |
 * | relatorios:read        |      ✔      |           |
 * | administradores:read   |      ✔      |           |
 * | administradores:write  |      ✔      |           |
 */
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: [
    'cursos:read',   'cursos:write',
    'aulas:read',    'aulas:write',
    'provas:read',   'provas:write',
    'notas:read',    'notas:write',
    'presenca:read', 'presenca:write',
    'alunos:read',   'alunos:write',
    'relatorios:read',
    'administradores:read', 'administradores:write',
  ],
  instrutor: [
    'cursos:read',   'cursos:write',
    'aulas:read',    'aulas:write',
    'provas:read',   'provas:write',
    'notas:read',    'notas:write',
    'presenca:read', 'presenca:write',
    'alunos:read',
  ],
};
