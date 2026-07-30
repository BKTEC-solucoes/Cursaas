import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Aluno {
  id: number;
  nome: string;
  email: string;
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
  data_nascimento: string | null;
  sexo: string | null;
  cpf_rg: string | null;
  endereco: string | null;
  cep: string | null;
  telefone: string | null;
  nome_responsavel: string | null;
  numero_matricula: string | null;
  turma: string | null;
  historico_escolar: string | null;
}

interface AlunoForm {
  // Acesso
  email: string;
  senha: string;
  ativo: boolean;
  // Dados pessoais
  nome: string;
  data_nascimento: string;
  sexo: string;
  cpf_rg: string;
  // Endereço e contato
  endereco: string;
  cep: string;
  telefone: string;
  // Responsável
  nome_responsavel: string;
  // Dados escolares
  numero_matricula: string;
  turma: string;
  historico_escolar: string;
}

function formVazio(): AlunoForm {
  return {
    email: '', senha: '', ativo: true,
    nome: '', data_nascimento: '', sexo: '', cpf_rg: '',
    endereco: '', cep: '', telefone: '',
    nome_responsavel: '',
    numero_matricula: '', turma: '', historico_escolar: '',
  };
}

@Component({
  selector: 'app-admin-alunos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2>👤 Gerenciar Alunos</h2>
        <button class="btn-primary" (click)="abrirFormulario()">+ Novo Aluno</button>
      </div>

      <!-- Modal confirmação exclusão -->
      <div class="modal-overlay" *ngIf="alunoParaDeletar" (click)="cancelarDelecao()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>⚠️ Confirmar Exclusão</h3>
          <p>Tem certeza que deseja excluir o aluno <strong>{{ alunoParaDeletar.nome }}</strong>?</p>
          <p class="modal-aviso">Esta ação não pode ser desfeita. Todas as notas, presenças e inscrições do aluno serão removidas.</p>
          <div class="modal-actions">
            <button class="btn-danger" (click)="confirmarDelecao()" [disabled]="deletando">
              {{ deletando ? 'Deletando...' : '🗑️ Sim, deletar' }}
            </button>
            <button class="btn-sm" (click)="cancelarDelecao()" [disabled]="deletando">Cancelar</button>
          </div>
          <div class="form-error" *ngIf="deleteErro">{{ deleteErro }}</div>
        </div>
      </div>

      <!-- Formulário -->
      <div class="form-card" *ngIf="formAberto">
        <h3>{{ editandoId ? '✏️ Editar Aluno' : '➕ Novo Aluno' }}</h3>
        <form (ngSubmit)="salvarAluno()" #f="ngForm">

          <!-- ─── Dados Pessoais ─── -->
          <div class="section-title">👤 Dados Pessoais</div>
          <div class="form-grid">
            <div class="form-row span2">
              <label>Nome Completo *</label>
              <input type="text" [(ngModel)]="form.nome" name="nome" required placeholder="Nome completo do aluno" />
            </div>
            <div class="form-row">
              <label>Data de Nascimento *</label>
              <input type="date" [(ngModel)]="form.data_nascimento" name="data_nascimento" required />
            </div>
            <div class="form-row">
              <label>Sexo *</label>
              <select [(ngModel)]="form.sexo" name="sexo" required>
                <option value="">Selecione...</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
                <option value="Prefiro não informar">Prefiro não informar</option>
              </select>
            </div>
            <div class="form-row">
              <label>CPF / RG *</label>
              <input type="text" [(ngModel)]="form.cpf_rg" name="cpf_rg" required placeholder="000.000.000-00" maxlength="14" (input)="formatarCpf()" />
            </div>
          </div>

          <!-- ─── Endereço e Contato ─── -->
          <div class="section-title">📍 Endereço e Contato</div>
          <div class="form-grid">
            <div class="form-row span2">
              <label>Endereço Residencial *</label>
              <input type="text" [(ngModel)]="form.endereco" name="endereco" required placeholder="Rua, número, bairro, cidade" />
            </div>
            <div class="form-row">
              <label>CEP *</label>
              <input type="text" [(ngModel)]="form.cep" name="cep" required placeholder="00000-000" maxlength="9" (input)="formatarCep()" />
            </div>
            <div class="form-row">
              <label>Celular *</label>
              <input type="text" [(ngModel)]="form.telefone" name="telefone" required placeholder="+55 (21) 91234-5678" maxlength="19" (input)="formatarCelular()" />
            </div>
            <div class="form-row">
              <label>E-mail *</label>
              <input type="email" [(ngModel)]="form.email" name="email" required placeholder="email@exemplo.com" />
            </div>
            <div class="form-row" *ngIf="!editandoId">
              <label>Senha *</label>
              <div class="password-field">
                <input [type]="mostrarSenha ? 'text' : 'password'" [(ngModel)]="form.senha" name="senha" required minlength="6" placeholder="Mínimo 6 caracteres" />
                <button type="button" class="toggle-password" (click)="mostrarSenha = !mostrarSenha">
                  {{ mostrarSenha ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
            </div>
          </div>

          <!-- ─── Responsável ─── -->
          <div class="section-title">👨‍👩‍👦 Responsável</div>
          <div class="form-grid">
            <div class="form-row span2">
              <label>Nome do Pai / Mãe / Responsável *</label>
              <input type="text" [(ngModel)]="form.nome_responsavel" name="nome_responsavel" required placeholder="Nome completo do responsável" />
            </div>
          </div>

          <!-- ─── Dados Escolares ─── -->
          <div class="section-title">🎓 Dados Escolares</div>
          <div class="form-grid">
            <div class="form-row">
              <label>Número de Matrícula *</label>
              <input type="text" [(ngModel)]="form.numero_matricula" name="numero_matricula" required placeholder="Ex: 2026001" />
            </div>
            <div class="form-row">
              <label>Turma *</label>
              <input type="text" [(ngModel)]="form.turma" name="turma" required placeholder="Ex: 3ºA, Turma 2026" />
            </div>
            <div class="form-row span2">
              <label>Histórico Escolar *</label>
              <textarea [(ngModel)]="form.historico_escolar" name="historico_escolar" required rows="3" placeholder="Observações sobre o histórico escolar do aluno..."></textarea>
            </div>
          </div>

          <!-- Status (somente edição) -->
          <div class="form-grid" *ngIf="editandoId">
            <div class="form-row">
              <label>Status</label>
              <select [(ngModel)]="form.ativo" name="ativo">
                <option [ngValue]="true">Ativo</option>
                <option [ngValue]="false">Inativo</option>
              </select>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary" [disabled]="salvando">
              {{ salvando ? 'Salvando...' : 'Salvar' }}
            </button>
            <button type="button" class="btn-sm" (click)="cancelarFormulario()">Cancelar</button>
          </div>

          <div class="form-error" *ngIf="formErro">{{ formErro }}</div>
        </form>
      </div>

      <!-- Carregando -->
      <div class="loading" *ngIf="carregando">Carregando alunos...</div>

      <!-- Tabela -->
      <div class="alunos-table" *ngIf="!carregando && alunos.length > 0">
        <table>
          <thead>
            <tr>
              <th>Matrícula</th>
              <th>Nome</th>
              <th>CPF/RG</th>
              <th>Turma</th>
              <th>E-mail</th>
              <th>Celular</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let aluno of alunos" [class.inactive]="!aluno.ativo">
              <td class="matricula">{{ aluno.numero_matricula || '—' }}</td>
              <td class="aluno-nome">{{ aluno.nome }}</td>
              <td>{{ aluno.cpf_rg || '—' }}</td>
              <td>{{ aluno.turma || '—' }}</td>
              <td>{{ aluno.email }}</td>
              <td>{{ aluno.telefone || '—' }}</td>
              <td>
                <span class="status" [ngClass]="aluno.ativo ? 'ativo' : 'inativo'">
                  {{ aluno.ativo ? '✓ Ativo' : '✗ Inativo' }}
                </span>
              </td>
              <td class="actions">
                <button class="btn-sm btn-edit" title="Editar" (click)="editarAluno(aluno)">✏️</button>
                <button class="btn-sm btn-delete" title="Deletar" (click)="abrirDelecao(aluno)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="empty-state" *ngIf="!carregando && alunos.length === 0">
        <p>Nenhum aluno cadastrado.</p>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1300px;
      margin: 0 auto;
      padding: 30px 20px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
    }

    .page-header h2 { margin: 0; font-size: 1.6rem; color: #2c3e50; }

    .btn-primary {
      background: #3498db;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.95rem;
      font-weight: 500;
      transition: background 0.2s;
    }
    .btn-primary:hover:not(:disabled) { background: #2980b9; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-sm {
      padding: 6px 14px;
      border: 1px solid #bdc3c7;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: background 0.2s;
    }
    .btn-sm:hover:not(:disabled) { background: #ecf0f1; }
    .btn-edit { border-color: #3498db; color: #3498db; }
    .btn-edit:hover:not(:disabled) { background: #ebf5fb; }
    .btn-delete { border-color: #e74c3c; color: #e74c3c; }
    .btn-delete:hover:not(:disabled) { background: #fdf2f2; }

    .btn-danger {
      background: #e74c3c; color: white; border: none;
      padding: 10px 20px; border-radius: 6px;
      cursor: pointer; font-weight: 500; transition: background 0.2s;
    }
    .btn-danger:hover:not(:disabled) { background: #c0392b; }
    .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Formulário */
    .form-card {
      background: white;
      border-radius: 10px;
      padding: 28px;
      margin-bottom: 25px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .form-card h3 { margin: 0 0 20px; color: #2c3e50; font-size: 1.1rem; }

    .section-title {
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #7f8c8d;
      margin: 20px 0 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #ecf0f1;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 20px;
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .form-row.span2 { grid-column: span 2; }

    .form-row label { font-size: 0.88rem; font-weight: 500; color: #555; }

    .form-row input,
    .form-row select,
    .form-row textarea {
      padding: 9px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.92rem;
      outline: none;
      transition: border-color 0.2s;
      font-family: inherit;
    }
    .form-row input:focus,
    .form-row select:focus,
    .form-row textarea:focus { border-color: #3498db; }
    .form-row textarea { resize: vertical; }

    .form-actions { display: flex; gap: 10px; margin-top: 22px; }

    .password-field {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .password-field input {
      flex: 1;
    }

    .toggle-password {
      padding: 8px 10px;
      border: 1px solid #bdc3c7;
      background: #f8f9fa;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
      color: #2c3e50;
      white-space: nowrap;
    }

    .toggle-password:hover {
      background: #ecf0f1;
    }

    .form-error {
      margin-top: 12px;
      padding: 10px 14px;
      background: #fdf2f2;
      border: 1px solid #f5c6c6;
      border-radius: 6px;
      color: #c0392b;
      font-size: 0.9rem;
    }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .modal-card {
      background: white; border-radius: 10px; padding: 30px;
      max-width: 460px; width: 90%;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .modal-card h3 { margin: 0 0 15px; color: #e74c3c; }
    .modal-card p { color: #555; margin-bottom: 10px; }
    .modal-aviso { font-size: 0.85rem; color: #888; font-style: italic; }
    .modal-actions { display: flex; gap: 10px; margin-top: 20px; }

    /* Tabela */
    .alunos-table {
      background: white; border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow-x: auto;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    thead { background: #f8f9fa; }
    th {
      padding: 13px 14px; text-align: left;
      font-weight: 600; color: #555;
      border-bottom: 2px solid #e9ecef; white-space: nowrap;
    }
    td { padding: 12px 14px; border-bottom: 1px solid #f0f0f0; color: #333; }
    tr.inactive td { opacity: 0.55; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8f9fa; }

    .aluno-nome { font-weight: 500; }
    .matricula { font-family: monospace; color: #2980b9; font-weight: 600; }

    .status {
      display: inline-block; padding: 3px 10px;
      border-radius: 20px; font-size: 0.78rem; font-weight: 600;
    }
    .ativo { background: #d5f5e3; color: #1e8449; }
    .inativo { background: #fdecea; color: #c0392b; }
    .actions { display: flex; gap: 6px; align-items: center; }

    .loading, .empty-state {
      text-align: center; padding: 40px; color: #888;
      font-size: 1rem; background: white;
      border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    @media (max-width: 700px) {
      .form-grid { grid-template-columns: 1fr; }
      .form-row.span2 { grid-column: span 1; }
    }
  `]
})
export class AdminAlunosComponent implements OnInit {
  alunos: Aluno[] = [];
  carregando = false;
  formAberto = false;
  mostrarSenha = false;
  editandoId: number | null = null;
  salvando = false;
  formErro = '';
  alunoParaDeletar: Aluno | null = null;
  deletando = false;
  deleteErro = '';

  form: AlunoForm = formVazio();

  private readonly apiUrl = `${environment.apiUrl}/alunos`;

  constructor(private http: HttpClient) {}

  ngOnInit() { this.carregarAlunos(); }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  carregarAlunos() {
    this.carregando = true;
    this.http.get<Aluno[]>(this.apiUrl, { headers: this.getHeaders() }).subscribe({
      next: (data) => { this.alunos = data; this.carregando = false; },
      error: () => { this.carregando = false; }
    });
  }

  abrirFormulario() {
    this.editandoId = null;
    this.form = formVazio();
    this.mostrarSenha = false;
    this.formErro = '';
    this.formAberto = true;
  }

  cancelarFormulario() {
    this.formAberto = false;
    this.mostrarSenha = false;
    this.formErro = '';
  }

  editarAluno(aluno: Aluno) {
    this.editandoId = aluno.id;
    this.mostrarSenha = false;
    this.form = {
      email: aluno.email,
      senha: '',
      ativo: aluno.ativo,
      nome: aluno.nome,
      data_nascimento: aluno.data_nascimento?.slice(0, 10) ?? '',
      sexo: aluno.sexo ?? '',
      cpf_rg: this.formatarCpfValor(aluno.cpf_rg ?? ''),
      endereco: aluno.endereco ?? '',
      cep: this.formatarCepValor(aluno.cep ?? ''),
      telefone: this.formatarCelularValor(aluno.telefone ?? ''),
      nome_responsavel: aluno.nome_responsavel ?? '',
      numero_matricula: aluno.numero_matricula ?? '',
      turma: aluno.turma ?? '',
      historico_escolar: aluno.historico_escolar ?? '',
    };
    this.formErro = '';
    this.formAberto = true;
  }

  formatarCpf() {
    this.form.cpf_rg = this.formatarCpfValor(this.form.cpf_rg || '');
  }

  private formatarCpfValor(valor: string): string {
    const digits = valor.replace(/\D/g, '').slice(0, 11);
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 6);
    const p3 = digits.slice(6, 9);
    const p4 = digits.slice(9, 11);

    if (digits.length <= 3) return p1;
    if (digits.length <= 6) return `${p1}.${p2}`;
    if (digits.length <= 9) return `${p1}.${p2}.${p3}`;
    return `${p1}.${p2}.${p3}-${p4}`;
  }

  formatarCep() {
    this.form.cep = this.formatarCepValor(this.form.cep || '');
  }

  private formatarCepValor(valor: string): string {
    const digits = valor.replace(/\D/g, '').slice(0, 8);
    const p1 = digits.slice(0, 5);
    const p2 = digits.slice(5, 8);

    if (digits.length <= 5) return p1;
    return `${p1}-${p2}`;
  }

  formatarCelular() {
    this.form.telefone = this.formatarCelularValor(this.form.telefone || '');
  }

  private formatarCelularValor(valor: string): string {
    const apenasNumeros = valor.replace(/\D/g, '');
    const semCodigoPais = apenasNumeros.startsWith('55') ? apenasNumeros.slice(2) : apenasNumeros;
    const limitado = semCodigoPais.slice(0, 11);

    const ddd = limitado.slice(0, 2);
    const parte1 = limitado.slice(2, 7);
    const parte2 = limitado.slice(7, 11);

    if (!ddd) return '+55';
    if (!parte1) return `+55 (${ddd}`;
    if (!parte2) return `+55 (${ddd}) ${parte1}`;
    return `+55 (${ddd}) ${parte1}-${parte2}`;
  }

  salvarAluno() {
    this.formErro = '';
    this.form.cpf_rg = this.formatarCpfValor(this.form.cpf_rg || '');
    this.form.cep = this.formatarCepValor(this.form.cep || '');
    this.form.telefone = this.formatarCelularValor(this.form.telefone || '').slice(0, 19);
    const obrigatorios: (keyof AlunoForm)[] = [
      'nome', 'data_nascimento', 'sexo', 'cpf_rg',
      'endereco', 'cep', 'telefone', 'email',
      'nome_responsavel', 'numero_matricula', 'turma', 'historico_escolar'
    ];
    for (const campo of obrigatorios) {
      if (!String(this.form[campo]).trim()) {
        this.formErro = 'Todos os campos obrigatórios devem ser preenchidos.';
        return;
      }
    }
    if (!this.editandoId && this.form.senha.length < 6) {
      this.formErro = 'A senha deve ter pelo menos 6 caracteres.';
      return;
    }

    this.salvando = true;

    if (this.editandoId) {
      const payload: any = { ...this.form };
      delete payload.senha;
      this.http.put<Aluno>(`${this.apiUrl}/${this.editandoId}`, payload, { headers: this.getHeaders() }).subscribe({
        next: (atualizado) => {
          const idx = this.alunos.findIndex(a => a.id === this.editandoId);
          if (idx !== -1) this.alunos[idx] = atualizado;
          this.salvando = false;
          this.formAberto = false;
        },
        error: (err) => {
          this.formErro = err?.error?.detail ?? 'Erro ao atualizar aluno.';
          this.salvando = false;
        }
      });
    } else {
      this.http.post<Aluno>(this.apiUrl + '/', this.form, { headers: this.getHeaders() }).subscribe({
        next: (novo) => {
          this.alunos.push(novo);
          this.salvando = false;
          this.mostrarSenha = false;
          this.formAberto = false;
        },
        error: (err) => {
          this.formErro = err?.error?.detail ?? 'Erro ao cadastrar aluno.';
          this.salvando = false;
        }
      });
    }
  }

  abrirDelecao(aluno: Aluno) {
    this.alunoParaDeletar = aluno;
    this.deleteErro = '';
  }

  cancelarDelecao() {
    this.alunoParaDeletar = null;
    this.deleteErro = '';
  }

  confirmarDelecao() {
    if (!this.alunoParaDeletar) return;
    this.deletando = true;
    this.http.delete(`${this.apiUrl}/${this.alunoParaDeletar.id}`, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.alunos = this.alunos.filter(a => a.id !== this.alunoParaDeletar!.id);
        this.alunoParaDeletar = null;
        this.deletando = false;
      },
      error: (err) => {
        this.deleteErro = err?.error?.detail ?? 'Erro ao deletar aluno.';
        this.deletando = false;
      }
    });
  }
}
