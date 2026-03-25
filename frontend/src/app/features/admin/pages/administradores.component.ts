import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
  curso_ids: number[];
  // Dados pessoais
  telefone: string | null;
  sexo: string | null;
  data_nascimento: string | null;
  cpf_rg: string | null;
  cep: string | null;
  endereco: string | null;
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
              />
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
              <input
                type="email"
                [(ngModel)]="adminForm.email"
                name="admin_email"
                required
                placeholder="admin@exemplo.com"
              />
            </div>
            <div class="form-row">
              <label>Confirmar E-mail *</label>
              <input
                type="email"
                [(ngModel)]="adminForm.confirmarEmail"
                name="admin_confirmar_email"
                required
                placeholder="Confirme o e-mail"
              />
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
                />
                <button type="button" class="toggle-password" (click)="mostrarSenha = !mostrarSenha">
                  {{ mostrarSenha ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
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
                />
                <button type="button" class="toggle-password" (click)="mostrarConfirmarSenha = !mostrarConfirmarSenha">
                  {{ mostrarConfirmarSenha ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
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
            <button type="submit" class="btn-primary" [disabled]="salvandoAdmin">
              {{ salvandoAdmin ? 'Salvando...' : (editandoAdminId ? 'Atualizar' : 'Criar Administrador') }}
            </button>
            <button type="button" class="btn-sm" (click)="limparFormulario()">{{ editandoAdminId ? 'Cancelar' : 'Limpar' }}</button>
          </div>

          <div class="form-error" *ngIf="adminFormErro">{{ adminFormErro }}</div>
          <div class="form-success" *ngIf="adminFormSucesso">{{ adminFormSucesso }}</div>
        </form>
      </div>

      <div class="list-card">
        <h3>📋 Administradores Cadastrados</h3>

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
                  <td [attr.colspan]="p.can('administradores:write') ? 6 : 5" class="cursos-panel-cell">
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

        <div class="empty-state" *ngIf="!carregandoLista && !erroLista && admins.length === 0">
          Nenhum administrador cadastrado.
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
    .role-financeiro  { background: #27ae60; color: #fff; }
    .role-suporte     { background: #e67e22; color: #fff; }
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
  `]
})
export class AdminAdministradoresComponent implements OnInit {
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

  readonly roleOptions = ADMIN_ROLE_OPTIONS;

  private readonly ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
    super_admin: 'Acesso total e irrestrito ao sistema e a todos os cursos.',
    instrutor:   'Gerencia cursos, aulas, provas, notas e presença. Recebe acesso automático apenas aos cursos que criar. Acesso adicional pode ser concedido manualmente.',
    financeiro:  'Visualiza relatórios financeiros, alunos e notas. Não possui acesso a nenhum curso por padrão.',
    suporte:     'Gerencia alunos e visualiza presença. Não possui acesso a nenhum curso por padrão.',
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

    this.http.get<AdminResumo[]>(this.adminsListUrl, { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.admins = data;
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