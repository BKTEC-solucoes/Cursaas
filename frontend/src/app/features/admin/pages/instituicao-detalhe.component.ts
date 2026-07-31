import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { FaculdadeAtivaService } from '../../../core/services/faculdade-ativa.service';

interface Instituicao {
  id: number;
  nome: string;
  slug: string;
  cnpj: string | null;
  email_contato: string | null;
  telefone: string | null;
  dominio_email: string | null;
  ativa: boolean;
  aprovada: boolean;
  plano: string;
  data_criacao: string;
  data_atualizacao: string;
}

@Component({
  selector: 'app-admin-instituicao-detalhe',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="content-page narrow">

      <div class="page-topbar">
        <button class="btn-back" (click)="voltar()">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          Voltar
        </button>
        <h1>Detalhes da Instituição</h1>
        @if (podeGerenciar()) {
          <button class="btn-gerenciar" (click)="gerenciar()">Gerenciar esta instituição</button>
        }
      </div>

      @if (erro) { <div class="msg msg--error">{{ erro }}</div> }

      @if (carregando) {
        <div class="loading-state"><div class="spinner"></div><p>Carregando...</p></div>
      }

      @if (!carregando && inst) {
        <div class="detail-card">
          <div class="card-header">
            <h2 class="card-title">{{ inst.nome }}</h2>
            <span class="badge" [class]="inst.aprovada ? 'badge--success' : 'badge--warn'">
              {{ statusLabel(inst) }}
            </span>
          </div>

          <div class="fields-grid">
            <div class="field">
              <div class="field-label">E-mail</div>
              <div class="field-value">{{ inst.email_contato || '—' }}</div>
            </div>
            <div class="field">
              <div class="field-label">CNPJ</div>
              <div class="field-value field-mono">{{ inst.cnpj || '—' }}</div>
            </div>
            <div class="field">
              <div class="field-label">Solicitado em</div>
              <div class="field-value">{{ inst.data_criacao | date:'dd/MM/yyyy HH:mm' }}</div>
            </div>
            <div class="field">
              <div class="field-label">Aprovado em</div>
              <div class="field-value">{{ inst.aprovada ? (inst.data_atualizacao | date:'dd/MM/yyyy HH:mm') : '—' }}</div>
            </div>
            <div class="field span2">
              <div class="field-label">Domínio de e-mail</div>
              <div class="field-value">{{ inst.dominio_email || '—' }}</div>
            </div>
          </div>
        </div>

        @if (!inst.aprovada) {
          <div class="action-card">
            <p class="action-hint">Esta solicitação está pendente de análise.</p>
            <div class="action-row">
              <button class="btn-primary" (click)="atualizarStatus('aprovar')" [disabled]="processando">
                {{ processando ? 'Processando...' : 'Aprovar Instituição' }}
              </button>
              <button class="btn-danger-outline" (click)="atualizarStatus('recusar')" [disabled]="processando">
                Recusar
              </button>
            </div>
          </div>
        }

        @if (inst.aprovada) {
          <div class="msg msg--success">
            Instituição aprovada em {{ inst.data_atualizacao | date:'dd/MM/yyyy' }}.
          </div>

          <div class="action-card">
            <div class="access-header">
              <span class="access-title">Controle de Acesso</span>
              <span class="badge" [class]="inst.ativa ? 'badge--success' : 'badge--danger'">
                {{ inst.ativa ? 'Acesso Permitido' : 'Acesso Negado' }}
              </span>
            </div>
            <p class="action-hint">
              {{ inst.ativa ? 'A instituição possui acesso ativo ao sistema.' : 'A instituição está com acesso bloqueado.' }}
            </p>
            <button [class]="inst.ativa ? 'btn-danger-outline' : 'btn-primary'" (click)="alternarAcesso()" [disabled]="processando">
              {{ processando ? 'Processando...' : (inst.ativa ? 'Bloquear Acesso' : 'Permitir Acesso') }}
            </button>
          </div>
        }
      }

    </div>
  `,
  styles: [`
    :host { display: block; }
    .narrow { max-width: 860px; }

    .page-topbar { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .page-topbar h1 { margin: 0; font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text); font-family: var(--font-display); }

    .btn-back {
      display: inline-flex; align-items: center; gap: 6px;
      border: 1.5px solid var(--color-border); background: var(--color-surface);
      color: var(--color-text-muted); border-radius: var(--radius); padding: 8px 14px;
      cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: border-color 0.2s, color 0.2s;
    }
    .btn-back:hover { border-color: var(--primary); color: var(--primary); }

    .btn-gerenciar {
      margin-left: auto;
      border: none;
      background: var(--color-primary);
      color: #fff;
      border-radius: var(--radius);
      padding: 9px 16px;
      cursor: pointer;
      font-size: var(--font-size-sm);
      font-weight: 600;
      white-space: nowrap;
      transition: filter 0.15s;
    }
    .btn-gerenciar:hover { filter: brightness(1.1); }

    .msg { padding: 12px 16px; border-radius: var(--radius); font-size: var(--font-size-sm); margin-bottom: 16px; }
    .msg--success { background: color-mix(in srgb, var(--color-success) 10%, transparent); color: var(--color-success); border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent); }
    .msg--error   { background: color-mix(in srgb, var(--color-danger) 10%, transparent);  color: var(--color-danger);  border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); }

    .loading-state {
      display: flex; align-items: center; gap: 12px; padding: 32px 24px;
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); color: var(--color-text-muted); font-size: var(--font-size-sm);
    }
    .spinner { width: 20px; height: 20px; border: 2px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .detail-card, .action-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: 28px; margin-bottom: 20px;
      box-shadow: var(--shadow-sm);
    }

    .card-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
    .card-title { font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text); margin: 0; }

    .badge { display: inline-flex; padding: 4px 12px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; }
    .badge--warn    { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); }
    .badge--success { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
    .badge--danger  { background: color-mix(in srgb, var(--color-danger) 15%, transparent);  color: var(--color-danger); }

    .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .span2 { grid-column: span 2; }
    .field-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); }
    .field-value { font-size: var(--font-size-base); color: var(--color-text); }
    .field-mono { font-family: monospace; }

    .action-hint { margin: 0 0 16px; font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .action-row { display: flex; gap: 12px; flex-wrap: wrap; }

    .access-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
    .access-title { font-size: var(--font-size-base); font-weight: 700; color: var(--color-text); }

    .btn-primary {
      background: var(--primary); color: #fff; border: none; border-radius: var(--radius);
      padding: 10px 22px; cursor: pointer; font-weight: 700; font-size: var(--font-size-sm);
      transition: opacity 0.15s;
    }
    .btn-primary:hover:not(:disabled) { opacity: 0.88; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-danger-outline {
      background: var(--color-surface); color: var(--color-danger);
      border: 1.5px solid color-mix(in srgb, var(--color-danger) 40%, transparent);
      border-radius: var(--radius); padding: 10px 22px;
      cursor: pointer; font-weight: 700; font-size: var(--font-size-sm); transition: background 0.15s;
    }
    .btn-danger-outline:hover:not(:disabled) { background: color-mix(in srgb, var(--color-danger) 8%, transparent); }
    .btn-danger-outline:disabled { opacity: 0.6; cursor: not-allowed; }

    @media (max-width: 600px) {
      .fields-grid { grid-template-columns: 1fr; }
      .span2 { grid-column: span 1; }
    }
  `]
})
export class AdminInstituicaoDetalheComponent implements OnInit {
  private readonly apiUrl = environment.apiUrl;

  inst: Instituicao | null = null;
  carregando = false;
  erro = '';
  processando = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private faculdadeAtiva: FaculdadeAtivaService,
  ) {}

  /** Só faz sentido para o super admin, e só em instituição ativa. */
  podeGerenciar(): boolean {
    return this.faculdadeAtiva.ehSuperAdmin() && !!this.inst?.ativa;
  }

  /**
   * Passa a gerenciar esta instituição: cursos, aulas, provas e alunos do painel
   * passam a ser os dela. Recarrega em /admin para que as telas já montem com o
   * novo escopo.
   */
  gerenciar(): void {
    if (!this.inst) return;
    this.faculdadeAtiva.selecionar(this.inst.id);
    window.location.href = '/admin/dashboard';
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.carregar(id);
  }

  carregar(id: number): void {
    this.carregando = true;
    this.erro = '';

    this.http
      .get<Instituicao>(`${this.apiUrl}/faculdades/${id}`, { headers: this.authHeaders() })
      .subscribe({
        next: (data) => {
          this.inst = data;
          this.carregando = false;
        },
        error: (err) => {
          this.erro = err?.error?.detail || 'Institui├º├úo n├úo encontrada.';
          this.carregando = false;
        },
      });
  }

  atualizarStatus(acao: 'aprovar' | 'recusar'): void {
    if (!this.inst) return;
    this.processando = true;

    const payload = acao === 'aprovar' ? { aprovada: true } : { aprovada: false };

    this.http
      .patch<Instituicao>(
        `${this.apiUrl}/faculdades/${this.inst.id}`,
        payload,
        { headers: this.authHeaders() },
      )
      .subscribe({
        next: (atualizada) => {
          this.inst = atualizada;
          this.processando = false;
        },
        error: (err) => {
          this.erro = err?.error?.detail || 'Erro ao atualizar status.';
          this.processando = false;
        },
      });
  }

  alternarAcesso(): void {
    if (!this.inst) return;
    this.processando = true;

    this.http
      .patch<Instituicao>(
        `${this.apiUrl}/faculdades/${this.inst.id}`,
        { ativa: !this.inst.ativa },
        { headers: this.authHeaders() },
      )
      .subscribe({
        next: (atualizada) => {
          this.inst = atualizada;
          this.processando = false;
        },
        error: (err) => {
          this.erro = err?.error?.detail || 'Erro ao alterar acesso.';
          this.processando = false;
        },
      });
  }

  voltar(): void {
    this.router.navigate(['/admin/instituicoes']);
  }

  getStatus(inst: Instituicao): string {
    if (!inst.aprovada) return 'pendente';
    return 'aprovado';
  }

  statusLabel(inst: Instituicao): string {
    return inst.aprovada ? 'Aprovado' : 'Pendente';
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
