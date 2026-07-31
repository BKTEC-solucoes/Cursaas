import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CadastroService, SolicitacaoCadastro } from '../../../core/services/cadastro.service';

@Component({
  selector: 'app-admin-cadastros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-page">
      <div class="page-topbar">
        <div>
          <h1>Solicitações de Cadastro</h1>
          <p>Aprove ou recuse solicitações de novos alunos.</p>
        </div>
        <div class="topbar-actions">
          <select [(ngModel)]="filtroStatus" (ngModelChange)="carregarSolicitacoes()" class="filter-select">
            <option value="">Todas</option>
            <option value="pendente">Pendentes</option>
            <option value="aprovada">Aprovadas</option>
            <option value="recusada">Recusadas</option>
          </select>
          <button class="btn-outline" (click)="carregarSolicitacoes()" [disabled]="carregando">
            {{ carregando ? 'Atualizando...' : 'Atualizar' }}
          </button>
        </div>
      </div>

      @if (mensagemSucesso) {
        <div class="msg msg--success">{{ mensagemSucesso }}</div>
      }
      @if (erro) {
        <div class="msg msg--error">{{ erro }}</div>
      }

      @if (solicitacaoRecusando) {
        <div class="modal-overlay" (click)="cancelarRecusa()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3>Recusar Solicitação</h3>
            <p>Informe o motivo da recusa para <strong>{{ solicitacaoRecusando.nome }}</strong>:</p>
            <textarea [(ngModel)]="motivoRecusa" placeholder="Mínimo 5 caracteres..." rows="4" class="motivo-textarea"></textarea>
            <div class="modal-actions">
              <button class="btn-outline" (click)="cancelarRecusa()">Cancelar</button>
              <button class="btn-danger" (click)="confirmarRecusa()" [disabled]="motivoRecusa.trim().length < 5 || processandoId !== null">
                {{ processandoId ? 'Recusando...' : 'Confirmar Recusa' }}
              </button>
            </div>
          </div>
        </div>
      }

      @if (carregando && solicitacoes.length === 0) {
        <div class="loading-state"><div class="spinner"></div><p>Carregando...</p></div>
      }

      @if (!carregando && solicitacoes.length === 0) {
        <div class="empty-state">
          <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/></svg>
          <p>Nenhuma solicitação encontrada.</p>
        </div>
      }

      @if (solicitacoes.length > 0) {
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>E-mail</th>
                <th>Faculdade</th>
                <th>Status</th>
                <th>Solicitado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (s of solicitacoes; track s.id) {
                <tr>
                  <td class="cell-strong">{{ s.nome }}</td>
                  <td>{{ s.email }}</td>
                  <td>{{ s.faculdade_nome || ('Faculdade #' + s.faculdade_id) }}</td>
                  <td>
                    <span class="badge" [class]="'badge--' + s.status">{{ getStatusLabel(s.status) }}</span>
                  </td>
                  <td>{{ s.criado_em | date:'dd/MM/yyyy HH:mm' }}</td>
                  @if (s.status === 'pendente') {
                    <td class="cell-actions">
                      <button class="btn-sm btn-sm--success" (click)="aprovar(s)" [disabled]="processandoId === s.id">
                        {{ processandoId === s.id ? '...' : 'Aprovar' }}
                      </button>
                      <button class="btn-sm btn-sm--danger" (click)="iniciarRecusa(s)" [disabled]="processandoId === s.id">
                        Recusar
                      </button>
                    </td>
                  }
                  @if (s.status !== 'pendente') {
                    <td class="cell-actions">
                      @if (s.revisado_em) {
                        <span class="text-muted">{{ s.revisado_em | date:'dd/MM/yyyy' }}</span>
                      }
                      @if (s.motivo_recusa) {
                        <span class="motivo-tip" [title]="s.motivo_recusa">Ver motivo</span>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .page-topbar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .page-topbar h1 { margin: 0 0 4px; font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text); font-family: var(--font-display); }
    .page-topbar p  { margin: 0; color: var(--color-text-muted); font-size: var(--font-size-sm); }

    .topbar-actions { display: flex; gap: 10px; align-items: center; }

    .filter-select {
      padding: 9px 14px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius);
      font-size: var(--font-size-sm);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      outline: none;
    }
    .filter-select:focus { border-color: var(--primary); }

    .btn-outline {
      padding: 9px 16px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
      font-weight: 500;
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s;
      white-space: nowrap;
    }
    .btn-outline:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
    .btn-outline:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-danger {
      padding: 9px 16px;
      border: none;
      border-radius: var(--radius);
      background: var(--color-danger);
      color: #fff;
      font-size: var(--font-size-sm);
      font-weight: 600;
      cursor: pointer;
    }
    .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

    .msg {
      padding: 12px 16px;
      border-radius: var(--radius);
      font-size: var(--font-size-sm);
      margin-bottom: 16px;
    }
    .msg--success { background: color-mix(in srgb, var(--color-success) 10%, transparent); color: var(--color-success); border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent); }
    .msg--error   { background: color-mix(in srgb, var(--color-danger) 10%, transparent);  color: var(--color-danger);  border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); }

    .loading-state, .empty-state {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 60px 24px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
    }

    .spinner {
      width: 28px; height: 28px;
      border: 3px solid var(--color-border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .table-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }

    table { width: 100%; border-collapse: collapse; }

    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
      font-size: var(--font-size-sm);
    }
    tr:last-child td { border-bottom: none; }

    th {
      background: var(--color-surface-2);
      color: var(--color-text-muted);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .cell-strong { font-weight: 600; color: var(--color-text); }
    .text-muted { font-size: 0.75rem; color: var(--color-text-muted); }

    .badge {
      display: inline-flex;
      padding: 3px 10px;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 700;
    }
    .badge--pendente { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); }
    .badge--aprovada { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
    .badge--recusada { background: color-mix(in srgb, var(--color-danger)  15%, transparent); color: var(--color-danger);  }

    .cell-actions { display: flex; gap: 8px; align-items: center; }

    .btn-sm {
      border: none;
      border-radius: var(--radius);
      padding: 6px 12px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      color: #fff;
    }
    .btn-sm:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-sm--success { background: var(--color-success); }
    .btn-sm--danger  { background: var(--color-danger); }

    .motivo-tip { font-size: 0.75rem; color: var(--color-danger); cursor: help; text-decoration: underline dotted; }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0 0 0 / 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
    }

    .modal-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 28px 32px;
      max-width: 480px;
      width: 90%;
      box-shadow: var(--shadow-lg);
    }

    .modal-card h3 { margin: 0 0 8px; font-size: var(--font-size-lg); color: var(--color-text); }
    .modal-card p  { color: var(--color-text-muted); margin: 0 0 16px; font-size: var(--font-size-sm); }

    .motivo-textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius);
      font-size: var(--font-size-sm);
      resize: vertical;
      box-sizing: border-box;
      background: var(--color-surface-2);
      color: var(--color-text);
      outline: none;
    }
    .motivo-textarea:focus { border-color: var(--primary); }

    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }

    @media (max-width: 900px) {
      .page-topbar { flex-direction: column; align-items: flex-start; }
      .table-card  { overflow-x: auto; }
    }
  `]
})
export class AdminCadastrosComponent implements OnInit {
  solicitacoes: SolicitacaoCadastro[] = [];
  filtroStatus = 'pendente';
  carregando = false;
  erro = '';
  mensagemSucesso = '';
  processandoId: number | null = null;

  solicitacaoRecusando: SolicitacaoCadastro | null = null;
  motivoRecusa = '';

  constructor(private cadastroService: CadastroService) {}

  ngOnInit(): void {
    this.carregarSolicitacoes();
  }

  carregarSolicitacoes(): void {
    this.carregando = true;
    this.erro = '';
    this.mensagemSucesso = '';

    const obs = this.filtroStatus
      ? this.cadastroService.listarTodas(this.filtroStatus)
      : this.cadastroService.listarTodas();

    obs.subscribe({
      next: (lista) => {
        this.solicitacoes = lista;
        this.carregando = false;
      },
      error: (err) => {
        this.erro = err?.error?.detail || 'Erro ao carregar solicitações.';
        this.carregando = false;
      }
    });
  }

  aprovar(s: SolicitacaoCadastro): void {
    this.processandoId = s.id;
    this.erro = '';
    this.mensagemSucesso = '';

    this.cadastroService.aprovar(s.id).subscribe({
      next: (res) => {
        this.processandoId = null;
        this.mensagemSucesso = `Solicitação de ${s.nome} aprovada com sucesso!`;
        this.solicitacoes = this.solicitacoes.map(item => item.id === res.id ? res : item);
        if (this.filtroStatus === 'pendente') {
          this.solicitacoes = this.solicitacoes.filter(item => item.id !== s.id);
        }
      },
      error: (err) => {
        this.processandoId = null;
        this.erro = err?.error?.detail || 'Erro ao aprovar solicitação.';
      }
    });
  }

  iniciarRecusa(s: SolicitacaoCadastro): void {
    this.solicitacaoRecusando = s;
    this.motivoRecusa = '';
  }

  cancelarRecusa(): void {
    this.solicitacaoRecusando = null;
    this.motivoRecusa = '';
  }

  confirmarRecusa(): void {
    if (!this.solicitacaoRecusando || this.motivoRecusa.trim().length < 5) return;
    const s = this.solicitacaoRecusando;
    this.processandoId = s.id;

    this.cadastroService.recusar(s.id, this.motivoRecusa.trim()).subscribe({
      next: (res) => {
        this.processandoId = null;
        this.solicitacaoRecusando = null;
        this.motivoRecusa = '';
        this.mensagemSucesso = `Solicitação de ${s.nome} recusada.`;
        this.solicitacoes = this.solicitacoes.map(item => item.id === res.id ? res : item);
        if (this.filtroStatus === 'pendente') {
          this.solicitacoes = this.solicitacoes.filter(item => item.id !== s.id);
        }
      },
      error: (err) => {
        this.processandoId = null;
        this.erro = err?.error?.detail || 'Erro ao recusar solicitação.';
      }
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pendente: 'Pendente',
      aprovada: 'Aprovada',
      recusada: 'Recusada',
    };
    return labels[status] ?? status;
  }
}
