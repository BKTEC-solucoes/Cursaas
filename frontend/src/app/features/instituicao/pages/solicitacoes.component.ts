import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

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
    :host { display: block; }

    .badge--warn { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 700; }
    .badge--success { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 700; }
    .badge--danger { background: color-mix(in srgb, var(--color-danger) 15%, transparent); color: var(--color-danger); padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 700; }

    .loading-state { text-align: center; padding: 40px; color: var(--color-text-muted); }
    .spinner { display: inline-block; width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: var(--space-3); }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-card { background: color-mix(in srgb, var(--color-danger) 10%, transparent); color: var(--color-danger); padding: var(--space-5); border-radius: var(--radius-lg); border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); margin-bottom: var(--space-4); }

    .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-6); box-shadow: var(--shadow-sm); }

    .filtro-row { display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-5); padding-bottom: var(--space-4); border-bottom: 1px solid var(--color-border); flex-wrap: wrap; }
    .filtro-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .filtro-btns { display: flex; gap: var(--space-2); }
    .filtro-btn { padding: var(--space-1) var(--space-4); border-radius: var(--radius-full); border: 1px solid var(--color-border); background: var(--color-surface-2); color: var(--color-text-muted); font-size: var(--font-size-sm); cursor: pointer; transition: all var(--transition-fast); }
    .filtro-btn:hover { border-color: var(--primary); color: var(--primary); }
    .filtro-btn.ativo { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 600; }

    .lista { display: flex; flex-direction: column; gap: var(--space-2); }

    .solicitacao-card { border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; cursor: pointer; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
    .solicitacao-card:hover { border-color: color-mix(in srgb, var(--primary) 50%, transparent); box-shadow: var(--shadow-sm); }
    .solicitacao-card.expandido { border-color: var(--primary); }

    .sol-header { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4); }
    .sol-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-lg); font-weight: 700; flex-shrink: 0; }
    .sol-info { flex: 1; min-width: 0; }
    .sol-nome { font-weight: 600; color: var(--color-text); font-size: var(--font-size-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sol-email { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .sol-meta { display: flex; flex-direction: column; align-items: flex-end; gap: var(--space-1); }
    .sol-data { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .expand-icon { color: var(--color-text-muted); font-size: var(--font-size-xs); flex-shrink: 0; }

    .sol-detalhes { padding: 0 var(--space-4) var(--space-4); border-top: 1px solid var(--color-border); cursor: default; }
    .detalhe-grid { display: flex; gap: var(--space-6); margin-top: var(--space-3); flex-wrap: wrap; }
    .detalhe-item { display: flex; flex-direction: column; gap: 2px; }
    .d-label { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--color-text-muted); }
    .d-value { font-size: var(--font-size-sm); color: var(--color-text); }
    .d-value.mono { font-family: monospace; }

    .mensagem-box, .recusa-box { margin-top: var(--space-3); padding: var(--space-3); border-radius: var(--radius); }
    .mensagem-box { background: var(--color-surface-2); border: 1px solid var(--color-border); }
    .recusa-box { background: color-mix(in srgb, var(--color-danger) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent); }
    .mensagem-box p, .recusa-box p { margin: var(--space-2) 0 0; font-size: var(--font-size-sm); color: var(--color-text); line-height: 1.5; white-space: pre-wrap; }

    .acoes-row { display: flex; gap: var(--space-3); margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--color-border); }
    .btn-aprovar { padding: var(--space-2) var(--space-5); border-radius: var(--radius); border: none; font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; background: var(--primary); color: #fff; transition: background var(--transition-fast); }
    .btn-aprovar:hover:not(:disabled) { background: var(--secondary); }
    .btn-aprovar:disabled { opacity: .6; cursor: not-allowed; }
    .btn-recusar { padding: var(--space-2) var(--space-5); border-radius: var(--radius); font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; background: color-mix(in srgb, var(--color-danger) 10%, transparent); color: var(--color-danger); border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); transition: background var(--transition-fast); }
    .btn-recusar:hover:not(:disabled) { background: color-mix(in srgb, var(--color-danger) 18%, transparent); }
    .btn-recusar:disabled { opacity: .6; cursor: not-allowed; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-7); width: 480px; max-width: 95vw; box-shadow: var(--shadow-lg); }
    .modal-title { margin: 0 0 var(--space-2); font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); font-family: var(--font-display); }
    .modal-sub { margin: 0 0 var(--space-4); font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .modal textarea { width: 100%; box-sizing: border-box; padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius); font-size: var(--font-size-sm); resize: vertical; outline: none; background: var(--color-surface); color: var(--color-text); }
    .modal textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent); }
    .modal-erro { margin-top: var(--space-2); font-size: var(--font-size-sm); color: var(--color-danger); }
    .modal-actions { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-5); }
    .btn-outline { padding: var(--space-2) var(--space-4); border-radius: var(--radius); border: 1px solid var(--color-border); background: var(--color-surface-2); color: var(--color-text-muted); font-size: var(--font-size-sm); cursor: pointer; }
    .btn-outline:hover { background: var(--color-border); color: var(--color-text); }
    .btn-danger { padding: var(--space-2) var(--space-5); border-radius: var(--radius); border: none; background: var(--color-danger); color: #fff; font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; }
    .btn-danger:hover:not(:disabled) { filter: brightness(.9); }
    .btn-danger:disabled { opacity: .6; cursor: not-allowed; }
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
    this.http.get<Solicitacao[]>(`${environment.apiUrl}/instituicoes/minha/solicitacoes`, { headers: this.headers() }).subscribe({
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
    const url = `${environment.apiUrl}/instituicoes/minha/solicitacoes/${s.id}/aprovar`;
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
    const url = `${environment.apiUrl}/instituicoes/minha/solicitacoes/${s.id}/recusar?${params}`;
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
