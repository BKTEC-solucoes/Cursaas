import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { ThemeService, DarkPref } from '../../../core/services/theme.service';
import { FaculdadeAtivaService, FaculdadeResumo } from '../../../core/services/faculdade-ativa.service';

import { IconComponent } from '../../../shared/components/icon.component';
const SIDEBAR_COLLAPSED_KEY = 'admin_sidebar_collapsed';

/** Nome do ícone (mapa em IconComponent) para cada item do menu. */
const icons = {
  dashboard: 'grid',
  cursos:    'book',
  aulas:     'video',
  provas:    'file-text',
  notas:     'chart',
  presenca:  'calendar',
  alunos:    'users',
  admins:    'shield',
  cadastros: 'file-plus',
  tema:      'palette',
  solicit:   'mail',
  institui:  'building',
  superadm:  'shield-check',
};

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, FormsModule, IconComponent],
  template: `
    <div class="layout-sidebar">

      <!-- â•â•â• OVERLAY mobile â•â•â• -->
      @if (sidebarOpen()) {
        <div class="sidebar-overlay" (click)="closeSidebar()"></div>
      }

      <!-- â•â•â• SIDEBAR â•â•â• -->
      <aside class="sidebar"
             [class.sidebar--open]="sidebarOpen()"
             [class.sidebar--collapsed]="isCollapsed()">

        <!-- Brand -->
        <div class="sidebar-brand">
          @if (!isCollapsed()) {
            <div class="brand-block">
              <span class="brand-name">Cursaas</span>
              <span class="admin-badge">Admin Global</span>
            </div>
          } @else {
            <span class="brand-icon">A</span>
          }
          <div class="brand-actions">
            <button class="btn-collapse" (click)="toggleCollapsed()"
                    [title]="isCollapsed() ? 'Expandir' : 'Recolher'">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                @if (isCollapsed()) {<polyline points="9 18 15 12 9 6"/>}
                @else            {<polyline points="15 18 9 12 15 6"/>}
              </svg>
            </button>
            <button class="sidebar-close" (click)="closeSidebar()" aria-label="Fechar menu">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <!--
          Nav — a ordem conta: primeiro as instituições (o objeto do painel),
          depois o trabalho dentro da instituição em gestão, e por último o
          Sistema, que é global e não deve se misturar ao resto.
        -->
        <nav class="sidebar-nav">
          @if (p.can('instituicoes:read')) {
            <div class="nav-group">
              @if (!isCollapsed()) {<span class="nav-group-label">Plataforma</span>}
              <a routerLink="/admin/instituicoes" routerLinkActive="active" [title]="isCollapsed() ? 'Instituições' : ''">
                <app-icon class="icon" [name]="icons.institui" [size]="18" />
                <span class="nav-label">Instituições</span>
              </a>
            </div>
          }

          <div class="nav-group">
            @if (!isCollapsed()) {
              <span class="nav-group-label">Visão Geral</span>
              @if (ehSuperAdmin && nomeFaculdadeAtiva) {
                <span class="nav-group-escopo" [title]="nomeFaculdadeAtiva">{{ nomeFaculdadeAtiva }}</span>
              }
            }
            <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" [title]="isCollapsed() ? 'Dashboard' : ''">
              <app-icon class="icon" [name]="icons.dashboard" [size]="18" />
              <span class="nav-label">Dashboard</span>
            </a>
          </div>

          <div class="nav-group">
            @if (!isCollapsed()) {<span class="nav-group-label">Acadêmico</span>}
            @if (p.can('cursos:read')) {
              <a routerLink="/admin/cursos" routerLinkActive="active" [title]="isCollapsed() ? 'Cursos' : ''">
                <app-icon class="icon" [name]="icons.cursos" [size]="18" />
                <span class="nav-label">Cursos</span>
              </a>
            }
            @if (p.can('aulas:read')) {
              <a routerLink="/admin/aulas" routerLinkActive="active" [title]="isCollapsed() ? 'Aulas' : ''">
                <app-icon class="icon" [name]="icons.aulas" [size]="18" />
                <span class="nav-label">Aulas</span>
              </a>
            }
            @if (p.can('provas:read')) {
              <a routerLink="/admin/provas" routerLinkActive="active" [title]="isCollapsed() ? 'Provas' : ''">
                <app-icon class="icon" [name]="icons.provas" [size]="18" />
                <span class="nav-label">Provas</span>
              </a>
            }
            @if (p.can('notas:read')) {
              <a routerLink="/admin/notas" routerLinkActive="active" [title]="isCollapsed() ? 'Notas' : ''">
                <app-icon class="icon" [name]="icons.notas" [size]="18" />
                <span class="nav-label">Notas</span>
              </a>
            }
            @if (p.can('presenca:read')) {
              <a routerLink="/admin/presenca" routerLinkActive="active" [title]="isCollapsed() ? 'Presença' : ''">
                <app-icon class="icon" [name]="icons.presenca" [size]="18" />
                <span class="nav-label">Presença</span>
              </a>
            }
          </div>

          <div class="nav-group">
            @if (!isCollapsed()) {<span class="nav-group-label">Gestão da Instituição</span>}
            @if (p.can('alunos:read')) {
              <a routerLink="/admin/alunos" routerLinkActive="active" [title]="isCollapsed() ? 'Alunos' : ''">
                <app-icon class="icon" [name]="icons.alunos" [size]="18" />
                <span class="nav-label">Alunos</span>
              </a>
            }
            @if (p.can('administradores:read')) {
              <a routerLink="/admin/administradores" routerLinkActive="active" [title]="isCollapsed() ? 'Administradores' : ''">
                <app-icon class="icon" [name]="icons.admins" [size]="18" />
                <span class="nav-label">Administradores</span>
              </a>
            }
            @if (p.can('alunos:write')) {
              <a routerLink="/admin/cadastros" routerLinkActive="active" [title]="isCollapsed() ? 'Cadastros' : ''">
                <app-icon class="icon" [name]="icons.cadastros" [size]="18" />
                <span class="nav-label">Cadastros</span>
              </a>
            }
            @if (p.can('tema:read')) {
              <a routerLink="/admin/tema" routerLinkActive="active" [title]="isCollapsed() ? 'Tema' : ''">
                <app-icon class="icon" [name]="icons.tema" [size]="18" />
                <span class="nav-label">Tema</span>
              </a>
            }
            <a routerLink="/admin/solicitacoes" routerLinkActive="active" [title]="isCollapsed() ? 'Solicitações' : ''">
              <app-icon class="icon" [name]="icons.solicit" [size]="18" />
              <span class="nav-label">Solicitações</span>
            </a>
          </div>

          <!--
            Sistema — administração da plataforma, fora de qualquer faculdade.
            Fica separado justamente para não parecer parte da instituição que
            está sendo gerenciada: aqui o cabeçalho X-Faculdade-Id não vale nada.
          -->
          @if (p.can('sistema:read')) {
            <div class="nav-group nav-group--sistema">
              @if (!isCollapsed()) {<span class="nav-group-label">Sistema</span>}
              <a routerLink="/admin/sistema/super-admins" routerLinkActive="active" [title]="isCollapsed() ? 'Super Admins' : ''">
                <app-icon class="icon" [name]="icons.superadm" [size]="18" />
                <span class="nav-label">Super Admins</span>
              </a>
            </div>
          }
        </nav>

        <!-- Footer -->
        <div class="sidebar-footer">
          <div class="sidebar-user">
            <div class="s-avatar">{{ usuarioNome.charAt(0).toUpperCase() }}</div>
            @if (!isCollapsed()) {
              <div class="user-info">
                <span class="user-name truncate">{{ usuarioNome }}</span>
                @if (roleLabel) {
                  <span class="user-role">{{ roleLabel }}</span>
                }
              </div>
            }
          </div>
          <div class="footer-actions">
            <button class="btn-icon-s" (click)="toggleDark()" [title]="darkModeTitle()">
              <app-icon [name]="darkModeIconName()" />
            </button>
            <button class="btn-logout-s" (click)="logout()" title="Sair">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              @if (!isCollapsed()) {<span>Sair</span>}
            </button>
          </div>
        </div>
      </aside>

      <!-- â•â•â• CONTEÚDO â•â•â• -->
      <div [class]="bodyClass()">
        <header class="sidebar-topbar">
          <button class="hamburger" (click)="toggleSidebar()" aria-label="Abrir menu">
            <span></span><span></span><span></span>
          </button>
          <span class="topbar-title">Painel Administrativo</span>

          @if (ehSuperAdmin) {
            <div class="tenant-switch">
              <label for="faculdadeAtiva">Gerenciando</label>
              <select
                id="faculdadeAtiva"
                [ngModel]="faculdadeAtivaId"
                (ngModelChange)="trocarFaculdade($event)"
                [disabled]="carregandoFaculdades || faculdades.length === 0"
              >
                @if (carregandoFaculdades) {
                  <option [ngValue]="null">Carregando…</option>
                } @else if (faculdades.length === 0) {
                  <option [ngValue]="null">Nenhuma instituição ativa</option>
                }
                @for (f of faculdades; track f.id) {
                  <option [ngValue]="f.id">{{ f.nome }}</option>
                }
              </select>
            </div>
          }

          <div class="topbar-user">
            <span class="user-greeting-top">{{ usuarioNome }}</span>
            @if (roleLabel) {
              <span class="role-badge">{{ roleLabel }}</span>
            }
          </div>
        </header>
        <main class="admin-main">
          <router-outlet></router-outlet>
        </main>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }

    .layout-sidebar { display: flex; min-height: 100vh; background: var(--background); }

    /* ── Sidebar ──────────────────────────────────────────── */
    .sidebar {
      position: fixed; left: 0; top: 0;
      width: var(--sidebar-w, 260px); height: 100vh;
      display: flex; flex-direction: column;
      background: var(--sidebar-bg); color: var(--sidebar-text);
      z-index: var(--z-overlay);
      overflow-y: auto; scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,.12) transparent;
      transition: width var(--transition-base), transform var(--transition-base);
    }

    /* ── Brand ────────────────────────────────────────────── */
    .sidebar-brand {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--space-4); border-bottom: 1px solid var(--sidebar-border);
      flex-shrink: 0; min-height: 64px;
    }
    .brand-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .brand-name {
      font-family: var(--font-display); font-size: var(--font-size-xl);
      font-weight: 700; letter-spacing: -.5px;
      color: var(--sidebar-text-active); white-space: nowrap; overflow: hidden;
    }
    .brand-icon {
      width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
      background: var(--sidebar-indicator); color: #fff;
      font-family: var(--font-display); font-weight: 800; font-size: var(--font-size-lg);
      border-radius: var(--radius); flex-shrink: 0;
    }
    .brand-actions { display: flex; align-items: center; gap: var(--space-1); }
    .admin-badge {
      display: inline-flex; padding: 1px 8px;
      background: color-mix(in srgb, var(--color-danger) 18%, transparent);
      color: var(--color-danger); border-radius: var(--radius-full);
      font-size: 10px; font-weight: 700; letter-spacing: .03em; white-space: nowrap;
    }

    /* ── Nav ──────────────────────────────────────────────── */
    .sidebar-nav { flex: 1; padding: var(--space-2) var(--space-2); overflow-y: auto; }

    .nav-group {
      padding-bottom: var(--space-2);
    }
    .nav-group + .nav-group {
      border-top: 1px solid var(--sidebar-border);
      padding-top: var(--space-3);
    }
    .nav-group-label {
      padding: 0 var(--space-3) var(--space-1);
      font-size: 10px; font-weight: 700;
      letter-spacing: .08em; text-transform: uppercase;
      color: var(--sidebar-text); opacity: .45;
      display: block; user-select: none;
      white-space: nowrap; overflow: hidden;
    }
    /* Nome da instituição em gestão — o escopo dos grupos seguintes. */
    .nav-group-escopo {
      display: block; padding: 0 var(--space-3) var(--space-2);
      font-size: 11px; font-weight: 600; color: var(--sidebar-text-active);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    /* Área global: separada do bloco da instituição, não é o mesmo escopo. */
    .nav-group--sistema { margin-top: var(--space-2); }
    .nav-group--sistema .nav-group-label { color: var(--color-danger); opacity: .8; }

    .sidebar-nav a {
      display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-2) var(--space-3); margin-bottom: 2px;
      color: var(--sidebar-text); text-decoration: none;
      font-size: var(--font-size-sm); font-weight: 500;
      border-radius: var(--radius); border-left: 3px solid transparent;
      transition: background var(--transition-fast), color var(--transition-fast);
    }
    .sidebar-nav a:hover  { background: var(--sidebar-bg-hover); color: var(--sidebar-text-active); }
    .sidebar-nav a.active { background: var(--sidebar-active-bg); color: var(--sidebar-text-active); border-left-color: var(--sidebar-indicator); font-weight: 600; }
    .icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; opacity: var(--sidebar-icon-opacity, .75); }
    .sidebar-nav a.active .icon, .sidebar-nav a:hover .icon { opacity: 1; }
    .nav-label { line-height: 1; }

    /* ── Footer ───────────────────────────────────────────── */
    .sidebar-footer {
      padding: var(--space-3) var(--space-3) var(--space-4);
      border-top: 1px solid var(--sidebar-border); flex-shrink: 0;
    }
    .sidebar-user {
      display: flex; align-items: center; gap: var(--space-2);
      padding: var(--space-2) var(--space-1); margin-bottom: var(--space-2); min-width: 0;
    }
    .s-avatar {
      width: 32px; height: 32px; border-radius: var(--radius-full);
      background: color-mix(in srgb, var(--sidebar-indicator) 35%, transparent);
      color: var(--sidebar-indicator); font-size: var(--font-size-sm); font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .user-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .user-name { font-size: var(--font-size-sm); color: var(--sidebar-text); font-weight: 500; }
    .user-role { font-size: 10px; color: var(--sidebar-text); opacity: .6; }
    .truncate  { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .footer-actions { display: flex; gap: var(--space-2); }
    .btn-icon-s {
      display: flex; align-items: center; justify-content: center;
      width: 34px; height: 34px;
      background: rgba(255,255,255,.08); border: 1px solid var(--sidebar-border);
      border-radius: var(--radius); color: var(--sidebar-text); cursor: pointer;
      transition: background var(--transition-fast); flex-shrink: 0;
    }
    .btn-icon-s:hover { background: rgba(255,255,255,.18); color: var(--sidebar-text-active); }
    .btn-logout-s {
      display: flex; align-items: center; gap: var(--space-2); flex: 1;
      padding: var(--space-2) var(--space-3);
      background: rgba(255,255,255,.06); border: 1px solid var(--sidebar-border);
      border-radius: var(--radius); color: var(--sidebar-text);
      cursor: pointer; font-size: var(--font-size-sm); font-weight: 500;
      transition: background var(--transition-fast); white-space: nowrap; overflow: hidden;
    }
    .btn-logout-s:hover { background: rgba(255,0,0,.15); color: #fca5a5; }

    /* ── Collapsed (rail) ─────────────────────────────────── */
    .sidebar--collapsed { width: var(--sidebar-w-collapsed, 68px); }
    .sidebar--collapsed .nav-label,
    .sidebar--collapsed .brand-block,
    .sidebar--collapsed .nav-group-label { display: none; }
    .sidebar--collapsed .sidebar-nav a  { justify-content: center; padding: var(--space-3) 0; border-left-color: transparent; }
    .sidebar--collapsed .sidebar-brand  { justify-content: center; }
    .sidebar--collapsed .sidebar-footer { padding: var(--space-3) var(--space-2) var(--space-4); }
    .sidebar--collapsed .sidebar-user   { justify-content: center; }
    .sidebar--collapsed .user-info      { display: none; }
    .sidebar--collapsed .footer-actions { flex-direction: column; }
    .sidebar--collapsed .btn-logout-s   { flex: none; width: 34px; height: 34px; padding: 0; justify-content: center; }
    .sidebar--collapsed .nav-group + .nav-group { padding-top: var(--space-2); }

    /* ── Body ─────────────────────────────────────────────── */
    .sidebar-body       { flex: 1; min-width: 0; margin-left: var(--sidebar-w, 260px); display: flex; flex-direction: column; min-height: 100vh; }
    /* min-width:0 é obrigatório: sem ele o flex item herda min-width:auto e não
       encolhe abaixo do min-content do conteúdo — uma tabela larga esticava o
       layout inteiro e a página ganhava scroll horizontal, em vez da tabela
       rolar dentro do próprio wrapper com overflow-x:auto. */
    .sidebar-body.body--rail { margin-left: var(--sidebar-w-collapsed, 68px); }

    /* ── Inner topbar ─────────────────────────────────────── */
    .sidebar-topbar {
      display: flex; align-items: center; gap: var(--space-3);
      height: var(--sidebar-topbar-h, 56px); padding: 0 var(--space-5);
      background: var(--inner-topbar-bg, var(--color-surface));
      border-bottom: 1px solid var(--inner-topbar-border, var(--color-border));
      position: sticky; top: 0; z-index: var(--z-dropdown);
    }
    .topbar-title {
      font-family: var(--font-display); font-size: var(--font-size-md); font-weight: 600;
      color: var(--color-text); flex: 1;
    }
    .topbar-user { display: flex; align-items: center; gap: var(--space-2); flex-shrink: 0; }
    .user-greeting-top { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .role-badge {
      padding: 2px 10px; border-radius: var(--radius-full);
      background: color-mix(in srgb, var(--color-danger) 12%, transparent);
      color: var(--color-danger); font-size: 11px; font-weight: 700;
    }

    .tenant-switch { display: flex; align-items: center; gap: 8px; margin-left: auto; margin-right: var(--space-4); }
    .tenant-switch label {
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
      color: var(--color-text-muted); white-space: nowrap;
    }
    .tenant-switch select {
      padding: 6px 12px; border-radius: var(--radius);
      border: 1px solid var(--color-border); background: var(--color-surface);
      color: var(--color-text); font-size: var(--font-size-sm); font-weight: 600;
      max-width: 260px; cursor: pointer;
    }
    .tenant-switch select:disabled { opacity: 0.6; cursor: not-allowed; }

    .admin-main { flex: 1; padding: var(--density-section-gap) var(--space-5); }

    /* ── Overlay ──────────────────────────────────────────── */
    .sidebar-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.50); z-index: calc(var(--z-overlay) - 1);
      backdrop-filter: blur(3px);
    }

    .btn-collapse {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; padding: 0;
      background: rgba(255,255,255,.08); border: 1px solid var(--sidebar-border);
      border-radius: var(--radius); color: var(--sidebar-text);
      cursor: pointer; transition: background var(--transition-fast);
    }
    .btn-collapse:hover { background: rgba(255,255,255,.18); color: var(--sidebar-text-active); }

    .sidebar-close {
      display: none; align-items: center; justify-content: center;
      width: 28px; height: 28px; background: none; border: none;
      color: var(--sidebar-text); cursor: pointer; padding: 0;
    }

    .hamburger {
      display: none; flex-direction: column; gap: 5px;
      background: none; border: none; cursor: pointer;
      padding: var(--space-1); flex-shrink: 0;
    }
    .hamburger span { display: block; width: 22px; height: 2px; background: var(--color-text); border-radius: 2px; }

    @media (max-width: 768px) {
      .sidebar { transform: translateX(-100%); width: var(--sidebar-w, 260px) !important; }
      .sidebar--open { transform: translateX(0); box-shadow: var(--shadow-lg); }
      .sidebar-close   { display: flex; }
      .sidebar-body, .sidebar-body.body--rail { margin-left: 0; }
      .hamburger       { display: flex; }
      .btn-collapse    { display: none; }
      .sidebar--collapsed .nav-label { display: unset; }
      .sidebar--collapsed .brand-block { display: flex; }
      .sidebar--collapsed .nav-group-label { display: block; }
      .sidebar--collapsed .sidebar-brand { justify-content: space-between; }
      .admin-main { padding: var(--space-4) var(--space-3); }
      .user-greeting-top { display: none; }
    }
    @media (min-width: 769px) {
      .sidebar-topbar .hamburger { display: none; }
    }
  `]
})
export class AdminLayoutComponent implements OnInit {
  usuarioNome = '';
  roleLabel   = '';
  readonly icons = icons;

