import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { AdminCourse, ApiService } from '../../../shared/services/api.service';

type CursoFormValue = number | string | null;

@Component({
  selector: 'app-admin-cursos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Gerenciar Cursos</h2>
          <p>Cursos gratuitos sao publicados na hora. Cursos pagos entram como pendentes para aprovacao.</p>
        </div>
        <button class="btn-primary" (click)="abrirFormulario()">Novo Curso</button>
      </div>

      <div class="form-card" *ngIf="formAberto">
        <h3>{{ editandoId ? 'Editar curso' : 'Criar curso' }}</h3>

        <form (ngSubmit)="salvarCurso()">
          <div class="form-row">
            <label for="nome">Nome</label>
            <input id="nome" type="text" [(ngModel)]="form.nome" name="nome" required />
          </div>

          <div class="form-row">
            <label for="descricao">Descricao</label>
            <textarea id="descricao" [(ngModel)]="form.descricao" name="descricao"></textarea>
          </div>

          <div class="form-row checkbox-row">
            <label class="checkbox-label" for="curso_pago">
              <input
                id="curso_pago"
                type="checkbox"
                [(ngModel)]="form.pago"
                name="curso_pago"
                (ngModelChange)="onPagoChange($event)"
              />
              Curso Pago
            </label>
          </div>

          <div class="form-row" *ngIf="form.pago">
            <label for="valor">Valor <span class="required">*</span></label>
            <input
              id="valor"
              type="number"
              step="0.01"
              min="0.01"
              [(ngModel)]="form.valor"
              name="valor"
              required
            />
            <small class="form-hint">Obrigatorio para cursos pagos e deve ser maior que zero.</small>
          </div>

          <div class="form-row" *ngIf="!form.pago">
            <small class="form-hint">Curso gratuito sera criado com valor nulo e publicado automaticamente.</small>
          </div>

          <div class="form-row">
            <label for="percentual">Percentual minimo de presenca</label>
            <input
              id="percentual"
              type="number"
              [(ngModel)]="form.percentual_presenca_minima"
              name="percentual_presenca_minima"
              min="0"
              max="100"
            />
          </div>

          <div class="form-row" *ngIf="editandoId">
            <label for="ativo">Disponibilidade</label>
            <select id="ativo" [(ngModel)]="form.ativo" name="ativo">
              <option [ngValue]="true">Ativo</option>
              <option [ngValue]="false">Inativo</option>
            </select>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="criando">
              {{ criando ? 'Salvando...' : 'Salvar' }}
            </button>
            <button type="button" class="btn-secondary" (click)="cancelarFormulario()">Cancelar</button>
          </div>

          <div class="form-error" *ngIf="formErro">{{ formErro }}</div>
        </form>
      </div>

      <div class="success-banner" *ngIf="mensagemSucesso">{{ mensagemSucesso }}</div>

      <div class="table-card" *ngIf="cursos.length > 0">
        <table>
          <thead>
            <tr>
              <th>Curso</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Ativo</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let curso of cursos">
              <td>
                <div class="curso-nome">{{ curso.nome }}</div>
                <div class="curso-descricao">{{ curso.descricao || 'Sem descricao.' }}</div>
              </td>
              <td>
                <span class="badge" [ngClass]="curso.pago ? 'pago' : 'gratuito'">
                  {{ curso.pago ? 'Pago' : 'Gratuito' }}
                </span>
              </td>
              <td>{{ formatarValor(curso.valor) }}</td>
              <td>
                <span class="status-badge" [ngClass]="'status-' + curso.status">
                  {{ getStatusLabel(curso.status) }}
                </span>
              </td>
              <td>{{ curso.ativo ? 'Sim' : 'Nao' }}</td>
              <td class="actions">
                <button class="btn-link" (click)="editarCurso(curso)">Editar</button>
                <button class="btn-link danger" (click)="deletarCurso(curso)" [disabled]="deletandoId === curso.id">
                  {{ deletandoId === curso.id ? 'Excluindo...' : 'Excluir' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="empty-state" *ngIf="!carregando && cursos.length === 0">Nenhum curso cadastrado ainda.</div>
      <div class="loading-state" *ngIf="carregando">Carregando cursos...</div>
      <div class="error-state" *ngIf="erro">{{ erro }}</div>
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
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
    }

    .page-header h2 {
      margin: 0 0 6px;
    }

    .page-header p {
      margin: 0;
      color: #667085;
      max-width: 620px;
    }

    .form-card,
    .table-card,
    .empty-state,
    .loading-state,
    .error-state,
    .success-banner {
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
    }

    .form-card {
      padding: 24px;
      margin-bottom: 20px;
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }

    .form-row input,
    .form-row textarea,
    .form-row select {
      border: 1px solid #d0d5dd;
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 14px;
    }

    .form-row textarea {
      min-height: 110px;
      resize: vertical;
    }

    .checkbox-row {
      margin-bottom: 8px;
    }

    .checkbox-label {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
    }

    .required {
      color: #b42318;
    }

    .form-hint {
      color: #667085;
      font-size: 12px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 18px;
    }

    .btn-primary,
    .btn-secondary {
      border: none;
      border-radius: 10px;
      padding: 10px 16px;
      cursor: pointer;
      font-weight: 600;
    }

    .btn-primary {
      background: #22303c;
      color: #fff;
    }

    .btn-secondary {
      background: #eaecf0;
      color: #344054;
    }

    .btn-primary:disabled,
    .btn-secondary:disabled,
    .btn-link:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .form-error,
    .error-state {
      color: #b42318;
    }

    .form-error {
      margin-top: 14px;
      background: #fef3f2;
      border: 1px solid #fecdca;
      border-radius: 10px;
      padding: 12px;
    }

    .success-banner {
      padding: 14px 16px;
      margin-bottom: 20px;
      color: #065f46;
      background: #ecfdf3;
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
      vertical-align: top;
    }

    th {
      background: #f8fafc;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #475467;
    }

    .curso-nome {
      font-weight: 700;
      color: #101828;
      margin-bottom: 4px;
    }

    .curso-descricao {
      color: #667085;
      font-size: 13px;
    }

    .badge,
    .status-badge {
      display: inline-flex;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 700;
    }

    .badge.pago {
      background: #fff7cc;
      color: #8a6d00;
    }

    .badge.gratuito {
      background: #d1fae5;
      color: #065f46;
    }

    .status-pendente {
      background: #fff7cc;
      color: #8a6d00;
    }

    .status-aprovado {
      background: #d1fae5;
      color: #065f46;
    }

    .status-recusado {
      background: #fee2e2;
      color: #991b1b;
    }

    .actions {
      display: flex;
      gap: 12px;
    }

    .btn-link {
      background: none;
      border: none;
      color: #175cd3;
      cursor: pointer;
      font-weight: 600;
      padding: 0;
    }

    .btn-link.danger {
      color: #b42318;
    }

    .empty-state,
    .loading-state,
    .error-state {
      padding: 24px;
      margin-top: 16px;
    }

    @media (max-width: 900px) {
      .page-header {
        flex-direction: column;
      }

      .table-card {
        overflow-x: auto;
      }
    }
  `]
})
export class AdminCursosComponent implements OnInit {
  cursos: AdminCourse[] = [];
  carregando = false;
  erro = '';
  mensagemSucesso = '';
  formAberto = false;
  formErro = '';
  criando = false;
  deletandoId: number | null = null;
  editandoId: number | null = null;

  form = {
    nome: '',
    descricao: '',
    pago: false,
    valor: null as CursoFormValue,
    percentual_presenca_minima: 75,
    ativo: true
  };

  constructor(
    private apiService: ApiService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.carregarCursos();
  }

  carregarCursos(): void {
    this.carregando = true;
    this.erro = '';

    this.apiService.getAdminCursos().subscribe({
      next: (cursos) => {
        this.cursos = (cursos || []).map((curso) => ({
          ...curso,
          descricao: curso.descricao ?? null
        }));
        console.log('Cursos do admin recebidos:', this.cursos);
        this.carregando = false;
      },
      error: (error) => {
        console.error('Erro ao carregar cursos:', error);
        this.erro = error?.error?.detail || 'Erro ao carregar cursos.';
        this.carregando = false;
      }
    });
  }

  abrirFormulario(): void {
    this.mensagemSucesso = '';
    this.formErro = '';
    this.editandoId = null;
    this.form = {
      nome: '',
      descricao: '',
      pago: false,
      valor: null,
      percentual_presenca_minima: 75,
      ativo: true
    };
    this.formAberto = true;
  }

  editarCurso(curso: AdminCourse): void {
    this.mensagemSucesso = '';
    this.formErro = '';
    this.editandoId = curso.id;
    this.form = {
      nome: curso.nome,
      descricao: curso.descricao || '',
      pago: !!curso.pago,
      valor: curso.pago ? curso.valor ?? null : null,
      percentual_presenca_minima: curso.percentual_presenca_minima,
      ativo: curso.ativo
    };
    this.formAberto = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarFormulario(): void {
    this.formAberto = false;
    this.editandoId = null;
    this.formErro = '';
  }

  onPagoChange(pago: boolean): void {
    if (!pago) {
      this.form.valor = null;
    }
  }

  salvarCurso(): void {
    const nome = this.form.nome.trim();
    if (!nome) {
      this.formErro = 'O nome do curso e obrigatorio.';
      return;
    }

    const valor = this.normalizarValor(this.form.valor);
    if (this.form.pago && (valor === null || valor <= 0)) {
      this.formErro = 'Informe um valor maior que zero para cursos pagos.';
      return;
    }

    this.criando = true;
    this.formErro = '';

    const payload = {
      nome,
      descricao: this.form.descricao.trim() || null,
      pago: this.form.pago,
      valor: this.form.pago ? valor : null,
      percentual_presenca_minima: this.form.percentual_presenca_minima,
      ativo: this.form.ativo
    };

    const request$ = this.editandoId
      ? this.apiService.updateCurso(this.editandoId, payload)
      : this.apiService.createCurso(payload);

    request$.subscribe({
      next: (curso: AdminCourse) => {
        this.criando = false;
        this.formAberto = false;
        this.editandoId = null;
        this.mensagemSucesso = curso.pago && curso.status === 'pendente'
          ? 'Curso pago criado com status pendente. Ele so sera publicado apos aprovacao do admin.'
          : 'Curso salvo com sucesso.';
        this.carregarCursos();
      },
      error: (err) => {
        console.error('Erro ao salvar curso:', err);
        this.criando = false;
        this.formErro = err?.error?.detail || 'Erro ao salvar curso.';
      }
    });
  }

  deletarCurso(curso: AdminCourse): void {
    const confirmou = confirm(`Deseja excluir o curso "${curso.nome}"?`);
    if (!confirmou) {
      return;
    }

    this.deletandoId = curso.id;
    this.http.delete(`http://localhost:8000/api/cursos/${curso.id}`).subscribe({
      next: () => {
        this.deletandoId = null;
        this.mensagemSucesso = 'Curso excluido com sucesso.';
        this.carregarCursos();
      },
      error: (err) => {
        console.error('Erro ao excluir curso:', err);
        this.deletandoId = null;
        this.erro = err?.error?.detail || 'Erro ao excluir curso.';
      }
    });
  }

  formatarValor(valor?: number | null): string {
    if (valor == null || Number(valor) <= 0) {
      return 'Gratis';
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(valor));
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'recusado':
        return 'Recusado';
      default:
        return 'Aprovado';
    }
  }

  private normalizarValor(valor: CursoFormValue): number | null {
    if (valor === null || valor === '') {
      return null;
    }

    const normalizado = typeof valor === 'string' ? Number(valor.replace(',', '.')) : Number(valor);
    return Number.isFinite(normalizado) ? normalizado : null;
  }
}
