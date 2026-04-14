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
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Gerenciar Cursos</h2>
          <p>Cursos gratuitos são publicados automaticamente. Cursos pagos entram como pendentes para aprovação.</p>
        </div>
        <button class="btn-primary" (click)="abrirFormulario()">Novo Curso</button>
      </div>

      <!-- Modal de confirmação de exclusão -->
      <div class="modal-overlay" *ngIf="cursoParaDeletar" (click)="cancelarDelecao()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>⚠️ Confirmar Exclusão</h3>
          <p>Tem certeza que deseja excluir o curso <strong>{{ cursoParaDeletar.nome }}</strong>?</p>
          <p class="modal-aviso">Esta ação não pode ser desfeita. Todas as aulas, provas e inscrições associadas serão removidas.</p>
          <div class="modal-actions">
            <button class="btn-danger" (click)="confirmarDelecao()" [disabled]="deletando">{{ deletando ? 'Deletando...' : '🗑️ Sim, deletar' }}</button>
            <button class="btn-sm" (click)="cancelarDelecao()" [disabled]="deletando">Cancelar</button>
          </div>
          <div class="form-error" *ngIf="deleteErro">{{ deleteErro }}</div>
        </div>
      </div>

      <div class="form-card" *ngIf="formAberto">
        <h3>{{ editandoId ? '✏️ Editar Curso' : 'Novo Curso' }}</h3>
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
                <input
                  type="radio"
                  [value]="false"
                  [(ngModel)]="form.pago"
                  name="tipo_curso"
                  (ngModelChange)="onPagoChange($event)"
                  class="radio-input"
                />
                <span class="radio-custom"></span>
                <span class="option-content">
                  <span class="option-title">🎁 Livre (Gratuito)</span>
                  <span class="option-desc">Publicado automaticamente</span>
                </span>
              </label>

              <label class="radio-option">
                <input
                  type="radio"
                  [value]="true"
                  [(ngModel)]="form.pago"
                  name="tipo_curso"
                  (ngModelChange)="onPagoChange($event)"
                  class="radio-input"
                />
                <span class="radio-custom"></span>
                <span class="option-content">
                  <span class="option-title">💳 Pago</span>
                  <span class="option-desc">Precisa de aprovação</span>
                </span>
              </label>
            </div>
          </div>

          <div class="form-row valor-row" *ngIf="form.pago">
            <label for="valor">Valor do Curso <span class="required">*</span></label>
            <div class="valor-input-group">
              <span class="valor-prefix">R$</span>
              <input
                id="valor"
                type="number"
                step="0.01"
                min="0.01"
                max="999999.99"
                [(ngModel)]="form.valor"
                name="valor"
                placeholder="0,00"
                class="valor-input"
                required
              />
            </div>
            <small class="form-hint info">Informe um valor maior que zero. Exemplo: 99,90</small>
          </div>

          <div class="form-row info-message" *ngIf="!form.pago">
            <div class="info-box">
              <span class="info-icon">ℹ️</span>
              <span class="info-text">Este curso será gratuito e publicado automaticamente no catálogo.</span>
            </div>
          </div>

          <div class="form-row">
            <label for="percentual">Percentual mínimo de presença</label>
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
            <button type="submit" class="btn-primary" [disabled]="criando">{{ criando ? 'Salvando...' : 'Salvar' }}</button>
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
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let curso of cursos">
              <td>
                <div class="curso-nome">{{ curso.nome }}</div>
                <div class="curso-descricao">{{ curso.descricao || 'Sem descrição.' }}</div>
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
              <td>{{ curso.ativo ? 'Sim' : 'Não' }}</td>
              <td class="actions">
                <button class="btn-sm btn-aula" title="Nova Aula" (click)="abrirNovaAula(curso)">📚 Nova Aula</button>
                <button class="btn-sm btn-edit" title="Editar" (click)="editarCurso(curso)">✏️</button>
                <button class="btn-sm btn-delete" title="Deletar" (click)="abrirDelecao(curso)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modal Nova Aula -->
      <div class="modal-overlay" *ngIf="modalAulaAberto" (click)="fecharNovaAula()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>📚 Nova Aula — {{ cursoSelecionado?.nome }}</h3>
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
            <div class="form-error" *ngIf="erroAula">{{ erroAula }}</div>
            <div class="modal-actions" style="margin-top: 16px;">
              <button type="submit" class="btn-primary" [disabled]="criandoAula">{{ criandoAula ? 'Salvando...' : '💾 Salvar Aula' }}</button>
              <button type="button" class="btn-sm" (click)="fecharNovaAula()" [disabled]="criandoAula">Cancelar</button>
            </div>
          </form>
        </div>
      </div>

      <div class="no-data" *ngIf="cursos.length === 0 && !carregando">
        <p>Nenhum curso criado ainda. Clique em "Novo Curso" para começar.</p>
      </div>

      <div class="loading" *ngIf="carregando">
        <div class="spinner"></div>
        <p>Carregando cursos...</p>
      </div>

      <div class="error" *ngIf="erro">
        <p>{{ erro }}</p>
        <button (click)="carregarCursos()">Tentar novamente</button>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1200px; margin: 0 auto; }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
    }
    .page-header h2 { margin: 0 0 6px; }
    .page-header p { margin: 0; color: #667085; max-width: 620px; }

    .form-card, .table-card, .success-banner {
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 8px 24px rgba(15,23,42,0.08);
    }
    .form-card { padding: 24px; margin-bottom: 20px; }

    .form-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .form-row input, .form-row textarea, .form-row select {
      border: 1px solid #d0d5dd; border-radius: 10px; padding: 10px 12px; font-size: 14px;
    }
    .form-row textarea { min-height: 110px; resize: vertical; }

    .tipo-curso-section { margin-bottom: 20px; }
    .section-label { font-weight: 600; color: #101828; margin-bottom: 12px; display: block; }
    .tipo-curso-options { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

    .radio-option {
      position: relative; display: flex; align-items: flex-start; gap: 12px;
      padding: 16px 14px; border: 2px solid #d0d5dd; border-radius: 12px;
      background: #fafbfc; cursor: pointer; transition: all 0.3s ease;
    }
    .radio-option:hover { border-color: #b0b7c3; background: #f5f6f8; }
    .radio-input { position: absolute; opacity: 0; width: 0; height: 0; cursor: pointer; }
    .radio-input:checked + .radio-custom {
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      border-color: var(--primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
    }
    .radio-input:checked ~ .option-content .option-title { color: var(--primary); font-weight: 700; }
    .radio-custom {
      flex-shrink: 0; width: 20px; height: 20px; border: 2px solid #d0d5dd;
      border-radius: 50%; background: #fff; transition: all 0.3s ease; margin-top: 2px;
    }
    .option-content { display: flex; flex-direction: column; gap: 4px; }
    .option-title { font-weight: 600; color: #344054; font-size: 14px; transition: color 0.3s ease; }
    .option-desc { color: #667085; font-size: 13px; }

    .valor-row { margin-bottom: 16px; }
    .valor-input-group { position: relative; display: flex; align-items: center; }
    .valor-prefix { position: absolute; left: 12px; font-weight: 700; color: var(--primary); font-size: 15px; pointer-events: none; }
    .valor-input {
      width: 100%; border: 2px solid #d0d5dd; border-radius: 10px;
      padding: 10px 12px 10px 40px !important; font-size: 14px; font-weight: 500; transition: all 0.3s ease;
    }
    .valor-input:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent); }

    .info-box {
      display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px;
      background: linear-gradient(135deg, #ecfdf3 0%, #f0fdf4 100%);
      border-left: 4px solid #10b981; border-radius: 10px;
    }
    .info-icon { font-size: 18px; flex-shrink: 0; }
    .info-text { color: #065f46; font-size: 14px; line-height: 1.5; }
    .form-hint { color: #667085; font-size: 12px; }
    .form-hint.info { color: var(--primary); font-weight: 500; }
    .required { color: #b42318; }

    .form-actions { display: flex; gap: 12px; margin-top: 18px; }
    .btn-primary, .btn-secondary {
      border: none; border-radius: 10px; padding: 10px 16px; cursor: pointer; font-weight: 600;
    }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-primary:hover { background: color-mix(in srgb, var(--primary) 80%, black); }
    .btn-secondary { background: #eaecf0; color: #344054; }
    .btn-primary:disabled, .btn-secondary:disabled { opacity: 0.7; cursor: not-allowed; }

    .form-error {
      margin-top: 14px; background: #fef3f2; border: 1px solid #fecdca;
      border-radius: 10px; padding: 12px; color: #b42318;
    }

    .success-banner {
      padding: 14px 16px; margin-bottom: 20px; color: #065f46; background: #ecfdf3;
    }

    .table-card { overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 16px; text-align: left; border-bottom: 1px solid #edf2f7; vertical-align: top; }
    th { background: #f8fafc; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #475467; }

    .curso-nome { font-weight: 700; color: #101828; margin-bottom: 4px; }
    .curso-descricao { color: #667085; font-size: 13px; }

    .badge, .status-badge {
      display: inline-flex; border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 700;
    }
    .badge.pago { background: #fff7cc; color: #8a6d00; }
    .badge.gratuito { background: #d1fae5; color: #065f46; }
    .status-pendente { background: #fff7cc; color: #8a6d00; }
    .status-aprovado { background: #d1fae5; color: #065f46; }
    .status-recusado { background: #fee2e2; color: #991b1b; }

    .actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .btn-sm {
      border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer;
      font-size: 13px; font-weight: 600; transition: transform 0.2s;
    }
    .btn-sm:hover { transform: scale(1.05); }
    .btn-edit { background: #e8f4fd; color: #1a6b9c; }
    .btn-delete { background: #fef2f2; color: #e74c3c; }
    .btn-aula { background: var(--primary); color: white; }
    .btn-aula:hover { background: color-mix(in srgb, var(--primary) 80%, black); transform: none; }

    .no-data {
      background: white; padding: 60px 20px; text-align: center;
      border-radius: 14px; box-shadow: 0 8px 24px rgba(15,23,42,0.08); color: #999;
    }

    .loading { text-align: center; padding: 60px 20px; color: #999; }
    .spinner {
      display: inline-block; width: 40px; height: 40px;
      border: 4px solid #f3f3f3; border-top: 4px solid var(--primary);
      border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    .error {
      background: #f8d7da; color: #721c24; padding: 15px; border-radius: 14px;
      margin-bottom: 20px; border: 1px solid #f5c6cb; text-align: center;
    }
    .error button {
      margin-top: 10px; padding: 8px 16px; background: #721c24;
      color: white; border: none; border-radius: 4px; cursor: pointer;
    }

    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-card {
      background: white; border-radius: 14px; padding: 30px;
      max-width: 460px; width: 90%; box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    .modal-card h3 { margin-top: 0; margin-bottom: 15px; }
    .modal-aviso {
      font-size: 13px; color: #721c24; background: #f8d7da;
      padding: 8px 12px; border-radius: 4px; margin-bottom: 20px;
    }
    .modal-actions { display: flex; gap: 10px; }
    .btn-danger {
      background-color: #dc3545; color: white; border: none;
      padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;
    }
    .btn-danger:hover:not(:disabled) { background-color: #c82333; }
    .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

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