  ehSuperAdmin = false;
  faculdades: FaculdadeResumo[] = [];
  faculdadeAtivaId: number | null = null;
  carregandoFaculdades = false;

  /** Instituição em gestão, exibida na sidebar como escopo dos grupos. */
  get nomeFaculdadeAtiva(): string | null {
    return this.faculdadeAtiva.nomeAtual;
  }

  private readonly _themeService = inject(ThemeService);

  readonly sidebarOpen = signal(false);
  readonly sidebarCollapsed = signal(
    localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  );
  readonly isCollapsed = computed(() => this.sidebarCollapsed());
  readonly bodyClass   = computed(() => {
    const base = 'sidebar-body';
    return this.isCollapsed() ? base + ' body--rail' : base;
  });

  private readonly _darkPref = toSignal(this._themeService.darkModePref$, { initialValue: 'system' as DarkPref });
  readonly darkModeTitle = computed(() => {
    const p = this._darkPref();
    const lbl = p === 'dark' ? 'Escuro' : p === 'light' ? 'Claro' : 'Automático';
    return `Tema: ${lbl} — clique para alternar`;
  });
  readonly darkModeIconName = computed(() => {
    const p = this._darkPref();
    return p === 'dark' ? 'moon' : p === 'light' ? 'sun' : 'contrast';
  });

