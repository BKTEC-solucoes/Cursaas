import { Component, computed, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService, DarkPref } from '../../../core/services/theme.service';

import { IconComponent } from '../../../shared/components/icon.component';
const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

const NAV_ITEMS = [
  { path: '/aluno/dashboard', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`, label: 'Dashboard' },
  { path: '/aluno/cursos',    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`, label: 'Cursos'    },
  { path: '/aluno/aulas',     icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`, label: 'Aulas'     },
  { path: '/aluno/provas',    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`, label: 'Provas'    },
  { path: '/aluno/notas',     icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`, label: 'Notas'     },
  { path: '/aluno/presenca',  icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`, label: 'Presença'  },
  { path: '/aluno/catalogo',  icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`, label: 'Catálogo'  },
] as const;

@Component({
  selector: 'app-aluno-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, IconComponent],
  template: `
    <div [class]="isSidebar() ? 'layout-sidebar' : 'layout-topbar'">

      <!-- ═══ TOPBAR ═══ -->
      @if (!isSidebar()) {
        <header class="topbar">
          <div class="topbar-inner">
            <div class="topbar-brand">
              @if (logoUrl()) {
                <img [src]="logoUrl()" alt="Logo" class="brand-logo" />
              } @else {
                <span class="brand-name">Cursaas</span>
              }
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

      <!-- ═══ SIDEBAR ═══ -->
      @if (isSidebar()) {
        @if (sidebarOpen()) {
          <div class="sidebar-overlay" (click)="closeSidebar()"></div>
        }
        <aside class="sidebar"
               [class.sidebar--open]="sidebarOpen()"
               [class.sidebar--collapsed]="isCollapsed()">
          <div class="sidebar-brand">
            @if (!isCollapsed()) {
              @if (logoUrl()) {
                <img [src]="logoUrl()" alt="Logo" class="brand-logo brand-logo--sidebar" />
              } @else {
                <span class="brand-name">Cursaas</span>
              }
            } @else {
              <span class="brand-icon">C</span>
            }
            @if (isCollapsible()) {
              <button class="btn-collapse"
                      (click)="toggleCollapsed()"
                      [title]="isCollapsed() ? 'Expandir menu' : 'Recolher menu'"
                      [attr.aria-label]="isCollapsed() ? 'Expandir menu' : 'Recolher menu'">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  @if (isCollapsed()) {
                    <polyline points="9 18 15 12 9 6"/>
                  } @else {
                    <polyline points="15 18 9 12 15 6"/>
                  }
                </svg>
              </button>
            }
            <button class="sidebar-close" (click)="closeSidebar()" aria-label="Fechar menu">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
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
              <div class="avatar avatar--sm sidebar-avatar">{{ usuarioNome.charAt(0).toUpperCase() }}</div>
              @if (!isCollapsed()) {
                <span class="user-name truncate">{{ usuarioNome }}</span>
              }
            </div>
            <div class="sidebar-footer-actions">
              <button class="btn-icon-sidebar" (click)="toggleDark()" [title]="darkModeTitle()">
                <app-icon [name]="darkModeIconName()" />
              </button>
              <button class="btn-logout-sidebar" (click)="logout()" title="Sair">
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
            <span class="brand-name brand-name--mobile">Cursaas</span>
            <div class="topbar-user">
              <button class="btn-dark-toggle"
                      (click)="toggleDark()"
                      [title]="darkModeTitle()">
                <app-icon [name]="darkModeIconName()" />
              </button>
              <div class="avatar avatar--sm">{{ usuarioNome.charAt(0).toUpperCase() }}</div>
            </div>
          </header>
        }
        <main [class]="mainClass()">
          <div [class]="contentClass()">
            <router-outlet />
          </div>
        </main>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Layout topbar ──────────────────────────────────────── */
    .layout-topbar {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--background);
    }

    .topbar {
      background: var(--sidebar-bg);
      color: var(--sidebar-text-active);
      box-shadow: var(--shadow);
      position: sticky;
      top: 0;
      z-index: var(--z-sticky);
    }

    .topbar-inner {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      max-width: var(--content-max-w);
      margin: 0 auto;
      padding: 0 var(--space-5);
      height: var(--topbar-h);
      flex-wrap: nowrap;
    }

    .topbar-brand { display: flex; align-items: center; flex-shrink: 0; }

    .topbar-nav {
      display: flex;
      flex: 1;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .topbar-nav::-webkit-scrollbar { display: none; }

    .topbar-nav a {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 0 var(--space-3);
      height: var(--topbar-h);
      color: var(--sidebar-text);
      text-decoration: none;
      font-size: var(--font-size-sm);
      font-weight: 500;
      border-bottom: 3px solid transparent;
      transition: background var(--transition-fast), color var(--transition-fast);
      white-space: nowrap;
    }
    .topbar-nav a:hover { color: var(--sidebar-text-active); background: var(--sidebar-bg-hover); }
    .topbar-nav a.active {
      color: var(--sidebar-text-active);
      border-bottom-color: var(--sidebar-indicator);
      background: var(--sidebar-active-bg);
    }

    .topbar-user {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex-shrink: 0;
    }

    .topbar-content { display: contents; }
    .topbar-main    { flex: 1; padding: var(--density-section-gap) var(--space-5); }

    /* ── Layout sidebar ─────────────────────────────────────── */
    .layout-sidebar {
      display: flex;
      min-height: 100vh;
      background: var(--background);
    }

    /* ── Sidebar shell ──────────────────────────────────────── */
    .sidebar {
      position: fixed;
      left: 0; top: 0;
      width: var(--sidebar-w, 260px);
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--sidebar-bg);
      color: var(--sidebar-text);
      z-index: var(--z-overlay);
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.15) transparent;
      transition: width var(--transition-base), transform var(--transition-base);
    }

    /* ── Sidebar brand ──────────────────────────────────────── */
    .sidebar-brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4) var(--space-4) var(--space-3);
      border-bottom: 1px solid var(--sidebar-border);
      flex-shrink: 0;
      min-height: 64px;
    }

    .brand-name {
      font-family: var(--font-display);
      font-size: var(--font-size-xl);
      font-weight: 700;
      letter-spacing: -0.5px;
      color: var(--sidebar-text-active);
      white-space: nowrap;
      overflow: hidden;
    }

    .brand-icon {
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--sidebar-indicator);
      color: #fff;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: var(--font-size-lg);
      border-radius: var(--radius);
      flex-shrink: 0;
    }

    .brand-logo { height: 32px; width: auto; object-fit: contain; }
    .brand-logo--sidebar { height: 28px; flex: 1; object-fit: contain; object-position: left; }

    /* ── Sidebar nav ────────────────────────────────────────── */
    .sidebar-nav { flex: 1; padding: var(--space-3) var(--space-2); }

    .sidebar-nav a {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      color: var(--sidebar-text);
      text-decoration: none;
      font-size: var(--font-size-sm);
      font-weight: 500;
      border-radius: var(--radius);
      border-left: 3px solid transparent;
      margin-bottom: 2px;
      transition: background var(--transition-fast), color var(--transition-fast);
    }
    .sidebar-nav a:hover {
      background: var(--sidebar-bg-hover);
      color: var(--sidebar-text-active);
    }
    .sidebar-nav a.active {
      background: var(--sidebar-active-bg);
      color: var(--sidebar-text-active);
      border-left-color: var(--sidebar-indicator);
      font-weight: 600;
    }
    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      opacity: var(--sidebar-icon-opacity);
      line-height: 1;
    }
    .sidebar-nav a.active .icon,
    .sidebar-nav a:hover  .icon { opacity: 1; }

    /* ── Sidebar footer ─────────────────────────────────────── */
    .sidebar-footer {
      padding: var(--space-3) var(--space-3) var(--space-4);
      border-top: 1px solid var(--sidebar-border);
      flex-shrink: 0;
    }

    .sidebar-user {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-1);
      margin-bottom: var(--space-2);
      min-width: 0;
    }

    .sidebar-avatar {
      background: color-mix(in srgb, var(--sidebar-indicator) 35%, transparent);
      color: var(--sidebar-indicator);
      font-weight: 700;
      flex-shrink: 0;
    }

    .user-name {
      font-size: var(--font-size-sm);
      color: var(--sidebar-text);
      font-weight: 500;
    }

    .sidebar-footer-actions {
      display: flex;
      gap: var(--space-2);
    }

    .btn-icon-sidebar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      background: rgba(255,255,255,0.08);
      border: 1px solid var(--sidebar-border);
      border-radius: var(--radius);
      color: var(--sidebar-text);
      cursor: pointer;
      transition: background var(--transition-fast);
      flex-shrink: 0;
    }
    .btn-icon-sidebar:hover { background: rgba(255,255,255,0.18); color: var(--sidebar-text-active); }

    .btn-logout-sidebar {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex: 1;
      padding: var(--space-2) var(--space-3);
      background: rgba(255,255,255,0.06);
      border: 1px solid var(--sidebar-border);
      border-radius: var(--radius);
      color: var(--sidebar-text);
      cursor: pointer;
      font-size: var(--font-size-sm);
      font-weight: 500;
      transition: background var(--transition-fast);
      white-space: nowrap;
      overflow: hidden;
    }
    .btn-logout-sidebar:hover { background: rgba(255,0,0,0.15); color: #fca5a5; }

    /* ── Sidebar colapsada (rail) ───────────────────────────── */
    .sidebar--collapsed { width: var(--sidebar-w-collapsed, 68px); }
    .sidebar--collapsed .nav-label,
    .sidebar--collapsed .brand-name,
    .sidebar--collapsed .brand-logo--sidebar { display: none; }
    .sidebar--collapsed .sidebar-nav a {
      justify-content: center;
      padding: var(--space-3) 0;
      border-left-width: 0;
      border-left-color: transparent;
      border-radius: var(--radius);
    }
    .sidebar--collapsed .sidebar-nav a.active { border-radius: var(--radius); }
    .sidebar--collapsed .sidebar-brand { justify-content: center; padding: var(--space-4) var(--space-2) var(--space-3); }
    .sidebar--collapsed .sidebar-footer { padding: var(--space-3) var(--space-2) var(--space-4); }
    .sidebar--collapsed .sidebar-user   { justify-content: center; }
    .sidebar--collapsed .user-name      { display: none; }
    .sidebar--collapsed .sidebar-footer-actions { flex-direction: column; }
    .sidebar--collapsed .btn-logout-sidebar { flex: none; width: 34px; height: 34px; padding: 0; justify-content: center; }

    .sidebar-body       { flex: 1; min-width: 0; margin-left: var(--sidebar-w, 260px); display: flex; flex-direction: column; min-height: 100vh; }
    /* min-width:0 é obrigatório: sem ele o flex item herda min-width:auto e não
       encolhe abaixo do min-content do conteúdo — uma tabela larga esticava o
       layout inteiro e a página ganhava scroll horizontal, em vez da tabela
       rolar dentro do próprio wrapper com overflow-x:auto. */
    .sidebar-body.body--rail { margin-left: var(--sidebar-w-collapsed, 68px); }
    .sidebar-main       { flex: 1; min-width: 0; padding: var(--density-section-gap) var(--space-5); }

    /* ── Inner topbar (sidebar mode) ────────────────────────── */
    .sidebar-topbar {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      height: var(--sidebar-topbar-h);
      padding: 0 var(--space-5);
      background: var(--inner-topbar-bg);
      border-bottom: 1px solid var(--inner-topbar-border);
      position: sticky;
      top: 0;
      z-index: var(--z-dropdown);
    }

    /* ── Overlay (mobile) ───────────────────────────────────── */
    .sidebar-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.50);
      z-index: calc(var(--z-overlay) - 1);
      backdrop-filter: blur(3px);
    }

    /* ── Buttons ────────────────────────────────────────────── */
    .btn-dark-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      padding: 0;
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: var(--radius);
      color: var(--sidebar-text-active);
      cursor: pointer;
      transition: background var(--transition-fast);
      flex-shrink: 0;
    }
    .btn-dark-toggle:hover { background: rgba(255,255,255,0.22); }

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
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      background: rgba(255,255,255,0.08);
      border: 1px solid var(--sidebar-border);
      border-radius: var(--radius);
      color: var(--sidebar-text);
      cursor: pointer;
      flex-shrink: 0;
      transition: background var(--transition-fast);
    }
    .btn-collapse:hover { background: rgba(255,255,255,0.18); color: var(--sidebar-text-active); }

    .sidebar-close {
      display: none;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: none;
      border: none;
      color: var(--sidebar-text);
      cursor: pointer;
      padding: 0;
    }

    .btn-logout {
      padding: var(--space-1) var(--space-3);
      background: rgba(255,255,255,0.12);
      color: var(--sidebar-text-active);
      border: 1px solid rgba(255,255,255,0.22);
      border-radius: var(--radius);
      cursor: pointer;
      font-size: var(--font-size-sm);
      font-weight: 500;
      transition: background var(--transition-fast);
      white-space: nowrap;
    }
    .btn-logout:hover { background: rgba(255,255,255,0.24); }

    /* ── Hamburger ──────────────────────────────────────────── */
    .hamburger {
      display: none;
      flex-direction: column;
      gap: 5px;
      background: none;
      border: none;
      cursor: pointer;
      padding: var(--space-1);
      flex-shrink: 0;
    }
    .hamburger span {
      display: block;
      width: 22px;
      height: 2px;
      background: var(--color-text);
      border-radius: 2px;
    }

    /* ── Content ────────────────────────────────────────────── */
    .content--boxed {
      max-width: var(--content-max-w);
      margin: 0 auto;
      width: 100%;
    }

    .brand-name--mobile { display: none; flex: 1; }
    .nav-label { line-height: 1; }

    /* ── Avatar local (sem conflito com global) ─────────────── */
    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--radius-full);
      background: color-mix(in srgb, var(--primary) 20%, transparent);
      color: var(--primary);
      font-size: var(--font-size-sm);
      font-weight: 700;
      flex-shrink: 0;
    }
    .avatar--sm { width: 28px; height: 28px; font-size: var(--font-size-xs); }

    /* ── Responsive ─────────────────────────────────────────── */
    @media (max-width: 768px) {
      .sidebar { transform: translateX(-100%); width: var(--sidebar-w, 260px) !important; }
      .sidebar--open { transform: translateX(0); box-shadow: var(--shadow-lg); }
      .sidebar--collapsed .nav-label,
      .sidebar--collapsed .brand-logo--sidebar { display: unset; }
      .sidebar--collapsed .sidebar-brand { justify-content: space-between; }
      .sidebar-close   { display: flex; }
      .sidebar-body,
      .sidebar-body.body--rail { margin-left: 0; }
      .hamburger       { display: flex; }
      .brand-name--mobile { display: block; }
      .btn-collapse    { display: none; }

      .topbar-inner { flex-wrap: wrap; height: auto; padding: var(--space-2) var(--space-3) 0; }
      .topbar-brand { order: 1; }
      .topbar-user  { order: 2; margin-left: auto; }
      .topbar-nav   { order: 3; width: 100%; padding-bottom: var(--space-1); }
      .topbar-nav a { padding: 0 var(--space-2); height: 44px; font-size: var(--font-size-xs); }

      .topbar-main, .sidebar-main { padding: var(--space-4) var(--space-3); }
    }

    @media (min-width: 769px) {
      .sidebar-topbar .hamburger      { display: none; }
      .sidebar-topbar .brand-name--mobile { display: none; }
    }
  `]
})
export class AlunoLayoutComponent {
  readonly navItems = NAV_ITEMS;
  usuarioNome = '';

  private readonly _themeService = inject(ThemeService);

  readonly isSidebar    = computed(() => this._layoutType() === 'sidebar');
  readonly sidebarOpen  = signal(false);
  readonly logoUrl      = toSignal(this._themeService.logoUrl$, { initialValue: null as string | null });

  // ── Colapso da sidebar ──────────────────────────────────────
  readonly sidebarCollapsed = signal(
    localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  );

  readonly isCollapsible = toSignal(this._themeService.sidebarCollapsible$, { initialValue: true });

  /** Recolhido E colapsável E tela larga */
  readonly isCollapsed = computed(() => this.isCollapsible() !== false && this.sidebarCollapsed());

  // ── Content width ───────────────────────────────────────────
  readonly contentWidth = toSignal(this._themeService.contentWidth$, { initialValue: 'boxed' as 'full' | 'boxed' });

  // ── Classes computadas ──────────────────────────────────────
  readonly bodyClass = computed(() => {
    const base = this.isSidebar() ? 'sidebar-body' : 'topbar-content';
    return this.isSidebar() && this.isCollapsed() ? base + ' body--rail' : base;
  });

  readonly mainClass = computed(() => this.isSidebar() ? 'sidebar-main' : 'topbar-main');

  readonly contentClass = computed(() =>
    this.contentWidth() === 'boxed' ? 'content--boxed' : '',
  );

  // ── Dark mode ───────────────────────────────────────────────
  private readonly _darkPref = toSignal(this._themeService.darkModePref$, { initialValue: 'system' as DarkPref });
  readonly darkModeLabel = computed(() => {
    const p = this._darkPref();
    return p === 'dark' ? 'Escuro' : p === 'light' ? 'Claro' : 'Automático';
  });
  readonly darkModeTitle = computed(() => `Tema: ${this.darkModeLabel()} — clique para alternar`);
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
        const url     = (e as NavigationEnd).urlAfterRedirects;
        const pageName = url.split('/').pop()?.split('?')[0] ?? '';
        this._themeService.applyForPage(pageName);
        const token = this.authService.getToken();
        if (token) this._themeService.recarregarSeVencido(token);
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
