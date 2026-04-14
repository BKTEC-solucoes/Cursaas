import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

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
    <div class="perfil-page">
      <div class="page-header">
        <h1>ðŸ›ï¸ Perfil da InstituiÃ§Ã£o</h1>
      </div>

      <div class="loading" *ngIf="carregando">Carregando informaÃ§Ãµes...</div>
      <div class="erro" *ngIf="erro && !carregando">{{ erro }}</div>

      <ng-container *ngIf="instituicao && !carregando">

        <!-- Card de identidade -->
        <div class="card">
          <div class="card-header">
            <div class="inst-avatar">{{ instInicial }}</div>
            <div class="inst-title">
              <h2>{{ instituicao.nome }}</h2>
              <div class="badges">
                <span class="badge" [class.badge-ok]="instituicao.aprovada" [class.badge-pending]="!instituicao.aprovada">
                  {{ instituicao.aprovada ? 'âœ… Aprovada' : 'â³ Aguardando aprovaÃ§Ã£o' }}
                </span>
                <span class="badge" [class.badge-ok]="instituicao.ativa" [class.badge-inactive]="!instituicao.ativa">
                  {{ instituicao.ativa ? 'ðŸŸ¢ Ativa' : 'ðŸ”´ Inativa' }}
                </span>
                <span class="badge badge-plano" *ngIf="instituicao.plano">
                  ðŸ“¦ {{ instituicao.plano | titlecase }}
                </span>
              </div>
            </div>
          </div>

          <!-- VisualizaÃ§Ã£o -->
          <ng-container *ngIf="!editando">
            <div class="section-title">Dados Cadastrais</div>
            <div class="info-grid">
              <div class="info-row">
                <span class="label">Nome</span>
                <span class="value">{{ instituicao.nome }}</span>
              </div>
              <div class="info-row" *ngIf="instituicao.cnpj">
                <span class="label">CNPJ</span>
                <span class="value mono">{{ instituicao.cnpj }}</span>
              </div>
              <div class="info-row">
                <span class="label">E-mail de contato</span>
                <span class="value">{{ instituicao.email_contato || 'â€”' }}</span>
              </div>
              <div class="info-row">
                <span class="label">Telefone</span>
                <span class="value">{{ instituicao.telefone || 'â€”' }}</span>
              </div>
              <div class="info-row">
                <span class="label">DomÃ­nio de e-mail</span>
                <span class="value">{{ instituicao.dominio_email || 'â€”' }}</span>
              </div>
              <div class="info-row">
                <span class="label">Cadastro em</span>
                <span class="value">{{ instituicao.data_criacao | date:'dd/MM/yyyy' }}</span>
              </div>
            </div>
            <div class="card-footer">
              <button class="btn-edit" (click)="iniciarEdicao()">âœï¸ Editar informaÃ§Ãµes</button>
            </div>
          </ng-container>

          <!-- EdiÃ§Ã£o -->
          <ng-container *ngIf="editando">
            <div class="section-title">Editar Dados</div>
            <div class="form-grid">
              <div class="form-group">
                <label>Nome da InstituiÃ§Ã£o</label>
                <input type="text" [(ngModel)]="form.nome" placeholder="Nome da instituiÃ§Ã£o" />
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
                <label>DomÃ­nio de E-mail</label>
                <input type="text" [(ngModel)]="form.dominio_email" placeholder="@minhainstituicao.edu.br" />
              </div>
            </div>
            <div class="feedback success" *ngIf="mensagemSucesso">{{ mensagemSucesso }}</div>
            <div class="feedback erro-form" *ngIf="erroForm">{{ erroForm }}</div>
            <div class="card-footer">
              <button class="btn-save" (click)="salvar()" [disabled]="salvando">
                {{ salvando ? 'Salvando...' : 'ðŸ’¾ Salvar' }}
              </button>
              <button class="btn-cancel" (click)="cancelarEdicao()">Cancelar</button>
            </div>
          </ng-container>
        </div>

      </ng-container>
    </div>
  `,
  styles: [`
    .perfil-page { max-width: 800px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 24px; font-weight: 700; color: #1f2937; margin: 0; }

    .loading { padding: 24px; text-align: center; border-radius: 8px; background: #f0f9ff; color: #0369a1; }
    .erro    { padding: 24px; text-align: center; border-radius: 8px; background: #fef2f2; color: #dc2626; }

    .card { background: white; border-radius: 12px; padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

    .card-header {
      display: flex; align-items: center; gap: 20px;
      margin-bottom: 28px; padding-bottom: 20px;
      border-bottom: 1px solid #f3f4f6;
    }
    .inst-avatar {
      width: 64px; height: 64px; border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: 700; flex-shrink: 0;
    }
    .inst-title h2 { margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #1f2937; }
    .badges { display: flex; gap: 8px; flex-wrap: wrap; }
    .badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-ok       { background: #dcfce7; color: #166534; }
    .badge-pending  { background: #fffbeb; color: #92400e; }
    .badge-inactive { background: #fef2f2; color: #991b1b; }
    .badge-plano    { background: #eff6ff; color: #1e40af; }

    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; margin-bottom: 12px; }

    .info-grid { display: flex; flex-direction: column; }
    .info-row { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .label { font-weight: 600; color: #374151; min-width: 180px; }
    .value { color: #6b7280; }
    .value.mono { font-family: monospace; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 13px; font-weight: 600; color: #374151; }
    .form-group input {
      padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px;
      font-size: 14px; color: #1f2937; outline: none; transition: border 0.2s;
    }
    .form-group input:focus { border-color: var(--secondary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--secondary) 15%, transparent); }

    .feedback { padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
    .feedback.success  { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .feedback.erro-form { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

    .card-footer { display: flex; gap: 12px; padding-top: 20px; margin-top: 8px; border-top: 1px solid #f3f4f6; }
    .btn-edit { background: var(--primary); color: white; border: none; border-radius: 8px; padding: 10px 20px; cursor: pointer; font-size: 14px; font-weight: 600; transition: background 0.2s; }
    .btn-edit:hover { background: color-mix(in srgb, var(--primary) 80%, black); }
    .btn-save { background: var(--primary); color: white; border: none; border-radius: 8px; padding: 10px 20px; cursor: pointer; font-size: 14px; font-weight: 600; transition: background 0.2s; }
    .btn-save:hover:not(:disabled) { background: color-mix(in srgb, var(--primary) 80%, black); }
    .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-cancel { background: white; color: #374151; border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 20px; cursor: pointer; font-size: 14px; font-weight: 600; transition: background 0.2s; }
    .btn-cancel:hover { background: #f3f4f6; }

    @media (max-width: 600px) {
      .form-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class InstituicaoPerfilComponent implements OnInit {
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
    if (!this.form.nome.trim()) { this.erroForm = 'O nome Ã© obrigatÃ³rio.'; return; }
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

