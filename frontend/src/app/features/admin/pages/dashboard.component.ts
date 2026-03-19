import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">
      <div class="header-greet">
        <h1>Bem-vindo, {{ usuarioNome }}!</h1>
        <p class="subtitle">Controle total da plataforma EAD Cursaas</p>
      </div>

      <div class="quick-actions">
        <h2>Ações Rápidas</h2>
        <div class="actions-grid">
          <a routerLink="/admin/cursos" class="action-btn action-cursos">
            <div class="action-icon">📚</div>
            <div class="action-title">Gerenciar Cursos</div>
            <div class="action-desc">Criar, editar e deletar cursos</div>
          </a>

          <a routerLink="/admin/aulas" class="action-btn action-aulas">
            <div class="action-icon">🎥</div>
            <div class="action-title">Aulas & Vídeos</div>
            <div class="action-desc">Criar aulas e fazer upload de vídeos</div>
          </a>

          <a routerLink="/admin/provas" class="action-btn action-provas">
            <div class="action-icon">📝</div>
            <div class="action-title">Criar Provas</div>
            <div class="action-desc">Gerenciar avaliações e questões</div>
          </a>

          <a routerLink="/admin/notas" class="action-btn action-notas">
            <div class="action-icon">📊</div>
            <div class="action-title">Lançar Notas</div>
            <div class="action-desc">Gerenciar notas dos alunos</div>
          </a>

          <a routerLink="/admin/presenca" class="action-btn action-presenca">
            <div class="action-icon">✓</div>
            <div class="action-title">Presença</div>
            <div class="action-desc">Ver frequência automática</div>
          </a>

          <a routerLink="/admin/administradores" class="action-btn action-administradores">
            <div class="action-icon">🔐</div>
            <div class="action-title">Administradores</div>
            <div class="action-desc">Cadastrar novos admins</div>
          </a>
        </div>
      </div>

      <div class="stats-section">
        <h2>Estatísticas da Plataforma</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">📚</div>
            <div class="stat-value">{{ totalCursos }}</div>
            <div class="stat-label">Cursos Ativos</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-value">{{ totalAlunos }}</div>
            <div class="stat-label">Alunos Inscritos</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🎥</div>
            <div class="stat-value">{{ totalAulas }}</div>
            <div class="stat-label">Aulas Criadas</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📝</div>
            <div class="stat-value">{{ totalProvas }}</div>
            <div class="stat-label">Provas Criadas</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1400px;
      margin: 0 auto;
    }

    .header-greet {
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
      color: white;
      padding: 40px 30px;
      border-radius: 8px;
      margin-bottom: 40px;
    }

    .header-greet h1 {
      margin: 0 0 10px 0;
      font-size: 32px;
      font-weight: 700;
    }

    .header-greet .subtitle {
      margin: 0;
      font-size: 16px;
      opacity: 0.9;
    }

    .quick-actions {
      margin-bottom: 40px;
    }

    .quick-actions h2 {
      margin: 0 0 20px 0;
      color: #333;
      font-size: 20px;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 15px;
    }

    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 25px 15px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-decoration: none;
      color: #333;
      transition: all 0.3s ease;
      cursor: pointer;
      border: 2px solid transparent;
    }

    .action-btn:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .action-btn.action-cursos:hover {
      border-color: #2c3e50;
      background: #f0f5f9;
    }

    .action-btn.action-aulas:hover {
      border-color: #e74c3c;
      background: #ffe8e8;
    }

    .action-btn.action-provas:hover {
      border-color: #f39c12;
      background: #fff8e8;
    }

    .action-btn.action-notas:hover {
      border-color: #27ae60;
      background: #e8f9e8;
    }

    .action-btn.action-presenca:hover {
      border-color: #3498db;
      background: #e8f4ff;
    }

    .action-btn.action-administradores:hover {
      border-color: #2c3e50;
      background: #eef2f5;
    }

    .action-icon {
      font-size: 32px;
      margin-bottom: 10px;
    }

    .action-title {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 5px;
      text-align: center;
    }

    .action-desc {
      font-size: 12px;
      color: #999;
      text-align: center;
      line-height: 1.4;
    }

    .stats-section {
      margin-top: 40px;
    }

    .stats-section h2 {
      margin: 0 0 20px 0;
      color: #333;
      font-size: 20px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }

    .stat-card {
      background: white;
      border-radius: 8px;
      padding: 25px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
      transition: transform 0.2s;
      border-left: 4px solid #2c3e50;
    }

    .stat-card:hover {
      transform: translateY(-2px);
    }

    .stat-icon {
      font-size: 36px;
      margin-bottom: 12px;
    }

    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 8px;
    }

    .stat-label {
      color: #666;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .header-greet {
        padding: 30px 20px;
      }

      .header-greet h1 {
        font-size: 24px;
      }

      .header-greet .subtitle {
        font-size: 14px;
      }

      .actions-grid {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 10px;
      }

      .action-btn {
        padding: 20px 10px;
      }

      .action-icon {
        font-size: 28px;
      }

      .action-title {
        font-size: 13px;
      }

      .action-desc {
        font-size: 11px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  usuarioNome = '';
  totalCursos = 0;
  totalAlunos = 0;
  totalProvas = 0;
  totalAulas = 0;

  constructor(private apiService: ApiService, private authService: AuthService) {
    const usuario = this.authService.getCurrentUser();
    if (usuario) {
      this.usuarioNome = usuario.nome;
    }
  }

  ngOnInit() {
    this.loadStats();
  }

  loadStats(): void {
    // Carrega dados dos endpoints da API
    this.apiService.getCursos().subscribe({
      next: (cursos: any) => {
        this.totalCursos = Array.isArray(cursos) ? cursos.length : 0;
      },
      error: () => this.totalCursos = 0
    });

    // Você pode adicionar mais chamadas conforme os endpoints estiverem disponíveis
    this.totalAlunos = 0;
    this.totalProvas = 0;
    this.totalAulas = 0;
  }
}
