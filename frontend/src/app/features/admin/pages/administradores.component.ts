import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, EMPTY } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, merge } from 'rxjs/operators';
import { ADMIN_ROLE_OPTIONS, AdminRole, ADMIN_ROLE_LABELS, type Permission } from '../../../core/permissions';
import { PermissionsService } from '../../../core/services/permissions.service';

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
    <div class="page-container">
      <div class="page-header">
        <h2>🔐 Gerenciar Administradores</h2>
      </div>

      <div class="form-card">
        <h3 *ngIf="!editandoAdminId">➕ Novo Administrador</h3>
        <h3 *ngIf="editandoAdminId">✏️ Editar Administrador</h3>
        <form (ngSubmit)="salvarAdmin()" #fa="ngForm">
          <div class="form-grid">
            <div class="form-row span2">
              <label>Nome *</label>
              <input
                type="text"
                [(ngModel)]="adminForm.nome"
                name="admin_nome"
                required
                placeholder="Nome do administrador"
                (blur)="marcarTocado('nome')"
                [class.campo-invalido]="tocados.has('nome') && !adminForm.nome.trim()"
              />
              <span class="campo-erro" *ngIf="tocados.has('nome') && !adminForm.nome.trim()">Campo obrigatório</span>
            </div>
            <div class="form-row span2">
              <label>Foto de Perfil</label>
              <div class="photo-upload-container">
                <div class="photo-preview">
                  <img
                    *ngIf="adminForm.foto_perfil"
                    [src]="adminForm.foto_perfil"
                    alt="Preview"
                    class="preview-image"
                  />
                  <div *ngIf="!adminForm.foto_perfil" class="preview-placeholder">
                    📷 Sem foto
                  </div>
                </div>
                <div class="upload-buttons">
                  <input
                    #fileInput
                    type="file"
                    accept="image/jpeg,image/png"
                    (change)="onFotoSelecionada($event)"
                    style="display: none"
                  />
                  <button type="button" class="btn-upload" (click)="fileInput.click()">
                    Upload
                  </button>
                  <button
                    type="button"
                    class="btn-avatar"
                    [disabled]="!adminForm.nome.trim()"
                    (click)="gerarAvatar()"
                  >
                    Gerar Avatar
                  </button>
                  <button
                    type="button"
                    class="btn-clear"
                    *ngIf="adminForm.foto_perfil"
                    (click)="limparFoto()"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            </div>
            <div class="form-row span2">
              <label>Tipo de Administrador *</label>
              <select [(ngModel)]="adminForm.admin_role" name="admin_role" required class="role-select">
                <option *ngFor="let opt of roleOptions" [value]="opt.value">{{ opt.label }}</option>
              </select>
              <span class="role-hint" *ngIf="adminForm.admin_role">{{ getRoleDescription(adminForm.admin_role) }}</span>
            </div>
            <div class="form-row">
              <label>E-mail *</label>
              <div class="email-check-wrapper">
                <input
                  type="email"
                  [(ngModel)]="adminForm.email"
                  (ngModelChange)="onEmailChange($event)"
                  name="admin_email"
                  required
                  placeholder="admin@exemplo.com"
                  [class.input-email-available]="emailStatus === 'available'"
                  [class.input-email-taken]="emailStatus === 'taken'"
                />
                <span *ngIf="emailStatus === 'checking'" class="email-status email-checking">⏳ Verificando...</span>
                <span *ngIf="emailStatus === 'available'" class="email-status email-available">✔ E-mail disponível</span>
                <span *ngIf="emailStatus === 'taken'" class="email-status email-taken">✖ E-mail já cadastrado</span>
              </div>
            </div>
            <div class="form-row">
              <label>Confirmar E-mail *</label>
              <input
                type="email"
                [(ngModel)]="adminForm.confirmarEmail"
                name="admin_confirmar_email"
                required
                placeholder="Confirme o e-mail"
                (blur)="marcarTocado('confirmarEmail')"
                [class.campo-invalido]="tocados.has('confirmarEmail') && adminForm.confirmarEmail.toLowerCase() !== adminForm.email.toLowerCase()"
              />
              <span class="campo-erro" *ngIf="tocados.has('confirmarEmail') && !adminForm.confirmarEmail.trim()">Campo obrigatório</span>
              <span class="campo-erro" *ngIf="tocados.has('confirmarEmail') && adminForm.confirmarEmail.trim() && adminForm.confirmarEmail.toLowerCase() !== adminForm.email.toLowerCase()">Os e-mails não conferem</span>
            </div>
            <div class="form-row">
              <label>Senha *</label>
              <div class="password-field">
                <input
                  [type]="mostrarSenha ? 'text' : 'password'"
                  [(ngModel)]="adminForm.senha"
                  name="admin_senha"
                  required
                  minlength="6"
                  placeholder="Mínimo 6 caracteres"
                  (blur)="marcarTocado('senha')"
                  [class.campo-invalido]="tocados.has('senha') && !editandoAdminId && !adminForm.senha"
                />
                <button type="button" class="toggle-password" (click)="mostrarSenha = !mostrarSenha">
                  {{ mostrarSenha ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
              <div class="forca-senha" *ngIf="adminForm.senha">
                <div class="forca-barras">
                  <div class="forca-barra" [style.background]="forcaSenha.score >= 1 ? forcaSenha.cor : '#e0e0e0'"></div>
                  <div class="forca-barra" [style.background]="forcaSenha.score >= 2 ? forcaSenha.cor : '#e0e0e0'"></div>
                  <div class="forca-barra" [style.background]="forcaSenha.score >= 3 ? forcaSenha.cor : '#e0e0e0'"></div>
                  <div class="forca-barra" [style.background]="forcaSenha.score >= 4 ? forcaSenha.cor : '#e0e0e0'"></div>
                </div>
                <span class="forca-texto" [style.color]="forcaSenha.cor">{{ forcaSenha.texto }}</span>
              </div>
              <span class="campo-erro" *ngIf="tocados.has('senha') && !editandoAdminId && !adminForm.senha">Senha obrigatória</span>
              <span class="campo-erro" *ngIf="tocados.has('senha') && adminForm.senha && adminForm.senha.length < 6">Mínimo 6 caracteres</span>
            </div>
            <div class="form-row">
              <label>Confirmar Senha *</label>
              <div class="password-field">
                <input
                  [type]="mostrarConfirmarSenha ? 'text' : 'password'"
                  [(ngModel)]="adminForm.confirmarSenha"
                  name="admin_confirmar_senha"
                  required
                  minlength="6"
                  placeholder="Confirme a senha"
                  (blur)="marcarTocado('confirmarSenha')"
                  [class.campo-invalido]="tocados.has('confirmarSenha') && !editandoAdminId && adminForm.confirmarSenha !== adminForm.senha"
                />
                <button type="button" class="toggle-password" (click)="mostrarConfirmarSenha = !mostrarConfirmarSenha">
                  {{ mostrarConfirmarSenha ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
              <span class="campo-erro" *ngIf="tocados.has('confirmarSenha') && !editandoAdminId && !adminForm.confirmarSenha">Campo obrigatório</span>
              <span class="campo-erro" *ngIf="tocados.has('confirmarSenha') && !editandoAdminId && adminForm.confirmarSenha && adminForm.confirmarSenha !== adminForm.senha">As senhas não conferem</span>
            </div>
            <div class="form-row">
              <label>Celular</label>
              <input
                type="text"
                [(ngModel)]="adminForm.telefone"
                name="admin_telefone"
                placeholder="+55 (21) 91234-5678"
                maxlength="19"
                (input)="formatarAdminCelular()"
              />
            </div>
            <div class="form-row">
              <label>Gênero</label>
              <select [(ngModel)]="adminForm.sexo" name="admin_sexo" class="role-select">
                <option value="">Selecione...</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
                <option value="nao_informado">Prefiro não informar</option>
              </select>
            </div>
            <div class="form-row">
              <label>CPF/RG</label>
              <input
                type="text"
                [(ngModel)]="adminForm.cpf_rg"
                name="admin_cpf_rg"
                placeholder="000.000.000-00"
                maxlength="14"
                (input)="formatarAdminCpf()"
              />
            </div>
            <div class="form-row">
              <label>Data de Nascimento</label>
              <input
                type="date"
                [(ngModel)]="adminForm.data_nascimento"
                name="admin_data_nascimento"
              />
            </div>
            <div class="form-row">
              <label>CEP</label>
              <input
                type="text"
                [(ngModel)]="adminForm.cep"
                name="admin_cep"
                placeholder="00000-000"
                maxlength="9"
                (input)="formatarAdminCep()"
              />
            </div>
            <div class="form-row span2">
              <label>Endereço</label>
              <input
                type="text"
                [(ngModel)]="adminForm.endereco"
                name="admin_endereco"
                placeholder="Rua, número, bairro, cidade"
              />
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary btn-submit" [disabled]="salvandoAdmin">
              <span *ngIf="salvandoAdmin" class="spinner"></span>
              {{ salvandoAdmin ? 'Salvando...' : (editandoAdminId ? 'Atualizar' : 'Criar Administrador') }}
            </button>
            <button type="button" class="btn-sm" (click)="limparFormulario()">{{ editandoAdminId ? 'Cancelar' : 'Limpar' }}</button>
          </div>

          <div class="form-error" *ngIf="adminFormErro">{{ adminFormErro }}</div>
          <div class="form-success" *ngIf="adminFormSucesso">{{ adminFormSucesso }}</div>
        </form>
      </div>

      <!-- ══ Painel de Convites ══════════════════════════════════════════════ -->
      <div class="form-card convite-card" *ngIf="p.can('administradores:write')">
        <h3>✉️ Convidar Administrador por E-mail</h3>
        <form (ngSubmit)="enviarConvite()" class="convite-form">
          <div class="convite-grid">
            <div class="form-row">
              <label>E-mail do convidado *</label>
              <input
                type="email"
                [(ngModel)]="conviteEmail"
                name="convite_email"
                required
                placeholder="novo@exemplo.com"
              />
            </div>
            <div class="form-row">
              <label>Perfil *</label>
              <select [(ngModel)]="conviteRole" name="convite_role" class="role-select">
                <option *ngFor="let opt of roleOptions" [value]="opt.value">{{ opt.label }}</option>
              </select>
            </div>
          </div>
          <div class="form-actions" style="margin-top: 14px;">
            <button type="submit" class="btn-primary btn-submit" [disabled]="enviandoConvite">
              <span *ngIf="enviandoConvite" class="spinner"></span>
              {{ enviandoConvite ? 'Enviando...' : '📨 Enviar Convite' }}
            </button>
          </div>
          <div class="form-error" *ngIf="conviteErro">{{ conviteErro }}</div>
          <div class="form-success" *ngIf="conviteSucesso">{{ conviteSucesso }}</div>
        </form>

        <!-- Lista de convites enviados -->
        <div class="convites-lista" *ngIf="convites.length > 0 || carregandoConvites">
          <h4 style="margin: 20px 0 10px; color: #2c3e50; font-size: .95rem;">Convites Enviados</h4>
          <div class="loading" *ngIf="carregandoConvites">Carregando convites...</div>
          <div class="convites-table" *ngIf="!carregandoConvites">
            <table>
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Expira em</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let c of convites">
                  <td>{{ c.email }}</td>
                  <td><span class="role-badge" [class]="'role-' + c.admin_role">{{ getRoleLabel(c.admin_role) }}</span></td>
                  <td>
                    <span class="status-badge"
                      [class.status-ativo]="!c.usado && !conviteExpirado(c)"
                      [class.status-inativo]="c.usado || conviteExpirado(c)">
                      {{ c.usado ? 'Aceito' : conviteExpirado(c) ? 'Expirado' : 'Pendente' }}
                    </span>
                  </td>
                  <td class="expira-cell">{{ formatarData(c.data_expiracao) }}</td>
                  <td>
                    <button
                      *ngIf="!c.usado && !conviteExpirado(c)"
                      type="button"
                      class="btn-revogar"
                      (click)="revogarConvite(c)"
                      title="Revogar convite"
                    >Revogar</button>
                    <span *ngIf="c.usado || conviteExpirado(c)" class="sem-acao">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="list-card">
        <h3>📋 Administradores Cadastrados</h3>

        <!-- Barra de filtros -->
        <div class="filtros-bar">
          <div class="filtro-busca">
            <input
              type="text"
              [(ngModel)]="filtroBusca"
              (ngModelChange)="onFiltroChange()"
              name="filtro_busca"
              placeholder="🔍 Buscar por nome ou e-mail..."
              class="input-busca"
            />
          </div>
          <div class="filtros-selects">
            <select [(ngModel)]="filtroAdminRole" (ngModelChange)="onFiltroSelectChange()" name="filtro_role" class="filtro-select">
              <option value="">Todos os tipos</option>
              <option value="super_admin">Super Admin</option>
              <option value="instrutor">Instrutor</option>
              <option value="legacy">Legado</option>
            </select>
            <select [(ngModel)]="filtroAtivo" (ngModelChange)="onFiltroSelectChange()" name="filtro_ativo" class="filtro-select">
              <option value="">Todos os status</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
            <span class="filtro-total" *ngIf="!carregandoLista">{{ total }} resultado(s)</span>
          </div>
        </div>

        <div class="loading" *ngIf="carregandoLista">Carregando administradores...</div>
        <div class="form-error" *ngIf="!carregandoLista && erroLista">{{ erroLista }}</div>

        <div class="admins-table" *ngIf="!carregandoLista && !erroLista && admins.length > 0">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Cursos</th>
                <th *ngIf="p.can('administradores:write')">Ações</th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngFor="let admin of admins">
                <tr>
                  <td class="photo-cell">
                    <img
                      *ngIf="admin.foto_perfil"
                      [src]="admin.foto_perfil"
                      alt="Foto"
                      class="list-photo"
                    />
                    <div *ngIf="!admin.foto_perfil" class="list-avatar">{{ getInitials(admin.nome) }}</div>
                  </td>
                  <td class="admin-nome">{{ admin.nome }}</td>
                  <td>{{ admin.email }}</td>
                  <td><span class="role-badge" [class]="'role-' + (admin.admin_role ?? 'legacy')">{{ getRoleLabel(admin.admin_role) }}</span></td>
                  <td>
                    <span class="status-badge" [class.status-ativo]="admin.ativo" [class.status-inativo]="!admin.ativo">
                      {{ admin.ativo ? 'Ativo' : 'Inativo' }}
                    </span>
                  </td>
                  <td>
                    <span class="cursos-resumo">{{ formatCursosAdmin(admin.curso_ids) }}</span>
                  </td>
                  <td *ngIf="p.can('administradores:write')" class="actions-cell">
                    <button type="button" class="btn-edit" (click)="editarAdmin(admin)" title="Editar dados">
                      ✏️ Editar
                    </button>
                    <button
                      type="button"
                      class="btn-cursos"
                      [class.active]="gerenciandoCursosAdminId === admin.id"
                      (click)="toggleGerenciarCursos(admin)"
                      title="Gerenciar cursos"
                    >
                      📚 Cursos
                    </button>
                  </td>
                </tr>
                <!-- Painel inline de gerenciamento de cursos -->
                <tr *ngIf="gerenciandoCursosAdminId === admin.id" class="cursos-panel-row">
                  <td [attr.colspan]="p.can('administradores:write') ? 7 : 6" class="cursos-panel-cell">
                    <div class="cursos-panel">
                      <div class="cursos-panel-header">
                        <strong>📚 Cursos gerenciados por {{ admin.nome }}</strong>
                        <span class="cursos-panel-hint">Marque os cursos que este administrador pode gerenciar. Use os atalhos abaixo para conceder ou remover todo o acesso.</span>
                      </div>
                      <div class="cursos-checkboxes">
                        <label
                          class="curso-checkbox-item curso-todos"
                          [class.checked]="todasSelecionadas()"
                          (click)="selecionarTodos()"
                        >
                          <input type="checkbox" [checked]="todasSelecionadas()" (change)="selecionarTodos()" />
                          🌐 Todos os cursos (acesso irrestrito)
                        </label>
                        <label
                          class="curso-checkbox-item curso-nenhum"
                          [class.checked]="cursosTemp.length === 0"
                          (click)="cursosTemp = []"
                        >
                          <input type="checkbox" [checked]="cursosTemp.length === 0" (change)="cursosTemp = []" />
                          🚫 Nenhum curso (sem acesso)
                        </label>
                        <label
                          *ngFor="let curso of cursosDisponiveis"
                          class="curso-checkbox-item"
                          [class.checked]="cursosTemp.includes(curso.id)"
                        >
                          <input
                            type="checkbox"
                            [checked]="cursosTemp.includes(curso.id)"
                            (change)="toggleCursoTemp(curso.id)"
                          />
                          {{ curso.nome }}
                        </label>
                        <div *ngIf="cursosDisponiveis.length === 0" class="cursos-empty">
                          Nenhum curso disponível.
                        </div>
                      </div>
                      <div class="cursos-panel-actions">
                        <button type="button" class="btn-primary btn-sm-action" [disabled]="salvandoCursos" (click)="salvarCursosAdmin(admin.id)">
                          {{ salvandoCursos ? 'Salvando...' : '💾 Salvar' }}
                        </button>
                        <button type="button" class="btn-sm" (click)="fecharGerenciarCursos()">
                          Cancelar
                        </button>
                        <span *ngIf="cursosTemp.length === 0" class="cursos-aviso cursos-aviso-restrito">🚫 Salvar assim bloqueará o acesso a todos os cursos</span>
                        <span *ngIf="todasSelecionadas()" class="cursos-aviso cursos-aviso-livre">✅ Acesso irrestrito a todos os cursos</span>
                      </div>
                      <div class="form-error" *ngIf="erroCursos">{{ erroCursos }}</div>
                      <div class="form-success" *ngIf="sucessoCursos">{{ sucessoCursos }}</div>
                    </div>
                  </td>
                </tr>
              </ng-container>
            </tbody>
          </table>
        </div>

        <!-- Paginação -->
        <div class="paginacao" *ngIf="!carregandoLista && totalPaginas > 1">
          <button class="pag-btn" (click)="irParaPagina(1)" [disabled]="paginaAtual === 1">«</button>
          <button class="pag-btn" (click)="irParaPagina(paginaAtual - 1)" [disabled]="paginaAtual === 1">‹</button>
          <button
            *ngFor="let p of paginas"
            class="pag-btn"
            [class.pag-ativa]="p === paginaAtual"
            (click)="irParaPagina(p)"
          >{{ p }}</button>
          <button class="pag-btn" (click)="irParaPagina(paginaAtual + 1)" [disabled]="paginaAtual === totalPaginas">›</button>
          <button class="pag-btn" (click)="irParaPagina(totalPaginas)" [disabled]="paginaAtual === totalPaginas">»</button>
          <span class="pag-info">Página {{ paginaAtual }} de {{ totalPaginas }}</span>
        </div>

        <div class="empty-state" *ngIf="!carregandoLista && !erroLista && admins.length === 0">
          Nenhum administrador encontrado.
        </div>
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
      gap: 12px;
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

    .form-card {
      background: white;
      border-radius: 10px;
      padding: 28px;
      margin-bottom: 25px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      border-left: 4px solid #2c3e50;
    }
    .form-card h3 { margin: 0 0 20px; color: #2c3e50; font-size: 1.1rem; }

    .list-card {
      background: white;
      border-radius: 10px;
      padding: 28px;
      margin-bottom: 25px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .list-card h3 { margin: 0 0 20px; color: #2c3e50; font-size: 1.1rem; }

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

    .form-row input {
      padding: 9px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.92rem;
      outline: none;
      transition: border-color 0.2s;
      font-family: inherit;
    }
    .form-row input:focus { border-color: #3498db; }

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

    .form-success {
      margin-top: 12px;
      padding: 10px 14px;
      background: #eafaf1;
      border: 1px solid #bde5c8;
      border-radius: 6px;
      color: #1e8449;
      font-size: 0.9rem;
    }

    .admins-table {
      overflow-x: auto;
      border: 1px solid #ecf0f1;
      border-radius: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.92rem;
    }

    thead {
      background: #f8f9fa;
    }

    th {
      text-align: left;
      padding: 12px 14px;
      border-bottom: 1px solid #ecf0f1;
      color: #2c3e50;
      font-weight: 600;
    }

    td {
      padding: 12px 14px;
      border-bottom: 1px solid #f2f2f2;
      color: #2f2f2f;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    .admin-nome {
      font-weight: 600;
    }

    .role-select {
      padding: 9px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.92rem;
      font-family: inherit;
      background: white;
      cursor: pointer;
      outline: none;
      transition: border-color 0.2s;
    }
    .role-select:focus { border-color: #3498db; }

    .multi-select {
      padding: 9px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.92rem;
      font-family: inherit;
      background: white;
      outline: none;
      transition: border-color 0.2s;
      min-height: 120px;
    }
    .multi-select:focus { border-color: #3498db; }

    .role-hint {
      font-size: 0.8rem;
      color: #7f8c8d;
      margin-top: 3px;
    }

    .role-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .role-super_admin { background: #2c3e50; color: #fff; }
    .role-instrutor   { background: #2980b9; color: #fff; }
    .role-legacy      { background: #95a5a6; color: #fff; }

    .photo-upload-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .photo-preview {
      width: 100px;
      height: 100px;
      border: 2px dashed #bdc3c7;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f9f9f9;
      overflow: hidden;
    }

    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .preview-placeholder {
      text-align: center;
      font-size: 0.85rem;
      color: #95a5a6;
      padding: 10px;
    }

    .upload-buttons {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .btn-upload, .btn-avatar, .btn-clear {
      padding: 6px 12px;
      border: 1px solid #bdc3c7;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 500;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .btn-upload:hover {
      background: #3498db;
      color: white;
      border-color: #2980b9;
    }

    .btn-avatar:hover:not(:disabled) {
      background: #27ae60;
      color: white;
      border-color: #229954;
    }

    .btn-avatar:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-clear:hover {
      background: #e74c3c;
      color: white;
      border-color: #c0392b;
    }

    .photo-cell {
      text-align: center;
      padding: 8px !important;
    }

    .list-photo {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #ecf0f1;
    }

    .list-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.75rem;
      margin: 0 auto;
    }

    .loading,
    .empty-state {
      padding: 14px;
      border-radius: 8px;
      background: #f8f9fa;
      color: #5d6d7e;
      font-size: 0.92rem;
    }

    .actions-cell {
      text-align: center;
      padding: 10px !important;
    }

    .btn-edit {
      padding: 6px 12px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .btn-edit:hover {
      background: #2980b9;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
    }

    .btn-edit:active {
      transform: translateY(0);
    }

    .btn-cursos {
      padding: 6px 12px;
      background: #8e44ad;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      transition: all 0.3s ease;
      margin-left: 6px;
    }

    .btn-cursos:hover {
      background: #7d3c98;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(142, 68, 173, 0.3);
    }

    .btn-cursos.active {
      background: #6c3483;
    }

    .cursos-panel-row td {
      padding: 0 !important;
    }

    .cursos-panel-cell {
      padding: 0 !important;
    }

    .cursos-panel {
      background: #f9f0ff;
      border: 1px solid #d2b4de;
      border-radius: 8px;
      padding: 18px 20px;
      margin: 4px 8px 8px;
    }

    .cursos-panel-header {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 14px;
    }

    .cursos-panel-header strong {
      color: #6c3483;
      font-size: 0.95rem;
    }

    .cursos-panel-hint {
      font-size: 0.8rem;
      color: #7f8c8d;
    }

    .cursos-checkboxes {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 14px;
    }

    .curso-checkbox-item {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 7px 14px;
      border: 1px solid #d7bde2;
      border-radius: 20px;
      background: white;
      cursor: pointer;
      font-size: 0.88rem;
      color: #4a235a;
      transition: all 0.2s;
      user-select: none;
    }

    .curso-checkbox-item.checked {
      background: #8e44ad;
      color: white;
      border-color: #8e44ad;
    }

    .curso-todos.checked {
      background: #27ae60;
      border-color: #27ae60;
    }

    .curso-nenhum.checked {
      background: #c0392b;
      border-color: #c0392b;
    }

    .cursos-aviso-restrito {
      color: #c0392b;
    }

    .cursos-aviso-livre {
      color: #27ae60;
    }

    .curso-checkbox-item input[type=checkbox] {
      width: 15px;
      height: 15px;
      accent-color: #8e44ad;
      cursor: pointer;
    }

    .cursos-panel-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn-sm-action {
      padding: 7px 18px;
      font-size: 0.88rem;
    }

    .cursos-aviso {
      font-size: 0.8rem;
      color: #e67e22;
    }

    .cursos-resumo {
      font-size: 0.82rem;
      color: #555;
    }

    .cursos-empty {
      color: #7f8c8d;
      font-size: 0.88rem;
    }

    @media (max-width: 700px) {
      .form-grid { grid-template-columns: 1fr; }
      .form-row.span2 { grid-column: span 1; }
    }

    /* Validação de e-mail em tempo real */
    .email-check-wrapper {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .email-check-wrapper input.input-email-available {
      border-color: #27ae60;
    }

    .email-check-wrapper input.input-email-taken {
      border-color: #e74c3c;
    }

    .email-status {
      font-size: 0.78rem;
      font-weight: 500;
    }

    .email-checking { color: #7f8c8d; }
    .email-available { color: #27ae60; }
    .email-taken { color: #e74c3c; }

    /* Validação por campo */
    .campo-invalido {
      border-color: #e74c3c !important;
    }
    .campo-invalido:focus {
      border-color: #e74c3c !important;
      box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.12);
    }
    .campo-erro {
      font-size: 0.78rem;
      color: #e74c3c;
      font-weight: 500;
    }

    /* Indicador de força da senha */
    .forca-senha {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 5px;
    }
    .forca-barras {
      display: flex;
      gap: 4px;
    }
    .forca-barra {
      width: 38px;
      height: 5px;
      border-radius: 3px;
      transition: background 0.3s;
    }
    .forca-texto {
      font-size: 0.78rem;
      font-weight: 600;
    }

    /* Spinner no botão */
    .btn-submit {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.35);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Barra de filtros */
    .filtros-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin-bottom: 16px;
    }

    .filtro-busca { flex: 1; min-width: 200px; }

    .input-busca {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.92rem;
      outline: none;
      font-family: inherit;
      box-sizing: border-box;
    }
    .input-busca:focus { border-color: #3498db; }

    .filtros-selects {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }

    .filtro-select {
      padding: 8px 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.88rem;
      background: white;
      outline: none;
      cursor: pointer;
      font-family: inherit;
    }
    .filtro-select:focus { border-color: #3498db; }

    .filtro-total {
      font-size: 0.82rem;
      color: #7f8c8d;
      white-space: nowrap;
    }

    /* Status badge */
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .status-ativo { background: #d5f5e3; color: #1e8449; }
    .status-inativo { background: #fadbd8; color: #922b21; }

    /* Paginação */
    .paginacao {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 16px;
      flex-wrap: wrap;
    }

    .pag-btn {
      min-width: 34px;
      height: 34px;
      padding: 0 10px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.88rem;
      color: #2c3e50;
      transition: background 0.15s, border-color 0.15s;
    }
    .pag-btn:hover:not(:disabled):not(.pag-ativa) { background: #ecf0f1; }
    .pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .pag-btn.pag-ativa {
      background: #3498db;
      color: white;
      border-color: #3498db;
      font-weight: 600;
      cursor: default;
    }

    .pag-info {
      font-size: 0.82rem;
      color: #7f8c8d;
      margin-left: 6px;
    }

    /* Painel de convites */
    .convite-card { border-left-color: #8e44ad; }

    .convite-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 20px;
    }

    .convites-table {
      overflow-x: auto;
      border: 1px solid #ecf0f1;
      border-radius: 8px;
    }
    .convites-table table {
      width: 100%;
      border-collapse: collapse;
      font-size: .88rem;
    }
    .convites-table th {
      text-align: left;
      padding: 10px 12px;
      background: #f8f9fa;
      border-bottom: 1px solid #ecf0f1;
      color: #2c3e50;
      font-weight: 600;
      font-size: .85rem;
    }
    .convites-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f2f2f2;
      color: #2f2f2f;
    }
    .convites-table tbody tr:last-child td { border-bottom: none; }

    .expira-cell { font-size: .82rem; color: #7f8c8d; }

    .btn-revogar {
      padding: 4px 10px;
      background: white;
      border: 1px solid #e74c3c;
      color: #e74c3c;
      border-radius: 4px;
      cursor: pointer;
      font-size: .8rem;
      font-weight: 500;
      transition: all .2s;
    }
    .btn-revogar:hover { background: #e74c3c; color: white; }

    .sem-acao { color: #bdc3c7; }

    @media (max-width: 700px) {
      .convite-grid { grid-template-columns: 1fr; }
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

  private readonly adminApiUrl  = 'http://localhost:8000/api/auth/admin-registro';
  private readonly adminsListUrl = 'http://localhost:8000/api/auth/admins';

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
        const url = new URL('http://localhost:8000/api/auth/check-email');
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

  private readonly convitesUrl = 'http://localhost:8000/api/convites';

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
      'http://localhost:8000/api/auth/upload-profile-picture',
      formData,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (resp) => {
        URL.revokeObjectURL(previewUrl);
        // Armazena apenas a URL do arquivo em disco (não base64)
        this.adminForm.foto_perfil = `http://localhost:8000/${resp.path}`;
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
      'http://localhost:8000/api/auth/generate-avatar',
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
      .put<any>(`http://localhost:8000/api/auth/admins/${adminId}`, payload, { headers: this.getHeaders() })
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
          `http://localhost:8000/api/auth/admins/${this.editandoAdminId}`,
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
    this.http.get<CursoOption[]>('http://localhost:8000/api/cursos', { headers: this.getHeaders() }).subscribe({
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