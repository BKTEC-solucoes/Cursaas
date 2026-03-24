import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ApiService, CourseRequest, CourseRequestStatus } from '../../../shared/services/api.service';

@Component({
  selector: 'app-admin-solicitacoes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Solicitacoes de Acesso</h2>
          <p>Analise os pedidos dos alunos para liberar cursos pagos.</p>
        </div>

        <button class="btn-refresh" (click)="carregarSolicitacoes()" [disabled]="carregando">
          {{ carregando ? 'Atualizando...' : 'Atualizar' }}
        </button>
      </div>

      <div class="feedback success" *ngIf="mensagemSucesso">{{ mensagemSucesso }}</div>
      <div class="feedback error" *ngIf="erro">{{ erro }}</div>

      <div class="table-card" *ngIf="solicitacoes.length > 0">
        <table>
          <thead>
            <tr>
              <th>Aluno</th>
              <th>E-mail</th>
              <th>Curso</th>
              <th>Status</th>
              <th>Solicitado em</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let solicitacao of solicitacoes">
              <td class="strong">{{ solicitacao.usuario_nome || 'Aluno sem nome' }}</td>
              <td>{{ solicitacao.usuario_email || 'Sem e-mail' }}</td>
              <td>{{ solicitacao.curso_nome || ('Curso #' + solicitacao.curso_id) }}</td>
              <td>
                <span class="status pendente">{{ getStatusLabel(solicitacao.status) }}</span>
              </td>
              <td>{{ solicitacao.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
              <td class="actions">
                <button
                  class="btn-approve"
                  (click)="atualizarStatus(solicitacao, 'approved')"
                  [disabled]="processandoId === solicitacao.id"
                >
                  Aceitar
                </button>
                <button
                  class="btn-reject"
                  (click)="atualizarStatus(solicitacao, 'rejected')"
                  [disabled]="processandoId === solicitacao.id"
                >
                  Recusar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="empty-state" *ngIf="!carregando && solicitacoes.length === 0">
        Nenhuma solicitacao pendente no momento.
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
    }

    .page-header h2 {
      margin: 0 0 6px;
      color: #22303c;
    }

    .page-header p {
      margin: 0;
      color: #667085;
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

    .table-card,
    .empty-state,
    .feedback {
      background: white;
      border-radius: 14px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
    }

    .feedback {
      padding: 14px 16px;
      margin-bottom: 16px;
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
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 16px;
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

    .status {
      display: inline-flex;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }

    .status.pendente {
      background: #fff7cc;
      color: #8a6d00;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .btn-approve,
    .btn-reject {
      border: none;
      border-radius: 8px;
      padding: 9px 12px;
      color: white;
      cursor: pointer;
      font-weight: 600;
    }

    .btn-approve {
      background: #15803d;
    }

    .btn-reject {
      background: #b42318;
    }

    .btn-approve:disabled,
    .btn-reject:disabled,
    .btn-refresh:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .empty-state {
      padding: 24px;
      color: #475467;
    }

    @media (max-width: 900px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .table-card {
        overflow-x: auto;
      }
    }
  `]
})
export class AdminSolicitacoesComponent implements OnInit {
  solicitacoes: CourseRequest[] = [];
  carregando = false;
  erro = '';
  mensagemSucesso = '';
  processandoId: number | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.carregarSolicitacoes();
  }

  carregarSolicitacoes(): void {
    this.carregando = true;
    this.erro = '';
    this.mensagemSucesso = '';

    this.apiService.getCourseRequests('pending').subscribe({
      next: (solicitacoes) => {
        this.solicitacoes = solicitacoes;
        this.carregando = false;
      },
      error: (error) => {
        this.erro = error?.error?.detail || 'Erro ao carregar solicitacoes.';
        this.carregando = false;
      }
    });
  }

  atualizarStatus(solicitacao: CourseRequest, status: CourseRequestStatus): void {
    this.processandoId = solicitacao.id;
    this.erro = '';
    this.mensagemSucesso = '';

    this.apiService.updateCourseRequestStatus(solicitacao.id, status).subscribe({
      next: () => {
        this.processandoId = null;
        this.solicitacoes = this.solicitacoes.filter((item) => item.id !== solicitacao.id);
        this.mensagemSucesso = status === 'approved'
          ? `Acesso liberado para ${solicitacao.usuario_nome || 'o aluno'}.`
          : `Solicitacao recusada para ${solicitacao.usuario_nome || 'o aluno'}.`;
      },
      error: (error) => {
        this.processandoId = null;
        this.erro = error?.error?.detail || 'Erro ao atualizar solicitacao.';
      }
    });
  }

  getStatusLabel(status: CourseRequestStatus): string {
    if (status === 'approved') {
      return 'Aprovada';
    }
    if (status === 'rejected') {
      return 'Recusada';
    }
    return 'Pendente';
  }
}
