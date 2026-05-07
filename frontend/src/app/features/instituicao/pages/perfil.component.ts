import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

interface InstituicaoInfo {
  id: number;
  nome: string;
  cnpj: string | null;
  email_contato: string | null;
  telefone: string | null;
  dominio_email: string | null;
  plano: string | null;
  ativa: boolean;
  aprovada: boolean;
  data_criacao: string;
}

@Component({
  selector: 'app-instituicao-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-page">
      <div class="page-header">
        <h1 class="page-title">Perfil da Instituição</h1>
        <p class="page-subtitle">Visualize e edite os dados da sua instituição.</p>
      </div>

      @if (carregando) {
        <div class="loading-state"><div class="spinner"></div><p>Carregando informações...</p></div>
      }
      @if (erro && !carregando) {
        <div class="error-card"><p>{{ erro }}</p></div>
      }

      @if (instituicao && !carregando) {
        <div class="card">
          <div class="card-header">
            <div class="inst-avatar">
              @if (logoUrl()) {
                <img [src]="logoUrl()!" alt="Logo" class="inst-logo-img" />
              } @else {
                {{ instInicial }}
              }
            </div>
            <div class="inst-title">
              <h2>{{ instituicao.nome }}</h2>
              <div class="badges">
                <span class="badge" [class.badge--success]="instituicao.aprovada" [class.badge--warn]="!instituicao.aprovada">
                  {{ instituicao.aprovada ? 'Aprovada' : 'Aguardando aprovação' }}
                </span>
                <span class="badge" [class.badge--success]="instituicao.ativa" [class.badge--danger]="!instituicao.ativa">
                  {{ instituicao.ativa ? 'Ativa' : 'Inativa' }}
                </span>
                @if (instituicao.plano) {
                  <span class="badge badge--info">{{ instituicao.plano | titlecase }}</span>
                }
              </div>
            </div>
          </div>

          @if (!editando) {
            <div class="section-title">Dados Cadastrais</div>
            <div class="info-grid">
              <div class="info-row"><span class="label">Nome</span><span class="value">{{ instituicao.nome }}</span></div>
              @if (instituicao.cnpj) {
                <div class="info-row"><span class="label">CNPJ</span><span class="value mono">{{ instituicao.cnpj }}</span></div>
              }
              <div class="info-row"><span class="label">E-mail de contato</span><span class="value">{{ instituicao.email_contato || '—' }}</span></div>
              <div class="info-row"><span class="label">Telefone</span><span class="value">{{ instituicao.telefone || '—' }}</span></div>
              <div class="info-row"><span class="label">Domínio de e-mail</span><span class="value">{{ instituicao.dominio_email || '—' }}</span></div>
              <div class="info-row"><span class="label">Cadastro em</span><span class="value">{{ instituicao.data_criacao | date:'dd/MM/yyyy' }}</span></div>
            </div>
            <div class="card-footer">
              <button class="btn-primary" (click)="iniciarEdicao()">Editar informações</button>
            </div>
          }

          @if (editando) {
            <div class="section-title">Editar Dados</div>
            <div class="form-grid">
              <div class="form-group">
                <label>Nome da Instituição</label>
                <input type="text" [(ngModel)]="form.nome" placeholder="Nome da instituição" />
              </div>
              <div class="form-group">
                <label>E-mail de Contato</label>
                <input type="email" [(ngModel)]="form.email_contato" placeholder="email@instituicao.com" />
              </div>
              <div class="form-group">
                <label>Telefone</label>
                <input type="text" [(ngModel)]="form.telefone" placeholder="(11) 99999-0000" />
              </div>
              <div class="form-group">
                <label>Domínio de E-mail</label>
                <input type="text" [(ngModel)]="form.dominio_email" placeholder="@minhainstituicao.edu.br" />
              </div>
            </div>
            @if (mensagemSucesso) { <div class="feedback feedback--success">{{ mensagemSucesso }}</div> }
            @if (erroForm) { <div class="feedback feedback--error">{{ erroForm }}</div> }
            <div class="card-footer">
              <button class="btn-primary" (click)="salvar()" [disabled]="salvando">{{ salvando ? 'Salvando...' : 'Salvar' }}</button>
              <button class="btn-outline" (click)="cancelarEdicao()">Cancelar</button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .loading-state { text-align: center; padding: 40px; color: var(--color-text-muted); }
    .spinner { display: inline-block; width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: var(--space-3); }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-card { background: color-mix(in srgb, var(--color-danger) 10%, transparent); color: var(--color-danger); padding: var(--space-5); border-radius: var(--radius-lg); border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); }

    .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-7); box-shadow: var(--shadow-sm); }

    .card-header { display: flex; align-items: center; gap: var(--space-5); margin-bottom: var(--space-7); padding-bottom: var(--space-5); border-bottom: 1px solid var(--color-border); }
    .inst-avatar { width: 64px; height: 64px; border-radius: 50%; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-2xl); font-weight: 700; flex-shrink: 0; overflow: hidden; }
    .inst-logo-img { width: 100%; height: 100%; object-fit: contain; border-radius: 50%; }
    .inst-title h2 { margin: 0 0 var(--space-2); font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text); font-family: var(--font-display); }
    .badges { display: flex; gap: var(--space-2); flex-wrap: wrap; }

    .badge { padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 600; }
    .badge--success { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
    .badge--warn    { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); }
    .badge--danger  { background: color-mix(in srgb, var(--color-danger)  15%, transparent); color: var(--color-danger); }
    .badge--info    { background: color-mix(in srgb, var(--primary) 10%, transparent); color: var(--primary); }

    .section-title { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--color-text-muted); margin-bottom: var(--space-3); }

    .info-grid { display: flex; flex-direction: column; }
    .info-row { display: flex; gap: var(--space-3); padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border); font-size: var(--font-size-sm); }
    .info-row:last-child { border-bottom: none; }
    .label { font-weight: 600; color: var(--color-text); min-width: 180px; }
    .value { color: var(--color-text-muted); }
    .value.mono { font-family: monospace; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-4); }
    .form-group { display: flex; flex-direction: column; gap: var(--space-2); }
    .form-group label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .form-group input { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius); font-size: var(--font-size-sm); background: var(--color-surface); color: var(--color-text); outline: none; transition: border-color var(--transition-fast); font-family: inherit; }
    .form-group input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent); }

    .feedback { padding: var(--space-3) var(--space-4); border-radius: var(--radius); font-size: var(--font-size-sm); margin-bottom: var(--space-3); }
    .feedback--success { background: color-mix(in srgb, var(--color-success) 10%, transparent); color: var(--color-success); border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent); }
    .feedback--error   { background: color-mix(in srgb, var(--color-danger) 10%, transparent); color: var(--color-danger); border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent); }

    .card-footer { display: flex; gap: var(--space-3); padding-top: var(--space-5); margin-top: var(--space-3); border-top: 1px solid var(--color-border); }

    .btn-primary { background: var(--primary); color: #fff; border: none; border-radius: var(--radius); padding: var(--space-3) var(--space-5); cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; transition: background var(--transition-fast); }
    .btn-primary:hover:not(:disabled) { background: var(--secondary); }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-outline { padding: var(--space-3) var(--space-5); border: 1px solid var(--color-border); background: var(--color-surface-2); color: var(--color-text-muted); border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-sm); }
    .btn-outline:hover { background: var(--color-border); color: var(--color-text); }

    @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
  `]
})
export class InstituicaoPerfilComponent implements OnInit {
  private readonly _themeService = inject(ThemeService);
  readonly logoUrl = toSignal(this._themeService.logoUrl$, { initialValue: null as string | null });

  instituicao: InstituicaoInfo | null = null;
  carregando = true;
  erro = '';
  editando = false;
  salvando = false;
  mensagemSucesso = '';
  erroForm = '';

  form = { nome: '', email_contato: '', telefone: '', dominio_email: '' };

  get instInicial(): string {
    return this.instituicao?.nome?.charAt(0)?.toUpperCase() ?? 'I';
  }

  constructor(private authService: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.http.get<InstituicaoInfo>('http://localhost:8000/api/instituicoes/minha', { headers: this.headers() }).subscribe({
      next: (data) => { this.instituicao = data; this.carregando = false; },
      error: (err) => { this.erro = err?.error?.detail ?? 'Erro ao carregar dados.'; this.carregando = false; },
    });
  }

  iniciarEdicao(): void {
    if (!this.instituicao) return;
    this.form = {
      nome: this.instituicao.nome,
      email_contato: this.instituicao.email_contato ?? '',
      telefone: this.instituicao.telefone ?? '',
      dominio_email: this.instituicao.dominio_email ?? '',
    };
    this.mensagemSucesso = '';
    this.erroForm = '';
    this.editando = true;
  }

  cancelarEdicao(): void {
    this.editando = false;
    this.erroForm = '';
  }

  salvar(): void {
    if (!this.form.nome.trim()) { this.erroForm = 'O nome é obrigatório.'; return; }
    this.salvando = true;
    this.erroForm = '';

    const payload: any = {};
    if (this.form.nome.trim())          payload['nome']          = this.form.nome.trim();
    if (this.form.email_contato.trim()) payload['email_contato'] = this.form.email_contato.trim();
    if (this.form.telefone.trim())      payload['telefone']      = this.form.telefone.trim();
    if (this.form.dominio_email.trim()) payload['dominio_email'] = this.form.dominio_email.trim();

    this.http.patch<InstituicaoInfo>('http://localhost:8000/api/instituicoes/minha', payload, { headers: this.headers() }).subscribe({
      next: (data) => {
        this.instituicao = data;
        this.salvando = false;
        this.editando = false;
        this.mensagemSucesso = 'Dados atualizados com sucesso!';
        setTimeout(() => this.mensagemSucesso = '', 4000);
      },
      error: (err) => {
        this.erroForm = err?.error?.detail ?? 'Erro ao salvar.';
        this.salvando = false;
      },
    });
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }
}

