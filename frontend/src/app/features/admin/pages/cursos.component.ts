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

      <div class="form-card" *ngIf="formAberto">
        <h3>Novo Curso</h3>
        <form (ngSubmit)="criarCurso()">
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

          <div class="form-actions">
            <button type="submit" class="btn-primary">Salvar</button>
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
                <button class="btn-sm btn-edit" title="Editar">✏️</button>
                <button class="btn-sm btn-delete" title="Deletar">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
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

    .form-error {
      margin-top: 10px;
      color: #721c24;
      background: #f8d7da;
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #f5c6cb;
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
  form = {
    nome: '',
    descricao: '',
    percentual_presenca_minima: 75,
    ativo: true
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarCursos();
  }

  carregarCursos(): void {
    this.carregando = true;
    this.erro = '';

    this.http.get<Curso[]>('http://localhost:8000/api/cursos').subscribe({
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
    this.form = {
      nome: '',
      descricao: '',
      percentual_presenca_minima: 75,
      ativo: true
    };
    this.formAberto = true;
  }

  cancelarFormulario(): void {
    this.formAberto = false;
    this.formErro = '';
  }

  criarCurso(): void {
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

    this.http.post('http://localhost:8000/api/cursos', payload).subscribe({
      next: (res: any) => {
        this.criando = false;
        this.formAberto = false;
        this.carregarCursos();
      },
      error: (err: any) => {
        console.error('Erro ao criar curso:', err);
        this.criando = false;
        if (err?.error?.detail) {
          this.formErro = err.error.detail;
        } else {
          this.formErro = 'Erro ao criar curso. Tente novamente.';
        }
      }
    });
  }
}
