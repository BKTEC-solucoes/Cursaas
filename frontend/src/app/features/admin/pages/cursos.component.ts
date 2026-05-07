import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AdminCourse, ApiService } from '../../../shared/services/api.service';

type CursoFormValue = number | string | null;

@Component({
  selector: 'app-admin-cursos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-page">
      <div class="page-topbar">
        <div>
          <h1>Gerenciar Cursos</h1>
          <p class="page-subtitle">Cursos gratuitos são publicados imediatamente. Cursos pagos ficam pendentes de aprovação.</p>
        </div>
        <button class="btn-primary" (click)="abrirFormulario()">+ Novo Curso</button>
      </div>

      @if (cursoParaDeletar) {
        <div class="modal-overlay" (click)="cancelarDelecao()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3>Confirmar Exclusão</h3>
            <p>Tem certeza que deseja excluir o curso <strong>{{ cursoParaDeletar.nome }}</strong>?</p>
            <p class="modal-aviso">Esta ação não pode ser desfeita. Todas as aulas, provas e inscrições associadas serão removidas.</p>
            <div class="modal-actions">
              <button class="btn-danger" (click)="confirmarDelecao()" [disabled]="deletando">{{ deletando ? 'Deletando...' : 'Sim, deletar' }}</button>
              <button class="btn-outline" (click)="cancelarDelecao()" [disabled]="deletando">Cancelar</button>
            </div>
            @if (deleteErro) { <div class="form-error">{{ deleteErro }}</div> }
          </div>
        </div>
      }

      @if (modalAulaAberto) {
        <div class="modal-overlay" (click)="fecharNovaAula()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3>Nova Aula — {{ cursoSelecionado?.nome }}</h3>
            <form (ngSubmit)="salvarAula()">
              <div class="form-row">
                <label>Título *</label>
                <input type="text" [(ngModel)]="formAula.titulo" name="titulo" required placeholder="Ex: Aula 1 - Introdução" />
              </div>
              <div class="form-row">
                <label>Descrição</label>
                <textarea [(ngModel)]="formAula.descricao" name="descricao" rows="3" placeholder="Conteúdo da aula..."></textarea>
              </div>
              <div class="form-row">
                <label>Data e Hora da Aula *</label>
                <input type="datetime-local" [(ngModel)]="formAula.data_aula" name="data_aula" required />
              </div>
              <div class="form-row">
                <label>Duração (minutos)</label>
                <input type="number" [(ngModel)]="formAula.duracao_minutos" name="duracao_minutos" min="1" placeholder="Ex: 60" />
              </div>
              @if (erroAula) { <div class="form-error">{{ erroAula }}</div> }
              <div class="modal-actions" style="margin-top: 16px;">
                <button type="submit" class="btn-primary" [disabled]="criandoAula">{{ criandoAula ? 'Salvando...' : 'Salvar Aula' }}</button>
                <button type="button" class="btn-outline" (click)="fecharNovaAula()" [disabled]="criandoAula">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (formAberto) {
        <div class="form-card">
          <h2 class="form-card-title">{{ editandoId ? 'Editar Curso' : 'Novo Curso' }}</h2>
          <form (ngSubmit)="salvarCurso()">
            <div class="form-row">
              <label>Nome *</label>
              <input type="text" [(ngModel)]="form.nome" name="nome" required placeholder="Nome do curso" />
            </div>
            <div class="form-row">
              <label>Descrição</label>
              <textarea [(ngModel)]="form.descricao" name="descricao" rows="3" placeholder="Descrição do curso..."></textarea>
            </div>

            <div class="form-row">
              <label>Tipo de Curso</label>
              <div class="tipo-curso-options">
                <label class="tipo-option" [class.selected]="!form.pago">
                  <input type="radio" [value]="false" [(ngModel)]="form.pago" name="tipo_curso" (ngModelChange)="onPagoChange($event)" />
                  <span class="tipo-label">Gratuito</span>
                  <span class="tipo-desc">Publicado automaticamente</span>
                </label>
                <label class="tipo-option" [class.selected]="form.pago">
                  <input type="radio" [value]="true" [(ngModel)]="form.pago" name="tipo_curso" (ngModelChange)="onPagoChange($event)" />
                  <span class="tipo-label">Pago</span>
                  <span class="tipo-desc">Precisa de aprovação</span>
                </label>
              </div>
            </div>

            @if (form.pago) {
              <div class="form-row">
                <label>Valor (R$) *</label>
                <input type="number" step="0.01" min="0.01" [(ngModel)]="form.valor" name="valor" placeholder="0,00" required />
              </div>
            }

            <div class="form-row">
              <label>Percentual mínimo de presença (%)</label>
              <input type="number" [(ngModel)]="form.percentual_presenca_minima" name="percentual_presenca_minima" min="0" max="100" />
            </div>

            @if (editandoId) {
              <div class="form-row">
                <label>Disponibilidade</label>
                <select [(ngModel)]="form.ativo" name="ativo">
                  <option [ngValue]="true">Ativo</option>
                  <option [ngValue]="false">Inativo</option>
                </select>
              </div>
            }

            <div class="form-actions">
              <button type="submit" class="btn-primary" [disabled]="criando">{{ criando ? 'Salvando...' : 'Salvar' }}</button>
              <button type="button" class="btn-outline" (click)="cancelarFormulario()">Cancelar</button>
            </div>
            @if (formErro) { <div class="form-error">{{ formErro }}</div> }
          </form>
        </div>
      }

      @if (mensagemSucesso) {
        <div class="msg msg--success">{{ mensagemSucesso }}</div>
      }

      @if (carregando) {
        <div class="loading-state"><div class="spinner"></div><p>Carregando cursos...</p></div>
      }

      @if (!carregando && cursos.length > 0) {
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Curso</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ativo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (curso of cursos; track curso.id) {
                <tr>
                  <td>
                    <div class="cell-strong">{{ curso.nome }}</div>
                    <div class="cell-sub">{{ curso.descricao || 'Sem descrição.' }}</div>
                  </td>
                  <td>
                    <span class="badge" [class]="curso.pago ? 'badge--warn' : 'badge--success'">
                      {{ curso.pago ? 'Pago' : 'Gratuito' }}
                    </span>
                  </td>
                  <td>{{ formatarValor(curso.valor) }}</td>
                  <td>
                    <span class="badge" [ngClass]="'badge--' + (curso.status === 'aprovado' ? 'success' : curso.status === 'recusado' ? 'danger' : 'warn')">
                      {{ getStatusLabel(curso.status) }}
                    </span>
                  </td>
                  <td>{{ curso.ativo ? 'Sim' : 'Não' }}</td>
                  <td class="cell-actions">
                    <button class="btn-sm-action" (click)="abrirNovaAula(curso)">+ Aula</button>
                    <button class="btn-icon btn-icon--edit" title="Editar" (click)="editarCurso(curso)">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon btn-icon--delete" title="Deletar" (click)="abrirDelecao(curso)">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (!carregando && cursos.length === 0) {
        <div class="empty-state">
          <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          <p>Nenhum curso criado ainda. Clique em "Novo Curso" para começar.</p>
        </div>
      }

      @if (erro) {
        <div class="msg msg--error">{{ erro }} <button (click)="carregarCursos()">Tentar novamente</button></div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .page-topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .page-topbar h1 { margin: 0 0 4px; font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text); font-family: var(--font-display); }
    .page-subtitle { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-muted); }

    .btn-primary { background: var(--primary); color: #fff; border: none; padding: 10px 18px; border-radius: var(--radius); cursor: pointer; font-weight: 600; font-size: var(--font-size-sm); transition: opacity 0.15s; white-space: nowrap; }
    .btn-primary:hover:not(:disabled) { opacity: 0.88; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-outline { padding: 9px 16px; border: 1.5px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); color: var(--color-text-muted); font-size: var(--font-size-sm); font-weight: 500; cursor: pointer; }
    .btn-outline:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
    .btn-outline:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-danger { background: var(--color-danger); color: #fff; border: none; padding: 9px 16px; border-radius: var(--radius); cursor: pointer; font-weight: 600; font-size: var(--font-size-sm); }
    .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0 0 0 / 0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 28px 32px; max-width: 500px; width: 90%; box-shadow: var(--shadow-lg); }
    .modal-card h3 { margin: 0 0 12px; font-size: var(--font-size-lg); color: var(--color-danger); }
    .modal-card p { color: var(--color-text-muted); margin-bottom: 8px; font-size: var(--font-size-sm); }
    .modal-aviso { font-size: 0.8125rem; font-style: italic; }
    .modal-actions { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }

    /* Form */
    .form-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 28px; margin-bottom: 24px; box-shadow: var(--shadow-sm); }
    .form-card-title { margin: 0 0 20px; font-size: var(--font-size-lg); color: var(--color-text); }
    .form-row { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
    .form-row label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-muted); }
    .form-row input, .form-row select, .form-row textarea {
      padding: 9px 12px; border: 1.5px solid var(--color-border); border-radius: var(--radius);
      font-size: var(--font-size-sm); outline: none; transition: border-color 0.2s;
      font-family: inherit; background: var(--color-surface-2); color: var(--color-text);
    }
    .form-row input:focus, .form-row select:focus, .form-row textarea:focus { border-color: var(--primary); background: var(--color-surface); }
    .form-row textarea { resize: vertical; }
    .form-actions { display: flex; gap: 10px; margin-top: 18px; }
    .form-error { margin-top: 12px; padding: 10px 14px; background: color-mix(in srgb, var(--color-danger) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent); border-radius: var(--radius); color: var(--color-danger); font-size: var(--font-size-sm); }

    /* Tipo curso */
    .tipo-curso-options { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .tipo-option { display: flex; flex-direction: column; gap: 3px; padding: 14px; border: 2px solid var(--color-border); border-radius: var(--radius); cursor: pointer; transition: border-color 0.2s, background 0.2s; }
    .tipo-option input[type="radio"] { display: none; }
    .tipo-option.selected { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 6%, transparent); }
    .tipo-label { font-weight: 700; font-size: var(--font-size-sm); color: var(--color-text); }
    .tipo-desc { font-size: 0.75rem; color: var(--color-text-muted); }

    /* Messages */
    .msg { padding: 12px 16px; border-radius: var(--radius); font-size: var(--font-size-sm); margin-bottom: 16px; }
    .msg--success { background: color-mix(in srgb, var(--color-success) 10%, transparent); color: var(--color-success); border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent); }
    .msg--error { background: color-mix(in srgb, var(--color-danger) 8%, transparent); color: var(--color-danger); border: 1px solid color-mix(in srgb, var(--color-danger) 20%, transparent); display: flex; align-items: center; gap: 12px; }
    .msg--error button { background: none; border: none; color: var(--color-danger); cursor: pointer; font-weight: 600; font-size: var(--font-size-sm); text-decoration: underline; }

    /* States */
    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 24px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Table */
    .table-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow-x: auto; box-shadow: var(--shadow-sm); }
    table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); min-width: 700px; }
    th { padding: 12px 14px; text-align: left; font-weight: 600; color: var(--color-text-muted); background: var(--color-surface-2); border-bottom: 1px solid var(--color-border); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
    td { padding: 12px 14px; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--color-surface-2); }

    .cell-strong { font-weight: 600; }
    .cell-sub { font-size: 0.8125rem; color: var(--color-text-muted); margin-top: 2px; }

    .badge { display: inline-flex; padding: 3px 10px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; }
    .badge--success { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
    .badge--warn    { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); }
    .badge--danger  { background: color-mix(in srgb, var(--color-danger)  15%, transparent); color: var(--color-danger);  }

    .cell-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }

    .btn-sm-action { padding: 5px 10px; background: color-mix(in srgb, var(--color-success) 12%, transparent); color: var(--color-success); border: 1.5px solid color-mix(in srgb, var(--color-success) 30%, transparent); border-radius: var(--radius); font-size: 0.75rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
    .btn-sm-action:hover { background: color-mix(in srgb, var(--color-success) 20%, transparent); }

    .btn-icon { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: var(--radius); border: 1.5px solid var(--color-border); background: var(--color-surface); cursor: pointer; }
    .btn-icon--edit  { color: var(--primary); }
    .btn-icon--edit:hover  { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, transparent); }
    .btn-icon--delete { color: var(--color-danger); }
    .btn-icon--delete:hover { border-color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 8%, transparent); }

    @media (max-width: 700px) { .tipo-curso-options { grid-template-columns: 1fr; } }
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
  editandoId: number | null = null;
  cursoParaDeletar: AdminCourse | null = null;
  deletando = false;
  deleteErro = '';
  form = {
    nome: '',
    descricao: '',
    pago: false,
    valor: null as CursoFormValue,
    percentual_presenca_minima: 75,
    ativo: true
  };

  modalAulaAberto = false;
  cursoSelecionado: AdminCourse | null = null;
  criandoAula = false;
  erroAula = '';
  formAula = {
    titulo: '',
    descricao: '',
    data_aula: '',
    duracao_minutos: null as number | null
  };

  constructor(
    private apiService: ApiService
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
    this.editandoId = null;
  }

  onPagoChange(pago: boolean): void {
    if (!pago) {
      this.form.valor = null;
    }
  }

  salvarCurso(): void {
    const nome = this.form.nome.trim();
    if (!nome) {
      this.formErro = 'O nome do curso é obrigatório.';
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

    if (this.editandoId !== null) {
      this.apiService.updateCurso(this.editandoId, payload).subscribe({
        next: () => {
          this.criando = false;
          this.formAberto = false;
          this.editandoId = null;
          this.carregarCursos();
        },
        error: (err: any) => {
          console.error('Erro ao editar curso:', err);
          this.criando = false;
          this.formErro = err?.error?.detail || 'Erro ao editar curso. Tente novamente.';
        }
      });
    } else {
      this.apiService.createCurso(payload).subscribe({
        next: () => {
          this.criando = false;
          this.formAberto = false;
          this.carregarCursos();
        },
        error: (err: any) => {
          console.error('Erro ao criar curso:', err);
          this.criando = false;
          this.formErro = err?.error?.detail || 'Erro ao criar curso. Tente novamente.';
        }
      });
    }
  }

  abrirNovaAula(curso: AdminCourse): void {
    this.cursoSelecionado = curso;
    this.erroAula = '';
    this.formAula = { titulo: '', descricao: '', data_aula: '', duracao_minutos: null };
    this.modalAulaAberto = true;
  }

  fecharNovaAula(): void {
    if (this.criandoAula) return;
    this.modalAulaAberto = false;
    this.cursoSelecionado = null;
  }

  salvarAula(): void {
    if (!this.formAula.titulo.trim()) {
      this.erroAula = 'O título da aula é obrigatório.';
      return;
    }
    if (!this.formAula.data_aula) {
      this.erroAula = 'A data e hora da aula são obrigatórias.';
      return;
    }

    this.criandoAula = true;
    this.erroAula = '';

    const payload: any = {
      curso_id: this.cursoSelecionado!.id,
      titulo: this.formAula.titulo.trim(),
      descricao: this.formAula.descricao.trim() || null,
      data_aula: new Date(this.formAula.data_aula).toISOString(),
      duracao_minutos: this.formAula.duracao_minutos || null
    };

    this.apiService.createAula(payload).subscribe({
      next: () => {
        this.criandoAula = false;
        this.modalAulaAberto = false;
        this.cursoSelecionado = null;
      },
      error: (err: any) => {
        console.error('Erro ao criar aula:', err);
        this.criandoAula = false;
        this.erroAula = err?.error?.detail || 'Erro ao criar aula. Tente novamente.';
      }
    });
  }

  abrirDelecao(curso: AdminCourse): void {
    this.deleteErro = '';
    this.cursoParaDeletar = curso;
  }

  cancelarDelecao(): void {
    if (this.deletando) return;
    this.cursoParaDeletar = null;
    this.deleteErro = '';
  }

  confirmarDelecao(): void {
    if (!this.cursoParaDeletar) return;
    this.deletando = true;
    this.deleteErro = '';

    this.apiService.deleteCurso(this.cursoParaDeletar.id).subscribe({
      next: () => {
        this.deletando = false;
        this.cursoParaDeletar = null;
        this.carregarCursos();
      },
      error: (err: any) => {
        console.error('Erro ao deletar curso:', err);
        this.deletando = false;
        this.deleteErro = err?.error?.detail || 'Erro ao deletar curso. Tente novamente.';
      }
    });
  }

  formatarValor(valor?: number | null): string {
    if (valor == null) {
      return 'Grátis';
    }

    const numValor = Number(valor);
    if (!Number.isFinite(numValor)) {
      return 'Grátis';
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValor);
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
