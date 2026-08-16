import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { IconComponent } from '../../../shared/components/icon.component';

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
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="dashboard">
      <div class="header-greet">
        <h1>Bem-vindo, {{ usuarioNome }}!</h1>
        <p class="subtitle">Painel da Instituição – Cursaas</p>
      </div>

      <div class="loading" *ngIf="carregando">Carregando informações...</div>
      <div class="erro" *ngIf="erro && !carregando">{{ erro }}</div>

      <!-- Status banner -->
      <div class="chips-row" *ngIf="instituicao && !carregando">
        <span class="chip" [class.chip-ok]="instituicao.aprovada" [class.chip-warn]="!instituicao.aprovada">
          <app-icon [name]="instituicao.aprovada ? 'check-circle' : 'clock'" />
          {{ instituicao.aprovada ? 'Cadastro aprovado' : 'Aguardando aprovação do Super Admin' }}
        </span>
        <span class="chip" [class.chip-ok]="instituicao.ativa" [class.chip-danger]="!instituicao.ativa">
          <app-icon name="circle-dot" />
          {{ instituicao.ativa ? 'Instituição ativa' : 'Instituição inativa' }}
        </span>
        <span class="chip chip-info" *ngIf="instituicao.plano">
          <app-icon name="package" />
          Plano: <strong>{{ instituicao.plano | titlecase }}</strong>
        </span>
      </div>

      <!-- Stats -->
      <div class="stats-grid" *ngIf="!carregando">
        <div class="stat-card">
          <div class="stat-icon stat-icon--primary"><app-icon name="graduation-cap" [size]="22" /></div>
          <div class="stat-body">
            <span class="stat-value">{{ totalAlunos }}</span>
            <span class="stat-label">Alunos vinculados</span>
          </div>
        </div>
        <div class="stat-card stat-card--highlight">
          <div class="stat-icon stat-icon--warning"><app-icon name="clipboard" [size]="22" /></div>
          <div class="stat-body">
            <span class="stat-value">{{ solicitacoesPendentes }}</span>
            <span class="stat-label">Solicitações pendentes</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon--success"><app-icon name="check-circle" [size]="22" /></div>
          <div class="stat-body">
            <span class="stat-value">{{ solicitacoesAprovadas }}</span>
            <span class="stat-label">Alunos aprovados</span>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div *ngIf="!carregando">
        <h2 class="section-title">Ações rápidas</h2>
        <div class="actions-grid">
          <a routerLink="/instituicao/perfil" class="action-btn">
            <div class="action-icon"><app-icon name="building" [size]="24" /></div>
            <div class="action-title">Meu perfil</div>
            <div class="action-desc">Ver e editar dados da instituição</div>
          </a>
          <a routerLink="/instituicao/alunos" class="action-btn">
            <div class="action-icon"><app-icon name="graduation-cap" [size]="24" /></div>
            <div class="action-title">Alunos</div>
            <div class="action-desc">Ver alunos vinculados</div>
          </a>
          <a routerLink="/instituicao/solicitacoes" class="action-btn">
            <div class="action-icon"><app-icon name="clipboard" [size]="24" /></div>
            <div class="action-title">Solicitações</div>
            <div class="action-desc">Acompanhar cadastros pendentes</div>
            <div class="action-badge" *ngIf="solicitacoesPendentes > 0">{{ solicitacoesPendentes }}</div>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .status-banner { display: flex; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-5); }
    .status-chip {
      display: inline-flex; align-items: center; gap: var(--space-2);
      padding: var(--space-2) var(--space-4); border-radius: var(--radius-full);
      font-size: var(--font-size-sm); font-weight: 500;
      background: var(--color-surface-2); border: 1px solid var(--color-border); color: var(--color-text-muted);
    }
    .chip-ok { background: color-mix(in srgb, var(--color-success) 12%, transparent); border-color: color-mix(in srgb, var(--color-success) 30%, transparent); color: var(--color-success); }
    .chip-warn { background: color-mix(in srgb, var(--color-warning) 12%, transparent); border-color: color-mix(in srgb, var(--color-warning) 30%, transparent); color: var(--color-warning); }
    .chip-danger { background: color-mix(in srgb, var(--color-danger) 12%, transparent); border-color: color-mix(in srgb, var(--color-danger) 30%, transparent); color: var(--color-danger); }
    .chip-info { background: color-mix(in srgb, var(--primary) 8%, transparent); border-color: color-mix(in srgb, var(--primary) 25%, transparent); color: var(--primary); }

    .stat-card--highlight { border: 2px solid var(--color-warning) !important; }

    /* .chips-row e .stats-grid não existem no styles.css global — o template
       referenciava .status-banner/.status-item, que também não existiam, e por
       isso os chips e os cards de estatística vinham sem layout nenhum. */
    .chips-row  { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-5); }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--space-4); }

    .section-title { font-size: var(--font-size-lg); font-weight: 600; color: var(--color-text); margin: var(--space-6) 0 var(--space-4); font-family: var(--font-display); }

    .actions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-4); }
    .action-btn {
      position: relative; display: flex; flex-direction: column; align-items: center;
      gap: var(--space-2); padding: var(--space-6) var(--space-4);
      background: var(--color-surface); border-radius: var(--radius-lg);
      text-decoration: none; box-shadow: var(--shadow-sm);
      border: 2px solid var(--color-border);
      transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
    }
    .action-btn:hover { transform: translateY(-3px); box-shadow: var(--shadow); border-color: var(--primary); }
    .action-icon { color: var(--primary); }
    .action-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .action-desc { font-size: var(--font-size-xs); color: var(--color-text-muted); text-align: center; }
    .action-badge { position: absolute; top: 10px; right: 10px; background: var(--color-danger); color: #fff; border-radius: var(--radius-full); padding: 2px 8px; font-size: var(--font-size-xs); font-weight: 700; }

    .loading-state { text-align: center; padding: 40px; color: var(--color-text-muted); }
    .spinner { display: inline-block; width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: var(--space-3); }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-card { background: color-mix(in srgb, var(--color-danger) 10%, transparent); color: var(--color-danger); padding: var(--space-5); border-radius: var(--radius-lg); border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); margin-bottom: var(--space-4); }
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
      inst: this.http.get<InstituicaoInfo>(`${environment.apiUrl}/instituicoes/minha`, { headers }).pipe(catchError(() => of(null))),
      alunos: this.http.get<any[]>(`${environment.apiUrl}/instituicoes/minha/alunos`, { headers }).pipe(catchError(() => of([]))),
      solicitacoes: this.http.get<any[]>(`${environment.apiUrl}/instituicoes/minha/solicitacoes`, { headers }).pipe(catchError(() => of([]))),
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

