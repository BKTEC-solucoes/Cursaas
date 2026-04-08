import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Instituicao {
  id: number;
  nome_instituicao: string;
  cnpj: string;
  contato: string;
  endereco: string;
  ativa: boolean;
  aprovada: boolean;
  data_criacao: string;
  data_atualizacao: string;
}

@Component({
  selector: 'app-admin-instituicao-detalhe',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">

      <div class="page-header">
        <button class="btn-back" (click)="voltar()">← Voltar</button>
        <h2>🏛️ Detalhes da Instituição</h2>
      </div>

      <div class="feedback error" *ngIf="erro">{{ erro }}</div>

      <div class="loading-card" *ngIf="carregando">
        <div class="spinner"></div> Carregando...
      </div>

      <ng-container *ngIf="!carregando && inst">

        <!-- Card principal -->
        <div class="detail-card">
          <div class="card-header">
            <div class="card-title">{{ inst.nome_instituicao }}</div>
            <span class="badge" [ngClass]="'badge-' + getStatus(inst)">
              {{ statusLabel(inst) }}
            </span>
          </div>

          <div class="fields-grid">
            <div class="field">
              <div class="field-label">Contato</div>
              <div class="field-value">{{ inst.contato }}</div>
            </div>
            <div class="field">
              <div class="field-label">CNPJ</div>
              <div class="field-value mono">{{ inst.cnpj }}</div>
            </div>
            <div class="field">
              <div class="field-label">Solicitado em</div>
              <div class="field-value">{{ inst.data_criacao | date:'dd/MM/yyyy HH:mm' }}</div>
            </div>
            <div class="field">
              <div class="field-label">Aprovado em</div>
              <div class="field-value">
                {{ inst.aprovada ? (inst.data_atualizacao | date:'dd/MM/yyyy HH:mm') : '—' }}
              </div>
            </div>
            <div class="field span2">
              <div class="field-label">Endereço / Informações adicionais</div>
              <div class="field-value desc">{{ inst.endereco }}</div>
            </div>
          </div>
        </div>

        <!-- Ações -->
        <div class="actions-card" *ngIf="!inst.aprovada">
          <p class="actions-hint">Esta solicitação está pendente de análise.</p>
          <div class="actions-row">
            <button
              class="btn-approve"
              (click)="atualizarStatus('aprovar')"
              [disabled]="processando"
            >
              {{ processando ? 'Processando...' : '✓ Aprovar Instituição' }}
            </button>
            <button
              class="btn-reject"
              (click)="atualizarStatus('recusar')"
              [disabled]="processando"
            >
              ✕ Recusar
            </button>
          </div>
        </div>

        <div class="status-card aprovado" *ngIf="inst.aprovada">
          ✓ Instituição aprovada em {{ inst.data_atualizacao | date:'dd/MM/yyyy' }}.
        </div>

        <!-- Controle de Acesso -->
        <div class="access-card" *ngIf="inst.aprovada">
          <div class="access-header">
            <div class="access-title">🔐 Controle de Acesso</div>
            <span class="badge" [ngClass]="inst.ativa ? 'badge-ativo' : 'badge-inativo'">
              {{ inst.ativa ? 'Acesso Permitido' : 'Acesso Negado' }}
            </span>
          </div>
          <p class="access-hint">
            {{ inst.ativa
              ? 'A instituição possui acesso ativo ao sistema.'
              : 'A instituição está com acesso bloqueado.' }}
          </p>
          <button
            [ngClass]="inst.ativa ? 'btn-deny' : 'btn-allow'"
            (click)="alternarAcesso()"
            [disabled]="processando"
          >
            {{ processando ? 'Processando...' : (inst.ativa ? '🔒 Bloquear Acesso' : '🔓 Permitir Acesso') }}
          </button>
        </div>

      </ng-container>

    </div>
  `,
  styles: [`
    .page-container { max-width: 860px; margin: 0 auto; }

    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .page-header h2 { margin: 0; color: #22303c; font-size: 20px; }

    .btn-back {
      border: 1px solid #d1d5db;
      background: white;
      color: #374151;
      border-radius: 8px;
      padding: 8px 14px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: background 0.15s;
    }
    .btn-back:hover { background: #f3f4f6; }

    .feedback.error {
      padding: 13px 16px;
      border-radius: 10px;
      margin-bottom: 16px;
      font-size: 14px;
      color: #b42318;
      background: #fef3f2;
      border: 1px solid #fecaca;
    }

    .loading-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: white;
      border-radius: 14px;
      padding: 32px 24px;
      box-shadow: 0 4px 20px rgba(15,23,42,0.08);
      color: #667085;
      font-size: 14px;
    }
    .spinner {
      width: 20px; height: 20px;
      border: 2px solid #e5e7eb;
      border-top-color: #2c3e50;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Detail card ── */
    .detail-card {
      background: white;
      border-radius: 14px;
      box-shadow: 0 4px 20px rgba(15,23,42,0.08);
      padding: 28px;
      margin-bottom: 20px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      gap: 12px;
      flex-wrap: wrap;
    }
    .card-title { font-size: 20px; font-weight: 700; color: #1f2937; }

    .badge { display: inline-flex; padding: 5px 12px; border-radius: 999px; font-size: 13px; font-weight: 700; }
    .badge-pendente { background: #fff7cc; color: #92400e; }
    .badge-aprovado { background: #dcfce7; color: #15803d; }
    .badge-recusado { background: #fee2e2; color: #b42318; }

    .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .span2 { grid-column: span 2; }
    .field-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
    .field-value { font-size: 15px; color: #1f2937; }
    .field-value.mono { font-family: monospace; }
    .field-value.desc { white-space: pre-line; color: #4b5563; font-size: 14px; line-height: 1.6; }

    /* ── Actions ── */
    .actions-card {
      background: white;
      border-radius: 14px;
      box-shadow: 0 4px 20px rgba(15,23,42,0.08);
      padding: 24px 28px;
      margin-bottom: 20px;
    }
    .actions-hint { margin: 0 0 16px; font-size: 14px; color: #667085; }
    .actions-row { display: flex; gap: 12px; flex-wrap: wrap; }

    .btn-approve {
      background: #15803d; color: white; border: none;
      border-radius: 8px; padding: 11px 22px;
      cursor: pointer; font-weight: 700; font-size: 14px;
      transition: background 0.2s;
    }
    .btn-approve:hover    { background: #166534; }
    .btn-approve:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-reject {
      background: white; color: #b42318;
      border: 1px solid #fecaca;
      border-radius: 8px; padding: 11px 22px;
      cursor: pointer; font-weight: 700; font-size: 14px;
      transition: all 0.2s;
    }
    .btn-reject:hover    { background: #fef3f2; border-color: #b42318; }
    .btn-reject:disabled { opacity: 0.6; cursor: not-allowed; }

    .status-card {
      border-radius: 10px;
      padding: 14px 18px;
      font-size: 14px;
      font-weight: 600;
    }
    .status-card.aprovado { background: #ecfdf3; color: #065f46; border: 1px solid #a7f3d0; }
    .status-card.recusado { background: #fef3f2; color: #b42318; border: 1px solid #fecaca; }

    /* ── Access card ── */
    .access-card {
      background: white;
      border-radius: 14px;
      box-shadow: 0 4px 20px rgba(15,23,42,0.08);
      padding: 24px 28px;
      margin-bottom: 20px;
    }
    .access-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .access-title { font-size: 16px; font-weight: 700; color: #1f2937; }
    .access-hint { margin: 0 0 16px; font-size: 14px; color: #667085; }
    .badge-ativo  { background: #dcfce7; color: #15803d; }
    .badge-inativo { background: #fee2e2; color: #b42318; }

    .btn-allow {
      background: #1d4ed8; color: white; border: none;
      border-radius: 8px; padding: 11px 22px;
      cursor: pointer; font-weight: 700; font-size: 14px;
      transition: background 0.2s;
    }
    .btn-allow:hover    { background: #1e40af; }
    .btn-allow:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-deny {
      background: white; color: #b42318;
      border: 1px solid #fecaca;
      border-radius: 8px; padding: 11px 22px;
      cursor: pointer; font-weight: 700; font-size: 14px;
      transition: all 0.2s;
    }
    .btn-deny:hover    { background: #fef3f2; border-color: #b42318; }
    .btn-deny:disabled { opacity: 0.6; cursor: not-allowed; }

    @media (max-width: 600px) {
      .fields-grid { grid-template-columns: 1fr; }
      .span2 { grid-column: span 1; }
    }
  `]
})
export class AdminInstituicaoDetalheComponent implements OnInit {
  private readonly apiUrl = 'http://localhost:8000/api';

  inst: Instituicao | null = null;
  carregando = false;
  erro = '';
  processando = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
  ) {}

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
          this.erro = err?.error?.detail || 'Instituição não encontrada.';
          this.carregando = false;
        },
      });
  }

  atualizarStatus(acao: 'aprovar' | 'recusar'): void {
    if (!this.inst) return;
    this.processando = true;

    this.http
      .put<Instituicao>(
        `${this.apiUrl}/faculdades/${this.inst.id}/${acao}`,
        {},
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
        `${this.apiUrl}/faculdades/${this.inst.id}/acesso`,
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
