import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';

interface AlunoVinculo {
  vinculo_id: number;
  usuario_id: number;
  nome: string;
  email: string;
  cpf_rg?: string;
  telefone?: string;
  data_nascimento?: string;
  sexo?: string;
  endereco?: string;
  cep?: string;
  nome_responsavel?: string;
  turma?: string;
  historico_escolar?: string;
  matricula?: string;
  numero_matricula?: string;
  status: 'ativo' | 'suspenso' | 'desligado';
  ativo: boolean;
  data_vinculo?: string;
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
    email: '', senha: '', ativo: true, nome: '',
    data_nascimento: '', sexo: '', cpf_rg: '',
    endereco: '', cep: '', telefone: '',
    nome_responsavel: '', numero_matricula: '',
    turma: '', historico_escolar: '',
  };
}

@Component({
  selector: 'app-instituicao-alunos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Alunos</h1>
          <p class="page-subtitle">Gerencie os alunos vinculados à sua instituição.</p>
        </div>
        <button class="btn-primary" (click)="abrirFormulario()">+ Novo Aluno</button>
      </div>

      @if (alunoParaDeletar) {
        <div class="modal-overlay" (click)="alunoParaDeletar = null">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3 class="modal-title">Confirmar Exclusão</h3>
            <p>Tem certeza que deseja excluir o aluno <strong>{{ alunoParaDeletar.nome }}</strong>?</p>
            <p class="modal-aviso">Esta ação é irreversível e também removerá o acesso do aluno à plataforma.</p>
            <div class="modal-actions">
              <button class="btn-danger" [disabled]="deletando" (click)="confirmarDelecao()">{{ deletando ? 'Excluindo...' : 'Sim, excluir' }}</button>
              <button class="btn-outline" (click)="alunoParaDeletar = null">Cancelar</button>
            </div>
            @if (deleteErro) { <div class="form-error">{{ deleteErro }}</div> }
          </div>
        </div>
      }

      @if (formAberto) {
        <div class="form-card">
          <h3 class="form-card-title">{{ editandoId ? 'Editar Aluno' : 'Novo Aluno' }}</h3>
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
              <div class="form-row">
                <label>E-mail *</label>
                <input type="email" [(ngModel)]="form.email" name="email" required placeholder="email@exemplo.com" />
              </div>
              @if (!editandoId) {
                <div class="form-row">
                  <label>Senha *</label>
                  <div class="password-field">
                    <input [type]="mostrarSenha ? 'text' : 'password'" [(ngModel)]="form.senha" name="senha" required minlength="6" placeholder="Mínimo 6 caracteres" />
                    <button type="button" class="toggle-password" (click)="mostrarSenha = !mostrarSenha">{{ mostrarSenha ? 'Ocultar' : 'Mostrar' }}</button>
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
                <textarea [(ngModel)]="form.historico_escolar" name="historico_escolar" required rows="3" placeholder="Observações sobre o histórico escolar do aluno..."></textarea>
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
        <div class="alunos-table">
          <table class="table table-zebra">
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
              @for (aluno of alunos; track aluno.vinculo_id) {
                <tr [class.row-inactive]="!aluno.ativo">
                  <td class="col-matricula">{{ aluno.numero_matricula || aluno.matricula || '—' }}</td>
                  <td class="col-nome">{{ aluno.nome }}</td>
                  <td>{{ aluno.cpf_rg || '—' }}</td>
                  <td>{{ aluno.turma || '—' }}</td>
                  <td>{{ aluno.email }}</td>
                  <td>{{ aluno.telefone || '—' }}</td>
                  <td>
                    <span class="badge" [class.badge--success]="aluno.ativo" [class.badge--danger]="!aluno.ativo">
                      {{ aluno.ativo ? 'Ativo' : 'Inativo' }}
                    </span>
                  </td>
                  <td class="col-actions">
                    <button class="btn-icon btn-icon--edit" title="Editar" (click)="editarAluno(aluno)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon btn-icon--delete" title="Deletar" (click)="abrirDelecao(aluno)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
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
          <div class="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h3 class="empty-title">Nenhum aluno cadastrado</h3>
          <p>Clique em "Novo Aluno" para cadastrar o primeiro.</p>
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

    .btn-icon { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: var(--radius); border: 1px solid var(--color-border); background: var(--color-surface-2); cursor: pointer; transition: all var(--transition-fast); }
    .btn-icon--edit { color: var(--primary); }
    .btn-icon--edit:hover { background: color-mix(in srgb, var(--primary) 10%, transparent); border-color: var(--primary); }
    .btn-icon--delete { color: var(--color-danger); }
    .btn-icon--delete:hover { background: color-mix(in srgb, var(--color-danger) 10%, transparent); border-color: var(--color-danger); }

    .form-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-7); margin-bottom: var(--space-6); box-shadow: var(--shadow-sm); }
    .form-card-title { margin: 0 0 var(--space-5); font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); font-family: var(--font-display); }

    .section-title { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--color-text-muted); margin: var(--space-5) 0 var(--space-3); padding-bottom: var(--space-2); border-bottom: 1px solid var(--color-border); }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3) var(--space-5); }
    .form-row { display: flex; flex-direction: column; gap: var(--space-1); }
    .form-row.span2 { grid-column: span 2; }
    .form-row label { font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text); }
    .form-row input, .form-row select, .form-row textarea { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius); font-size: var(--font-size-sm); background: var(--color-surface); color: var(--color-text); outline: none; transition: border-color var(--transition-fast); font-family: inherit; }
    .form-row input:focus, .form-row select:focus, .form-row textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent); }
    .form-row textarea { resize: vertical; }

    .form-actions { display: flex; gap: var(--space-3); margin-top: var(--space-5); }

    .password-field { display: flex; align-items: center; gap: var(--space-2); }
    .password-field input { flex: 1; }
    .toggle-password { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); background: var(--color-surface-2); border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap; }
    .toggle-password:hover { background: var(--color-border); }

    .form-error { margin-top: var(--space-3); padding: var(--space-3) var(--space-4); background: color-mix(in srgb, var(--color-danger) 10%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); border-radius: var(--radius); color: var(--color-danger); font-size: var(--font-size-sm); }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-7); max-width: 460px; width: 90%; box-shadow: var(--shadow-lg); }
    .modal-title { margin: 0 0 var(--space-3); font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); font-family: var(--font-display); }
    .modal-card p { color: var(--color-text-muted); margin-bottom: var(--space-3); font-size: var(--font-size-sm); }
    .modal-aviso { font-size: var(--font-size-xs) !important; color: var(--color-danger) !important; background: color-mix(in srgb, var(--color-danger) 8%, transparent); padding: var(--space-2) var(--space-3); border-radius: var(--radius); }
    .modal-actions { display: flex; gap: var(--space-3); margin-top: var(--space-5); }

    .alunos-table { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow-x: auto; box-shadow: var(--shadow-sm); }
    .col-matricula { font-family: monospace; color: var(--primary); font-weight: 600; }
    .col-nome { font-weight: 500; color: var(--color-text); }
    .row-inactive td { opacity: .55; }
    .col-actions { white-space: nowrap; }
    /* NÃO use display:flex aqui: num <td> isso anula o table-cell e a célula
       sai do row box — o fundo e a borda da linha param antes da coluna de
       ações. Os botões são inline-flex, então margem + vertical-align dão o
       mesmo resultado visual sem quebrar a tabela. */
    .col-actions > * { vertical-align: middle; }
    .col-actions > * + * { margin-left: var(--space-2); }

    .badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 600; }
    .badge--success { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
    .badge--danger  { background: color-mix(in srgb, var(--color-danger)  15%, transparent); color: var(--color-danger); }

    .loading-state { text-align: center; padding: 40px; color: var(--color-text-muted); }
    .spinner { display: inline-block; width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: var(--space-3); }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 700px) {
      .form-grid { grid-template-columns: 1fr; }
      .form-row.span2 { grid-column: span 1; }
    }
  `]
})
export class InstituicaoAlunosComponent implements OnInit {
  alunos: AlunoVinculo[] = [];
  carregando = false;
  formAberto = false;
  mostrarSenha = false;
  editandoId: number | null = null;
  salvando = false;
  formErro = '';
  alunoParaDeletar: AlunoVinculo | null = null;
  deletando = false;
  deleteErro = '';

  form: AlunoForm = formVazio();

  constructor(private api: ApiService) {}

  ngOnInit() { this.carregarAlunos(); }

  carregarAlunos() {
    this.carregando = true;
    this.api.getInstituicaoAlunos().subscribe({
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

  editarAluno(aluno: AlunoVinculo) {
    this.editandoId = aluno.usuario_id;
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
      numero_matricula: aluno.numero_matricula ?? aluno.matricula ?? '',
      turma: aluno.turma ?? '',
      historico_escolar: aluno.historico_escolar ?? '',
    };
    this.formErro = '';
    this.formAberto = true;
  }

  abrirDelecao(aluno: AlunoVinculo) {
    this.alunoParaDeletar = aluno;
    this.deleteErro = '';
    this.deletando = false;
  }

  confirmarDelecao() {
    if (!this.alunoParaDeletar) return;
    this.deletando = true;
    this.deleteErro = '';
    this.api.deleteInstituicaoAluno(this.alunoParaDeletar.usuario_id).subscribe({
      next: () => {
        this.alunos = this.alunos.filter(a => a.usuario_id !== this.alunoParaDeletar!.usuario_id);
        this.alunoParaDeletar = null;
        this.deletando = false;
      },
      error: (err) => {
        this.deleteErro = err?.error?.detail ?? 'Erro ao excluir aluno.';
        this.deletando = false;
      }
    });
  }

  formatarCpf() { this.form.cpf_rg = this.formatarCpfValor(this.form.cpf_rg || ''); }

  private formatarCpfValor(valor: string): string {
    const d = valor.replace(/\D/g, '').slice(0, 11);
    const p1 = d.slice(0, 3), p2 = d.slice(3, 6), p3 = d.slice(6, 9), p4 = d.slice(9, 11);
    if (d.length <= 3) return p1;
    if (d.length <= 6) return `\${p1}.\${p2}`;
    if (d.length <= 9) return `\${p1}.\${p2}.\${p3}`;
    return `\${p1}.\${p2}.\${p3}-\${p4}`;
  }

  formatarCep() { this.form.cep = this.formatarCepValor(this.form.cep || ''); }

  private formatarCepValor(valor: string): string {
    const d = valor.replace(/\D/g, '').slice(0, 8);
    return d.length <= 5 ? d.slice(0, 5) : `\${d.slice(0, 5)}-\${d.slice(5, 8)}`;
  }

  formatarCelular() { this.form.telefone = this.formatarCelularValor(this.form.telefone || ''); }

  private formatarCelularValor(valor: string): string {
    const nums = valor.replace(/\D/g, '');
    const sem55 = nums.startsWith('55') ? nums.slice(2) : nums;
    const lim = sem55.slice(0, 11);
    const ddd = lim.slice(0, 2), p1 = lim.slice(2, 7), p2 = lim.slice(7, 11);
    if (!ddd) return '+55';
    if (!p1) return `+55 (\${ddd}`;
    if (!p2) return `+55 (\${ddd}) \${p1}`;
    return `+55 (\${ddd}) \${p1}-\${p2}`;
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
      this.api.updateInstituicaoAluno(this.editandoId, payload).subscribe({
        next: (atualizado) => {
          const idx = this.alunos.findIndex(a => a.usuario_id === this.editandoId);
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
      this.api.createInstituicaoAluno(this.form).subscribe({
        next: (novo) => {
          this.alunos.push(novo);
          this.salvando = false;
          this.formAberto = false;
        },
        error: (err) => {
          this.formErro = err?.error?.detail ?? 'Erro ao cadastrar aluno.';
          this.salvando = false;
        }
      });
    }
  }
}
