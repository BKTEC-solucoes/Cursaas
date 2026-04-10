import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

interface Solicitacao {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  cpf_rg: string | null;
  mensagem: string | null;
  status: 'pendente' | 'aprovada' | 'recusada';
  motivo_recusa: string | null;
  criado_em: string;
  revisado_em: string | null;
}

@Component({
  selector: 'app-instituicao-solicitacoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="solicitacoes-page">
      <div class="page-header">
        <h1>📋 Solicitações de Cadastro</h1>
        <span class="badge-count badge-pending" *ngIf="pendentesCount > 0">{{ pendentesCount }} pendentes</span>
      </div>

      <p class="info-text">Estas são as solicitações de alunos para ingressar na sua instituição. Aprove ou recuse diretamente por aqui.</p>

      <div class="loading" *ngIf="carregando">Carregando solicitações...</div>
      <div class="erro" *ngIf="erro && !carregando">{{ erro }}</div>

      <div class="card" *ngIf="!carregando && !erro">
        <!-- Filtro -->
        <div class="filtro-row">
          <label class="filtro-label">Filtrar por status:</label>
          <div class="filtro-btns">
            <button *ngFor="let f of filtros" (click)="setFiltro(f.value)" [class.ativo]="filtroAtual === f.value" class="filtro-btn">
              {{ f.label }}
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div class="empty" *ngIf="solicitacoesFiltradas.length === 0">
          <div class="empty-icon">📭</div>
          <p>Nenhuma solicitação {{ filtroAtual !== 'todos' ? 'com status "' + filtroAtual + '"' : '' }} encontrada.</p>
        </div>

        <!-- Cards de solicitações -->
        <div class="lista" *ngIf="solicitacoesFiltradas.length > 0">
          <div class="solicitacao-card" *ngFor="let s of solicitacoesFiltradas" (click)="toggleExpanded(s.id)"
               [class.expandido]="expandido === s.id">
            <div class="sol-header">
              <div class="sol-avatar">{{ s.nome.charAt(0).toUpperCase() }}</div>
              <div class="sol-info">
                <div class="sol-nome">{{ s.nome }}</div>
                <div class="sol-email">{{ s.email }}</div>
              </div>
              <div class="sol-meta">
                <span class="badge"
                  [class.badge-pendente]="s.status === 'pendente'"
                  [class.badge-aprovada]="s.status === 'aprovada'"
                  [class.badge-recusada]="s.status === 'recusada'">
                  {{ s.status | titlecase }}
                </span>
                <span class="sol-data">{{ s.criado_em | date:'dd/MM/yyyy' }}</span>
              </div>
              <span class="expand-icon">{{ expandido === s.id ? '▲' : '▼' }}</span>
            </div>

            <!-- Detalhes expandidos -->
            <div class="sol-detalhes" *ngIf="expandido === s.id" (click)="$event.stopPropagation()">
              <div class="detalhe-grid">
                <div class="detalhe-item" *ngIf="s.telefone">
                  <span class="d-label">Telefone</span>
                  <span class="d-value">{{ s.telefone }}</span>
                </div>
                <div class="detalhe-item" *ngIf="s.cpf_rg">
                  <span class="d-label">CPF / RG</span>
                  <span class="d-value mono">{{ s.cpf_rg }}</span>
                </div>
                <div class="detalhe-item" *ngIf="s.revisado_em">
                  <span class="d-label">Revisado em</span>
                  <span class="d-value">{{ s.revisado_em | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
              </div>
              <div class="mensagem-box" *ngIf="s.mensagem">
                <span class="d-label">Mensagem do solicitante</span>
                <p>{{ s.mensagem }}</p>
              </div>
              <div class="recusa-box" *ngIf="s.motivo_recusa">
                <span class="d-label">Motivo da recusa</span>
                <p>{{ s.motivo_recusa }}</p>
              </div>

              <!-- Ações: apenas para pendentes -->
              <div class="acoes-row" *ngIf="s.status === 'pendente'">
                <button class="btn-aprovar" (click)="aprovar(s)" [disabled]="processando[s.id]">
                  {{ processando[s.id] === 'aprovando' ? 'Aprovando...' : '✓ Aprovar' }}
                </button>
                <button class="btn-recusar" (click)="abrirRecusa(s)" [disabled]="processando[s.id]">
                  ✗ Recusar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de recusa -->
    <div class="modal-overlay" *ngIf="modalRecusa" (click)="fecharRecusa()">
      <div class="modal" (click)="$event.stopPropagation()">
        <h3>Recusar Solicitação</h3>
        <p class="modal-sub">Informe o motivo da recusa para <strong>{{ modalRecusa.nome }}</strong>.</p>
        <textarea [(ngModel)]="motivoRecusa" placeholder="Motivo da recusa (obrigatório, mínimo 5 caracteres)..." rows="4"></textarea>
        <div class="modal-erro" *ngIf="erroRecusa">{{ erroRecusa }}</div>
        <div class="modal-actions">
          <button class="btn-cancelar" (click)="fecharRecusa()">Cancelar</button>
          <button class="btn-recusar-confirm" (click)="confirmarRecusa()" [disabled]="processandoRecusa">
            {{ processandoRecusa ? 'Recusando...' : 'Confirmar Recusa' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .solicitacoes-page { max-width: 900px; margin: 0 auto; }
    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .page-header h1 { font-size: 24px; font-weight: 700; color: #1f2937; margin: 0; }
    .badge-count { border-radius: 20px; padding: 4px 12px; font-size: 13px; font-weight: 600; }
    .badge-pending { background: #fffbeb; color: #92400e; }

    .info-text { font-size: 13px; color: #6b7280; margin: 0 0 20px; }

    .loading { padding: 24px; text-align: center; border-radius: 8px; background: #f0f9ff; color: #0369a1; }
    .erro    { padding: 24px; text-align: center; border-radius: 8px; background: #fef2f2; color: #dc2626; }

    .card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

    .filtro-row { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6; flex-wrap: wrap; }
    .filtro-label { font-size: 13px; font-weight: 600; color: #374151; }
    .filtro-btns { display: flex; gap: 8px; }
    .filtro-btn { padding: 6px 14px; border-radius: 20px; border: 1px solid #d1d5db; background: white; color: #6b7280; font-size: 13px; cursor: pointer; transition: all 0.2s; }
    .filtro-btn:hover { border-color: #1a6b3c; color: #1a6b3c; }
    .filtro-btn.ativo { background: #1a6b3c; border-color: #1a6b3c; color: white; font-weight: 600; }

    .empty { text-align: center; padding: 48px 0; }
    .empty-icon { font-size: 48px; margin-bottom: 12px; }
    .empty p { color: #6b7280; font-size: 14px; }

    .lista { display: flex; flex-direction: column; gap: 8px; }

    .solicitacao-card {
      border: 1px solid #e5e7eb; border-radius: 10px;
      overflow: hidden; cursor: pointer;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .solicitacao-card:hover { border-color: #1a6b3c; box-shadow: 0 2px 8px rgba(26,107,60,0.08); }
    .solicitacao-card.expandido { border-color: #1a6b3c; }

    .sol-header { display: flex; align-items: center; gap: 14px; padding: 16px; }
    .sol-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #1a6b3c, #2d9e5f); color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; }
    .sol-info { flex: 1; min-width: 0; }
    .sol-nome { font-weight: 600; color: #1f2937; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sol-email { font-size: 13px; color: #6b7280; }
    .sol-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .sol-data { font-size: 12px; color: #9ca3af; }
    .expand-icon { color: #9ca3af; font-size: 12px; flex-shrink: 0; }

    .badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-pendente { background: #fffbeb; color: #92400e; }
    .badge-aprovada { background: #dcfce7; color: #166534; }
    .badge-recusada { background: #fef2f2; color: #991b1b; }

    .sol-detalhes { padding: 0 16px 16px; border-top: 1px solid #f3f4f6; margin-top: 0; cursor: default; }
    .detalhe-grid { display: flex; gap: 24px; margin-top: 12px; flex-wrap: wrap; }
    .detalhe-item { display: flex; flex-direction: column; gap: 2px; }
    .d-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
    .d-value { font-size: 14px; color: #374151; }
    .d-value.mono { font-family: monospace; }

    .mensagem-box, .recusa-box { margin-top: 12px; padding: 12px; border-radius: 8px; }
    .mensagem-box { background: #f9fafb; }
    .recusa-box   { background: #fef2f2; }
    .mensagem-box p, .recusa-box p { margin: 6px 0 0; font-size: 14px; color: #374151; line-height: 1.5; white-space: pre-wrap; }

    .acoes-row { display: flex; gap: 10px; margin-top: 16px; padding-top: 14px; border-top: 1px solid #f3f4f6; }
    .btn-aprovar, .btn-recusar { padding: 8px 20px; border-radius: 8px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-aprovar { background: #1a6b3c; color: white; }
    .btn-aprovar:hover:not(:disabled) { background: #155c31; }
    .btn-recusar { background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
    .btn-recusar:hover:not(:disabled) { background: #fee2e2; }
    .btn-aprovar:disabled, .btn-recusar:disabled { opacity: 0.6; cursor: not-allowed; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: white; border-radius: 14px; padding: 28px; width: 480px; max-width: 95vw; box-shadow: 0 8px 30px rgba(0,0,0,0.18); }
    .modal h3 { margin: 0 0 6px; font-size: 18px; font-weight: 700; color: #1f2937; }
    .modal-sub { margin: 0 0 16px; font-size: 14px; color: #6b7280; }
    .modal textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; resize: vertical; outline: none; }
    .modal textarea:focus { border-color: #1a6b3c; box-shadow: 0 0 0 3px rgba(26,107,60,0.1); }
    .modal-erro { margin-top: 8px; font-size: 13px; color: #dc2626; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
    .btn-cancelar { padding: 8px 18px; border-radius: 8px; border: 1px solid #d1d5db; background: white; color: #374151; font-size: 14px; cursor: pointer; }
    .btn-cancelar:hover { background: #f9fafb; }
    .btn-recusar-confirm { padding: 8px 20px; border-radius: 8px; border: none; background: #dc2626; color: white; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-recusar-confirm:hover:not(:disabled) { background: #b91c1c; }
    .btn-recusar-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class InstituicaoSolicitacoesComponent implements OnInit {
  solicitacoes: Solicitacao[] = [];
  carregando = true;
  erro = '';
  filtroAtual: string = 'todos';
  expandido: number | null = null;
  processando: Record<number, string | false> = {};

  modalRecusa: Solicitacao | null = null;
  motivoRecusa = '';
  erroRecusa = '';
  processandoRecusa = false;

  filtros = [
    { label: 'Todos',     value: 'todos' },
    { label: 'Pendentes', value: 'pendente' },
    { label: 'Aprovadas', value: 'aprovada' },
    { label: 'Recusadas', value: 'recusada' },
  ];

  get pendentesCount(): number {
    return this.solicitacoes.filter(s => s.status === 'pendente').length;
  }

  get solicitacoesFiltradas(): Solicitacao[] {
    if (this.filtroAtual === 'todos') return this.solicitacoes;
    return this.solicitacoes.filter(s => s.status === this.filtroAtual);
  }

  constructor(private authService: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.http.get<Solicitacao[]>('http://localhost:8000/api/instituicoes/minha/solicitacoes', { headers: this.headers() }).subscribe({
      next: (data) => { this.solicitacoes = data; this.carregando = false; },
      error: (err) => { this.erro = err?.error?.detail ?? 'Erro ao carregar solicitações.'; this.carregando = false; },
    });
  }

  setFiltro(valor: string): void {
    this.filtroAtual = valor;
    this.expandido = null;
  }

  toggleExpanded(id: number): void {
    this.expandido = this.expandido === id ? null : id;
  }

  aprovar(s: Solicitacao): void {
    this.processando[s.id] = 'aprovando';
    const url = `http://localhost:8000/api/instituicoes/minha/solicitacoes/${s.id}/aprovar`;
    this.http.patch(url, {}, { headers: this.headers() }).subscribe({
      next: () => {
        s.status = 'aprovada';
        this.processando[s.id] = false;
      },
      error: (err) => {
        alert(err?.error?.detail ?? 'Erro ao aprovar solicitação.');
        this.processando[s.id] = false;
      }
    });
  }

  abrirRecusa(s: Solicitacao): void {
    this.modalRecusa = s;
    this.motivoRecusa = '';
    this.erroRecusa = '';
    this.processandoRecusa = false;
  }

  fecharRecusa(): void {
    this.modalRecusa = null;
  }

  confirmarRecusa(): void {
    if (!this.modalRecusa) return;
    if (this.motivoRecusa.trim().length < 5) {
      this.erroRecusa = 'O motivo deve ter pelo menos 5 caracteres.';
      return;
    }
    this.processandoRecusa = true;
    const s = this.modalRecusa;
    const params = `motivo=${encodeURIComponent(this.motivoRecusa.trim())}`;
    const url = `http://localhost:8000/api/instituicoes/minha/solicitacoes/${s.id}/recusar?${params}`;
    this.http.patch(url, {}, { headers: this.headers() }).subscribe({
      next: () => {
        s.status = 'recusada';
        s.motivo_recusa = this.motivoRecusa.trim();
        this.processandoRecusa = false;
        this.modalRecusa = null;
      },
      error: (err) => {
        this.erroRecusa = err?.error?.detail ?? 'Erro ao recusar solicitação.';
        this.processandoRecusa = false;
      }
    });
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }
}
