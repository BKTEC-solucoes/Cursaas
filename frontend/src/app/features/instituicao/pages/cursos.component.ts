import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AdminCourse, ApiService } from '../../../shared/services/api.service';

type CursoFormValue = number | string | null;

@Component({
  selector: 'app-instituicao-cursos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Gerenciar Cursos</h1>
          <p class="page-subtitle">Cursos gratuitos são publicados automaticamente. Cursos pagos entram como pendentes para aprovação.</p>
        </div>
        <button class="btn-primary" (click)="abrirFormulario()">Novo Curso</button>
      </div>

      @if (cursoParaDeletar) {
        <div class="modal-overlay" (click)="cancelarDelecao()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3 class="modal-title">Confirmar Exclusão</h3>
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

      @if (formAberto) {
        <div class="form-card">
          <h3 class="form-card-title">{{ editandoId ? 'Editar Curso' : 'Novo Curso' }}</h3>
          <form (ngSubmit)="salvarCurso()">
            <div class="form-row">
              <label for="nome">Nome</label>
              <input id="nome" type="text" [(ngModel)]="form.nome" name="nome" required />
            </div>
            <div class="form-row">
              <label for="descricao">Descrição</label>
              <textarea id="descricao" [(ngModel)]="form.descricao" name="descricao"></textarea>
            </div>
            <div class="form-row tipo-curso-section">
              <label class="section-label">Tipo de Curso</label>
              <div class="tipo-curso-options">
                <label class="radio-option">
                  <input type="radio" [value]="false" [(ngModel)]="form.pago" name="tipo_curso" (ngModelChange)="onPagoChange($event)" class="radio-input" />
                  <span class="radio-custom"></span>
                  <span class="option-content">
                    <span class="option-title">Livre (Gratuito)</span>
                    <span class="option-desc">Publicado automaticamente</span>
                  </span>
                </label>
                <label class="radio-option">
                  <input type="radio" [value]="true" [(ngModel)]="form.pago" name="tipo_curso" (ngModelChange)="onPagoChange($event)" class="radio-input" />
                  <span class="radio-custom"></span>
                  <span class="option-content">
                    <span class="option-title">Pago</span>
                    <span class="option-desc">Precisa de aprovação</span>
                  </span>
                </label>
              </div>
            </div>
            @if (form.pago) {
              <div class="form-row">
                <label for="valor">Valor do Curso *</label>
                <div class="valor-input-group">
                  <span class="valor-prefix">R$</span>
                  <input id="valor" type="number" step="0.01" min="0.01" max="999999.99" [(ngModel)]="form.valor" name="valor" placeholder="0,00" class="valor-input" required />
                </div>
                <small class="form-hint">Informe um valor maior que zero.</small>
              </div>
            }
            @if (!form.pago) {
              <div class="info-box">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>Este curso será gratuito e publicado automaticamente no catálogo.</span>
              </div>
            }
            <div class="form-row">
              <label for="percentual">Percentual mínimo de presença</label>
              <input id="percentual" type="number" [(ngModel)]="form.percentual_presenca_minima" name="percentual_presenca_minima" min="0" max="100" />
            </div>
            @if (editandoId) {
              <div class="form-row">
                <label for="ativo">Disponibilidade</label>
                <select id="ativo" [(ngModel)]="form.ativo" name="ativo">
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
        <div class="success-banner">{{ mensagemSucesso }}</div>
      }

      @if (carregando) {
        <div class="loading-state"><div class="spinner"></div><p>Carregando cursos...</p></div>
      }
      @if (erro) {
        <div class="error-card"><p>{{ erro }}</p><button (click)="carregarCursos()">Tentar novamente</button></div>
      }

      @if (cursos.length > 0) {
        <div class="table-card">
          <table class="table table-zebra">
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
                    <div class="curso-nome">{{ curso.nome }}</div>
                    <div class="curso-descricao">{{ curso.descricao || 'Sem descrição.' }}</div>
                  </td>
                  <td><span class="badge" [class.badge--warn]="curso.pago" [class.badge--success]="!curso.pago">{{ curso.pago ? 'Pago' : 'Gratuito' }}</span></td>
                  <td>{{ formatarValor(curso.valor) }}</td>
                  <td><span class="badge" [class.badge--warn]="curso.status==='pendente'" [class.badge--success]="curso.status==='aprovado'" [class.badge--danger]="curso.status==='recusado'">{{ getStatusLabel(curso.status) }}</span></td>
                  <td>{{ curso.ativo ? 'Sim' : 'Não' }}</td>
                  <td class="col-actions">
                    <button class="btn-sm btn-sm--primary" title="Nova Aula" (click)="abrirNovaAula(curso)">Nova Aula</button>
                    <button class="btn-icon btn-icon--edit" title="Editar" (click)="editarCurso(curso)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon btn-icon--delete" title="Deletar" (click)="abrirDelecao(curso)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (modalAulaAberto) {
        <div class="modal-overlay" (click)="fecharNovaAula()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3 class="modal-title">Nova Aula &mdash; {{ cursoSelecionado?.nome }}</h3>
            <form (ngSubmit)="salvarAula()">
              <div class="form-row">
                <label>Título *</label>
                <input type="text" [(ngModel)]="formAula.titulo" name="titulo" required placeholder="Ex: Aula 1 - Introdução" />
              </div>
              <div class="form-row">
                <label>Descrição</label>
                <textarea [(ngModel)]="formAula.descricao" name="descricao" placeholder="Conteúdo da aula..."></textarea>
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
              <div class="modal-actions">
                <button type="submit" class="btn-primary" [disabled]="criandoAula">{{ criandoAula ? 'Salvando...' : 'Salvar Aula' }}</button>
                <button type="button" class="btn-outline" (click)="fecharNovaAula()" [disabled]="criandoAula">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (cursos.length === 0 && !carregando) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </div>
          <h3 class="empty-title">Nenhum curso criado</h3>
          <p>Clique em "Novo Curso" para começar.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-4); }

    .btn-primary { background: var(--primary); color: #fff; border: none; padding: var(--space-3) var(--space-5); border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; transition: background var(--transition-fast); white-space: nowrap; }
    .btn-primary:hover:not(:disabled) { background: var(--secondary); }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-outline { padding: var(--space-2) var(--space-4); border: 1px solid var(--color-border); background: var(--color-surface-2); color: var(--color-text-muted); border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-sm); }
    .btn-outline:hover { background: var(--color-border); color: var(--color-text); }
    .btn-danger { padding: var(--space-2) var(--space-5); border: none; background: var(--color-danger); color: #fff; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; }
    .btn-danger:hover:not(:disabled) { filter: brightness(.9); }
    .btn-danger:disabled { opacity: .6; cursor: not-allowed; }

    .btn-sm--primary { padding: var(--space-1) var(--space-3); border: none; background: var(--primary); color: #fff; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-xs); font-weight: 600; }
    .btn-sm--primary:hover { background: var(--secondary); }
    .btn-icon { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--radius); border: 1px solid var(--color-border); background: var(--color-surface-2); cursor: pointer; transition: all var(--transition-fast); }
    .btn-icon--edit { color: var(--primary); }
    .btn-icon--edit:hover { background: color-mix(in srgb, var(--primary) 10%, transparent); border-color: var(--primary); }
    .btn-icon--delete { color: var(--color-danger); }
    .btn-icon--delete:hover { background: color-mix(in srgb, var(--color-danger) 10%, transparent); border-color: var(--color-danger); }
    .col-actions { white-space: nowrap; }
    /* NÃO use display:flex aqui: num <td> isso anula o table-cell e a célula
       sai do row box — o fundo e a borda da linha param antes da coluna de
       ações. Os botões são inline-flex, então margem + vertical-align dão o
       mesmo resultado visual sem quebrar a tabela. */
    .col-actions > * { vertical-align: middle; }
    .col-actions > * + * { margin-left: var(--space-2); }

    .form-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-6); margin-bottom: var(--space-5); box-shadow: var(--shadow-sm); }
    .form-card-title { margin: 0 0 var(--space-5); font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); font-family: var(--font-display); }

    .form-row { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4); }
    .form-row input, .form-row textarea, .form-row select { border: 1px solid var(--color-border); border-radius: var(--radius); padding: var(--space-2) var(--space-3); font-size: var(--font-size-sm); background: var(--color-surface); color: var(--color-text); outline: none; transition: border-color var(--transition-fast); font-family: inherit; }
    .form-row input:focus, .form-row textarea:focus, .form-row select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent); }
    .form-row textarea { min-height: 100px; resize: vertical; }
    .form-hint { color: var(--color-text-muted); font-size: var(--font-size-xs); }

    .tipo-curso-section { margin-bottom: var(--space-5); }
    .section-label { font-weight: 600; color: var(--color-text); margin-bottom: var(--space-3); display: block; font-size: var(--font-size-sm); }
    .tipo-curso-options { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }

    .radio-option { position: relative; display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-4); border: 2px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); cursor: pointer; transition: all var(--transition-fast); }
    .radio-option:hover { border-color: color-mix(in srgb, var(--primary) 50%, transparent); }
    .radio-input { position: absolute; opacity: 0; width: 0; height: 0; }
    .radio-input:checked + .radio-custom { background: var(--primary); border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent); }
    .radio-input:checked ~ .option-content .option-title { color: var(--primary); font-weight: 700; }
    .radio-custom { flex-shrink: 0; width: 18px; height: 18px; border: 2px solid var(--color-border); border-radius: 50%; background: var(--color-surface-2); transition: all var(--transition-fast); margin-top: 2px; }
    .option-content { display: flex; flex-direction: column; gap: var(--space-1); }
    .option-title { font-weight: 600; color: var(--color-text); font-size: var(--font-size-sm); }
    .option-desc { color: var(--color-text-muted); font-size: var(--font-size-xs); }

    .valor-input-group { position: relative; display: flex; align-items: center; }
    .valor-prefix { position: absolute; left: 12px; font-weight: 700; color: var(--primary); font-size: var(--font-size-sm); pointer-events: none; }
    .valor-input { width: 100%; padding-left: 36px !important; }

    .info-box { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-3) var(--space-4); background: color-mix(in srgb, var(--color-success) 8%, transparent); border-left: 4px solid var(--color-success); border-radius: var(--radius); margin-bottom: var(--space-4); color: var(--color-success); font-size: var(--font-size-sm); }

    .form-error { margin-top: var(--space-3); padding: var(--space-3) var(--space-4); background: color-mix(in srgb, var(--color-danger) 10%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); border-radius: var(--radius); color: var(--color-danger); font-size: var(--font-size-sm); }
    .form-actions { display: flex; gap: var(--space-3); margin-top: var(--space-5); }

    .success-banner { padding: var(--space-3) var(--space-4); margin-bottom: var(--space-4); color: var(--color-success); background: color-mix(in srgb, var(--color-success) 10%, transparent); border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent); border-radius: var(--radius); font-size: var(--font-size-sm); }

    .table-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm); }
    .curso-nome { font-weight: 600; color: var(--color-text); margin-bottom: 2px; }
    .curso-descricao { color: var(--color-text-muted); font-size: var(--font-size-xs); }

    .badge { display: inline-flex; align-items: center; border-radius: var(--radius-full); padding: 2px 10px; font-size: var(--font-size-xs); font-weight: 700; }
    .badge--warn    { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); }
    .badge--success { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
    .badge--danger  { background: color-mix(in srgb, var(--color-danger)  15%, transparent); color: var(--color-danger); }

    .loading-state { text-align: center; padding: 40px; color: var(--color-text-muted); }
    .spinner { display: inline-block; width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: var(--space-3); }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-card { padding: var(--space-5); background: color-mix(in srgb, var(--color-danger) 10%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); border-radius: var(--radius-lg); color: var(--color-danger); text-align: center; }
    .error-card button { margin-top: var(--space-3); padding: var(--space-2) var(--space-4); background: var(--color-danger); color: #fff; border: none; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-sm); }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-7); max-width: 460px; width: 90%; box-shadow: var(--shadow-lg); }
    .modal-title { margin: 0 0 var(--space-3); font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); font-family: var(--font-display); }
    .modal-card p { color: var(--color-text-muted); margin-bottom: var(--space-3); font-size: var(--font-size-sm); }
    .modal-aviso { font-size: var(--font-size-xs) !important; color: var(--color-danger) !important; background: color-mix(in srgb, var(--color-danger) 8%, transparent) !important; padding: var(--space-2) var(--space-3); border-radius: var(--radius); }
    .modal-actions { display: flex; gap: var(--space-3); margin-top: var(--space-5); }

    @media (max-width: 900px) {
      .page-header { flex-direction: column; }
      .table-card { overflow-x: auto; }
      .tipo-curso-options { grid-template-columns: 1fr; }
    }
  `]
})
export class InstituicaoCursosComponent implements OnInit {
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

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.carregarCursos();
  }

  carregarCursos(): void {
    this.carregando = true;
    this.erro = '';
    this.apiService.getInstituicaoCursos().subscribe({
      next: (cursos) => {
        this.cursos = cursos;
        this.carregando = false;
      },
      error: (error) => {
        this.erro = error?.error?.detail || 'Erro ao carregar cursos.';
        this.carregando = false;
      }
    });
  }

  abrirFormulario(): void {
    this.mensagemSucesso = '';
    this.formErro = '';
    this.editandoId = null;
    this.form = { nome: '', descricao: '', pago: false, valor: null, percentual_presenca_minima: 75, ativo: true };
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
    if (!pago) this.form.valor = null;
  }

  salvarCurso(): void {
    const nome = this.form.nome.trim();
    if (!nome) { this.formErro = 'O nome do curso é obrigatório.'; return; }

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
      this.apiService.updateInstituicaoCurso(this.editandoId, payload).subscribe({
        next: () => {
          this.criando = false;
          this.formAberto = false;
          this.editandoId = null;
          this.mensagemSucesso = 'Curso atualizado com sucesso!';
          setTimeout(() => this.mensagemSucesso = '', 4000);
          this.carregarCursos();
        },
        error: (err: any) => {
          this.criando = false;
          this.formErro = err?.error?.detail || 'Erro ao editar curso. Tente novamente.';
        }
      });
    } else {
      this.apiService.createInstituicaoCurso(payload).subscribe({
        next: () => {
          this.criando = false;
          this.formAberto = false;
          this.mensagemSucesso = 'Curso criado com sucesso!';
          setTimeout(() => this.mensagemSucesso = '', 4000);
          this.carregarCursos();
        },
        error: (err: any) => {
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
    if (!this.formAula.titulo.trim()) { this.erroAula = 'O título da aula é obrigatório.'; return; }
    if (!this.formAula.data_aula) { this.erroAula = 'A data e hora da aula são obrigatórias.'; return; }

    this.criandoAula = true;
    this.erroAula = '';

    const payload = {
      curso_id: this.cursoSelecionado!.id,
      titulo: this.formAula.titulo.trim(),
      descricao: this.formAula.descricao.trim() || null,
      data_aula: new Date(this.formAula.data_aula).toISOString(),
      duracao_minutos: this.formAula.duracao_minutos || null
    };

    this.apiService.createInstituicaoAula(this.cursoSelecionado!.id, payload).subscribe({
      next: () => {
        this.criandoAula = false;
        this.modalAulaAberto = false;
        this.cursoSelecionado = null;
        this.mensagemSucesso = 'Aula criada com sucesso!';
        setTimeout(() => this.mensagemSucesso = '', 4000);
      },
      error: (err: any) => {
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

    this.apiService.deleteInstituicaoCurso(this.cursoParaDeletar.id).subscribe({
      next: () => {
        this.deletando = false;
        this.cursoParaDeletar = null;
        this.carregarCursos();
      },
      error: (err: any) => {
        this.deletando = false;
        this.deleteErro = err?.error?.detail || 'Erro ao deletar curso. Tente novamente.';
      }
    });
  }

  formatarValor(valor?: number | null): string {
    if (valor == null) return 'Grátis';
    const n = Number(valor);
    if (!Number.isFinite(n)) return 'Grátis';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'recusado': return 'Recusado';
      default: return 'Aprovado';
    }
  }

  private normalizarValor(valor: CursoFormValue): number | null {
    if (valor === null || valor === '') return null;
    const n = typeof valor === 'string' ? Number(valor.replace(',', '.')) : Number(valor);
    return Number.isFinite(n) ? n : null;
  }
}
