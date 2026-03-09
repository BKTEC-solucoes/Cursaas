import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Curso {
  id: number;
  nome: string;
  descricao: string;
  professor_responsavel: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
}

@Component({
  selector: 'app-admin-cursos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2>Gerenciar Cursos</h2>
        <button class="btn-primary" (click)="abrirFormulario()">+ Novo Curso</button>
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
            <label>Nome</label>
            <input type="text" [(ngModel)]="form.nome" name="nome" required />
          </div>

          <div class="form-row">
            <label>Descrição</label>
            <textarea [(ngModel)]="form.descricao" name="descricao"></textarea>
          </div>

          <div class="form-row">
            <label>Percentual presença mínima</label>
            <input type="number" [(ngModel)]="form.percentual_presenca_minima" name="percentual_presenca_minima" min="0" max="100" />
          </div>

          <div class="form-row" *ngIf="editandoId">
            <label>Status</label>
            <select [(ngModel)]="form.ativo" name="ativo">
              <option [ngValue]="true">Ativo</option>
              <option [ngValue]="false">Inativo</option>
            </select>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="criando">{{ criando ? 'Salvando...' : 'Salvar' }}</button>
            <button type="button" class="btn-sm" (click)="cancelarFormulario()">Cancelar</button>
          </div>

          <div class="form-error" *ngIf="formErro">{{ formErro }}</div>
        </form>
      </div>

      <div class="cursos-table" *ngIf="cursos.length > 0">
        <table>
          <thead>
            <tr>
              <th>Nome do Curso</th>
              <th>Professor</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let curso of cursos" [class.inactive]="!curso.ativo">
              <td class="curso-nome">{{ curso.nome }}</td>
              <td>{{ curso.professor_responsavel }}</td>
              <td>{{ curso.data_inicio | date:'dd/MM/yyyy' }}</td>
              <td>{{ curso.data_fim | date:'dd/MM/yyyy' }}</td>
              <td>
                <span class="status" [ngClass]="curso.ativo ? 'ativo' : 'inativo'">
                  {{ curso.ativo ? '✓ Ativo' : '✗ Inativo' }}
                </span>
              </td>
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
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      gap: 15px;
    }

    .page-header h2 {
      margin: 0;
      color: #333;
    }

    .btn-primary {
      background-color: #2c3e50;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: background-color 0.2s;
      white-space: nowrap;
    }

    .btn-primary:hover {
      background-color: #1a252f;
    }

    .cursos-table {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: #f5f5f5;
      border-bottom: 2px solid #ddd;
    }

    th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: #333;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      padding: 15px;
      border-bottom: 1px solid #eee;
      font-size: 14px;
    }

    tbody tr:hover {
      background-color: #f9f9f9;
    }

    tbody tr.inactive {
      opacity: 0.7;
    }

    .curso-nome {
      font-weight: 600;
      color: #333;
    }

    .status {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .status.ativo {
      background: #d4edda;
      color: #155724;
    }

    .status.inativo {
      background: #f8d7da;
      color: #721c24;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .btn-sm {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 4px 8px;
      transition: transform 0.2s;
    }

    .btn-sm:hover {
      transform: scale(1.2);
    }

    .btn-edit {
      color: #3498db;
    }

    .btn-delete {
      color: #e74c3c;
    }

    .btn-aula {
      background-color: #27ae60;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color 0.2s;
    }

    .btn-aula:hover {
      background-color: #219a52;
      transform: none;
    }

    .no-data {
      background: white;
      padding: 60px 20px;
      text-align: center;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      color: #999;
    }

    .loading {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }

    .spinner {
      display: inline-block;
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #2c3e50;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 15px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      background: #f8d7da;
      color: #721c24;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
      border: 1px solid #f5c6cb;
      text-align: center;
    }

    .error button {
      margin-top: 10px;
      padding: 8px 16px;
      background: #721c24;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }

    .form-card {
      background: white;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .form-row {
      display: flex;
      flex-direction: column;
      margin-bottom: 12px;
    }

    .form-row label {
      font-weight: 600;
      margin-bottom: 6px;
    }

    .form-row input, .form-row textarea {
      padding: 8px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .form-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .form-row select {
      padding: 8px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .form-error {
      margin-top: 10px;
      color: #721c24;
      background: #f8d7da;
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #f5c6cb;
    }

    .btn-danger {
      background-color: #dc3545;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: background-color 0.2s;
    }

    .btn-danger:hover:not(:disabled) {
      background-color: #c82333;
    }

    .btn-danger:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-card {
      background: white;
      border-radius: 8px;
      padding: 30px;
      max-width: 450px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }

    .modal-card h3 {
      margin-top: 0;
      margin-bottom: 15px;
    }

    .modal-aviso {
      font-size: 13px;
      color: #721c24;
      background: #f8d7da;
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 20px;
    }

    .modal-actions {
      display: flex;
      gap: 10px;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }

      table {
        font-size: 12px;
      }

      th, td {
        padding: 10px;
      }

      .actions {
        flex-direction: column;
      }
    }
  `]
})
export class AdminCursosComponent implements OnInit {
  cursos: Curso[] = [];
  carregando = false;
  erro = '';
  formAberto = false;
  formErro = '';
  criando = false;
  editandoId: number | null = null;
  cursoParaDeletar: Curso | null = null;
  deletando = false;
  deleteErro = '';
  form = {
    nome: '',
    descricao: '',
    percentual_presenca_minima: 75,
    ativo: true
  };

  modalAulaAberto = false;
  cursoSelecionado: Curso | null = null;
  criandoAula = false;
  erroAula = '';
  formAula = {
    titulo: '',
    descricao: '',
    data_aula: '',
    duracao_minutos: null as number | null
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarCursos();
  }

  carregarCursos(): void {
    this.carregando = true;
    this.erro = '';

    this.http.get<Curso[]>('http://localhost:8000/api/cursos/').subscribe({
      next: (cursos) => {
        this.cursos = cursos || [];
        this.carregando = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar cursos:', error);
        this.erro = 'Erro ao carregar cursos. Tente novamente.';
        this.carregando = false;
      }
    });
  }

  abrirFormulario(): void {
    this.formErro = '';
    this.editandoId = null;
    this.form = {
      nome: '',
      descricao: '',
      percentual_presenca_minima: 75,
      ativo: true
    };
    this.formAberto = true;
  }

  editarCurso(curso: Curso): void {
    this.formErro = '';
    this.editandoId = curso.id;
    this.form = {
      nome: curso.nome,
      descricao: curso.descricao || '',
      percentual_presenca_minima: 75,
      ativo: curso.ativo
    };
    this.formAberto = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarFormulario(): void {
    this.formAberto = false;
    this.formErro = '';
    this.editandoId = null;
  }

  salvarCurso(): void {
    if (!this.form.nome || this.form.nome.trim() === '') {
      this.formErro = 'O nome do curso é obrigatório.';
      return;
    }

    this.criando = true;
    this.formErro = '';

    const payload = {
      nome: this.form.nome,
      descricao: this.form.descricao,
      percentual_presenca_minima: this.form.percentual_presenca_minima,
      ativo: this.form.ativo
    };

    if (this.editandoId) {
      this.http.put(`http://localhost:8000/api/cursos/${this.editandoId}`, payload).subscribe({
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
      this.http.post('http://localhost:8000/api/cursos/', payload).subscribe({
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

  abrirNovaAula(curso: Curso): void {
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

    this.http.post('http://localhost:8000/api/aulas/', payload).subscribe({
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

  abrirDelecao(curso: Curso): void {
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

    this.http.delete(`http://localhost:8000/api/cursos/${this.cursoParaDeletar.id}`).subscribe({
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
}
