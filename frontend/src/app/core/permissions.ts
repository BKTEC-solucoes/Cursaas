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

/**
 * Papéis que o painel de uma instituição pode atribuir.
 *
 * `super_admin` fica de fora de propósito: ele administra a plataforma inteira,
 * não uma faculdade, e é criado no menu Sistema. O backend recusa
 * `admin_role=super_admin` em `/api/auth/admin-registro` pelo mesmo motivo —
 * criar um por dentro do painel de uma instituição era escalada de privilégio.
 */
export const ADMIN_ROLE_OPTIONS_INSTITUICAO: { value: AdminRole; label: string }[] =
  ADMIN_ROLE_OPTIONS.filter(o => o.value !== 'super_admin');

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
  | 'administradores:write'
  // Plataforma: cadastro e aprovação das instituições (fora do escopo de uma
  // faculdade — o backend exige super admin em /api/faculdades).
  | 'instituicoes:read'
  | 'instituicoes:write'
  // Sistema: super admins da plataforma. Separado de `administradores:*`, que
  // são os admins DA instituição em gestão.
  | 'sistema:read'
  | 'sistema:write';

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
 * | instituicoes:read      |      ✔      |           |
 * | instituicoes:write     |      ✔      |           |
 * | sistema:read           |      ✔      |           |
 * | sistema:write          |      ✔      |           |
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
    'instituicoes:read',    'instituicoes:write',
    'sistema:read',         'sistema:write',
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
