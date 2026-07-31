import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, EMPTY } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, merge } from 'rxjs/operators';
import { ADMIN_ROLE_OPTIONS, AdminRole, ADMIN_ROLE_LABELS, type Permission } from '../../../core/permissions';
import { PermissionsService } from '../../../core/services/permissions.service';
import { environment } from '../../../../environments/environment';

interface AdminForm {
  nome: string;
  email: string;
  confirmarEmail: string;
  senha: string;
  confirmarSenha: string;
  admin_role: AdminRole;
  foto_perfil: string | null;  // URL relativa ou data URI
  curso_ids: number[];
  // Dados pessoais
  telefone: string;
  sexo: string;
  data_nascimento: string;
  cpf_rg: string;
  cep: string;
  endereco: string;
}

interface AdminResumo {
  id: number;
  nome: string;
  email: string;
  admin_role: AdminRole | null;
  foto_perfil: string | null;
  ativo: boolean;
  curso_ids: number[];
  // Dados pessoais
  telefone: string | null;
  sexo: string | null;
  data_nascimento: string | null;
  cpf_rg: string | null;
  cep: string | null;
  endereco: string | null;
}

interface AdminListResponse {
  items: AdminResumo[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface CursoOption {
  id: number;
  nome: string;
}

function adminFormVazio(): AdminForm {
  return {
    nome: '',
    email: '',
    confirmarEmail: '',
    senha: '',
    confirmarSenha: '',
    admin_role: 'super_admin',
    foto_perfil: null,
    curso_ids: [],
    telefone: '',
    sexo: '',
    data_nascimento: '',
    cpf_rg: '',
    cep: '',
    endereco: '',
  };
}

interface ConviteItem {
  id: number;
  email: string;
  admin_role: AdminRole;
  usado: boolean;
  data_criacao: string;
  data_expiracao: string;
  data_uso: string | null;
  convidado_por_nome: string | null;
}

@Component({
  selector: 'app-admin-administradores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-page">

      <!-- â•â• Cabeçalho â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Administradores</h1>
          <p class="page-subtitle">Gerencie os administradores do sistema</p>
        </div>
      </div>

      <!-- â•â• Painel 1: Formulário de criação / edição â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
      <div class="card card-elevated admin-form-card">
        <div class="card-section-title">
          @if (!editandoAdminId) { Novo Administrador }
          @else { Editar Administrador }
        </div>
        <form (ngSubmit)="salvarAdmin()" #fa="ngForm">
          <div class="form-grid-2">

            <!-- Nome -->
            <div class="field span2">
              <label class="field-label">Nome *</label>
              <input class="field-input" [class.field-input--error]="tocados.has('nome') && !adminForm.nome.trim()"
                type="text" [(ngModel)]="adminForm.nome" name="admin_nome" required
                placeholder="Nome do administrador" (blur)="marcarTocado('nome')" />
              @if (tocados.has('nome') && !adminForm.nome.trim()) {
                <span class="field-error">Campo obrigatório</span>
              }
            </div>

            <!-- Foto de perfil -->
            <div class="field span2">
              <label class="field-label">Foto de Perfil</label>
              <div class="photo-row">
                <div class="photo-circle">
                  @if (adminForm.foto_perfil) {
                    <img [src]="adminForm.foto_perfil" alt="Preview" class="photo-circle__img" />
                  } @else {
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                    </svg>
                  }
                </div>
                <div class="photo-actions">
                  <input #fileInput type="file" accept="image/jpeg,image/png" (change)="onFotoSelecionada($event)" style="display:none" />
                  <button type="button" class="btn btn-outline btn-sm" (click)="fileInput.click()">Upload</button>
                  <button type="button" class="btn btn-outline btn-sm" [disabled]="!adminForm.nome.trim()" (click)="gerarAvatar()">Gerar Avatar</button>
                  @if (adminForm.foto_perfil) {
                    <button type="button" class="btn btn-ghost btn-sm" (click)="limparFoto()">Remover</button>
                  }
                </div>
              </div>
            </div>

            <!-- Tipo de admin -->
            <div class="field span2">
              <label class="field-label">Tipo de Administrador *</label>
              <select class="field-input" [(ngModel)]="adminForm.admin_role" name="admin_role" required>
                @for (opt of roleOptions; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
              @if (adminForm.admin_role) {
                <span class="field-hint">{{ getRoleDescription(adminForm.admin_role) }}</span>
              }
            </div>

            <!-- Email -->
            <div class="field">
              <label class="field-label">E-mail *</label>
              <div class="email-wrap">
                <input class="field-input"
                  [class.field-input--ok]="emailStatus === 'available'"
                  [class.field-input--error]="emailStatus === 'taken'"
                  type="email" [(ngModel)]="adminForm.email" (ngModelChange)="onEmailChange($event)"
                  name="admin_email" required placeholder="admin@exemplo.com" />
                @if (emailStatus === 'checking') { <span class="email-status badge badge-neutral">Verificando...</span> }
                @if (emailStatus === 'available') { <span class="email-status badge badge-success">Disponível</span> }
                @if (emailStatus === 'taken') { <span class="email-status badge badge-danger">Já cadastrado</span> }
              </div>
            </div>

            <!-- Confirmar email -->
            <div class="field">
              <label class="field-label">Confirmar E-mail *</label>
              <input class="field-input"
                [class.field-input--error]="tocados.has('confirmarEmail') && adminForm.confirmarEmail.toLowerCase() !== adminForm.email.toLowerCase()"
                type="email" [(ngModel)]="adminForm.confirmarEmail" name="admin_confirmar_email" required
                placeholder="Confirme o e-mail" (blur)="marcarTocado('confirmarEmail')" />
              @if (tocados.has('confirmarEmail') && !adminForm.confirmarEmail.trim()) {
                <span class="field-error">Campo obrigatório</span>
              }
              @if (tocados.has('confirmarEmail') && adminForm.confirmarEmail.trim() && adminForm.confirmarEmail.toLowerCase() !== adminForm.email.toLowerCase()) {
                <span class="field-error">Os e-mails não conferem</span>
              }
            </div>

            <!-- Senha -->
            <div class="field">
              <label class="field-label">Senha *</label>
              <div class="password-wrap">
                <input class="field-input"
                  [class.field-input--error]="tocados.has('senha') && !editandoAdminId && !adminForm.senha"
                  [type]="mostrarSenha ? 'text' : 'password'"
                  [(ngModel)]="adminForm.senha" name="admin_senha" required minlength="6"
                  placeholder="Mínimo 6 caracteres" (blur)="marcarTocado('senha')" />
                <button type="button" class="password-toggle btn btn-ghost btn-sm" (click)="mostrarSenha = !mostrarSenha">
                  {{ mostrarSenha ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
              @if (adminForm.senha) {
                <div class="password-strength">
                  <div class="strength-bars">
                    @for (i of [1,2,3,4]; track i) {
                      <div class="strength-bar" [class.strength-bar--filled]="forcaSenha.score >= i" [style.background]="forcaSenha.score >= i ? forcaSenha.cor : ''"></div>
                    }
                  </div>
                  <span class="strength-label" [style.color]="forcaSenha.cor">{{ forcaSenha.texto }}</span>
                </div>
              }
              @if (tocados.has('senha') && !editandoAdminId && !adminForm.senha) {
                <span class="field-error">Senha obrigatória</span>
              }
              @if (tocados.has('senha') && adminForm.senha && adminForm.senha.length < 6) {
                <span class="field-error">Mínimo 6 caracteres</span>
              }
            </div>

            <!-- Confirmar senha -->
            <div class="field">
              <label class="field-label">Confirmar Senha *</label>
              <div class="password-wrap">
                <input class="field-input"
                  [class.field-input--error]="tocados.has('confirmarSenha') && !editandoAdminId && adminForm.confirmarSenha !== adminForm.senha"
                  [type]="mostrarConfirmarSenha ? 'text' : 'password'"
                  [(ngModel)]="adminForm.confirmarSenha" name="admin_confirmar_senha" required minlength="6"
                  placeholder="Confirme a senha" (blur)="marcarTocado('confirmarSenha')" />
                <button type="button" class="password-toggle btn btn-ghost btn-sm" (click)="mostrarConfirmarSenha = !mostrarConfirmarSenha">
                  {{ mostrarConfirmarSenha ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
              @if (tocados.has('confirmarSenha') && !editandoAdminId && !adminForm.confirmarSenha) {
                <span class="field-error">Campo obrigatório</span>
              }
              @if (tocados.has('confirmarSenha') && !editandoAdminId && adminForm.confirmarSenha && adminForm.confirmarSenha !== adminForm.senha) {
                <span class="field-error">As senhas não conferem</span>
              }
            </div>

            <!-- Dados pessoais -->
            <div class="field">
              <label class="field-label">Celular</label>
              <input class="field-input" type="text" [(ngModel)]="adminForm.telefone" name="admin_telefone"
                placeholder="+55 (21) 91234-5678" maxlength="19" (input)="formatarAdminCelular()" />
            </div>
            <div class="field">
              <label class="field-label">Gênero</label>
              <select class="field-input" [(ngModel)]="adminForm.sexo" name="admin_sexo">
                <option value="">Selecione...</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
                <option value="nao_informado">Prefiro não informar</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label">CPF/RG</label>
              <input class="field-input" type="text" [(ngModel)]="adminForm.cpf_rg" name="admin_cpf_rg"
                placeholder="000.000.000-00" maxlength="14" (input)="formatarAdminCpf()" />
            </div>
            <div class="field">
              <label class="field-label">Data de Nascimento</label>
              <input class="field-input" type="date" [(ngModel)]="adminForm.data_nascimento" name="admin_data_nascimento" />
            </div>
            <div class="field">
              <label class="field-label">CEP</label>
              <input class="field-input" type="text" [(ngModel)]="adminForm.cep" name="admin_cep"
                placeholder="00000-000" maxlength="9" (input)="formatarAdminCep()" />
            </div>
            <div class="field span2">
              <label class="field-label">Endereço</label>
              <input class="field-input" type="text" [(ngModel)]="adminForm.endereco" name="admin_endereco"
                placeholder="Rua, número, bairro, cidade" />
            </div>
          </div>

          <div class="form-footer">
            <button type="submit" class="btn btn-primary" [disabled]="salvandoAdmin">
              @if (salvandoAdmin) { <span class="spinner-sm"></span> }
              {{ salvandoAdmin ? 'Salvando...' : (editandoAdminId ? 'Atualizar' : 'Criar Administrador') }}
            </button>
            <button type="button" class="btn btn-ghost" (click)="limparFormulario()">
              {{ editandoAdminId ? 'Cancelar' : 'Limpar' }}
            </button>
          </div>

          @if (adminFormErro) { <div class="msg msg-error" style="margin-top:var(--space-3)">{{ adminFormErro }}</div> }
          @if (adminFormSucesso) { <div class="msg msg-success" style="margin-top:var(--space-3)">{{ adminFormSucesso }}</div> }
        </form>
      </div>

      <!-- â•â• Painel 2: Convites â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
      @if (p.can('administradores:write')) {
        <div class="card card-elevated">
          <div class="card-section-title">Convidar por E-mail</div>
          <form (ngSubmit)="enviarConvite()" class="convite-form">
            <div class="form-grid-2">
              <div class="field">
                <label class="field-label">E-mail do convidado *</label>
                <input class="field-input" type="email" [(ngModel)]="conviteEmail" name="convite_email" required placeholder="novo@exemplo.com" />
              </div>
              <div class="field">
                <label class="field-label">Perfil *</label>
                <select class="field-input" [(ngModel)]="conviteRole" name="convite_role">
                  @for (opt of roleOptions; track opt.value) {
                    <option [value]="opt.value">{{ opt.label }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="form-footer">
              <button type="submit" class="btn btn-primary" [disabled]="enviandoConvite">
                @if (enviandoConvite) { <span class="spinner-sm"></span> }
                {{ enviandoConvite ? 'Enviando...' : 'Enviar Convite' }}
              </button>
            </div>
            @if (conviteErro) { <div class="msg msg-error" style="margin-top:var(--space-3)">{{ conviteErro }}</div> }
            @if (conviteSucesso) { <div class="msg msg-success" style="margin-top:var(--space-3)">{{ conviteSucesso }}</div> }
          </form>

          @if (convites.length > 0 || carregandoConvites) {
            <div class="convites-section">
              <p class="section-sub">Convites Enviados</p>
              @if (carregandoConvites) {
                <div class="loading-state"><div class="spinner"></div><p>Carregando convites...</p></div>
              } @else {
                <div class="table-wrap">
                  <table class="table">
                    <thead><tr><th>E-mail</th><th>Perfil</th><th>Status</th><th>Expira em</th><th>Ação</th></tr></thead>
                    <tbody>
                      @for (c of convites; track c.id) {
                        <tr>
                          <td>{{ c.email }}</td>
                          <td><span class="badge badge-primary">{{ getRoleLabel(c.admin_role) }}</span></td>
                          <td>
                            @if (c.usado) { <span class="badge badge-success">Aceito</span> }
                            @else if (conviteExpirado(c)) { <span class="badge badge-danger">Expirado</span> }
                            @else { <span class="badge badge-warning">Pendente</span> }
                          </td>
                          <td>{{ formatarData(c.data_expiracao) }}</td>
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
          }
        </div>
      }

      <!-- â•â• Painel 3: Lista de admins â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
      <div class="card card-elevated">
        <div class="card-section-title">Administradores Cadastrados</div>

        <!-- Filtros -->
        <div class="filter-bar">
          <input class="field-input filter-search" type="text" [(ngModel)]="filtroBusca" (ngModelChange)="onFiltroChange()"
            name="filtro_busca" placeholder="Buscar por nome ou e-mail..." />
          <select class="field-input filter-select" [(ngModel)]="filtroAdminRole" (ngModelChange)="onFiltroSelectChange()" name="filtro_role">
            <option value="">Todos os tipos</option>
            <option value="super_admin">Super Admin</option>
            <option value="instrutor">Instrutor</option>
            <option value="legacy">Legado</option>
          </select>
          <select class="field-input filter-select" [(ngModel)]="filtroAtivo" (ngModelChange)="onFiltroSelectChange()" name="filtro_ativo">
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
          @if (!carregandoLista) { <span class="filter-total">{{ total }} resultado(s)</span> }
        </div>

        @if (carregandoLista) {
          <div class="loading-state"><div class="spinner"></div><p>Carregando...</p></div>
        }
        @if (!carregandoLista && erroLista) {
          <div class="msg msg-error">{{ erroLista }}</div>
        }

        @if (!carregandoLista && !erroLista && admins.length > 0) {
          <div class="table-wrap">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th style="width:48px"></th>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Cursos</th>
                  @if (p.can('administradores:write')) { <th>Ações</th> }
                </tr>
              </thead>
              <tbody>
                @for (admin of admins; track admin.id) {
                  <tr>
                    <td>
                      @if (admin.foto_perfil) {
                        <img [src]="admin.foto_perfil" alt="Foto" class="list-avatar-img" />
                      } @else {
                        <div class="list-avatar-initials">{{ getInitials(admin.nome) }}</div>
                      }
                    </td>
                    <td class="admin-nome-cell">{{ admin.nome }}</td>
                    <td>{{ admin.email }}</td>
                    <td><span class="badge badge-primary">{{ getRoleLabel(admin.admin_role) }}</span></td>
                    <td>
                      @if (admin.ativo) { <span class="badge badge-success">Ativo</span> }
                      @else { <span class="badge badge-danger">Inativo</span> }
                    </td>
                    <td>{{ formatCursosAdmin(admin.curso_ids) }}</td>
                    @if (p.can('administradores:write')) {
                      <td class="actions-cell">
                        <button type="button" class="btn btn-outline btn-sm" (click)="editarAdmin(admin)">Editar</button>
                        <button type="button" class="btn btn-outline btn-sm"
                          [class.btn-primary]="gerenciandoCursosAdminId === admin.id"
                          (click)="toggleGerenciarCursos(admin)">Cursos</button>
                        <button type="button" class="btn btn-danger btn-sm" (click)="excluirAdmin(admin)">Excluir</button>
                      </td>
                    }
                  </tr>
                  <!-- Painel inline de cursos -->
                  @if (gerenciandoCursosAdminId === admin.id) {
                    <tr class="cursos-panel-row">
                      <td [attr.colspan]="p.can('administradores:write') ? 7 : 6" style="padding:0">
                        <div class="cursos-panel card-flat">
                          <p class="cursos-panel-title">Cursos de {{ admin.nome }}</p>
                          <p class="cursos-panel-hint">Marque os cursos que este administrador pode gerenciar.</p>
                          <div class="cursos-checkboxes">
                            <label class="curso-check-item" [class.curso-check-item--on]="todasSelecionadas()">
                              <input type="checkbox" [checked]="todasSelecionadas()" (change)="selecionarTodos()" />
                              Todos os cursos (acesso irrestrito)
                            </label>
                            <label class="curso-check-item" [class.curso-check-item--on]="cursosTemp.length === 0">
                              <input type="checkbox" [checked]="cursosTemp.length === 0" (change)="cursosTemp = []" />
                              Nenhum curso (sem acesso)
                            </label>
                            @for (curso of cursosDisponiveis; track curso.id) {
                              <label class="curso-check-item" [class.curso-check-item--on]="cursosTemp.includes(curso.id)">
                                <input type="checkbox" [checked]="cursosTemp.includes(curso.id)" (change)="toggleCursoTemp(curso.id)" />
                                {{ curso.nome }}
                              </label>
                            }
                            @if (cursosDisponiveis.length === 0) {
                              <p style="color:var(--color-text-muted);font-size:var(--font-size-sm)">Nenhum curso disponível.</p>
                            }
                          </div>
                          <div class="cursos-panel-footer">
                            <button type="button" class="btn btn-primary btn-sm" [disabled]="salvandoCursos" (click)="salvarCursosAdmin(admin.id)">
                              {{ salvandoCursos ? 'Salvando...' : 'Salvar' }}
                            </button>
                            <button type="button" class="btn btn-ghost btn-sm" (click)="fecharGerenciarCursos()">Cancelar</button>
                            @if (cursosTemp.length === 0) {
                              <span class="badge badge-warning">Sem acesso a cursos</span>
                            }
                            @if (todasSelecionadas()) {
                              <span class="badge badge-success">Acesso irrestrito</span>
                            }
                          </div>
                          @if (erroCursos) { <div class="msg msg-error" style="margin-top:var(--space-2)">{{ erroCursos }}</div> }
                          @if (sucessoCursos) { <div class="msg msg-success" style="margin-top:var(--space-2)">{{ sucessoCursos }}</div> }
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        }

        @if (!carregandoLista && !erroLista && admins.length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
            <p class="empty-title">Nenhum administrador encontrado</p>
          </div>
        }

        <!-- Paginação -->
        @if (!carregandoLista && totalPaginas > 1) {
          <div class="pagination">
            <button class="btn btn-ghost btn-sm" (click)="irParaPagina(1)" [disabled]="paginaAtual === 1">«</button>
            <button class="btn btn-ghost btn-sm" (click)="irParaPagina(paginaAtual - 1)" [disabled]="paginaAtual === 1">‹</button>
            @for (pg of paginas; track pg) {
              <button class="btn btn-sm" [class.btn-primary]="pg === paginaAtual"
                [class.btn-ghost]="pg !== paginaAtual" (click)="irParaPagina(pg)">{{ pg }}</button>
            }
            <button class="btn btn-ghost btn-sm" (click)="irParaPagina(paginaAtual + 1)" [disabled]="paginaAtual === totalPaginas">›</button>
            <button class="btn btn-ghost btn-sm" (click)="irParaPagina(totalPaginas)" [disabled]="paginaAtual === totalPaginas">»</button>
            <span style="color:var(--color-text-muted);font-size:var(--font-size-sm)">Página {{ paginaAtual }} de {{ totalPaginas }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .admin-form-card { margin-bottom: var(--space-6); }
    .card-section-title { font-size: var(--font-size-lg); font-weight: 600; color: var(--color-text); margin-bottom: var(--space-5); }
    .section-sub { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-muted); margin: var(--space-5) 0 var(--space-3); text-transform: uppercase; letter-spacing: .05em; }
    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
    .field { display: flex; flex-direction: column; gap: var(--space-1); }
    .field.span2 { grid-column: span 2; }
    .field-label { font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text); }
    .field-input { border: 1px solid var(--color-border); border-radius: var(--radius); padding: var(--space-2) var(--space-3); font-size: var(--font-size-sm); background: var(--color-surface); color: var(--color-text); outline: none; transition: border-color var(--transition-fast); font-family: inherit; width: 100%; box-sizing: border-box; }
    .field-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent); }
    .field-input--error { border-color: var(--color-danger) !important; }
    .field-input--ok { border-color: var(--color-success) !important; }
    .field-error { font-size: var(--font-size-xs); color: var(--color-danger); }
    .field-hint { font-size: var(--font-size-xs); color: var(--color-text-muted); }
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
    .password-toggle { flex-shrink: 0; }
    .password-strength { display: flex; align-items: center; gap: var(--space-2); margin-top: var(--space-1); }
    .strength-bars { display: flex; gap: 4px; }
    .strength-bar { width: 32px; height: 4px; border-radius: 2px; background: var(--color-border); transition: background .2s; }
    .strength-bar--filled { background: var(--color-success); }
    .strength-label { font-size: var(--font-size-xs); font-weight: 500; }
    .filter-bar { display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap; margin-bottom: var(--space-4); }
    .filter-search { flex: 1; min-width: 200px; }
    .filter-select { width: 160px; }
    .filter-total { font-size: var(--font-size-sm); color: var(--color-text-muted); white-space: nowrap; }
    .list-avatar-img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
    .list-avatar-initials { width: 36px; height: 36px; border-radius: 50%; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-xs); font-weight: 700; }
    .admin-nome-cell { font-weight: 500; }
    .actions-cell { display: flex; gap: var(--space-2); align-items: center; white-space: nowrap; }
    .cursos-panel-row td { padding: 0; }
    .cursos-panel { padding: var(--space-5); background: var(--color-surface-2); border-top: 1px solid var(--color-border); }
    .cursos-panel-title { font-weight: 600; font-size: var(--font-size-md); color: var(--color-text); margin: 0 0 var(--space-1); }
    .cursos-panel-hint { font-size: var(--font-size-sm); color: var(--color-text-muted); margin: 0 0 var(--space-4); }
    .cursos-checkboxes { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-4); }
    .curso-check-item { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); font-size: var(--font-size-sm); cursor: pointer; transition: border-color var(--transition-fast), background var(--transition-fast); }
    .curso-check-item--on { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, var(--color-surface)); }
    .cursos-panel-footer { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
    .convite-form { margin-top: 0; }
    .convites-section { margin-top: var(--space-5); }
    .pagination { display: flex; align-items: center; gap: var(--space-2); margin-top: var(--space-4); flex-wrap: wrap; }
    .spinner-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 768px) {
      .form-grid-2 { grid-template-columns: 1fr; }
      .field.span2 { grid-column: span 1; }
      .filter-bar { flex-direction: column; align-items: stretch; }
      .filter-select { width: 100%; }
    }
  `]
})
export class AdminAdministradoresComponent implements OnInit, OnDestroy {
  salvandoAdmin = false;
  mostrarSenha = false;
  mostrarConfirmarSenha = false;
  adminFormErro = '';
  adminFormSucesso = '';
  adminForm: AdminForm = adminFormVazio();
  admins: AdminResumo[] = [];
  carregandoLista = false;
  erroLista = '';
  editandoAdminId: number | null = null;
  cursosDisponiveis: CursoOption[] = [];
  gerenciandoCursosAdminId: number | null = null;
  cursosTemp: number[] = [];
  salvandoCursos = false;
  erroCursos = '';
  sucessoCursos = '';

  emailStatus: 'idle' | 'checking' | 'available' | 'taken' = 'idle';
  private emailCheck$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Filtros e paginação
  filtroBusca = '';
  filtroAdminRole = '';
  filtroAtivo: '' | 'true' | 'false' = '';
  paginaAtual = 1;
  tamanhoPagina = 10;
  total = 0;
  totalPaginas = 1;
  private busca$ = new Subject<void>();

  tocados = new Set<string>();

  // Convites
  conviteEmail = '';
  conviteRole: AdminRole = 'instrutor';
  enviandoConvite = false;
  conviteErro = '';
  conviteSucesso = '';
  convites: ConviteItem[] = [];
  carregandoConvites = false;

  get forcaSenha(): { score: number; texto: string; cor: string } {
    const s = this.adminForm.senha;
    if (!s) return { score: 0, texto: '', cor: '' };
    let pts = 0;
    if (s.length >= 6) pts++;
    if (s.length >= 10) pts++;
    if (/[A-Z]/.test(s) && /[a-z]/.test(s)) pts++;
    if (/[0-9]/.test(s)) pts++;
    if (/[^A-Za-z0-9]/.test(s)) pts++;
    const nivel = pts <= 1 ? 1 : pts <= 2 ? 2 : pts <= 3 ? 3 : 4;
    const textos = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
    const cores  = ['', '#e74c3c', '#e67e22', '#f1c40f', '#27ae60'];
    return { score: nivel, texto: textos[nivel], cor: cores[nivel] };
  }

  readonly roleOptions = ADMIN_ROLE_OPTIONS;

  private readonly ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
    super_admin: 'Acesso total e irrestrito ao sistema e a todos os cursos.',
    instrutor:   'Gerencia cursos, aulas, provas, notas e presença. Recebe acesso automático apenas aos cursos que criar. Acesso adicional pode ser concedido manualmente.',
  };

  private readonly adminApiUrl  = `${environment.apiUrl}/auth/admin-registro`;
  private readonly adminsListUrl = `${environment.apiUrl}/auth/admins`;

  constructor(private http: HttpClient, public permissionsService: PermissionsService) {}

  get p(): PermissionsService {
    return this.permissionsService;
  }

  ngOnInit(): void {
    this.carregarCursosDisponiveis();
    this.carregarAdmins();
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
        const url = new URL(`${environment.apiUrl}/auth/check-email`);
        url.searchParams.set('email', email);
        if (this.editandoAdminId) {
          url.searchParams.set('exclude_id', String(this.editandoAdminId));
        }
        return this.http.get<{ available: boolean }>(url.toString());
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (resp) => { this.emailStatus = resp.available ? 'available' : 'taken'; },
      error: () => { this.emailStatus = 'idle'; },
    });

    this.busca$.pipe(
      debounceTime(400),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.paginaAtual = 1;
      this.carregarAdmins();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onEmailChange(email: string): void {
    this.emailStatus = 'idle';
    this.emailCheck$.next(email.trim());
  }

  marcarTocado(campo: string): void {
    this.tocados.add(campo);
  }

  private marcarTodosTocados(): void {
    ['nome', 'email', 'confirmarEmail', 'senha', 'confirmarSenha'].forEach(c => this.tocados.add(c));
  }

  getRoleLabel(role: AdminRole | null): string {
    return role ? ADMIN_ROLE_LABELS[role] : 'Legado';
  }

  getRoleDescription(role: AdminRole): string {
    return this.ROLE_DESCRIPTIONS[role] ?? '';
  }

  todasSelecionadas(): boolean {
    return this.cursosDisponiveis.length > 0 &&
      this.cursosDisponiveis.every(c => this.cursosTemp.includes(c.id));
  }

  selecionarTodos(): void {
    this.cursosTemp = this.cursosDisponiveis.map(c => c.id);
  }

  formatCursosAdmin(cursoIds: number[]): string {
    if (!cursoIds || cursoIds.length === 0) {
      return 'Nenhum curso';
    }

    // Se todos os cursos disponíveis estão selecionados
    if (
      this.cursosDisponiveis.length > 0 &&
      this.cursosDisponiveis.every(c => cursoIds.includes(c.id))
    ) {
      return 'Todos os cursos';
    }

    const nomes = this.cursosDisponiveis
      .filter(c => cursoIds.includes(c.id))
      .map(c => c.nome);

    if (!nomes.length) {
      return `${cursoIds.length} curso(s)`;
    }

    // Trunca para caber no layout: acumula nomes até 60 caracteres
    const MAX_CHARS = 60;
    let resultado = '';
    for (const nome of nomes) {
      const candidato = resultado ? `${resultado}, ${nome}` : nome;
      if (candidato.length > MAX_CHARS) {
        return `${resultado}...`;
      }
      resultado = candidato;
    }
    return resultado;
  }

  getInitials(nome: string): string {
    const palavras = nome.trim().split(' ');
    if (palavras.length === 0) return '?';
    if (palavras.length === 1) return palavras[0][0].toUpperCase();
    return (palavras[0][0] + palavras[1][0]).toUpperCase();
  }

  onFiltroChange(): void {
    this.busca$.next();
  }

  onFiltroSelectChange(): void {
    this.paginaAtual = 1;
    this.carregarAdmins();
  }

  // ── Convites ──────────────────────────────────────────────────────────────

  private readonly convitesUrl = `${environment.apiUrl}/convites`;

  private carregarConvites(): void {
    if (!this.permissionsService.can('administradores:write')) return;
    this.carregandoConvites = true;
    this.http.get<ConviteItem[]>(this.convitesUrl, { headers: this.getHeaders() }).subscribe({
      next: (data) => { this.convites = data; this.carregandoConvites = false; },
      error: () => { this.carregandoConvites = false; },
    });
  }

  enviarConvite(): void {
    this.conviteErro = '';
    this.conviteSucesso = '';
    if (!this.conviteEmail.trim()) { this.conviteErro = 'Informe o e-mail do convidado.'; return; }

    this.enviandoConvite = true;
    this.http.post<ConviteItem>(
      this.convitesUrl,
      { email: this.conviteEmail.trim(), admin_role: this.conviteRole },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (novo) => {
        this.enviandoConvite = false;
        this.conviteSucesso = `Convite enviado para ${novo.email}!`;
        this.conviteEmail = '';
        this.convites = [novo, ...this.convites];
      },
      error: (err) => {
        this.enviandoConvite = false;
        this.conviteErro = err?.error?.detail ?? 'Erro ao enviar convite.';
      },
    });
  }

  revogarConvite(c: ConviteItem): void {
    if (!confirm(`Revogar convite para ${c.email}?`)) return;
    this.http.delete(`${this.convitesUrl}/${c.id}`, { headers: this.getHeaders() }).subscribe({
      next: () => { this.convites = this.convites.filter(x => x.id !== c.id); },
      error: (err) => { this.conviteErro = err?.error?.detail ?? 'Erro ao revogar convite.'; },
    });
  }

  conviteExpirado(c: ConviteItem): boolean {
    return new Date(c.data_expiracao) < new Date();
  }

  formatarData(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  irParaPagina(p: number): void {
    if (p < 1 || p > this.totalPaginas) return;
    this.paginaAtual = p;
    this.carregarAdmins();
  }

  get paginas(): number[] {
    const range: number[] = [];
    const start = Math.max(1, this.paginaAtual - 2);
    const end = Math.min(this.totalPaginas, this.paginaAtual + 2);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }

  onFotoSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validar tipo
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      this.adminFormErro = 'Apenas JPG e PNG são aceitos.';
      input.value = '';
      return;
    }

    // Limitar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.adminFormErro = 'A imagem deve ter no máximo 5MB.';
      input.value = '';
      return;
    }

    // Preview local imediato enquanto faz upload
    const previewUrl = URL.createObjectURL(file);
    this.adminForm.foto_perfil = previewUrl;
    this.adminFormErro = '';

    // Upload para o servidor — salva o arquivo em disco
    const formData = new FormData();
    formData.append('file', file);

    this.http.post<any>(
      `${environment.apiUrl}/auth/upload-profile-picture`,
      formData,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (resp) => {
        URL.revokeObjectURL(previewUrl);
        // Armazena apenas a URL do arquivo em disco (não base64)
        this.adminForm.foto_perfil = `${environment.baseUrl}/${resp.path}`;
        this.adminFormErro = '';
      },
      error: () => {
        URL.revokeObjectURL(previewUrl);
        this.adminForm.foto_perfil = null;
        this.adminFormErro = 'Erro ao fazer upload da imagem.';
      }
    });
  }

  gerarAvatar(): void {
    if (!this.adminForm.nome.trim()) {
      this.adminFormErro = 'Preencha o nome para gerar o avatar.';
      return;
    }

    this.http.post<any>(
      `${environment.apiUrl}/auth/generate-avatar`,
      null,
      {
        params: { nome: this.adminForm.nome },
        headers: this.getHeaders()
      }
    ).subscribe({
      next: (resp) => {
        this.adminForm.foto_perfil = resp.avatar;
        this.adminFormErro = '';
      },
      error: (err) => {
        this.adminFormErro = 'Erro ao gerar avatar.';
      }
    });
  }

  limparFoto(): void {
    this.adminForm.foto_perfil = null;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  toggleGerenciarCursos(admin: AdminResumo): void {
    if (this.gerenciandoCursosAdminId === admin.id) {
      this.fecharGerenciarCursos();
      return;
    }
    this.gerenciandoCursosAdminId = admin.id;
    this.cursosTemp = [...(admin.curso_ids ?? [])];
    this.erroCursos = '';
    this.sucessoCursos = '';
  }

  fecharGerenciarCursos(): void {
    this.gerenciandoCursosAdminId = null;
    this.cursosTemp = [];
    this.erroCursos = '';
    this.sucessoCursos = '';
  }

  toggleCursoTemp(cursoId: number): void {
    const idx = this.cursosTemp.indexOf(cursoId);
    if (idx === -1) {
      this.cursosTemp = [...this.cursosTemp, cursoId];
    } else {
      this.cursosTemp = this.cursosTemp.filter(id => id !== cursoId);
    }
  }

  salvarCursosAdmin(adminId: number): void {
    this.salvandoCursos = true;
    this.erroCursos = '';
    this.sucessoCursos = '';

    const payload = { curso_ids: this.cursosTemp };

    this.http
      .put<any>(`${environment.apiUrl}/auth/admins/${adminId}`, payload, { headers: this.getHeaders() })
      .subscribe({
        next: () => {
          this.salvandoCursos = false;
          this.sucessoCursos = 'Cursos atualizados com sucesso.';
          // Atualiza a lista local sem recarregar tudo
          const admin = this.admins.find(a => a.id === adminId);
          if (admin) {
            admin.curso_ids = [...this.cursosTemp];
          }
          setTimeout(() => {
            this.fecharGerenciarCursos();
          }, 1200);
        },
        error: (err) => {
          this.salvandoCursos = false;
          this.erroCursos = err?.error?.detail ?? 'Erro ao salvar cursos.';
        }
      });
  }

  excluirAdmin(admin: AdminResumo): void {
    if (!confirm(`Excluir o administrador "${admin.nome}" permanentemente? Esta ação não pode ser desfeita.`)) return;

    this.http.delete(
      `${environment.apiUrl}/auth/admins/${admin.id}`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        this.admins = this.admins.filter(a => a.id !== admin.id);
        if (this.editandoAdminId === admin.id) {
          this.editandoAdminId = null;
        }
      },
      error: (err) => {
        alert(err?.error?.detail ?? 'Erro ao excluir administrador.');
      }
    });
  }

  editarAdmin(admin: AdminResumo): void {
    this.editandoAdminId = admin.id;
    this.emailStatus = 'idle';
    this.tocados.clear();
    this.fecharGerenciarCursos();
    this.adminForm = {
      nome: admin.nome,
      email: admin.email,
      confirmarEmail: admin.email,
      senha: '',
      confirmarSenha: '',
      admin_role: admin.admin_role ?? 'super_admin',
      foto_perfil: admin.foto_perfil,
      curso_ids: admin.curso_ids ?? [],
      telefone: this.formatarCelularValor(admin.telefone ?? ''),
      sexo: admin.sexo ?? '',
      data_nascimento: admin.data_nascimento ?? '',
      cpf_rg: this.formatarCpfValor(admin.cpf_rg ?? ''),
      cep: this.formatarCepValor(admin.cep ?? ''),
      endereco: admin.endereco ?? '',
    };
    this.adminFormErro = '';
    this.adminFormSucesso = '';
    window.scrollTo(0, 0);
  }

  salvarAdmin() {
    this.marcarTodosTocados();
    this.adminFormErro = '';
    this.adminFormSucesso = '';

    if (
      !this.adminForm.nome.trim() ||
      !this.adminForm.email.trim() ||
      !this.adminForm.confirmarEmail.trim()
    ) {
      this.adminFormErro = 'Nome e e-mail são obrigatórios.';
      return;
    }

    if (
      this.adminForm.email.trim().toLowerCase() !== this.adminForm.confirmarEmail.trim().toLowerCase()
    ) {
      this.adminFormErro = 'Os e-mails não conferem.';
      return;
    }

    if (this.emailStatus === 'taken') {
      this.adminFormErro = 'Este e-mail já está cadastrado. Escolha outro.';
      return;
    }

    // Validações apenas para criação (novo admin)
    if (!this.editandoAdminId) {
      if (!this.adminForm.senha.trim() || !this.adminForm.confirmarSenha.trim()) {
        this.adminFormErro = 'Senha é obrigatória para novo administrador.';
        return;
      }

      if (this.adminForm.senha !== this.adminForm.confirmarSenha) {
        this.adminFormErro = 'As senhas não conferem.';
        return;
      }

      if (this.adminForm.senha.length < 6) {
        this.adminFormErro = 'A senha deve ter pelo menos 6 caracteres.';
        return;
      }
    }

    this.salvandoAdmin = true;

    if (this.editandoAdminId) {
      // Edição: enviar apenas os campos alteráveis
      const payload = {
        nome: this.adminForm.nome,
        email: this.adminForm.email,
        admin_role: this.adminForm.admin_role,
        foto_perfil: this.adminForm.foto_perfil,
        curso_ids: this.adminForm.curso_ids,
        telefone: this.adminForm.telefone || null,
        sexo: this.adminForm.sexo || null,
        data_nascimento: this.adminForm.data_nascimento || null,
        cpf_rg: this.adminForm.cpf_rg || null,
        cep: this.adminForm.cep || null,
        endereco: this.adminForm.endereco || null,
      };

      this.http
        .put<any>(
          `${environment.apiUrl}/auth/admins/${this.editandoAdminId}`,
          payload,
          { headers: this.getHeaders() }
        )
        .subscribe({
          next: () => {
            this.salvandoAdmin = false;
            this.editandoAdminId = null;
            this.adminForm = adminFormVazio();
            this.mostrarSenha = false;
            this.mostrarConfirmarSenha = false;
            this.adminFormSucesso = 'Administrador atualizado com sucesso.';
            this.carregarAdmins();
          },
          error: (err) => {
            this.salvandoAdmin = false;
            this.adminFormErro = err?.error?.detail ?? 'Erro ao atualizar administrador.';
          }
        });
    } else {
      // Criação: enviar todos os campos incluindo senha
      const payload = {
        nome: this.adminForm.nome,
        email: this.adminForm.email,
        senha: this.adminForm.senha,
        admin_role: this.adminForm.admin_role,
        foto_perfil: this.adminForm.foto_perfil,
        curso_ids: this.adminForm.curso_ids,
        telefone: this.adminForm.telefone || null,
        sexo: this.adminForm.sexo || null,
        data_nascimento: this.adminForm.data_nascimento || null,
        cpf_rg: this.adminForm.cpf_rg || null,
        cep: this.adminForm.cep || null,
        endereco: this.adminForm.endereco || null,
      };

      this.http.post<any>(this.adminApiUrl, payload, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.salvandoAdmin = false;
          this.adminForm = adminFormVazio();
          this.mostrarSenha = false;
          this.mostrarConfirmarSenha = false;
          this.adminFormSucesso = 'Administrador criado com sucesso.';
          this.carregarAdmins();
        },
        error: (err) => {
          this.salvandoAdmin = false;
          this.adminFormErro = err?.error?.detail ?? 'Erro ao criar administrador.';
        }
      });
    }
  }

  limparFormulario() {
    this.adminForm = adminFormVazio();
    this.mostrarSenha = false;
    this.mostrarConfirmarSenha = false;
    this.adminFormErro = '';
    this.adminFormSucesso = '';
    this.editandoAdminId = null;
    this.emailStatus = 'idle';
    this.tocados.clear();
  }

  private carregarCursosDisponiveis() {
    this.http.get<CursoOption[]>(`${environment.apiUrl}/cursos`, { headers: this.getHeaders() }).subscribe({
      next: (cursos) => {
        this.cursosDisponiveis = cursos;
      },
      error: () => {
        this.cursosDisponiveis = [];
      }
    });
  }

  private carregarAdmins() {
    this.carregandoLista = true;
    this.erroLista = '';

    const url = new URL(this.adminsListUrl);
    if (this.filtroBusca.trim()) url.searchParams.set('busca', this.filtroBusca.trim());
    if (this.filtroAdminRole) url.searchParams.set('admin_role', this.filtroAdminRole);
    if (this.filtroAtivo !== '') url.searchParams.set('ativo', this.filtroAtivo);
    url.searchParams.set('page', String(this.paginaAtual));
    url.searchParams.set('page_size', String(this.tamanhoPagina));

    this.http.get<AdminListResponse>(url.toString(), { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.admins = data.items;
        this.total = data.total;
        this.totalPaginas = data.total_pages;
        this.paginaAtual = data.page;
        this.carregandoLista = false;
      },
      error: (err) => {
        this.carregandoLista = false;
        this.erroLista = err?.error?.detail ?? 'Erro ao carregar administradores.';
      }
    });
  }

  // ── Máscaras ──────────────────────────────────────────────────────────────

  formatarAdminCpf() {
    this.adminForm.cpf_rg = this.formatarCpfValor(this.adminForm.cpf_rg || '');
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

  formatarAdminCep() {
    this.adminForm.cep = this.formatarCepValor(this.adminForm.cep || '');
  }

  private formatarCepValor(valor: string): string {
    const digits = valor.replace(/\D/g, '').slice(0, 8);
    const p1 = digits.slice(0, 5);
    const p2 = digits.slice(5, 8);
    if (digits.length <= 5) return p1;
    return `${p1}-${p2}`;
  }

  formatarAdminCelular() {
    this.adminForm.telefone = this.formatarCelularValor(this.adminForm.telefone || '');
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
}