  constructor(
    private authService: AuthService,
    private router: Router,
    public p: PermissionsService,
    private faculdadeAtiva: FaculdadeAtivaService,
  ) {
    const usuario = this.authService.getCurrentUser();
    if (usuario) {
      this.usuarioNome = usuario.nome;
      this.roleLabel   = this.p.getRoleLabel();
    }

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.sidebarOpen.set(false));
  }

  ngOnInit(): void {
    this.ehSuperAdmin = this.faculdadeAtiva.ehSuperAdmin();
    if (!this.ehSuperAdmin) return;

    this.faculdadeAtiva.faculdadeId$.subscribe(id => (this.faculdadeAtivaId = id));
    this.faculdadeAtiva.faculdades$.subscribe(lista => (this.faculdades = lista));

    // O guard já pediu a lista; aqui só aproveitamos o cache do serviço.
    this.carregandoFaculdades = true;
    this.faculdadeAtiva.carregarFaculdades().subscribe({
      next: () => (this.carregandoFaculdades = false),
      error: () => (this.carregandoFaculdades = false),
    });
  }

  /**
   * Troca a instituição gerenciada e recarrega a aplicação.
   *
   * O reload é intencional: cada tela do painel busca seus dados no ngOnInit, e
   * o `X-Faculdade-Id` novo só vale para requisições futuras — sem recarregar,
   * a tela continuaria mostrando os dados da instituição anterior.
   */
  trocarFaculdade(faculdadeId: number | null): void {
    if (faculdadeId === null || faculdadeId === this.faculdadeAtivaId) return;

    this.faculdadeAtiva.selecionar(faculdadeId);
    window.location.reload();
  }

  toggleSidebar():   void { this.sidebarOpen.update(v => !v); }
  closeSidebar():    void { this.sidebarOpen.set(false); }
  toggleCollapsed(): void {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  }
  toggleDark(): void { this._themeService.toggleDarkMode(); }
  logout(): void {
    if (confirm('Deseja realmente sair?')) {
      this.faculdadeAtiva.reset();
      this.authService.logout();
    }
  }
}
