import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CadastroService, SolicitacaoCadastro } from '../../../core/services/cadastro.service';

@Component({
  selector: 'app-admin-cadastros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Solicitações de Cadastro</h2>
          <p>Aprove ou recuse solicitações de novos alunos.</p>
        </div>
        <div class="header-actions">
          <select [(ngModel)]="filtroStatus" (ngModelChange)="carregarSolicitacoes()" class="filter-select">
            <option value="">Todas</option>
            <option value="pendente">Pendentes</option>
            <option value="aprovada">Aprovadas</option>
            <option value="recusada">Recusadas</option>
          </select>
          <button class="btn-refresh" (click)="carregarSolicitacoes()" [disabled]="carregando">
            {{ carregando ? 'Atualizando...' : 'Atualizar' }}
          </button>
        </div>
      </div>

      <div class="feedback success" *ngIf="mensagemSucesso">{{ mensagemSucesso }}</div>
      <div class="feedback error" *ngIf="erro">{{ erro }}</div>

      <!-- Modal de recusa -->
      <div class="modal-overlay" *ngIf="solicitacaoRecusando" (click)="cancelarRecusa()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Recusar Solicitação</h3>
          <p>Informe o motivo da recusa para <strong>{{ solicitacaoRecusando.nome }}</strong>:</p>
          <textarea
            [(ngModel)]="motivoRecusa"
            placeholder="Mínimo 5 caracteres..."
            rows="4"
            class="motivo-textarea"
          ></textarea>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="cancelarRecusa()">Cancelar</button>
            <button class="btn-reject" (click)="confirmarRecusa()" [disabled]="motivoRecusa.trim().length < 5 || processandoId !== null">
              {{ processandoId ? 'Recusando...' : 'Confirmar Recusa' }}
            </button>
          </div>
        </div>
      </div>

      <div class="table-card" *ngIf="solicitacoes.length > 0">
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
            <tr *ngFor="let s of solicitacoes">
              <td class="strong">{{ s.nome }}</td>
              <td>{{ s.email }}</td>
              <td>{{ s.faculdade_nome || ('Faculdade #' + s.faculdade_id) }}</td>
              <td>
                <span class="status-badge" [class]="'status-' + s.status">
                  {{ getStatusLabel(s.status) }}
                </span>
              </td>
              <td>{{ s.criado_em | date:'dd/MM/yyyy HH:mm' }}</td>
              <td class="actions" *ngIf="s.status === 'pendente'">
                <button
                  class="btn-approve"
                  (click)="aprovar(s)"
                  [disabled]="processandoId === s.id"
                >
                  {{ processandoId === s.id ? '...' : 'Aprovar' }}
                </button>
                <button
                  class="btn-reject"
                  (click)="iniciarRecusa(s)"
                  [disabled]="processandoId === s.id"
                >
                  Recusar
                </button>
              </td>
              <td class="actions" *ngIf="s.status !== 'pendente'">
                <span class="revisado-em" *ngIf="s.revisado_em">
                  {{ s.revisado_em | date:'dd/MM/yyyy' }}
                </span>
                <span class="motivo-recusa" *ngIf="s.motivo_recusa" [title]="s.motivo_recusa">
                  ⚠️ Ver motivo
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="empty-state" *ngIf="!carregando && solicitacoes.length === 0">
        <div class="empty-icon">📋</div>
        <p>Nenhuma solicitação encontrada.</p>
      </div>

      <div class="loading-state" *ngIf="carregando && solicitacoes.length === 0">
        <p>Carregando solicitações...</p>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .page-header h2 {
      margin: 0 0 6px;
      color: #22303c;
    }

    .page-header p {
      margin: 0;
      color: #667085;
    }

    .header-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .filter-select {
      padding: 9px 14px;
      border: 1px solid #d0d5dd;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }

    .btn-refresh {
      background: #22303c;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 16px;
      cursor: pointer;
      font-weight: 600;
    }

    .btn-refresh:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .feedback {
      padding: 14px 16px;
      margin-bottom: 16px;
      border-radius: 10px;
    }

    .feedback.success {
      color: #065f46;
      background: #ecfdf3;
    }

    .feedback.error {
      color: #b42318;
      background: #fef3f2;
    }

    .table-card {
      background: white;
      border-radius: 14px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 14px 16px;
      text-align: left;
      border-bottom: 1px solid #edf2f7;
      font-size: 14px;
    }

    th {
      background: #f8fafc;
      color: #475467;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .strong {
      font-weight: 700;
      color: #1f2937;
    }

    .status-badge {
      display: inline-flex;
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }

    .status-pendente   { background: #fff7cc; color: #8a6d00; }
    .status-aprovada   { background: #d1fae5; color: #065f46; }
    .status-recusada   { background: #fee2e2; color: #b42318; }

    .actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .btn-approve, .btn-reject, .btn-cancel {
      border: none;
      border-radius: 8px;
      padding: 7px 14px;
      color: white;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
    }

    .btn-approve { background: #15803d; }
    .btn-reject  { background: #b42318; }
    .btn-cancel  { background: #6b7280; }

    .btn-approve:disabled,
    .btn-reject:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .revisado-em {
      font-size: 12px;
      color: #888;
    }

    .motivo-recusa {
      font-size: 12px;
      color: #b42318;
      cursor: help;
    }

    .empty-state, .loading-state {
      background: white;
      border-radius: 14px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
      padding: 40px;
      text-align: center;
      color: #667085;
    }

    .empty-icon {
      font-size: 40px;
      margin-bottom: 12px;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
    }

    .modal {
      background: white;
      border-radius: 14px;
      padding: 28px 32px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }

    .modal h3 {
      margin: 0 0 8px;
      color: #1f2937;
    }

    .modal p {
      color: #555;
      margin: 0 0 16px;
      font-size: 14px;
    }

    .motivo-textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d0d5dd;
      border-radius: 8px;
      font-size: 14px;
      resize: vertical;
      box-sizing: border-box;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 16px;
    }

    @media (max-width: 900px) {
      .page-header { flex-direction: column; align-items: flex-start; }
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
      pendente: '⏳ Pendente',
      aprovada: '✓ Aprovada',
      recusada: '✗ Recusada',
    };
    return labels[status] ?? status;
  }
}
