import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

interface InstituicaoInfo {
  id: number;
  nome: string;
  cnpj: string | null;
  email_contato: string | null;
  telefone: string | null;
  dominio_email: string | null;
  plano: string | null;
  ativa: boolean;
  aprovada: boolean;
  data_criacao: string;
}

@Component({
  selector: 'app-instituicao-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">
      <div class="header-greet">
        <h1>Bem-vindo, {{ usuarioNome }}!</h1>
        <p class="subtitle">Painel da Instituição – Cursaas</p>
      </div>

      <div class="loading" *ngIf="carregando">Carregando informações...</div>
      <div class="erro" *ngIf="erro && !carregando">{{ erro }}</div>

      <!-- Status banner -->
      <div class="status-banner" *ngIf="instituicao && !carregando">
        <div class="status-item" [class.ok]="instituicao.aprovada" [class.pendente]="!instituicao.aprovada">
          <span>{{ instituicao.aprovada ? '✅ Cadastro aprovado' : '⏳ Aguardando aprovação do Super Admin' }}</span>
        </div>
        <div class="status-item" [class.ok]="instituicao.ativa" [class.inativo]="!instituicao.ativa">
          <span>{{ instituicao.ativa ? '🟢 Instituição ativa' : '🔴 Instituição inativa' }}</span>
        </div>
        <div class="status-item" *ngIf="instituicao.plano">
          <span>📦 Plano: <strong>{{ instituicao.plano | titlecase }}</strong></span>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-section" *ngIf="!carregando">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">👨‍🎓</div>
            <div class="stat-value">{{ totalAlunos }}</div>
            <div class="stat-label">Alunos Vinculados</div>
          </div>
          <div class="stat-card highlight">
            <div class="stat-icon">📋</div>
            <div class="stat-value">{{ solicitacoesPendentes }}</div>
            <div class="stat-label">Solicitações Pendentes</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-value">{{ solicitacoesAprovadas }}</div>
            <div class="stat-label">Alunos Aprovados</div>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="quick-actions" *ngIf="!carregando">
        <h2>Ações Rápidas</h2>
        <div class="actions-grid">
          <a routerLink="/instituicao/perfil" class="action-btn">
            <div class="action-icon">🏛️</div>
            <div class="action-title">Meu Perfil</div>
            <div class="action-desc">Ver e editar dados da instituição</div>
          </a>
          <a routerLink="/instituicao/alunos" class="action-btn">
            <div class="action-icon">👨‍🎓</div>
            <div class="action-title">Alunos</div>
            <div class="action-desc">Ver alunos vinculados</div>
          </a>
          <a routerLink="/instituicao/solicitacoes" class="action-btn">
            <div class="action-icon">📋</div>
            <div class="action-title">Solicitações</div>
            <div class="action-desc">Acompanhar cadastros pendentes</div>
            <div class="action-badge" *ngIf="solicitacoesPendentes > 0">{{ solicitacoesPendentes }}</div>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { max-width: 1100px; margin: 0 auto; }

    .header-greet {
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      color: white;
      padding: 36px 30px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .header-greet h1 { margin: 0 0 6px; font-size: 28px; font-weight: 700; }
    .header-greet .subtitle { margin: 0; font-size: 14px; opacity: 0.9; }

    .loading { padding: 24px; text-align: center; background: #f0f9ff; color: #0369a1; border-radius: 8px; margin-bottom: 20px; }
    .erro    { padding: 24px; text-align: center; background: #fef2f2; color: #dc2626; border-radius: 8px; margin-bottom: 20px; }

    .status-banner { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
    .status-item {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px; border-radius: 8px;
      background: #f0fdf4; border: 1px solid #bbf7d0;
      font-size: 14px; font-weight: 500; color: #166534;
    }
    .status-item.pendente { background: #fffbeb; border-color: #fcd34d; color: #92400e; }
    .status-item.inativo  { background: #fef2f2; border-color: #fca5a5; color: #991b1b; }

    .stats-section { margin-bottom: 28px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .stat-card {
      background: white; border-radius: 12px; padding: 24px 20px;
      text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border: 2px solid transparent;
    }
    .stat-card.highlight { border-color: #f59e0b; }
    .stat-icon  { font-size: 32px; margin-bottom: 8px; }
    .stat-value { font-size: 32px; font-weight: 700; color: var(--primary); margin-bottom: 4px; }
    .stat-label { font-size: 13px; color: #6b7280; }

    .quick-actions h2 { font-size: 18px; font-weight: 600; color: #1f2937; margin: 0 0 16px; }
    .actions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .action-btn {
      position: relative;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 24px 16px; background: white; border-radius: 12px;
      text-decoration: none; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      transition: all 0.2s; border: 2px solid transparent;
    }
    .action-btn:hover { transform: translateY(-3px); box-shadow: 0 6px 16px rgba(0,0,0,0.12); border-color: var(--secondary); }
    .action-icon  { font-size: 36px; }
    .action-title { font-size: 14px; font-weight: 600; color: #1f2937; }
    .action-desc  { font-size: 12px; color: #6b7280; text-align: center; }
    .action-badge {
      position: absolute; top: 10px; right: 10px;
      background: #ef4444; color: white;
      border-radius: 999px; padding: 2px 8px;
      font-size: 11px; font-weight: 700;
    }
  `]
})
export class InstituicaoDashboardComponent implements OnInit {
  usuarioNome = '';
  instituicao: InstituicaoInfo | null = null;
  carregando = true;
  erro = '';
  totalAlunos = 0;
  solicitacoesPendentes = 0;
  solicitacoesAprovadas = 0;

  constructor(private authService: AuthService, private http: HttpClient) {
    const usuario = this.authService.getCurrentUser();
    if (usuario) this.usuarioNome = usuario.nome;
  }

  ngOnInit(): void {
    const headers = this.headers();
    forkJoin({
      inst: this.http.get<InstituicaoInfo>('http://localhost:8000/api/instituicoes/minha', { headers }).pipe(catchError(() => of(null))),
      alunos: this.http.get<any[]>('http://localhost:8000/api/instituicoes/minha/alunos', { headers }).pipe(catchError(() => of([]))),
      solicitacoes: this.http.get<any[]>('http://localhost:8000/api/instituicoes/minha/solicitacoes', { headers }).pipe(catchError(() => of([]))),
    }).subscribe(({ inst, alunos, solicitacoes }) => {
      this.instituicao = inst;
      this.totalAlunos = (alunos as any[]).length;
      const sols = solicitacoes as any[];
      this.solicitacoesPendentes = sols.filter((s: any) => s.status === 'pendente').length;
      this.solicitacoesAprovadas = sols.filter((s: any) => s.status === 'aprovada').length;
      this.carregando = false;
      if (!inst) this.erro = 'Erro ao carregar dados da instituição.';
    });
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }
}

