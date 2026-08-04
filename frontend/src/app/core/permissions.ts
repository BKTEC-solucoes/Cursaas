// =====================================================================
// RBAC — Mapa central de papéis e permissões do painel administrativo
// =====================================================================

/**
 * Cargos administrativos, do mais amplo ao mais estreito:
 *
 *   super_admin ...... a plataforma: todas as instituições, o menu Sistema e o
 *                      cadastro de outros super admins.
 *   admin_faculdade .. uma instituição: acadêmico, alunos, tema e os
 *                      administradores dela. Não cria instituição nem super admin.
 *   instrutor ........ conteúdo: cursos, aulas e provas (mais notas e presença
 *                      das turmas que leciona), restrito aos cursos que criou ou
 *                      que lhe foram vinculados.
 *
 * O backend tem a mesma escada em `AdminRoleEnum` — mude os dois juntos.
 */
export type AdminRole = 'super_admin' | 'admin_faculdade' | 'instrutor';

/** Rótulos para exibição nos selects / tabelas */
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin:     'Super Admin',
  admin_faculdade: 'Admin da Faculdade',
  instrutor:       'Instrutor',
};

export const ADMIN_ROLE_OPTIONS: { value: AdminRole; label: string }[] = [
  { value: 'super_admin',     label: 'Super Admin' },
  { value: 'admin_faculdade', label: 'Admin da Faculdade' },
  { value: 'instrutor',       label: 'Instrutor' },
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
  // Tema/layout da instituição em gestão — só quem administra a faculdade
  // (não o instrutor, restrito a conteúdo).
  | 'tema:read'
  | 'tema:write'
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
 * A diferença entre as duas primeiras colunas é o alcance: o admin da faculdade
 * faz tudo o que o super admin faz *dentro de uma instituição*, e nada fora
 * dela — não cadastra instituições (`instituicoes:*`, que o backend exige super
 * admin em `/api/faculdades`) nem cria contas de plataforma (`sistema:*`).
 *
 * | Permissão              | super_admin | admin_faculdade | instrutor |
 * |------------------------|:-----------:|:---------------:|:---------:|
 * | cursos:read            |      ✔      |        ✔        |     ✔     |
 * | cursos:write           |      ✔      |        ✔        |     ✔     |
 * | aulas:read             |      ✔      |        ✔        |     ✔     |
 * | aulas:write            |      ✔      |        ✔        |     ✔     |
 * | provas:read            |      ✔      |        ✔        |     ✔     |
 * | provas:write           |      ✔      |        ✔        |     ✔     |
 * | notas:read             |      ✔      |        ✔        |     ✔     |
 * | notas:write            |      ✔      |        ✔        |     ✔     |
 * | presenca:read          |      ✔      |        ✔        |     ✔     |
 * | presenca:write         |      ✔      |        ✔        |     ✔     |
 * | alunos:read            |      ✔      |        ✔        |     ✔     |
 * | alunos:write           |      ✔      |        ✔        |           |
 * | relatorios:read        |      ✔      |        ✔        |           |
 * | administradores:read   |      ✔      |        ✔        |           |
 * | administradores:write  |      ✔      |        ✔        |           |
 * | tema:read              |      ✔      |        ✔        |           |
 * | tema:write             |      ✔      |        ✔        |           |
 * | instituicoes:read      |      ✔      |                 |           |
 * | instituicoes:write     |      ✔      |                 |           |
 * | sistema:read           |      ✔      |                 |           |
 * | sistema:write          |      ✔      |                 |           |
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
    'tema:read',            'tema:write',
    'instituicoes:read',    'instituicoes:write',
    'sistema:read',         'sistema:write',
  ],
  admin_faculdade: [
    'cursos:read',   'cursos:write',
    'aulas:read',    'aulas:write',
    'provas:read',   'provas:write',
    'notas:read',    'notas:write',
    'presenca:read', 'presenca:write',
    'alunos:read',   'alunos:write',
    'relatorios:read',
    'administradores:read', 'administradores:write',
    'tema:read',            'tema:write',
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
