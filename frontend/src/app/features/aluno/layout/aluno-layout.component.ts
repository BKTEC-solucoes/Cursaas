import { Component, computed, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService, DarkPref } from '../../../core/services/theme.service';

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

const NAV_ITEMS = [
  { path: '/aluno/dashboard', icon: '🏠', label: 'Dashboard' },
  { path: '/aluno/cursos',    icon: '📚', label: 'Cursos'    },
  { path: '/aluno/aulas',     icon: '🎥', label: 'Aulas'     },
  { path: '/aluno/provas',    icon: '📝', label: 'Provas'    },
  { path: '/aluno/notas',     icon: '📊', label: 'Notas'     },
  { path: '/aluno/presenca',  icon: '✓',  label: 'Presença'  },
  { path: '/aluno/catalogo',  icon: '🛒', label: 'Catálogo'  },
] as const;

@Component({
  selector: 'app-aluno-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
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
                  <span class="icon">{{ item.icon }}</span>{{ item.label }}
                </a>
              }
            </nav>
            <div class="topbar-user">
              <span class="user-greeting">{{ usuarioNome }}</span>
              <button class="btn-dark-toggle" (click)="toggleDark()" [title]="darkModeTitle()">{{ darkModeIcon() }}</button>
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
            }
            @if (isCollapsible()) {
              <button class="btn-collapse"
                      (click)="toggleCollapsed()"
                      [title]="isCollapsed() ? 'Expandir menu' : 'Recolher menu'"
                      [attr.aria-label]="isCollapsed() ? 'Expandir menu' : 'Recolher menu'">
                {{ isCollapsed() ? '▶' : '◀' }}
              </button>
            }
            <button class="sidebar-close" (click)="closeSidebar()" aria-label="Fechar menu">✕</button>
          </div>
          <nav class="sidebar-nav">
            @for (item of navItems; track item.path) {
              <a [routerLink]="item.path"
                 routerLinkActive="active"
                 (click)="closeSidebar()"
                 [attr.aria-label]="item.label"
                 [title]="isCollapsed() ? item.label : ''">
                <span class="icon">{{ item.icon }}</span>
                <span class="nav-label">{{ item.label }}</span>
              </a>
            }
          </nav>
          <div class="sidebar-footer">
            <span class="user-greeting">{{ usuarioNome }}</span>
            <button class="btn-dark-toggle btn-dark-toggle--sidebar" (click)="toggleDark()" [title]="darkModeTitle()">
              <span>{{ darkModeIcon() }}</span>
              <span class="toggle-label">{{ darkModeLabel() }}</span>
            </button>
            <button class="btn-logout" (click)="logout()">Sair</button>
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
              <span class="user-greeting">{{ usuarioNome }}</span>
              <button class="btn-dark-toggle"
                      (click)="toggleDark()"
                      [title]="darkModeTitle()">{{ darkModeIcon() }}</button>
              <button class="btn-logout" (click)="logout()">Sair</button>
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
    :host {
      --sidebar-w:           240px;
      --sidebar-w-collapsed:  60px;
      --topbar-h:             60px;
      --sidebar-topbar-h:     56px;
      --content-max-w:      1400px;
    }
    :host { display: block; }

    .layout-topbar {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--background);
    }

    .topbar {
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      color: var(--color-text-inverse);
      box-shadow: var(--shadow);
      position: sticky;
      top: 0;
      z-index: var(--z-sticky);
    }

    .topbar-inner {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 var(--space-5);
      height: var(--topbar-h);
      flex-wrap: nowrap;
    }

    .topbar-brand {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

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
      color: rgba(255, 255, 255, 0.88);
      text-decoration: none;
      font-size: var(--font-size-sm);
      font-weight: 500;
      border-bottom: 3px solid transparent;
      transition: background var(--transition-fast), color var(--transition-fast);
      white-space: nowrap;
    }
    .topbar-nav a:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }
    .topbar-nav a.active {
      color: #fff;
      border-bottom-color: var(--color-nav-indicator);
      background: rgba(255, 255, 255, 0.12);
    }

    .topbar-user {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex-shrink: 0;
    }

    .topbar-content { display: contents; }

    .topbar-main {
      flex: 1;
      padding: var(--density-section-gap) var(--space-5);
    }

    .sidebar-main { flex: 1; padding: var(--density-section-gap) var(--space-5); }

    .layout-sidebar {
      display: flex;
      min-height: 100vh;
      background: var(--background);
    }

    .sidebar {
      position: fixed;
      left: 0; top: 0;
      width: var(--sidebar-w);
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(180deg, var(--primary) 0%, var(--secondary) 100%);
      color: var(--color-text-inverse);
      z-index: var(--z-overlay);
      transition: transform var(--transition-base);
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-5) var(--space-4) var(--space-3);
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      flex-shrink: 0;
    }

    .sidebar-nav { flex: 1; padding: var(--space-2) 0; }

    .sidebar-nav a {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      color: rgba(255, 255, 255, 0.85);
      text-decoration: none;
      font-size: var(--font-size-sm);
      font-weight: 500;
      border-left: 3px solid transparent;
      transition: background var(--transition-fast), color var(--transition-fast);
    }
    .sidebar-nav a:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
    .sidebar-nav a.active {
      background: rgba(255, 255, 255, 0.14);
      color: #fff;
      border-left-color: var(--color-nav-indicator);
    }

    .sidebar-footer {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4) var(--space-5);
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      flex-shrink: 0;
    }

    .sidebar-close {
      display: none;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.8);
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: var(--space-1);
    }

    .sidebar-body {
      flex: 1;
      margin-left: var(--sidebar-w);
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .sidebar-topbar {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      height: var(--sidebar-topbar-h);
      padding: 0 var(--space-5);
      background: var(--primary);
      color: var(--color-text-inverse);
      box-shadow: var(--shadow-sm);
      position: sticky;
      top: 0;
      z-index: var(--z-dropdown);
    }

    .sidebar-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: calc(var(--z-overlay) - 1);
      backdrop-filter: blur(2px);
    }

    .brand-name {
      font-size: var(--font-size-xl);
      font-weight: 700;
      letter-spacing: -0.5px;
      color: var(--color-text-inverse);
    }

    .brand-logo { height: 32px; width: auto; object-fit: contain; }

    .brand-logo--sidebar {
      height: 28px;
      flex: 1;
      object-fit: contain;
      object-position: left;
    }

    .user-greeting { font-size: var(--font-size-sm); opacity: 0.9; }

    .btn-dark-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: var(--radius);
      color: var(--color-text-inverse);
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      flex-shrink: 0;
      transition: background var(--transition-fast), transform var(--transition-fast);
    }
    .btn-dark-toggle:hover {
      background: rgba(255, 255, 255, 0.28);
      transform: scale(1.08);
    }
    .btn-dark-toggle--sidebar {
      display: flex;
      width: 100%;
      height: auto;
      padding: var(--space-2) var(--space-3);
      gap: var(--space-2);
      justify-content: flex-start;
      font-size: 15px;
    }
    .toggle-label {
      font-size: var(--font-size-sm);
      font-weight: 500;
    }

    /* ── Botão colapso ────────────────────────────────────── */
    .btn-collapse {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: var(--radius);
      color: var(--color-text-inverse);
      cursor: pointer;
      font-size: 12px;
      flex-shrink: 0;
      transition: background var(--transition-fast);
    }
    .btn-collapse:hover { background: rgba(255, 255, 255, 0.25); }

    /* ── Sidebar colapsada (rail) ─────────────────────────── */
    .sidebar--collapsed {
      width: var(--sidebar-w-collapsed);
    }
    .sidebar--collapsed .nav-label,
    .sidebar--collapsed .brand-name,
    .sidebar--collapsed .sidebar-footer,
    .sidebar--collapsed .brand-logo--sidebar {
      display: none;
    }
    .sidebar--collapsed .sidebar-nav a {
      justify-content: center;
      padding: var(--space-3) 0;
      border-left-width: 2px;
    }
    .sidebar--collapsed .icon { font-size: 20px; }
    .sidebar--collapsed .sidebar-brand { justify-content: center; }

    .sidebar-body.body--rail { margin-left: var(--sidebar-w-collapsed); }

    /* Transição suave ao colapsar */
    .sidebar { transition: width var(--transition-base), transform var(--transition-base); }

    /* ── Conteúdo boxed ───────────────────────────────────── */
    .content--boxed {
      max-width: var(--content-max-w);
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }

    .btn-logout {
      padding: var(--space-1) var(--space-3);
      background: rgba(255, 255, 255, 0.18);
      color: var(--color-text-inverse);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: var(--radius);
      cursor: pointer;
      font-size: var(--font-size-sm);
      font-weight: 500;
      transition: background var(--transition-fast);
      white-space: nowrap;
    }
    .btn-logout:hover { background: rgba(255, 255, 255, 0.3); }

    .icon { font-size: 15px; }
    .nav-label { line-height: 1; }

    .hamburger {
      display: none;
      flex-direction: column;
      gap: 5px;
      background: none;
      border: none;
      cursor: pointer;
      padding: var(--space-1);
    }
    .hamburger span {
      display: block;
      width: 22px;
      height: 2px;
      background: var(--color-text-inverse);
      border-radius: 2px;
    }

    .brand-name--mobile { display: none; flex: 1; }

    @media (max-width: 768px) {
      .sidebar { transform: translateX(-100%); width: var(--sidebar-w) !important; }
      .sidebar--open { transform: translateX(0); box-shadow: var(--shadow-lg); }
      .sidebar--collapsed .nav-label,
      .sidebar--collapsed .brand-logo--sidebar { display: unset; }
      .sidebar--collapsed .sidebar-brand { justify-content: space-between; }
      .sidebar-close      { display: block; }
      .sidebar-body,
      .sidebar-body.body--rail { margin-left: 0; }
      .hamburger          { display: flex; }
      .brand-name--mobile { display: block; }
      .user-greeting      { display: none; }
      .btn-collapse       { display: none; }

      .topbar-inner { flex-wrap: wrap; height: auto; padding: var(--space-2) var(--space-3) 0; }
      .topbar-brand { order: 1; }
      .topbar-user  { order: 2; margin-left: auto; }
      .topbar-nav   { order: 3; width: 100%; padding-bottom: var(--space-1); }
      .topbar-nav a { padding: 0 var(--space-2); height: 44px; font-size: var(--font-size-xs); }

      .topbar-main, .sidebar-main { padding: var(--space-4) var(--space-3); }
    }

    @media (min-width: 769px) {
      .sidebar-topbar .hamburger          { display: none; }
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
  readonly darkModeIcon  = computed(() => {
    const p = this._darkPref();
    return p === 'dark' ? '🌙' : p === 'light' ? '☀️' : '🌓';
  });
  readonly darkModeLabel = computed(() => {
    const p = this._darkPref();
    return p === 'dark' ? 'Escuro' : p === 'light' ? 'Claro' : 'Automático';
  });
  readonly darkModeTitle = computed(() => `Tema: ${this.darkModeLabel()} — clique para alternar`);

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
