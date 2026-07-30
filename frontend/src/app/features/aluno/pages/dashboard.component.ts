import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-aluno-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">
      <div class="header-greet">
        <h1>Bem-vindo, {{ usuarioNome }}!</h1>
        <p class="subtitle">Portal EAD Cursaas</p>
      </div>

      <div class="quick-actions">
        <h2>Ações Rápidas</h2>
        <div class="actions-grid">
          <a routerLink="/aluno/cursos" class="action-btn action-cursos">
            <div class="action-icon">📚</div>
            <div class="action-title">Meus Cursos</div>
            <div class="action-desc">Visualizar cursos inscritos</div>
          </a>

          <a routerLink="/aluno/aulas" class="action-btn action-aulas">
            <div class="action-icon">🎥</div>
            <div class="action-title">Aulas & Vídeos</div>
            <div class="action-desc">Assistir aulas do seu curso</div>
          </a>

          <a routerLink="/aluno/provas" class="action-btn action-provas">
            <div class="action-icon">📝</div>
            <div class="action-title">Provas</div>
            <div class="action-desc">Responder avaliações</div>
          </a>

          <a routerLink="/aluno/notas" class="action-btn action-notas">
            <div class="action-icon">📊</div>
            <div class="action-title">Minhas Notas</div>
            <div class="action-desc">Ver notas e desempenho</div>
          </a>

          <a routerLink="/aluno/presenca" class="action-btn action-presenca">
            <div class="action-icon">✓</div>
            <div class="action-title">Presença</div>
            <div class="action-desc">Acompanhar frequência</div>
          </a>
        </div>
      </div>

      <div class="stats-section">
        <h2>Resumo do Desempenho</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">📚</div>
            <div class="stat-value">{{ meusCursos }}</div>
            <div class="stat-label">Cursos Inscritos</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📝</div>
            <div class="stat-value">{{ minhasNotas }}</div>
            <div class="stat-label">Notas Registradas</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">✓</div>
            <div class="stat-value">{{ minhaPresenca }}%</div>
            <div class="stat-label">Presença Média</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0;
    }

    .header-greet {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
      border-color: #667eea;
      background: #f0f4ff;
    }

    .action-btn.action-aulas:hover {
      border-color: #E83E8C;
      background: #ffe8f9;
    }

    .action-btn.action-provas:hover {
      border-color: #FFC107;
      background: #fff8e8;
    }

    .action-btn.action-notas:hover {
      border-color: #28A745;
      background: #e8f9e8;
    }

    .action-btn.action-presenca:hover {
      border-color: #17A2B8;
      background: #e8f9fb;
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
      color: #667eea;
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
export class AlunoDashboardComponent implements OnInit {
  usuarioNome = '';
  meusCursos = 0;
  minhasNotas = 0;
  minhaPresenca = 75;

  constructor(private authService: AuthService, private apiService: ApiService) {}

  ngOnInit() {
    const usuario = this.authService.getCurrentUser();
    if (usuario) {
      this.usuarioNome = usuario.nome;
    }
    this.loadStats();
  }

  loadStats(): void {
    const usuario = this.authService.getCurrentUser();
    if (!usuario) {
      this.meusCursos = 0;
      return;
    }

    // Matrículas reais do aluno, não o catálogo.
    //
    // Isto usava getCursos(), que bate em /cursos/catalogo — a VITRINE da
    // faculdade. O card dizia "Cursos Inscritos" exibindo a contagem de tudo
    // que a instituição publicou, então um aluno sem matrícula nenhuma via
    // dezenas de "cursos inscritos".
    this.apiService.getCursosAluno(usuario.id).subscribe({
      next: (cursos: any) => {
        this.meusCursos = Array.isArray(cursos) ? cursos.length : 0;
      },
      error: () => this.meusCursos = 0
    });
  }
}
