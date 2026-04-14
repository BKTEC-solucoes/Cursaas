import { Component, computed, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

/** Links de navegação compartilhados entre topbar e sidebar */
const NAV_ITEMS = [
  { path: '/instituicao/dashboard',    icon: '🏠', label: 'Dashboard'     },
  { path: '/instituicao/perfil',       icon: '🏛️', label: 'Perfil'        },
  { path: '/instituicao/alunos',       icon: '👨‍🎓', label: 'Alunos'        },
  { path: '/instituicao/solicitacoes', icon: '📋', label: 'Solicitações'  },
  { path: '/instituicao/cursos',       icon: '📚', label: 'Cursos'        },
  { path: '/instituicao/aulas',        icon: '🎬', label: 'Aulas'         },
  { path: '/instituicao/notas',        icon: '📊', label: 'Notas'         },
  { path: '/instituicao/tema',         icon: '🎨', label: 'Tema'          },
] as const;

@Component({
  selector: 'app-instituicao-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <!-- ── Shell: class alterna entre modos sem destruir o router-outlet ── -->
    <div [class]="isSidebar() ? 'layout-sidebar' : 'layout-topbar'">

      <!-- ═══ TOPBAR NAV (apenas no modo topbar) ═══ -->
      @if (!isSidebar()) {
        <header class="topbar">
          <div class="topbar-inner">
            <div class="topbar-brand">
              <span class="brand-name">Cursaas</span>
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
              <button class="btn-logout" (click)="logout()">Sair</button>
            </div>
          </div>
        </header>
      }

      <!-- ═══ SIDEBAR NAV (apenas no modo sidebar) ═══ -->
      @if (isSidebar()) {
        @if (sidebarOpen()) {
          <div class="sidebar-overlay" (click)="closeSidebar()"></div>
        }
        <aside class="sidebar" [class.sidebar--open]="sidebarOpen()">
          <div class="sidebar-brand">
            <span class="brand-name">Cursaas</span>
            <button class="sidebar-close" (click)="closeSidebar()" aria-label="Fechar menu">✕</button>
          </div>
          <nav class="sidebar-nav">
            @for (item of navItems; track item.path) {
              <a [routerLink]="item.path" routerLinkActive="active" (click)="closeSidebar()">
                <span class="icon">{{ item.icon }}</span>
                <span class="nav-label">{{ item.label }}</span>
              </a>
            }
          </nav>
          <div class="sidebar-footer">
            <span class="user-greeting">{{ usuarioNome }}</span>
            <button class="btn-logout" (click)="logout()">Sair</button>
          </div>
        </aside>
      }

      <!-- ═══ CONTEÚDO: router-outlet NUNCA dentro de @if ═══ -->
      <div [class]="isSidebar() ? 'sidebar-body' : 'topbar-content'">
        @if (isSidebar()) {
          <header class="sidebar-topbar">
            <button class="hamburger" (click)="toggleSidebar()" aria-label="Abrir menu">
              <span></span><span></span><span></span>
            </button>
            <span class="brand-name brand-name--mobile">Cursaas</span>
            <div class="topbar-user">
              <span class="user-greeting">{{ usuarioNome }}</span>
              <button class="btn-logout" (click)="logout()">Sair</button>
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
    /* ── Tokens compartilhados ──────────────────────────────── */
    :host {
      --sidebar-w: 240px;
      --topbar-h:  60px;
      --sidebar-topbar-h: 56px;
    }

    /* ── Reset de host ─────────────────────────────────────── */
    :host { display: block; }

    /* ══════════════════════════════════════════════════════════
       TOPBAR LAYOUT
    ══════════════════════════════════════════════════════════ */

    .layout-topbar {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--background, #f5f5f5);
    }

    .topbar {
      background: linear-gradient(135deg, var(--primary, #1a6b3c) 0%, var(--secondary, #2d9e5f) 100%);
      color: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,.15);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .topbar-inner {
      display: flex;
      align-items: center;
      gap: 16px;
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 20px;
      height: var(--topbar-h);
      flex-wrap: nowrap;
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
      gap: 6px;
      padding: 0 14px;
      height: var(--topbar-h);
      color: rgba(255,255,255,.88);
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 500;
      border-bottom: 3px solid transparent;
      transition: background .15s, color .15s;
      white-space: nowrap;
    }
    .topbar-nav a:hover { color: #fff; background: rgba(255,255,255,.1); }
    .topbar-nav a.active {
      color: #fff;
      border-bottom-color: #FFD700;
      background: rgba(255,255,255,.12);
    }

    .topbar-user {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    /* Wrapper transparente no modo topbar: não interfere no flex */
    .topbar-content { display: contents; }

    .topbar-main {
      flex: 1;
      padding: 24px 20px;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }

    /* ══════════════════════════════════════════════════════════
       SIDEBAR LAYOUT
    ══════════════════════════════════════════════════════════ */

    .layout-sidebar {
      display: flex;
      min-height: 100vh;
      background: var(--background, #f5f5f5);
    }

    /* ── Sidebar ──────────────────────────────────────────── */
    .sidebar {
      position: fixed;
      left: 0; top: 0;
      width: var(--sidebar-w);
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(180deg, var(--primary, #1a6b3c) 0%, var(--secondary, #0f4b2a) 100%);
      color: #fff;
      z-index: 200;
      transition: transform .25s ease;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,.2) transparent;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 16px 12px;
      border-bottom: 1px solid rgba(255,255,255,.15);
      flex-shrink: 0;
    }

    .sidebar-nav {
      flex: 1;
      padding: 8px 0;
    }

    .sidebar-nav a {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 16px;
      color: rgba(255,255,255,.85);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      border-left: 3px solid transparent;
      transition: background .15s, color .15s;
    }
    .sidebar-nav a:hover { background: rgba(255,255,255,.1); color: #fff; }
    .sidebar-nav a.active {
      background: rgba(255,255,255,.14);
      color: #fff;
      border-left-color: #FFD700;
    }

    .sidebar-footer {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 16px 20px;
      border-top: 1px solid rgba(255,255,255,.15);
      flex-shrink: 0;
    }

    .sidebar-close {
      display: none;
      background: none;
      border: none;
      color: rgba(255,255,255,.8);
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
    }

    /* ── Body (área direita da sidebar) ───────────────────── */
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
      gap: 12px;
      height: var(--sidebar-topbar-h);
      padding: 0 20px;
      background: var(--primary, #1a6b3c);
      color: #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,.12);
      position: sticky;
      top: 0;
      z-index: 99;
    }

    .hamburger {
      display: none;
      flex-direction: column;
      gap: 5px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
    }
    .hamburger span {
      display: block;
      width: 22px;
      height: 2px;
      background: #fff;
      border-radius: 2px;
      transition: transform .2s;
    }

    .brand-name--mobile { display: none; flex: 1; }

    .sidebar-main {
      flex: 1;
      padding: 24px 20px;
    }

    /* ── Overlay mobile ──────────────────────────────────── */
    .sidebar-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.45);
      z-index: 199;
      backdrop-filter: blur(2px);
    }

    /* ── Shared ──────────────────────────────────────────── */
    .brand-name {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -.5px;
    }

    .user-greeting {
      font-size: 13px;
      opacity: .9;
    }

    .btn-logout {
      padding: 6px 14px;
      background: rgba(255,255,255,.18);
      color: #fff;
      border: 1px solid rgba(255,255,255,.3);
      border-radius: var(--radius, 6px);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: background .15s;
      white-space: nowrap;
    }
    .btn-logout:hover { background: rgba(255,255,255,.3); }

    .icon { font-size: 15px; }
    .nav-label { line-height: 1; }

    /* ══════════════════════════════════════════════════════════
       RESPONSIVIDADE — SIDEBAR MOBILE (<= 768px)
    ══════════════════════════════════════════════════════════ */
    @media (max-width: 768px) {

      /* Sidebar: escondida por padrão, desliza quando aberta */
      .sidebar {
        transform: translateX(-100%);
      }
      .sidebar--open {
        transform: translateX(0);
        box-shadow: 4px 0 24px rgba(0,0,0,.25);
      }
      .sidebar-close { display: block; }

      /* Body: sem margem esquerda (sidebar é overlay) */
      .sidebar-body { margin-left: 0; }

      /* Hamburger e nome da marca visíveis */
      .hamburger { display: flex; }
      .brand-name--mobile { display: block; }

      /* Nome do usuário some no mobile */
      .user-greeting { display: none; }

      /* TopBar: empilha nav embaixo da brand */
      .topbar-inner {
        flex-wrap: wrap;
        height: auto;
        padding: 8px 12px 0;
      }
      .topbar-brand { order: 1; }
      .topbar-user  { order: 2; margin-left: auto; }
      .topbar-nav   { order: 3; width: 100%; padding-bottom: 4px; }
      .topbar-nav a { padding: 0 10px; height: 44px; font-size: 12.5px; }

      .topbar-main, .sidebar-main { padding: 16px 12px; }
    }

    /* Desktop: ocultar hamburger na sidebar */
    @media (min-width: 769px) {
      .sidebar-topbar .hamburger { display: none; }
      .sidebar-topbar .brand-name--mobile { display: none; }
    }
  `]
})
export class InstituicaoLayoutComponent {
  readonly navItems = NAV_ITEMS;
  usuarioNome = '';

  /** Signal derivado de ThemeService.layoutType$ */
  readonly isSidebar = computed(() => this._layoutType() === 'sidebar');

  /** Controla abertura da sidebar no mobile */
  readonly sidebarOpen = signal(false);

  private readonly _layoutType = toSignal(
    inject(ThemeService).layoutType$,
    { initialValue: 'topbar' as const },
  );

  constructor(private authService: AuthService, private router: Router) {
    const usuario = this.authService.getCurrentUser();
    if (usuario) this.usuarioNome = usuario.nome;

    const themeService = inject(ThemeService);

    // Aplica override de página ao navegar + fecha sidebar no mobile
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.sidebarOpen.set(false);
        // Extrai o último segmento da URL: /instituicao/alunos → 'alunos'
        const url = (e as NavigationEnd).urlAfterRedirects;
        const pageName = url.split('/').pop()?.split('?')[0] ?? '';
        themeService.applyForPage(pageName);
      });
  }

  toggleSidebar(): void  { this.sidebarOpen.update(v => !v); }
  closeSidebar(): void   { this.sidebarOpen.set(false); }

  logout(): void {
    if (confirm('Deseja realmente sair?')) {
      this.authService.logout();
    }
  }
}
