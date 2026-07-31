import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CursosService } from '../../../core/services/cursos.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="content-page">
      <div class="dash-hero">
        <div>
          <h1>Bem-vindo, {{ usuarioNome }}</h1>
          <p>Controle total da plataforma EAD Cursaas</p>
        </div>
      </div>

      <h2 class="section-heading">Ações rápidas</h2>
      <div class="actions-grid">
        <a routerLink="/admin/cursos" class="action-card">
          <div class="action-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <div class="action-title">Gerenciar Cursos</div>
          <div class="action-desc">Criar, editar e remover cursos</div>
        </a>

        <a routerLink="/admin/aulas" class="action-card">
          <div class="action-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
          </div>
          <div class="action-title">Aulas &amp; Vídeos</div>
          <div class="action-desc">Criar aulas e fazer upload</div>
        </a>

        <a routerLink="/admin/provas" class="action-card">
          <div class="action-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
          </div>
          <div class="action-title">Criar Provas</div>
          <div class="action-desc">Gerenciar avaliações e questões</div>
        </a>

        <a routerLink="/admin/notas" class="action-card">
          <div class="action-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
          <div class="action-title">Lançar Notas</div>
          <div class="action-desc">Gerenciar notas dos alunos</div>
        </a>

        <a routerLink="/admin/presenca" class="action-card">
          <div class="action-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="action-title">Presença</div>
          <div class="action-desc">Ver frequência automática</div>
        </a>

        <a routerLink="/admin/administradores" class="action-card">
          <div class="action-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div class="action-title">Administradores</div>
          <div class="action-desc">Cadastrar novos admins</div>
        </a>

        <a routerLink="/admin/instituicoes" class="action-card">
          <div class="action-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div class="action-title">Instituições</div>
          <div class="action-desc">Solicitações de novas instituições</div>
        </a>
      </div>

      <h2 class="section-heading">Estatísticas da plataforma</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <div class="stat-value">{{ totalCursos }}</div>
          <div class="stat-label">Cursos Ativos</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="stat-value">{{ totalAlunos }}</div>
          <div class="stat-label">Alunos Inscritos</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
          </div>
          <div class="stat-value">{{ totalAulas }}</div>
          <div class="stat-label">Aulas Criadas</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/></svg>
          </div>
          <div class="stat-value">{{ totalProvas }}</div>
          <div class="stat-label">Provas Criadas</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .dash-hero {
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      color: #fff;
      padding: 36px 32px;
      border-radius: var(--radius-lg);
      margin-bottom: 32px;
    }

    .dash-hero h1 {
      margin: 0 0 6px;
      font-size: var(--font-size-2xl);
      font-weight: 700;
      font-family: var(--font-display);
    }

    .dash-hero p {
      margin: 0;
      opacity: 0.88;
      font-size: var(--font-size-base);
    }

    .section-heading {
      font-size: var(--font-size-base);
      font-weight: 700;
      color: var(--color-text);
      margin: 0 0 14px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-size: 0.8125rem;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin-bottom: 32px;
    }

    .action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 22px 14px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      text-decoration: none;
      color: var(--color-text);
      transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
      box-shadow: var(--shadow-sm);
    }

    .action-card:hover {
      border-color: var(--primary);
      transform: translateY(-3px);
      box-shadow: var(--shadow);
      color: var(--primary);
    }

    .action-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--primary) 10%, transparent);
      border-radius: var(--radius);
      color: var(--primary);
    }

    .action-card:hover .action-icon {
      background: color-mix(in srgb, var(--primary) 16%, transparent);
    }

    .action-title {
      font-size: 0.875rem;
      font-weight: 600;
      text-align: center;
    }

    .action-desc {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-align: center;
      line-height: 1.4;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .stat-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 24px;
      text-align: center;
      box-shadow: var(--shadow-sm);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }

    .stat-icon {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--primary) 10%, transparent);
      border-radius: var(--radius);
      color: var(--primary);
      margin: 0 auto 14px;
    }

    .stat-value {
      font-size: var(--font-size-3xl);
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 6px;
      font-family: var(--font-display);
    }

    .stat-label {
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
    }

    @media (max-width: 640px) {
      .dash-hero { padding: 24px 20px; }
      .actions-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  usuarioNome = '';
  totalCursos = 0;
  totalAlunos = 0;
  totalProvas = 0;
  totalAulas = 0;

  constructor(private cursosService: CursosService, private authService: AuthService) {
    const usuario = this.authService.getCurrentUser();
    if (usuario) {
      this.usuarioNome = usuario.nome;
    }
  }

  ngOnInit() {
    this.loadStats();
  }

  loadStats(): void {
    // `/cursos/` é filtrado por tenant (a instituição em gestão, para o super
    // admin). Antes isto lia `/cursos/catalogo`, o marketplace público, que
    // exige `?faculdade=<slug>` e respondia 400 para quem não tem faculdade
    // própria — o painel do super admin mostrava 0 cursos sempre.
    this.cursosService.getCursos().subscribe({
      next: (cursos) => {
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
