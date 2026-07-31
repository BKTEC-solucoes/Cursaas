import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * Painel de Sistema — contas que administram a plataforma.
 *
 * Deliberadamente fora do escopo de instituição: o resto do painel trabalha
 * dentro da faculdade selecionada no cabeçalho (`X-Faculdade-Id`), enquanto
 * super admin não pertence a nenhuma. Por isso esta tela fala com
 * `/api/sistema/super-admins`, e não com `/api/auth/admins` — aquela rota
 * filtra por tenant e, portanto, nunca mostraria um super admin global.
 */

interface SuperAdmin {
  id: number;
  nome: string;
  email: string;
  foto_perfil: string | null;
  ativo: boolean;
  data_criacao: string | null;
  faculdade_id: number | null;
  faculdade_nome: string | null;
  telefone: string | null;
}

interface SuperAdminPage {
  items: SuperAdmin[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface ConviteItem {
  id: number;
  email: string;
  usado: boolean;
  data_criacao: string;
  data_expiracao: string;
  data_uso: string | null;
  convidado_por_nome: string | null;
}

interface SuperAdminForm {
  nome: string;
  email: string;
  confirmarEmail: string;
  senha: string;
  confirmarSenha: string;
  telefone: string;
  foto_perfil: string | null;
}

function formVazio(): SuperAdminForm {
  return {
    nome: '',
    email: '',
    confirmarEmail: '',
    senha: '',
    confirmarSenha: '',
    telefone: '',
    foto_perfil: null,
  };
}

@Component({
  selector: 'app-sistema-super-admins',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-page">

      <div class="page-header">
        <div>
          <h1 class="page-title">Super Admins</h1>
          <p class="page-subtitle">
            Contas que administram a plataforma: cadastram instituições e acessam
            qualquer uma delas. Não pertencem a nenhuma faculdade.
          </p>
        </div>
      </div>

      <div class="msg msg-info escopo-aviso">
        Esta área é global. Para criar administradores de uma instituição use
        <strong>Gestão › Administradores</strong>, que trabalha dentro da faculdade selecionada.
      </div>

      <!-- ══ Criar / editar ═══════════════════════════════════════════════ -->
      <div class="card card-elevated form-card">
        <div class="card-section-title">
          @if (!editandoId) { Novo Super Admin } @else { Editar Super Admin }
        </div>

        <form (ngSubmit)="salvar()">
          <div class="form-grid-2">

            <div class="field span2">
              <label class="field-label">Nome *</label>
              <input class="field-input" type="text" name="nome" required
                     [(ngModel)]="form.nome" placeholder="Nome completo" />
            </div>

            <div class="field span2">
              <label class="field-label">Foto de Perfil</label>
              <div class="photo-row">
                <div class="photo-circle">
                  @if (form.foto_perfil) {
                    <img [src]="form.foto_perfil" alt="Preview" class="photo-circle__img" />
                  } @else {
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                    </svg>
                  }
                </div>
                <div class="photo-actions">
                  <input #fileInput type="file" accept="image/jpeg,image/png" (change)="onFotoSelecionada($event)" style="display:none" />
                  <button type="button" class="btn btn-outline btn-sm" (click)="fileInput.click()">Upload</button>
                  <button type="button" class="btn btn-outline btn-sm" [disabled]="!form.nome.trim()" (click)="gerarAvatar()">Gerar Avatar</button>
                  @if (form.foto_perfil) {
                    <button type="button" class="btn btn-ghost btn-sm" (click)="form.foto_perfil = null">Remover</button>
                  }
                </div>
              </div>
            </div>

            <div class="field">
              <label class="field-label">E-mail *</label>
              <div class="email-wrap">
                <input class="field-input"
                       [class.field-input--ok]="emailStatus === 'available'"
                       [class.field-input--error]="emailStatus === 'taken'"
                       type="email" name="email" required
                       [(ngModel)]="form.email" (ngModelChange)="onEmailChange($event)"
                       placeholder="super@exemplo.com" />
                @if (emailStatus === 'checking')  { <span class="email-status badge badge-neutral">Verificando...</span> }
                @if (emailStatus === 'available') { <span class="email-status badge badge-success">Disponível</span> }
                @if (emailStatus === 'taken')     { <span class="email-status badge badge-danger">Já cadastrado</span> }
              </div>
            </div>

            <div class="field">
              <label class="field-label">Confirmar E-mail *</label>
              <input class="field-input" type="email" name="confirmar_email" required
                     [(ngModel)]="form.confirmarEmail" placeholder="Confirme o e-mail" />
            </div>

            @if (!editandoId) {
              <div class="field">
                <label class="field-label">Senha *</label>
                <div class="password-wrap">
                  <input class="field-input" [type]="mostrarSenha ? 'text' : 'password'"
                         name="senha" required minlength="6"
                         [(ngModel)]="form.senha" placeholder="Mínimo 6 caracteres" />
                  <button type="button" class="btn btn-ghost btn-sm" (click)="mostrarSenha = !mostrarSenha">
                    {{ mostrarSenha ? 'Ocultar' : 'Mostrar' }}
                  </button>
                </div>
              </div>

              <div class="field">
                <label class="field-label">Confirmar Senha *</label>
                <input class="field-input" [type]="mostrarSenha ? 'text' : 'password'"
                       name="confirmar_senha" required minlength="6"
                       [(ngModel)]="form.confirmarSenha" placeholder="Confirme a senha" />
              </div>
            }

            <div class="field span2">
              <label class="field-label">Celular</label>
              <input class="field-input" type="text" name="telefone" maxlength="19"
                     [(ngModel)]="form.telefone" (input)="formatarCelular()"
                     placeholder="+55 (21) 91234-5678" />
            </div>
          </div>

          <div class="form-footer">
            <button type="submit" class="btn btn-primary" [disabled]="salvando">
              {{ salvando ? 'Salvando...' : (editandoId ? 'Atualizar' : 'Criar Super Admin') }}
            </button>
            <button type="button" class="btn btn-ghost" (click)="limparFormulario()">
              {{ editandoId ? 'Cancelar' : 'Limpar' }}
            </button>
          </div>

          @if (formErro)    { <div class="msg msg-error"   style="margin-top:var(--space-3)">{{ formErro }}</div> }
          @if (formSucesso) { <div class="msg msg-success" style="margin-top:var(--space-3)">{{ formSucesso }}</div> }
        </form>
      </div>

      <!-- ══ Convites ═════════════════════════════════════════════════════ -->
      <div class="card card-elevated">
        <div class="card-section-title">Convidar Super Admin por E-mail</div>
        <p class="section-hint">
          O convidado define a própria senha pelo link e nasce sem vínculo com
          instituição — como todo super admin.
        </p>

        <form (ngSubmit)="enviarConvite()">
          <div class="form-grid-2">
            <div class="field span2">
              <label class="field-label">E-mail do convidado *</label>
              <input class="field-input" type="email" name="convite_email" required
                     [(ngModel)]="conviteEmail" placeholder="novo@exemplo.com" />
            </div>
          </div>
          <div class="form-footer">
            <button type="submit" class="btn btn-primary" [disabled]="enviandoConvite">
              {{ enviandoConvite ? 'Enviando...' : 'Enviar Convite' }}
            </button>
          </div>
          @if (conviteErro)    { <div class="msg msg-error"   style="margin-top:var(--space-3)">{{ conviteErro }}</div> }
          @if (conviteSucesso) { <div class="msg msg-success" style="margin-top:var(--space-3)">{{ conviteSucesso }}</div> }
        </form>

        @if (convites.length > 0) {
          <div class="table-wrap" style="margin-top:var(--space-5)">
            <table class="table">
              <thead><tr><th>E-mail</th><th>Status</th><th>Expira em</th><th>Enviado por</th><th>Ação</th></tr></thead>
              <tbody>
                @for (c of convites; track c.id) {
                  <tr>
                    <td>{{ c.email }}</td>
                    <td>
                      @if (c.usado)                 { <span class="badge badge-success">Aceito</span> }
                      @else if (conviteExpirado(c)) { <span class="badge badge-danger">Expirado</span> }
                      @else                         { <span class="badge badge-warning">Pendente</span> }
                    </td>
                    <td>{{ formatarData(c.data_expiracao) }}</td>
                    <td>{{ c.convidado_por_nome || '—' }}</td>
                    <td>
                      @if (!c.usado && !conviteExpirado(c)) {
                        <button type="button" class="btn btn-danger btn-sm" (click)="revogarConvite(c)">Revogar</button>
                      } @else {
                        <span style="color:var(--color-text-muted)">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- ══ Lista ════════════════════════════════════════════════════════ -->
      <div class="card card-elevated">
        <div class="card-section-title">Super Admins da Plataforma</div>

        <div class="filter-bar">
          <input class="field-input filter-search" type="text" name="busca"
                 [(ngModel)]="filtroBusca" (ngModelChange)="onBuscaChange()"
                 placeholder="Buscar por nome ou e-mail..." />
          <select class="field-input filter-select" name="filtro_ativo"
                  [(ngModel)]="filtroAtivo" (ngModelChange)="onFiltroChange()">
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
          @if (!carregando) { <span class="filter-total">{{ total }} conta(s)</span> }
        </div>

        @if (carregando) {
          <div class="loading-state"><div class="spinner"></div><p>Carregando...</p></div>
        }
        @if (!carregando && erroLista) { <div class="msg msg-error">{{ erroLista }}</div> }

        @if (!carregando && !erroLista && itens.length > 0) {
          <div class="table-wrap">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th style="width:48px"></th>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Status</th>
                  <th>Vínculo</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (sa of itens; track sa.id) {
                  <tr>
                    <td>
                      @if (sa.foto_perfil) {
                        <img [src]="sa.foto_perfil" alt="Foto" class="list-avatar-img" />
                      } @else {
                        <div class="list-avatar-initials">{{ iniciais(sa.nome) }}</div>
                      }
                    </td>
                    <td class="nome-cell">
                      {{ sa.nome }}
                      @if (sa.id === usuarioLogadoId) { <span class="badge badge-neutral">você</span> }
                    </td>
                    <td>{{ sa.email }}</td>
                    <td>
                      @if (sa.ativo) { <span class="badge badge-success">Ativo</span> }
                      @else          { <span class="badge badge-danger">Inativo</span> }
                    </td>
                    <td>
                      @if (sa.faculdade_nome) {
                        <span class="badge badge-warning" title="Conta legada — super admin não deveria ter vínculo">
                          {{ sa.faculdade_nome }}
                        </span>
                      } @else {
                        <span style="color:var(--color-text-muted)">Global</span>
                      }
                    </td>
                    <td>{{ sa.data_criacao ? formatarData(sa.data_criacao) : '—' }}</td>
                    <td class="actions-cell">
                      <button type="button" class="btn btn-outline btn-sm" (click)="editar(sa)">Editar</button>
                      @if (sa.id !== usuarioLogadoId) {
                        <button type="button" class="btn btn-outline btn-sm" (click)="alternarAtivo(sa)">
                          {{ sa.ativo ? 'Desativar' : 'Ativar' }}
                        </button>
                        <button type="button" class="btn btn-danger btn-sm" (click)="excluir(sa)">Excluir</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (!carregando && !erroLista && itens.length === 0) {
          <div class="empty-state">
            <p class="empty-title">Nenhum super admin encontrado</p>
          </div>
        }

        @if (!carregando && totalPaginas > 1) {
          <div class="pagination">
            <button class="btn btn-ghost btn-sm" (click)="irParaPagina(paginaAtual - 1)" [disabled]="paginaAtual === 1">‹</button>
            <span style="color:var(--color-text-muted);font-size:var(--font-size-sm)">
              Página {{ paginaAtual }} de {{ totalPaginas }}
            </span>
            <button class="btn btn-ghost btn-sm" (click)="irParaPagina(paginaAtual + 1)" [disabled]="paginaAtual === totalPaginas">›</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .form-card { margin-bottom: var(--space-6); }
    .card-section-title { font-size: var(--font-size-lg); font-weight: 600; color: var(--color-text); margin-bottom: var(--space-4); }
    .section-hint { font-size: var(--font-size-sm); color: var(--color-text-muted); margin: 0 0 var(--space-4); }
    .escopo-aviso { margin-bottom: var(--space-5); }
    .msg-info { padding: var(--space-3) var(--space-4); border-radius: var(--radius);
                background: color-mix(in srgb, var(--primary) 10%, transparent);
                color: var(--color-text); font-size: var(--font-size-sm);
                border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); }
    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
    .field { display: flex; flex-direction: column; gap: var(--space-1); }
    .field.span2 { grid-column: span 2; }
    .field-label { font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text); }
    .field-input { border: 1px solid var(--color-border); border-radius: var(--radius); padding: var(--space-2) var(--space-3); font-size: var(--font-size-sm); background: var(--color-surface); color: var(--color-text); outline: none; transition: border-color var(--transition-fast); font-family: inherit; width: 100%; box-sizing: border-box; }
    .field-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent); }
    .field-input--error { border-color: var(--color-danger) !important; }
    .field-input--ok { border-color: var(--color-success) !important; }
    .form-footer { display: flex; gap: var(--space-3); margin-top: var(--space-5); align-items: center; }
    .photo-row { display: flex; align-items: center; gap: var(--space-4); }
    .photo-circle { width: 72px; height: 72px; border-radius: 50%; background: var(--color-surface-2); border: 2px solid var(--color-border); overflow: hidden; display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); flex-shrink: 0; }
    .photo-circle__img { width: 100%; height: 100%; object-fit: cover; }
    .photo-actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }
    .email-wrap { display: flex; align-items: center; gap: var(--space-2); }
    .email-wrap .field-input { flex: 1; }
    .email-status { white-space: nowrap; }
    .password-wrap { display: flex; gap: var(--space-2); align-items: center; }
    .password-wrap .field-input { flex: 1; }
    .filter-bar { display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap; margin-bottom: var(--space-4); }
    .filter-search { flex: 1; min-width: 200px; }
    .filter-select { width: 160px; }
    .filter-total { font-size: var(--font-size-sm); color: var(--color-text-muted); white-space: nowrap; }
    .list-avatar-img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
    .list-avatar-initials { width: 36px; height: 36px; border-radius: 50%; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-xs); font-weight: 700; }
    .nome-cell { font-weight: 500; display: flex; align-items: center; gap: var(--space-2); }
    .actions-cell { display: flex; gap: var(--space-2); align-items: center; white-space: nowrap; }
    .pagination { display: flex; align-items: center; gap: var(--space-3); margin-top: var(--space-4); }
    @media (max-width: 768px) {
      .form-grid-2 { grid-template-columns: 1fr; }
      .field.span2 { grid-column: span 1; }
      .filter-bar { flex-direction: column; align-items: stretch; }
      .filter-select { width: 100%; }
    }
  `]
})
export class SistemaSuperAdminsComponent implements OnInit, OnDestroy {
  private readonly api = `${environment.apiUrl}/sistema/super-admins`;
  private readonly convitesUrl = `${environment.apiUrl}/convites`;

  form: SuperAdminForm = formVazio();
  editandoId: number | null = null;
  salvando = false;
  mostrarSenha = false;
  formErro = '';
  formSucesso = '';

  itens: SuperAdmin[] = [];
  carregando = false;
  erroLista = '';
  filtroBusca = '';
  filtroAtivo: '' | 'true' | 'false' = '';
  paginaAtual = 1;
  tamanhoPagina = 10;
  total = 0;
  totalPaginas = 1;

  convites: ConviteItem[] = [];
  conviteEmail = '';
  enviandoConvite = false;
  conviteErro = '';
  conviteSucesso = '';

  emailStatus: 'idle' | 'checking' | 'available' | 'taken' = 'idle';
  usuarioLogadoId: number | null = null;

  private readonly emailCheck$ = new Subject<string>();
  private readonly busca$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  constructor(private http: HttpClient, private auth: AuthService) {
    // A própria conta não recebe os botões de desativar/excluir — o backend
    // recusa os dois, e mostrá-los só produziria um erro previsível.
    this.usuarioLogadoId = this.auth.getCurrentUser()?.id ?? null;
  }

  ngOnInit(): void {
    this.carregar();
    this.carregarConvites();

    this.emailCheck$.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(email => {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          this.emailStatus = 'idle';
          return EMPTY;
        }
        this.emailStatus = 'checking';
        let params = new HttpParams().set('email', email);
        if (this.editandoId) params = params.set('exclude_id', String(this.editandoId));
        return this.http.get<{ available: boolean }>(`${environment.apiUrl}/auth/check-email`, { params });
      }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: resp => { this.emailStatus = resp.available ? 'available' : 'taken'; },
      error: () => { this.emailStatus = 'idle'; },
    });

    this.busca$.pipe(debounceTime(400), takeUntil(this.destroy$)).subscribe(() => {
      this.paginaAtual = 1;
      this.carregar();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Lista ─────────────────────────────────────────────────────────────────

  carregar(): void {
    this.carregando = true;
    this.erroLista = '';

    let params = new HttpParams()
      .set('page', String(this.paginaAtual))
      .set('page_size', String(this.tamanhoPagina));
    if (this.filtroBusca.trim()) params = params.set('busca', this.filtroBusca.trim());
    if (this.filtroAtivo !== '')  params = params.set('ativo', this.filtroAtivo);

    this.http.get<SuperAdminPage>(this.api, { params }).subscribe({
      next: page => {
        this.itens = page.items;
        this.total = page.total;
        this.totalPaginas = page.total_pages;
        this.paginaAtual = page.page;
        this.carregando = false;
      },
      error: err => {
        this.carregando = false;
        this.erroLista = err?.error?.detail ?? 'Erro ao carregar super admins.';
      },
    });
  }

  onBuscaChange(): void  { this.busca$.next(); }
  onFiltroChange(): void { this.paginaAtual = 1; this.carregar(); }

  irParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.paginaAtual = pagina;
    this.carregar();
  }

  // ── Formulário ────────────────────────────────────────────────────────────

  onEmailChange(email: string): void {
    this.emailStatus = 'idle';
    this.emailCheck$.next(email.trim());
  }

  editar(sa: SuperAdmin): void {
    this.editandoId = sa.id;
    this.emailStatus = 'idle';
    this.form = {
      nome: sa.nome,
      email: sa.email,
      confirmarEmail: sa.email,
      senha: '',
      confirmarSenha: '',
      telefone: this.formatarCelularValor(sa.telefone ?? ''),
      foto_perfil: sa.foto_perfil,
    };
    this.formErro = '';
    this.formSucesso = '';
    window.scrollTo(0, 0);
  }

  limparFormulario(): void {
    this.form = formVazio();
    this.editandoId = null;
    this.emailStatus = 'idle';
    this.formErro = '';
    this.formSucesso = '';
  }

  salvar(): void {
    this.formErro = '';
    this.formSucesso = '';

    if (!this.form.nome.trim() || !this.form.email.trim()) {
      this.formErro = 'Nome e e-mail são obrigatórios.';
      return;
    }
    if (this.form.email.trim().toLowerCase() !== this.form.confirmarEmail.trim().toLowerCase()) {
      this.formErro = 'Os e-mails não conferem.';
      return;
    }
    if (this.emailStatus === 'taken') {
      this.formErro = 'Este e-mail já está cadastrado. Escolha outro.';
      return;
    }
    if (!this.editandoId) {
      if (this.form.senha.length < 6) {
        this.formErro = 'A senha deve ter pelo menos 6 caracteres.';
        return;
      }
      if (this.form.senha !== this.form.confirmarSenha) {
        this.formErro = 'As senhas não conferem.';
        return;
      }
    }

    this.salvando = true;

    if (this.editandoId) {
      const payload = {
        nome: this.form.nome.trim(),
        email: this.form.email.trim(),
        foto_perfil: this.form.foto_perfil,
        telefone: this.form.telefone || null,
      };
      this.http.put<SuperAdmin>(`${this.api}/${this.editandoId}`, payload).subscribe({
        next: () => {
          this.salvando = false;
          this.limparFormulario();
          this.formSucesso = 'Super admin atualizado com sucesso.';
          this.carregar();
        },
        error: err => {
          this.salvando = false;
          this.formErro = err?.error?.detail ?? 'Erro ao atualizar super admin.';
        },
      });
      return;
    }

    const payload = {
      nome: this.form.nome.trim(),
      email: this.form.email.trim(),
      senha: this.form.senha,
      foto_perfil: this.form.foto_perfil,
      telefone: this.form.telefone || null,
    };
    this.http.post<SuperAdmin>(this.api, payload).subscribe({
      next: () => {
        this.salvando = false;
        this.limparFormulario();
        this.formSucesso = 'Super admin criado com sucesso.';
        this.carregar();
      },
      error: err => {
        this.salvando = false;
        this.formErro = err?.error?.detail ?? 'Erro ao criar super admin.';
      },
    });
  }

  alternarAtivo(sa: SuperAdmin): void {
    const acao = sa.ativo ? 'desativar' : 'ativar';
    if (!confirm(`Deseja ${acao} o acesso de "${sa.nome}"?`)) return;

    this.http.put<SuperAdmin>(`${this.api}/${sa.id}`, { ativo: !sa.ativo }).subscribe({
      next: atualizado => { sa.ativo = atualizado.ativo; },
      error: err => { this.erroLista = err?.error?.detail ?? `Erro ao ${acao} super admin.`; },
    });
  }

  excluir(sa: SuperAdmin): void {
    if (!confirm(`Excluir o super admin "${sa.nome}" permanentemente? Esta ação não pode ser desfeita.`)) return;

    this.http.delete(`${this.api}/${sa.id}`).subscribe({
      next: () => {
        this.itens = this.itens.filter(i => i.id !== sa.id);
        this.total = Math.max(0, this.total - 1);
        if (this.editandoId === sa.id) this.limparFormulario();
      },
      error: err => { this.erroLista = err?.error?.detail ?? 'Erro ao excluir super admin.'; },
    });
  }

  // ── Foto ──────────────────────────────────────────────────────────────────

  onFotoSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      this.formErro = 'Apenas JPG e PNG são aceitos.';
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.formErro = 'A imagem deve ter no máximo 5MB.';
      input.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    this.form.foto_perfil = previewUrl;
    this.formErro = '';

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<{ path: string }>(`${environment.apiUrl}/auth/upload-profile-picture`, formData).subscribe({
      next: resp => {
        URL.revokeObjectURL(previewUrl);
        this.form.foto_perfil = `${environment.baseUrl}/${resp.path}`;
      },
      error: () => {
        URL.revokeObjectURL(previewUrl);
        this.form.foto_perfil = null;
        this.formErro = 'Erro ao fazer upload da imagem.';
      },
    });
  }

  gerarAvatar(): void {
    if (!this.form.nome.trim()) return;
    this.http.post<{ avatar: string }>(
      `${environment.apiUrl}/auth/generate-avatar`, null,
      { params: { nome: this.form.nome } },
    ).subscribe({
      next: resp => { this.form.foto_perfil = resp.avatar; },
      error: () => { this.formErro = 'Erro ao gerar avatar.'; },
    });
  }

  // ── Convites ──────────────────────────────────────────────────────────────

  private carregarConvites(): void {
    // `escopo=sistema`: só os convites de super admin, sem filtro de tenant.
    this.http.get<ConviteItem[]>(this.convitesUrl, { params: { escopo: 'sistema' } }).subscribe({
      next: lista => { this.convites = lista; },
      error: () => { this.convites = []; },
    });
  }

  enviarConvite(): void {
    this.conviteErro = '';
    this.conviteSucesso = '';
    if (!this.conviteEmail.trim()) {
      this.conviteErro = 'Informe o e-mail do convidado.';
      return;
    }

    this.enviandoConvite = true;
    this.http.post<ConviteItem>(this.convitesUrl, {
      email: this.conviteEmail.trim(),
      admin_role: 'super_admin',
    }).subscribe({
      next: novo => {
        this.enviandoConvite = false;
        this.conviteSucesso = `Convite enviado para ${novo.email}!`;
        this.conviteEmail = '';
        this.convites = [novo, ...this.convites];
      },
      error: err => {
        this.enviandoConvite = false;
        this.conviteErro = err?.error?.detail ?? 'Erro ao enviar convite.';
      },
    });
  }

  revogarConvite(c: ConviteItem): void {
    if (!confirm(`Revogar convite para ${c.email}?`)) return;
    this.http.delete(`${this.convitesUrl}/${c.id}`).subscribe({
      next: () => { this.convites = this.convites.filter(x => x.id !== c.id); },
      error: err => { this.conviteErro = err?.error?.detail ?? 'Erro ao revogar convite.'; },
    });
  }

  conviteExpirado(c: ConviteItem): boolean {
    return new Date(c.data_expiracao) < new Date();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatarData(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  iniciais(nome: string): string {
    const partes = nome.trim().split(' ').filter(Boolean);
    if (partes.length === 0) return '?';
    if (partes.length === 1) return partes[0][0].toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }

  formatarCelular(): void {
    this.form.telefone = this.formatarCelularValor(this.form.telefone || '');
  }

  private formatarCelularValor(valor: string): string {
    const apenasNumeros = valor.replace(/\D/g, '');
    const semCodigoPais = apenasNumeros.startsWith('55') ? apenasNumeros.slice(2) : apenasNumeros;
    const limitado = semCodigoPais.slice(0, 11);
    const ddd = limitado.slice(0, 2);
    const parte1 = limitado.slice(2, 7);
    const parte2 = limitado.slice(7, 11);
    if (!ddd) return valor ? '+55' : '';
    if (!parte1) return `+55 (${ddd}`;
    if (!parte2) return `+55 (${ddd}) ${parte1}`;
    return `+55 (${ddd}) ${parte1}-${parte2}`;
  }
}
