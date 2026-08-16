import { Component, computed, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService, DarkPref } from '../../../core/services/theme.service';

import { IconComponent } from '../../../shared/components/icon.component';
/** Links de navegação compartilhados entre topbar e sidebar */
const NAV_ITEMS = [
  { path: '/instituicao/dashboard',    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`, label: 'Dashboard'     },
  { path: '/instituicao/perfil',       icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`, label: 'Perfil'        },
  { path: '/instituicao/alunos',       icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`, label: 'Alunos'        },
  { path: '/instituicao/solicitacoes', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`, label: 'Solicitações'  },
  { path: '/instituicao/cursos',       icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`, label: 'Cursos'        },
  { path: '/instituicao/aulas',        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`, label: 'Aulas'         },
  { path: '/instituicao/notas',        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`, label: 'Notas'         },
  { path: '/instituicao/tema',         icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`, label: 'Tema'          },
] as const;

const SIDEBAR_COLLAPSED_KEY = 'inst_sidebar_collapsed';

@Component({
  selector: 'app-instituicao-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, IconComponent],
  template: `
    <div [class]="isSidebar() ? 'layout-sidebar' : 'layout-topbar'">

      <!-- ═══ TOPBAR NAV (apenas no modo topbar) ═══ -->
      @if (!isSidebar()) {
        <header class="topbar">
          <div class="topbar-inner">
            <div class="topbar-brand">
              @if (logoUrl()) {
                <img [src]="logoUrl()!" alt="Logo" class="brand-logo" />
              } @else {
                <span class="brand-name">Cursaas</span>
              }
              <span class="inst-badge">Instituição</span>
            </div>
            <nav class="topbar-nav">
              @for (item of navItems; track item.path) {
                <a [routerLink]="item.path" routerLinkActive="active">
                  <span class="icon" [innerHTML]="item.icon"></span>{{ item.label }}
                </a>
              }
            </nav>
            <div class="topbar-user">
              <span class="user-greeting">{{ usuarioNome }}</span>
              <button class="btn-dark-toggle" (click)="toggleDark()" [title]="darkModeTitle()">
                <app-icon [name]="darkModeIconName()" />
              </button>
              <button class="btn-logout" (click)="logout()">Sair</button>
            </div>
          </div>
        </header>
      }

      <!-- ═══ SIDEBAR NAV ═══ -->
      @if (isSidebar()) {
        @if (sidebarOpen()) {
          <div class="sidebar-overlay" (click)="closeSidebar()"></div>
        }
        <aside class="sidebar"
               [class.sidebar--open]="sidebarOpen()"
               [class.sidebar--collapsed]="isCollapsed()">
          <div class="sidebar-brand">
            @if (!isCollapsed()) {
              <div class="brand-block">
                @if (logoUrl()) {
                  <img [src]="logoUrl()!" alt="Logo" class="brand-logo brand-logo--sidebar" />
                } @else {
                  <span class="brand-name">Cursaas</span>
                }
                <span class="inst-badge">Instituição</span>
              </div>
            } @else {
              @if (logoUrl()) {
                <img [src]="logoUrl()!" alt="Logo" class="brand-logo brand-logo--icon" />
              } @else {
                <span class="brand-icon">I</span>
              }
            }
            <div class="brand-actions">
              <button class="btn-collapse"
                      (click)="toggleCollapsed()"
                      [title]="isCollapsed() ? 'Expandir menu' : 'Recolher menu'">
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
          <nav class="sidebar-nav">
            @for (item of navItems; track item.path) {
              <a [routerLink]="item.path"
                 routerLinkActive="active"
                 (click)="closeSidebar()"
                 [attr.aria-label]="item.label"
                 [title]="isCollapsed() ? item.label : ''">
                <span class="icon" [innerHTML]="item.icon"></span>
                <span class="nav-label">{{ item.label }}</span>
              </a>
            }
          </nav>
          <div class="sidebar-footer">
            <div class="sidebar-user">
              <div class="s-avatar">{{ usuarioNome.charAt(0).toUpperCase() }}</div>
              @if (!isCollapsed()) {
                <span class="user-name truncate">{{ usuarioNome }}</span>
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
      }

      <!-- ═══ CONTEÚDO ═══ -->
      <div [class]="bodyClass()">
        @if (isSidebar()) {
          <header class="sidebar-topbar">
            <button class="hamburger" (click)="toggleSidebar()" aria-label="Abrir menu">
              <span></span><span></span><span></span>
            </button>
            @if (logoUrl()) {
                <img [src]="logoUrl()!" alt="Logo" class="brand-logo brand-logo--mobile" />
              } @else {
                <span class="brand-name brand-name--mobile">Cursaas</span>
              }
            <div class="topbar-user">
              <button class="btn-dark-toggle" (click)="toggleDark()" [title]="darkModeTitle()">
                <app-icon [name]="darkModeIconName()" />
              </button>
              <div class="s-avatar s-avatar--sm">{{ usuarioNome.charAt(0).toUpperCase() }}</div>
            </div>
          </header>
        }
        <main [class]="isSidebar() ? 'sidebar-main' : 'topbar-main'">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Layout topbar ────────────────────────────────────── */
    .layout-topbar { display: flex; flex-direction: column; min-height: 100vh; background: var(--background); }

    .topbar {
      background: var(--sidebar-bg);
      color: var(--sidebar-text-active);
      box-shadow: var(--shadow);
      position: sticky; top: 0; z-index: var(--z-sticky);
    }
    .topbar-inner {
      display: flex; align-items: center; gap: var(--space-4);
      max-width: var(--content-max-w, 1400px); margin: 0 auto;
      padding: 0 var(--space-5); height: var(--topbar-h, 64px);
    }
    .topbar-brand { display: flex; align-items: center; gap: var(--space-2); flex-shrink: 0; }
    .topbar-nav { display: flex; flex: 1; overflow-x: auto; scrollbar-width: none; }
    .topbar-nav::-webkit-scrollbar { display: none; }
    .topbar-nav a {
      display: flex; align-items: center; gap: var(--space-2);
      padding: 0 var(--space-3); height: var(--topbar-h, 64px);
      color: var(--sidebar-text); text-decoration: none;
      font-size: var(--font-size-sm); font-weight: 500;
      border-bottom: 3px solid transparent; white-space: nowrap;
      transition: background var(--transition-fast), color var(--transition-fast);
    }
    .topbar-nav a:hover  { color: var(--sidebar-text-active); background: var(--sidebar-bg-hover); }
    .topbar-nav a.active { color: var(--sidebar-text-active); border-bottom-color: var(--sidebar-indicator); background: var(--sidebar-active-bg); }
    .topbar-user { display: flex; align-items: center; gap: var(--space-3); flex-shrink: 0; }
    .topbar-content { display: contents; }
    .topbar-main { flex: 1; padding: var(--density-section-gap) var(--space-5); }

    /* ── Layout sidebar ─────────────────────────────────── */
    .layout-sidebar { display: flex; min-height: 100vh; background: var(--background); }

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

    .sidebar-brand {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--space-4);
      border-bottom: 1px solid var(--sidebar-border);
      flex-shrink: 0; min-height: 64px;
    }
    .brand-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .brand-name {
      font-family: var(--font-display); font-size: var(--font-size-xl);
      font-weight: 700; letter-spacing: -.5px;
      color: var(--sidebar-text-active); white-space: nowrap; overflow: hidden;
    }
    .brand-name--mobile { display: none; flex: 1; }
    .brand-logo {
      height: 36px; width: auto; max-width: 140px;
      object-fit: contain; display: block;
    }
    .brand-logo--sidebar { height: 32px; max-width: 120px; }
    .brand-logo--icon { height: 30px; width: 30px; object-fit: contain; }
    .brand-logo--mobile { height: 28px; max-width: 100px; flex: 1; }
    .brand-icon {
      width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
      background: var(--sidebar-indicator); color: #fff;
      font-family: var(--font-display); font-weight: 800;
      font-size: var(--font-size-lg); border-radius: var(--radius); flex-shrink: 0;
    }
    .brand-actions { display: flex; align-items: center; gap: var(--space-1); }
    .inst-badge {
      display: inline-flex; padding: 1px 8px;
      background: color-mix(in srgb, var(--color-info) 18%, transparent);
      color: var(--color-info); border-radius: var(--radius-full);
      font-size: 10px; font-weight: 700; letter-spacing: .03em;
      white-space: nowrap;
    }

    .sidebar-nav { flex: 1; padding: var(--space-3) var(--space-2); }
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

    .sidebar-footer {
      padding: var(--space-3) var(--space-3) var(--space-4);
      border-top: 1px solid var(--sidebar-border); flex-shrink: 0;
    }
    .sidebar-user {
      display: flex; align-items: center; gap: var(--space-2);
      padding: var(--space-2) var(--space-1); margin-bottom: var(--space-2); min-width: 0;
    }
    .s-avatar {
      width: 28px; height: 28px; border-radius: var(--radius-full);
      background: color-mix(in srgb, var(--sidebar-indicator) 35%, transparent);
      color: var(--sidebar-indicator); font-size: var(--font-size-xs); font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .s-avatar--sm { width: 26px; height: 26px; }
    .user-name { font-size: var(--font-size-sm); color: var(--sidebar-text); font-weight: 500; }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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

    .sidebar--collapsed { width: var(--sidebar-w-collapsed, 68px); }
    .sidebar--collapsed .nav-label,
    .sidebar--collapsed .brand-name,
    .sidebar--collapsed .brand-block { display: none; }
    .sidebar--collapsed .sidebar-nav a { justify-content: center; padding: var(--space-3) 0; border-left-color: transparent; }
    .sidebar--collapsed .sidebar-brand { justify-content: center; }
    .sidebar--collapsed .sidebar-footer { padding: var(--space-3) var(--space-2) var(--space-4); }
    .sidebar--collapsed .sidebar-user   { justify-content: center; }
    .sidebar--collapsed .user-name      { display: none; }
    .sidebar--collapsed .footer-actions { flex-direction: column; }
    .sidebar--collapsed .btn-logout-s   { flex: none; width: 34px; height: 34px; padding: 0; justify-content: center; }

    .sidebar-body       { flex: 1; min-width: 0; margin-left: var(--sidebar-w, 260px); display: flex; flex-direction: column; min-height: 100vh; }
    /* min-width:0 é obrigatório: sem ele o flex item herda min-width:auto e não
       encolhe abaixo do min-content do conteúdo — uma tabela larga esticava o
       layout inteiro e a página ganhava scroll horizontal, em vez da tabela
       rolar dentro do próprio wrapper com overflow-x:auto. */
    .sidebar-body.body--rail { margin-left: var(--sidebar-w-collapsed, 68px); }
    .sidebar-main       { flex: 1; min-width: 0; padding: var(--density-section-gap) var(--space-5); }

    .sidebar-topbar {
      display: flex; align-items: center; gap: var(--space-3);
      height: var(--sidebar-topbar-h, 56px); padding: 0 var(--space-5);
      background: var(--inner-topbar-bg, var(--color-surface));
      border-bottom: 1px solid var(--inner-topbar-border, var(--color-border));
      position: sticky; top: 0; z-index: var(--z-dropdown);
    }

    .sidebar-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.50); z-index: calc(var(--z-overlay) - 1);
      backdrop-filter: blur(3px);
    }

    .btn-dark-toggle {
      display: inline-flex; align-items: center; justify-content: center;
      width: 34px; height: 34px; padding: 0;
      background: rgba(255,255,255,.10); border: 1px solid rgba(255,255,255,.18);
      border-radius: var(--radius); color: var(--sidebar-text-active);
      cursor: pointer; transition: background var(--transition-fast); flex-shrink: 0;
    }
    .btn-dark-toggle:hover { background: rgba(255,255,255,.22); }

    /* O branco translúcido acima pressupõe fundo escuro — vale na topbar do
       layout topbar, que é pintada com o primary. Na .sidebar-topbar o botão
       fica sobre --color-surface (branco no modo claro) e o ícone, também
       branco, sumia. Aqui ele veste os tokens da superfície onde está. */
    .sidebar-topbar .btn-dark-toggle {
      background: var(--color-surface-2);
      border-color: var(--color-border);
      color: var(--color-text);
    }
    .sidebar-topbar .btn-dark-toggle:hover { background: var(--color-brand-tint); }

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

    .btn-logout {
      padding: var(--space-1) var(--space-3);
      background: rgba(255,255,255,.12); color: var(--sidebar-text-active);
      border: 1px solid rgba(255,255,255,.22); border-radius: var(--radius);
      cursor: pointer; font-size: var(--font-size-sm); font-weight: 500;
      transition: background var(--transition-fast); white-space: nowrap;
    }
    .btn-logout:hover { background: rgba(255,255,255,.24); }

    .hamburger {
      display: none; flex-direction: column; gap: 5px;
      background: none; border: none; cursor: pointer; padding: var(--space-1); flex-shrink: 0;
    }
    .hamburger span { display: block; width: 22px; height: 2px; background: var(--color-text); border-radius: 2px; }

    @media (max-width: 768px) {
      .sidebar { transform: translateX(-100%); width: var(--sidebar-w, 260px) !important; }
      .sidebar--open { transform: translateX(0); box-shadow: var(--shadow-lg); }
      .sidebar-close   { display: flex; }
      .sidebar-body, .sidebar-body.body--rail { margin-left: 0; }
      .hamburger       { display: flex; }
      .brand-name--mobile { display: block; }
      .btn-collapse    { display: none; }
      .sidebar--collapsed .nav-label { display: unset; }
      .sidebar--collapsed .brand-block { display: flex; }
      .sidebar--collapsed .sidebar-brand { justify-content: space-between; }
      .topbar-inner { flex-wrap: wrap; height: auto; padding: var(--space-2) var(--space-3) 0; }
      .topbar-brand { order: 1; }
      .topbar-user  { order: 2; margin-left: auto; }
      .topbar-nav   { order: 3; width: 100%; padding-bottom: var(--space-1); }
      .topbar-main, .sidebar-main { padding: var(--space-4) var(--space-3); }
    }
    @media (min-width: 769px) {
      .sidebar-topbar .hamburger { display: none; }
      .sidebar-topbar .brand-name--mobile { display: none; }
    }
  `]
})
export class InstituicaoLayoutComponent {
  readonly navItems = NAV_ITEMS;
  usuarioNome = '';

  private readonly _themeService = inject(ThemeService);

  readonly logoUrl = toSignal(this._themeService.logoUrl$, { initialValue: null as string | null });

  readonly isSidebar   = computed(() => this._layoutType() === 'sidebar');
  readonly sidebarOpen = signal(false);

  readonly sidebarCollapsed = signal(
    localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  );
  readonly isCollapsed = computed(() => this.sidebarCollapsed());

  readonly bodyClass = computed(() => {
    const base = this.isSidebar() ? 'sidebar-body' : 'topbar-content';
    return this.isSidebar() && this.isCollapsed() ? base + ' body--rail' : base;
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

  private readonly _layoutType = toSignal(
    this._themeService.layoutType$,
    { initialValue: 'topbar' as const },
  );

  constructor(private authService: AuthService, private router: Router) {
    const usuario = this.authService.getCurrentUser();
    if (usuario) this.usuarioNome = usuario.nome;

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.sidebarOpen.set(false);
        const url = (e as NavigationEnd).urlAfterRedirects;
        const pageName = url.split('/').pop()?.split('?')[0] ?? '';
        this._themeService.applyForPage(pageName);
      });
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
      this.authService.logout();
    }
  }
}
