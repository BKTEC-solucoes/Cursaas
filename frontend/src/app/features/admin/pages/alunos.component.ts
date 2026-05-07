import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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
  email: string;
  senha: string;
  ativo: boolean;
  nome: string;
  data_nascimento: string;
  sexo: string;
  cpf_rg: string;
  endereco: string;
  cep: string;
  telefone: string;
  nome_responsavel: string;
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
    <div class="content-page">
      <div class="page-topbar">
        <h1>Gerenciar Alunos</h1>
        <button class="btn-primary" (click)="abrirFormulario()">+ Novo Aluno</button>
      </div>

      @if (alunoParaDeletar) {
        <div class="modal-overlay" (click)="cancelarDelecao()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3>Confirmar Exclusão</h3>
            <p>Tem certeza que deseja excluir o aluno <strong>{{ alunoParaDeletar.nome }}</strong>?</p>
            <p class="modal-aviso">Esta ação não pode ser desfeita. Todas as notas, presenças e inscrições serão removidas.</p>
            <div class="modal-actions">
              <button class="btn-danger" (click)="confirmarDelecao()" [disabled]="deletando">
                {{ deletando ? 'Deletando...' : 'Sim, deletar' }}
              </button>
              <button class="btn-outline" (click)="cancelarDelecao()" [disabled]="deletando">Cancelar</button>
            </div>
            @if (deleteErro) { <div class="form-error">{{ deleteErro }}</div> }
          </div>
        </div>
      }

      @if (formAberto) {
        <div class="form-card">
          <h2 class="form-card-title">{{ editandoId ? 'Editar Aluno' : 'Novo Aluno' }}</h2>
          <form (ngSubmit)="salvarAluno()" #f="ngForm">

            <div class="section-title">Dados Pessoais</div>
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

            <div class="section-title">Endereço e Contato</div>
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
            </div>

            <div class="section-title">Acesso ao Sistema</div>
            <div class="form-grid">
              <div class="form-row">
                <label>E-mail *</label>
                <input type="email" [(ngModel)]="form.email" name="email" required placeholder="email@exemplo.com" />
              </div>
              @if (!editandoId) {
                <div class="form-row">
                  <label>Senha *</label>
                  <div class="password-field">
                    <input [type]="mostrarSenha ? 'text' : 'password'" [(ngModel)]="form.senha" name="senha" required minlength="6" placeholder="Mínimo 6 caracteres" />
                    <button type="button" class="toggle-password" (click)="mostrarSenha = !mostrarSenha">
                      {{ mostrarSenha ? 'Ocultar' : 'Mostrar' }}
                    </button>
                  </div>
                </div>
              }
            </div>

            <div class="section-title">Responsável</div>
            <div class="form-grid">
              <div class="form-row span2">
                <label>Nome do Pai / Mãe / Responsável *</label>
                <input type="text" [(ngModel)]="form.nome_responsavel" name="nome_responsavel" required placeholder="Nome completo do responsável" />
              </div>
            </div>

            <div class="section-title">Dados Escolares</div>
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
                <textarea [(ngModel)]="form.historico_escolar" name="historico_escolar" required rows="3" placeholder="Observações sobre o histórico escolar..."></textarea>
              </div>
            </div>

            @if (editandoId) {
              <div class="form-grid">
                <div class="form-row">
                  <label>Status</label>
                  <select [(ngModel)]="form.ativo" name="ativo">
                    <option [ngValue]="true">Ativo</option>
                    <option [ngValue]="false">Inativo</option>
                  </select>
                </div>
              </div>
            }

            <div class="form-actions">
              <button type="submit" class="btn-primary" [disabled]="salvando">{{ salvando ? 'Salvando...' : 'Salvar' }}</button>
              <button type="button" class="btn-outline" (click)="cancelarFormulario()">Cancelar</button>
            </div>

            @if (formErro) { <div class="form-error">{{ formErro }}</div> }
          </form>
        </div>
      }

      @if (carregando) {
        <div class="loading-state"><div class="spinner"></div><p>Carregando alunos...</p></div>
      }

      @if (!carregando && alunos.length > 0) {
        <div class="table-card">
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
              @for (aluno of alunos; track aluno.id) {
                <tr [class.inactive]="!aluno.ativo">
                  <td class="col-matricula">{{ aluno.numero_matricula || '—' }}</td>
                  <td class="cell-strong">{{ aluno.nome }}</td>
                  <td>{{ aluno.cpf_rg || '—' }}</td>
                  <td>{{ aluno.turma || '—' }}</td>
                  <td>{{ aluno.email }}</td>
                  <td>{{ aluno.telefone || '—' }}</td>
                  <td>
                    <span class="badge" [class]="aluno.ativo ? 'badge--success' : 'badge--danger'">
                      {{ aluno.ativo ? 'Ativo' : 'Inativo' }}
                    </span>
                  </td>
                  <td class="cell-actions">
                    <button class="btn-icon btn-icon--edit" title="Editar" (click)="editarAluno(aluno)">
                      <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon btn-icon--delete" title="Deletar" (click)="abrirDelecao(aluno)">
                      <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (!carregando && alunos.length === 0) {
        <div class="empty-state">
          <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <p>Nenhum aluno cadastrado.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .page-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
    .page-topbar h1 { margin: 0; font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text); font-family: var(--font-display); }

    .btn-primary { background: var(--primary); color: #fff; border: none; padding: 10px 18px; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; transition: opacity 0.15s; }
    .btn-primary:hover:not(:disabled) { opacity: 0.88; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-outline { padding: 9px 16px; border: 1.5px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); color: var(--color-text-muted); font-size: var(--font-size-sm); font-weight: 500; cursor: pointer; transition: border-color 0.2s, color 0.2s; }
    .btn-outline:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
    .btn-outline:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-danger { background: var(--color-danger); color: #fff; border: none; padding: 9px 16px; border-radius: var(--radius); cursor: pointer; font-weight: 600; font-size: var(--font-size-sm); }
    .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0 0 0 / 0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 28px 32px; max-width: 460px; width: 90%; box-shadow: var(--shadow-lg); }
    .modal-card h3 { margin: 0 0 12px; font-size: var(--font-size-lg); color: var(--color-danger); }
    .modal-card p { color: var(--color-text-muted); margin-bottom: 8px; font-size: var(--font-size-sm); }
    .modal-aviso { font-size: 0.8125rem; font-style: italic; }
    .modal-actions { display: flex; gap: 10px; margin-top: 20px; }

    /* Form */
    .form-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 28px; margin-bottom: 24px; box-shadow: var(--shadow-sm); }
    .form-card-title { margin: 0 0 20px; font-size: var(--font-size-lg); color: var(--color-text); }

    .section-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 1px solid var(--color-border); }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
    .form-row { display: flex; flex-direction: column; gap: 5px; }
    .form-row.span2 { grid-column: span 2; }
    .form-row label { font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text-muted); }

    .form-row input, .form-row select, .form-row textarea {
      padding: 9px 12px; border: 1.5px solid var(--color-border); border-radius: var(--radius);
      font-size: var(--font-size-sm); outline: none; transition: border-color 0.2s;
      font-family: inherit; background: var(--color-surface-2); color: var(--color-text);
    }
    .form-row input:focus, .form-row select:focus, .form-row textarea:focus { border-color: var(--primary); background: var(--color-surface); }
    .form-row textarea { resize: vertical; }

    .form-actions { display: flex; gap: 10px; margin-top: 22px; }

    .password-field { display: flex; align-items: center; gap: 8px; }
    .password-field input { flex: 1; }
    .toggle-password { padding: 8px 10px; border: 1.5px solid var(--color-border); background: var(--color-surface-2); border-radius: var(--radius); cursor: pointer; font-size: 0.8rem; color: var(--color-text-muted); white-space: nowrap; }
    .toggle-password:hover { background: var(--color-surface); }

    .form-error { margin-top: 12px; padding: 10px 14px; background: color-mix(in srgb, var(--color-danger) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent); border-radius: var(--radius); color: var(--color-danger); font-size: var(--font-size-sm); }

    /* States */
    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 24px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Table */
    .table-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow-x: auto; box-shadow: var(--shadow-sm); }
    table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); min-width: 900px; }
    th { padding: 12px 14px; text-align: left; font-weight: 600; color: var(--color-text-muted); background: var(--color-surface-2); border-bottom: 1px solid var(--color-border); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
    td { padding: 12px 14px; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
    tr.inactive td { opacity: 0.5; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--color-surface-2); }

    .cell-strong { font-weight: 600; }
    .col-matricula { font-family: monospace; color: var(--primary); font-weight: 600; }

    .badge { display: inline-flex; padding: 3px 10px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; }
    .badge--success { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
    .badge--danger  { background: color-mix(in srgb, var(--color-danger) 15%, transparent);  color: var(--color-danger); }

    .cell-actions { display: flex; gap: 6px; }
    .btn-icon { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: var(--radius); border: 1.5px solid var(--color-border); background: var(--color-surface); cursor: pointer; transition: border-color 0.15s, color 0.15s; }
    .btn-icon--edit  { color: var(--primary); }
    .btn-icon--edit:hover  { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, transparent); }
    .btn-icon--delete { color: var(--color-danger); }
    .btn-icon--delete:hover { border-color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 8%, transparent); }

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
  private readonly apiUrl = 'http://localhost:8000/api/alunos';
  constructor(private http: HttpClient) {}
  ngOnInit() { this.carregarAlunos(); }
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
  carregarAlunos(): void {
    this.carregando = true;
    this.http.get<Aluno[]>(this.apiUrl, { headers: this.getHeaders() }).subscribe({
      next: (lista) => { this.alunos = lista; this.carregando = false; },
      error: () => { this.carregando = false; }
    });
  }
  abrirFormulario(): void {
    this.editandoId = null; this.form = formVazio(); this.formErro = ''; this.mostrarSenha = false; this.formAberto = true;
  }
  cancelarFormulario(): void {
    this.formAberto = false; this.formErro = ''; this.form = formVazio(); this.editandoId = null;
  }
  salvarAluno(): void {
    if (this.salvando) return;
    this.salvando = true; this.formErro = '';
    const req = this.editandoId
      ? this.http.put(`${this.apiUrl}/${this.editandoId}`, this.form, { headers: this.getHeaders() })
      : this.http.post(this.apiUrl, this.form, { headers: this.getHeaders() });
    req.subscribe({
      next: () => { this.salvando = false; this.cancelarFormulario(); this.carregarAlunos(); },
      error: (err) => { this.salvando = false; this.formErro = err?.error?.detail || 'Erro ao salvar aluno.'; }
    });
  }
  editarAluno(aluno: Aluno): void {
    this.editandoId = aluno.id;
    this.form = { email: aluno.email, senha: '', ativo: aluno.ativo, nome: aluno.nome, data_nascimento: aluno.data_nascimento || '', sexo: aluno.sexo || '', cpf_rg: aluno.cpf_rg || '', endereco: aluno.endereco || '', cep: aluno.cep || '', telefone: aluno.telefone || '', nome_responsavel: aluno.nome_responsavel || '', numero_matricula: aluno.numero_matricula || '', turma: aluno.turma || '', historico_escolar: aluno.historico_escolar || '' };
    this.formErro = ''; this.mostrarSenha = false; this.formAberto = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  abrirDelecao(aluno: Aluno): void { this.alunoParaDeletar = aluno; this.deleteErro = ''; }
  cancelarDelecao(): void { this.alunoParaDeletar = null; this.deleteErro = ''; }
  confirmarDelecao(): void {
    if (!this.alunoParaDeletar || this.deletando) return;
    this.deletando = true; this.deleteErro = '';
    this.http.delete(`${this.apiUrl}/${this.alunoParaDeletar.id}`, { headers: this.getHeaders() }).subscribe({
      next: () => { this.deletando = false; this.alunos = this.alunos.filter(a => a.id !== this.alunoParaDeletar!.id); this.alunoParaDeletar = null; },
      error: (err) => { this.deletando = false; this.deleteErro = err?.error?.detail || 'Erro ao deletar aluno.'; }
    });
  }
  formatarCpf(): void {
    let v = this.form.cpf_rg.replace(/\D/g, '').substring(0, 11);
    if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
    else if (v.length > 3) v = v.replace(/(\d{3})(\d{0,3})/, '$1.$2');
    this.form.cpf_rg = v;
  }
  formatarCep(): void {
    let v = this.form.cep.replace(/\D/g, '').substring(0, 8);
    if (v.length > 5) v = v.replace(/(\d{5})(\d{0,3})/, '$1-$2');
    this.form.cep = v;
  }
  formatarCelular(): void {
    let v = this.form.telefone.replace(/\D/g, '');
    if (v.length <= 13) {
      v = v.replace(/^(\d{2})(\d{2})(\d{5})(\d{4})$/, '+$1 ($2) $3-$4');
      v = v.replace(/^(\d{2})(\d{2})(\d{4})(\d{4})$/, '+$1 ($2) $3-$4');
    }
    this.form.telefone = v;
  }
}
