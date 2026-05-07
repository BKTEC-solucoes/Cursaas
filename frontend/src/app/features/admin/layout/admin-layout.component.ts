import { Component, computed, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { ThemeService, DarkPref } from '../../../core/services/theme.service';

const SIDEBAR_COLLAPSED_KEY = 'admin_sidebar_collapsed';

/** SVG icons reutilizÃ¡veis */
const icons = {
  dashboard: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  cursos:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  aulas:     `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  provas:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  notas:     `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  presenca:  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  alunos:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  admins:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  cadastros: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
  solicit:   `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  institui:  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`,
};

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
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

        <!-- Nav â€” grupo VisÃ£o Geral -->
        <nav class="sidebar-nav">
          <div class="nav-group">
            @if (!isCollapsed()) {<span class="nav-group-label">VisÃ£o Geral</span>}
            <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" [title]="isCollapsed() ? 'Dashboard' : ''">
              <span class="icon" [innerHTML]="icons.dashboard"></span>
              <span class="nav-label">Dashboard</span>
            </a>
          </div>

          <div class="nav-group">
            @if (!isCollapsed()) {<span class="nav-group-label">AcadÃªmico</span>}
            @if (p.can('cursos:read')) {
              <a routerLink="/admin/cursos" routerLinkActive="active" [title]="isCollapsed() ? 'Cursos' : ''">
                <span class="icon" [innerHTML]="icons.cursos"></span>
                <span class="nav-label">Cursos</span>
              </a>
            }
            @if (p.can('aulas:read')) {
              <a routerLink="/admin/aulas" routerLinkActive="active" [title]="isCollapsed() ? 'Aulas' : ''">
                <span class="icon" [innerHTML]="icons.aulas"></span>
                <span class="nav-label">Aulas</span>
              </a>
            }
            @if (p.can('provas:read')) {
              <a routerLink="/admin/provas" routerLinkActive="active" [title]="isCollapsed() ? 'Provas' : ''">
                <span class="icon" [innerHTML]="icons.provas"></span>
                <span class="nav-label">Provas</span>
              </a>
            }
            @if (p.can('notas:read')) {
              <a routerLink="/admin/notas" routerLinkActive="active" [title]="isCollapsed() ? 'Notas' : ''">
                <span class="icon" [innerHTML]="icons.notas"></span>
                <span class="nav-label">Notas</span>
              </a>
            }
            @if (p.can('presenca:read')) {
              <a routerLink="/admin/presenca" routerLinkActive="active" [title]="isCollapsed() ? 'PresenÃ§a' : ''">
                <span class="icon" [innerHTML]="icons.presenca"></span>
                <span class="nav-label">PresenÃ§a</span>
              </a>
            }
          </div>

          <div class="nav-group">
            @if (!isCollapsed()) {<span class="nav-group-label">GestÃ£o</span>}
            @if (p.can('alunos:read')) {
              <a routerLink="/admin/alunos" routerLinkActive="active" [title]="isCollapsed() ? 'Alunos' : ''">
                <span class="icon" [innerHTML]="icons.alunos"></span>
                <span class="nav-label">Alunos</span>
              </a>
            }
            @if (p.can('administradores:read')) {
              <a routerLink="/admin/administradores" routerLinkActive="active" [title]="isCollapsed() ? 'Administradores' : ''">
                <span class="icon" [innerHTML]="icons.admins"></span>
                <span class="nav-label">Administradores</span>
              </a>
            }
            <a routerLink="/admin/cadastros" routerLinkActive="active" [title]="isCollapsed() ? 'Cadastros' : ''">
              <span class="icon" [innerHTML]="icons.cadastros"></span>
              <span class="nav-label">Cadastros</span>
            </a>
            <a routerLink="/admin/solicitacoes" routerLinkActive="active" [title]="isCollapsed() ? 'SolicitaÃ§Ãµes' : ''">
              <span class="icon" [innerHTML]="icons.solicit"></span>
              <span class="nav-label">SolicitaÃ§Ãµes</span>
            </a>
          </div>

          <div class="nav-group">
            @if (!isCollapsed()) {<span class="nav-group-label">Plataforma</span>}
            <a routerLink="/admin/instituicoes" routerLinkActive="active" [title]="isCollapsed() ? 'InstituiÃ§Ãµes' : ''">
              <span class="icon" [innerHTML]="icons.institui"></span>
              <span class="nav-label">InstituiÃ§Ãµes</span>
            </a>
          </div>
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
              <span [innerHTML]="darkModeIconSvg()"></span>
            </button>
            <button class="btn-logout-s" (click)="logout()" title="Sair">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              @if (!isCollapsed()) {<span>Sair</span>}
            </button>
          </div>
        </div>
      </aside>

      <!-- â•â•â• CONTEÃšDO â•â•â• -->
      <div [class]="bodyClass()">
        <header class="sidebar-topbar">
          <button class="hamburger" (click)="toggleSidebar()" aria-label="Abrir menu">
            <span></span><span></span><span></span>
          </button>
          <span class="topbar-title">Painel Administrativo</span>
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

    /* â”€â”€ Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

    /* â”€â”€ Brand â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

    /* â”€â”€ Nav â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

    /* â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

    /* â”€â”€ Collapsed (rail) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

    /* â”€â”€ Body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    .sidebar-body       { flex: 1; margin-left: var(--sidebar-w, 260px); display: flex; flex-direction: column; min-height: 100vh; }
    .sidebar-body.body--rail { margin-left: var(--sidebar-w-collapsed, 68px); }

    /* â”€â”€ Inner topbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

    .admin-main { flex: 1; padding: var(--density-section-gap) var(--space-5); }

    /* â”€â”€ Overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
export class AdminLayoutComponent {
  usuarioNome = '';
  roleLabel   = '';
  readonly icons = icons;

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
    const lbl = p === 'dark' ? 'Escuro' : p === 'light' ? 'Claro' : 'AutomÃ¡tico';
    return `Tema: ${lbl} â€” clique para alternar`;
  });
  readonly darkModeIconSvg = computed(() => {
    const p = this._darkPref();
    if (p === 'dark')  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    if (p === 'light') return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/></svg>`;
  });

  constructor(
    private authService: AuthService,
    private router: Router,
    public p: PermissionsService,
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
