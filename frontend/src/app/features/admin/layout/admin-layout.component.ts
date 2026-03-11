import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
    <div class="admin-container">
      <header class="admin-header">
        <div class="header-content">
          <div class="header-top">
            <h1>🔐 Painel Administrativo</h1>
            <div class="user-menu">
              <span class="user-greeting">{{ usuarioNome }}</span>
              <button class="btn-logout" (click)="logout()">Sair</button>
            </div>
          </div>
          <nav class="navbar">
            <a routerLink="/admin" routerLinkActive="active">
              <span class="icon">📊</span>Dashboard
            </a>
            <a routerLink="/admin/cursos" routerLinkActive="active">
              <span class="icon">📚</span>Cursos
            </a>
            <a routerLink="/admin/aulas" routerLinkActive="active">
              <span class="icon">🎥</span>Aulas
            </a>
            <a routerLink="/admin/provas" routerLinkActive="active">
              <span class="icon">📝</span>Provas
            </a>
            <a routerLink="/admin/notas" routerLinkActive="active">
              <span class="icon">📊</span>Notas
            </a>
            <a routerLink="/admin/presenca" routerLinkActive="active">
              <span class="icon">✓</span>Presença
            </a>
            <a routerLink="/admin/alunos" routerLinkActive="active">
              <span class="icon">👤</span>Alunos
            </a>
          </nav>
        </div>
      </header>
      <main>
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .admin-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background-color: #f5f5f5;
    }

    .admin-header {
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
      color: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-content {
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .header-top h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .user-greeting {
      font-size: 14px;
      opacity: 0.95;
    }

    .btn-logout {
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-logout:hover {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.5);
    }

    .navbar {
      display: flex;
      gap: 0;
      padding: 0;
      margin: 0;
      list-style: none;
      overflow-x: auto;
    }

    .navbar a {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 15px 18px;
      color: rgba(255, 255, 255, 0.9);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .navbar a:hover {
      color: white;
      background: rgba(255, 255, 255, 0.1);
    }

    .navbar a.active {
      color: white;
      border-bottom-color: #e74c3c;
      background: rgba(255, 255, 255, 0.1);
    }

    .icon {
      font-size: 16px;
    }

    main {
      flex: 1;
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
    }

    @media (max-width: 768px) {
      .header-top {
        padding: 12px 15px;
        flex-wrap: wrap;
      }

      .header-top h1 {
        font-size: 20px;
        flex: 1;
      }

      .user-greeting {
        display: none;
      }

      .navbar {
        overflow-x: auto;
        scrollbar-width: thin;
      }

      .navbar a {
        padding: 12px 12px;
        font-size: 12px;
        gap: 4px;
      }

      .icon {
        font-size: 14px;
      }

      main {
        padding: 15px;
      }
    }
  `]
})
export class AdminLayoutComponent {
  usuarioNome = '';

  constructor(private authService: AuthService) {
    const usuario = this.authService.getCurrentUser();
    if (usuario) {
      this.usuarioNome = usuario.nome;
    }
  }

  logout(): void {
    if (confirm('Deseja realmente sair?')) {
      this.authService.logout();
    }
  }
}
