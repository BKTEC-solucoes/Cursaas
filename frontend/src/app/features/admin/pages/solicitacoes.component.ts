import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminCourse, ApiService } from '../../../shared/services/api.service';

@Component({
  selector: 'app-admin-solicitacoes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Solicitacoes de Cursos</h2>
          <p>Analise os cursos pagos pendentes antes de publica-los no catalogo.</p>
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
              <th>Curso</th>
              <th>Descricao</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Criado em</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let curso of solicitacoes">
              <td class="strong">{{ curso.nome }}</td>
              <td>{{ curso.descricao || 'Sem descricao.' }}</td>
              <td>{{ formatarValor(curso.valor) }}</td>
              <td><span class="status pendente">Pendente</span></td>
              <td>{{ curso.data_criacao | date:'dd/MM/yyyy HH:mm' }}</td>
              <td class="actions">
                <button
                  class="btn-approve"
                  (click)="aprovar(curso)"
                  [disabled]="processandoId === curso.id"
                >
                  Aprovar
                </button>
                <button
                  class="btn-reject"
                  (click)="recusar(curso)"
                  [disabled]="processandoId === curso.id"
                >
                  Recusar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="empty-state" *ngIf="!carregando && solicitacoes.length === 0">
        Nenhum curso pago pendente no momento.
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
  solicitacoes: AdminCourse[] = [];
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

    this.apiService.getAdminCourseApprovals().subscribe({
      next: (cursos) => {
        this.solicitacoes = cursos;
        this.carregando = false;
      },
      error: (error) => {
        this.erro = error?.error?.detail || 'Erro ao carregar solicitacoes.';
        this.carregando = false;
      }
    });
  }

  aprovar(curso: AdminCourse): void {
    this.processandoId = curso.id;
    this.erro = '';
    this.mensagemSucesso = '';

    this.apiService.approveAdminCourse(curso.id).subscribe({
      next: () => {
        this.processandoId = null;
        this.solicitacoes = this.solicitacoes.filter((item) => item.id !== curso.id);
        this.mensagemSucesso = `Curso "${curso.nome}" aprovado e publicado no catalogo.`;
      },
      error: (error) => {
        this.processandoId = null;
        this.erro = error?.error?.detail || 'Erro ao aprovar curso.';
      }
    });
  }

  recusar(curso: AdminCourse): void {
    this.processandoId = curso.id;
    this.erro = '';
    this.mensagemSucesso = '';

    this.apiService.rejectAdminCourse(curso.id).subscribe({
      next: () => {
        this.processandoId = null;
        this.solicitacoes = this.solicitacoes.filter((item) => item.id !== curso.id);
        this.mensagemSucesso = `Curso "${curso.nome}" recusado.`;
      },
      error: (error) => {
        this.processandoId = null;
        this.erro = error?.error?.detail || 'Erro ao recusar curso.';
      }
    });
  }

  formatarValor(valor?: number | null): string {
    if (valor == null || Number(valor) <= 0) {
      return 'Nao informado';
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(valor));
  }
}
