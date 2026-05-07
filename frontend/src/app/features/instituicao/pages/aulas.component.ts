import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';

import { ApiService } from '../../../shared/services/api.service';

interface AulaItem {
  id: number;
  titulo: string;
  descricao?: string;
  data_aula: string;
  duracao_minutos?: number;
  curso_id: number;
  ativo: boolean;
  videos?: VideoItem[];
}

interface VideoItem {
  id: number;
  aula_id: number;
  arquivo_nome: string;
  caminho_arquivo: string;
  duracao_segundos?: number;
  tamanho_bytes?: number;
  formato?: string;
  status: string;
  data_upload: string;
}

interface CursoItem {
  id: number;
  nome: string;
}

@Component({
  selector: 'app-instituicao-aulas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Aulas</h1>
          <p class="page-subtitle">Visualize, crie e edite as aulas dos seus cursos.</p>
        </div>
        <button class="btn-primary" (click)="abrirNovaAula()">+ Nova Aula</button>
      </div>

      @if (cursos.length > 0) {
        <div class="filtro-bar">
          <label>Filtrar por curso:</label>
          <select [(ngModel)]="cursoFiltroId" (ngModelChange)="onFiltroChange($event)" name="filtro_curso">
            <option [ngValue]="null">Todos os cursos</option>
            @for (c of cursos; track c.id) { <option [ngValue]="c.id">{{ c.nome }}</option> }
          </select>
        </div>
      }

      @if (mensagemSucesso) { <div class="success-banner">{{ mensagemSucesso }}</div> }
      @if (carregando) { <div class="loading-state"><div class="spinner"></div><p>Carregando aulas...</p></div> }
      @if (erro) { <div class="error-card"><p>{{ erro }}</p><button (click)="carregarAulas()">Tentar novamente</button></div> }

      @if (aulas.length > 0) {
        <div class="table-card">
          <table class="table-zebra">
            <thead>
              <tr><th>Título</th><th>Curso</th><th>Data</th><th>Duração</th><th>Vídeo</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              @for (aula of aulas; track aula.id) {
                <tr>
                  <td class="col-titulo">{{ aula.titulo }}</td>
                  <td class="col-curso">{{ getCursoNome(aula.curso_id) }}</td>
                  <td>{{ aula.data_aula | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ aula.duracao_minutos ? aula.duracao_minutos + 'min' : '—' }}</td>
                  <td>
                    @if (aula.videos && aula.videos.length > 0) { <span class="badge badge--success">Sim</span> }
                    @if (!aula.videos || aula.videos.length === 0) { <span class="badge badge--muted">Não</span> }
                  </td>
                  <td>
                    <span class="badge" [class.badge--success]="aula.ativo" [class.badge--danger]="!aula.ativo">
                      {{ aula.ativo ? 'Ativa' : 'Inativa' }}
                    </span>
                  </td>
                  <td class="col-actions">
                    <button class="btn-icon" title="Ver detalhes" (click)="verAula(aula)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="btn-icon btn-icon--edit" title="Editar" (click)="editarAula(aula)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon btn-icon--video" title="Upload de vídeo" (click)="abrirUpload(aula)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                    </button>
                    <button class="btn-icon btn-icon--danger" title="Deletar" (click)="abrirDelecao(aula)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (aulas.length === 0 && !carregando) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <h3 class="empty-title">Nenhuma aula encontrada</h3>
          <p>Clique em "+ Nova Aula" para começar.</p>
        </div>
      }
    </div>

    <!-- Modal Ver Aula -->
    @if (modalVerAberto) {
      <div class="modal-overlay" (click)="fecharVer()">
        <div class="modal-content modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">Detalhes da Aula</h3>
            <button class="btn-close" (click)="fecharVer()">✕</button>
          </div>
          @if (aulaDetalhe) {
            <div class="modal-body">
              <div class="detalhe-card">
                <div class="detalhe-row"><span class="dl">Título</span><span>{{ aulaDetalhe.titulo }}</span></div>
                @if (aulaDetalhe.descricao) { <div class="detalhe-row"><span class="dl">Descrição</span><span>{{ aulaDetalhe.descricao }}</span></div> }
                <div class="detalhe-row"><span class="dl">Curso</span><span>{{ getCursoNome(aulaDetalhe.curso_id) }}</span></div>
                <div class="detalhe-row"><span class="dl">Data</span><span>{{ aulaDetalhe.data_aula | date:'dd/MM/yyyy HH:mm' }}</span></div>
                @if (aulaDetalhe.duracao_minutos) { <div class="detalhe-row"><span class="dl">Duração</span><span>{{ aulaDetalhe.duracao_minutos }} min</span></div> }
                <div class="detalhe-row"><span class="dl">Status</span>
                  <span class="badge" [class.badge--success]="aulaDetalhe.ativo" [class.badge--danger]="!aulaDetalhe.ativo">{{ aulaDetalhe.ativo ? 'Ativa' : 'Inativa' }}</span>
                </div>
              </div>
              <div class="videos-section">
                <h4>Vídeos ({{ aulaDetalhe.videos?.length ?? 0 }})</h4>
                @if (!aulaDetalhe.videos || aulaDetalhe.videos.length === 0) {
                  <div class="sem-video">
                    <p>Nenhum vídeo enviado.</p>
                    <button class="btn-primary" (click)="abrirUpload(aulaDetalhe); fecharVer()">Enviar Vídeo</button>
                  </div>
                }
                @for (v of aulaDetalhe.videos ?? []; track v.id) {
                  <div class="video-item">
                    <div class="video-player-wrap"><video controls [src]="getVideoUrl(v.caminho_arquivo)" class="video-player" preload="metadata">Seu navegador não suporta reprodução de vídeo.</video></div>
                    <div class="video-meta">
                      <span><strong>Arquivo:</strong> {{ v.arquivo_nome }}</span>
                      @if (v.tamanho_bytes) { <span><strong>Tamanho:</strong> {{ (v.tamanho_bytes / 1024 / 1024).toFixed(2) }} MB</span> }
                      @if (v.duracao_segundos) { <span><strong>Duração:</strong> {{ formatarDuracao(v.duracao_segundos) }}</span> }
                      @if (v.formato) { <span><strong>Formato:</strong> {{ v.formato }}</span> }
                    </div>
                    <div class="video-actions">
                      <button class="btn-danger-sm" (click)="excluirVideo(aulaDetalhe!, v)" [disabled]="excluindoVideoId === v.id">
                        {{ excluindoVideoId === v.id ? 'Excluindo...' : 'Excluir vídeo' }}
                      </button>
                    </div>
                    @if (erroExcluirVideo) { <div class="form-error">{{ erroExcluirVideo }}</div> }
                  </div>
                }
              </div>
            </div>
          }
          @if (carregandoDetalhe) { <div class="loading-state" style="padding:40px"><div class="spinner"></div><p>Carregando...</p></div> }
        </div>
      </div>
    }

    <!-- Modal Nova Aula (rota alternativa via router) -->
    @if (modalNovaAberto) {
      <div class="modal-overlay" (click)="fecharNovaAula()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">Nova Aula</h3>
            <button class="btn-close" (click)="fecharNovaAula()">✕</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="salvarNovaAula()">
              <div class="form-row"><label>Curso *</label>
                <select [(ngModel)]="formNova.curso_id" name="curso_id" required>
                  <option [ngValue]="null" disabled>Selecione um curso...</option>
                  @for (c of cursos; track c.id) { <option [ngValue]="c.id">{{ c.nome }}</option> }
                </select>
              </div>
              <div class="form-row"><label>Título *</label><input type="text" [(ngModel)]="formNova.titulo" name="titulo" required placeholder="Ex: Aula 1 - Introdução" /></div>
              <div class="form-row"><label>Descrição</label><textarea [(ngModel)]="formNova.descricao" name="descricao" placeholder="Conteúdo da aula..."></textarea></div>
              <div class="form-row"><label>Data e Hora *</label><input type="datetime-local" [(ngModel)]="formNova.data_aula" name="data_aula" required /></div>
              <div class="form-row"><label>Duração (minutos)</label><input type="number" [(ngModel)]="formNova.duracao_minutos" name="duracao_minutos" min="1" placeholder="Ex: 60" /></div>
              @if (erroNova) { <div class="form-error">{{ erroNova }}</div> }
              <div class="modal-footer">
                <button type="button" class="btn-outline" (click)="fecharNovaAula()" [disabled]="salvandoNova">Cancelar</button>
                <button type="submit" class="btn-primary" [disabled]="salvandoNova">{{ salvandoNova ? 'Salvando...' : 'Salvar' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }

    <!-- Modal Editar Aula -->
    @if (modalEditarAberto) {
      <div class="modal-overlay" (click)="fecharEditar()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">Editar Aula</h3>
            <button class="btn-close" (click)="fecharEditar()">✕</button>
          </div>
          <div class="modal-body">
            @if (aulaEmEdicao && aulaEmEdicao.videos && aulaEmEdicao.videos.length > 0) {
              <div class="video-atual-section">
                <h4>Vídeo Atual</h4>
                @for (v of aulaEmEdicao.videos; track v.id) {
                  <div class="video-atual-item">
                    <div class="video-atual-info">
                      <span class="video-nome">{{ v.arquivo_nome }}</span>
                      @if (v.tamanho_bytes) { <span class="video-tamanho">{{ (v.tamanho_bytes / 1024 / 1024).toFixed(2) }} MB</span> }
                    </div>
                    <button class="btn-danger-sm" (click)="excluirVideoEdicao(aulaEmEdicao!, v)" [disabled]="excluindoVideoId === v.id">
                      {{ excluindoVideoId === v.id ? 'Excluindo...' : 'Excluir' }}
                    </button>
                  </div>
                }
                @if (erroExcluirVideo) { <div class="form-error">{{ erroExcluirVideo }}</div> }
                <hr class="divisor" />
              </div>
            }
            <form (ngSubmit)="salvarEdicao()">
              <div class="form-row"><label>Título *</label><input type="text" [(ngModel)]="formEditar.titulo" name="titulo" required /></div>
              <div class="form-row"><label>Descrição</label><textarea [(ngModel)]="formEditar.descricao" name="descricao"></textarea></div>
              <div class="form-row"><label>Data e Hora *</label><input type="datetime-local" [(ngModel)]="formEditar.data_aula" name="data_aula" required /></div>
              <div class="form-row"><label>Duração (minutos)</label><input type="number" [(ngModel)]="formEditar.duracao_minutos" name="duracao_minutos" min="1" /></div>
              <div class="form-row"><label>Status</label>
                <select [(ngModel)]="formEditar.ativo" name="ativo">
                  <option [ngValue]="true">Ativa</option>
                  <option [ngValue]="false">Inativa</option>
                </select>
              </div>
              @if (erroEditar) { <div class="form-error">{{ erroEditar }}</div> }
              <div class="modal-footer">
                <button type="button" class="btn-outline" (click)="fecharEditar()" [disabled]="salvandoEditar">Cancelar</button>
                <button type="submit" class="btn-primary" [disabled]="salvandoEditar">{{ salvandoEditar ? 'Salvando...' : 'Salvar' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }

    <!-- Modal Confirmar Exclusão -->
    @if (aulaParaDeletar) {
      <div class="modal-overlay" (click)="cancelarDelecao()">
        <div class="modal-content modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">Confirmar Exclusão</h3>
            <button class="btn-close" (click)="cancelarDelecao()">✕</button>
          </div>
          <div class="modal-body">
            <p>Tem certeza que deseja excluir a aula <strong>{{ aulaParaDeletar.titulo }}</strong>?</p>
            <p class="aviso-red">Esta ação não pode ser desfeita.</p>
            @if (erroDelecao) { <div class="form-error">{{ erroDelecao }}</div> }
          </div>
          <div class="modal-footer">
            <button class="btn-outline" (click)="cancelarDelecao()" [disabled]="deletando">Cancelar</button>
            <button class="btn-danger" (click)="confirmarDelecao()" [disabled]="deletando">{{ deletando ? 'Deletando...' : 'Deletar' }}</button>
          </div>
        </div>
      </div>
    }

    <!-- Modal Upload de Vídeo -->
    @if (modalUploadAberto) {
      <div class="modal-overlay" (click)="fecharUpload()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">Upload de Vídeo</h3>
            <button class="btn-close" (click)="fecharUpload()">✕</button>
          </div>
          <div class="modal-body">
            @if (aulaParaUpload) { <p class="aula-nome-label"><strong>Aula:</strong> {{ aulaParaUpload.titulo }}</p> }
            <div class="upload-area" [class.dragover]="dragover" (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onFileDrop($event)">
              <div class="upload-content">
                <svg class="upload-icon" xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                <p><strong>Arraste um vídeo aqui</strong></p>
                <p class="small-text">ou</p>
                <label class="btn-selecionar">Selecionar arquivo<input type="file" (change)="onFileSelected($event)" accept="video/*" style="display:none" /></label>
              </div>
              <p class="formatos"><small>Formatos: MP4, WebM, AVI, MOV (máx. 500 MB)</small></p>
            </div>
            @if (arquivoSelecionado) {
              <div class="arquivo-info">
                <p><strong>Arquivo:</strong> {{ arquivoSelecionado.name }}</p>
                <p><strong>Tamanho:</strong> {{ (arquivoSelecionado.size / 1024 / 1024).toFixed(2) }} MB</p>
              </div>
            }
            @if (uploadEmProgresso) {
              <div class="progresso">
                <div class="progress-bar"><div class="progress-fill" [style.width.%]="percentualUpload"></div></div>
                <p>{{ percentualUpload }}% — Enviando...</p>
              </div>
            }
            @if (uploadSucesso) { <div class="success-banner">Vídeo enviado com sucesso!</div> }
            @if (erroUpload) { <div class="form-error">{{ erroUpload }}</div> }
          </div>
          <div class="modal-footer">
            <button class="btn-outline" (click)="fecharUpload()" [disabled]="uploadEmProgresso">Cancelar</button>
            <button class="btn-primary" (click)="enviarVideo()" [disabled]="!arquivoSelecionado || uploadEmProgresso">
              {{ uploadEmProgresso ? 'Enviando...' : 'Enviar Vídeo' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .filtro-bar { display: flex; align-items: center; gap: var(--space-3); background: var(--color-surface); border: 1px solid var(--color-border); padding: var(--space-3) var(--space-5); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); margin-bottom: var(--space-5); font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .filtro-bar select { border: 1px solid var(--color-border); border-radius: var(--radius); padding: 6px 10px; font-size: var(--font-size-sm); min-width: 220px; background: var(--color-surface); color: var(--color-text); outline: none; }

    .success-banner { background: color-mix(in srgb, var(--color-success) 10%, transparent); color: var(--color-success); border-radius: var(--radius-lg); padding: var(--space-3) var(--space-5); margin-bottom: var(--space-5); border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent); }
    .loading-state { text-align: center; padding: var(--space-12) var(--space-5); color: var(--color-text-muted); }
    .spinner { display: inline-block; width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: var(--space-3); }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-card { background: color-mix(in srgb, var(--color-danger) 10%, transparent); color: var(--color-danger); padding: var(--space-5); border-radius: var(--radius-lg); border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); margin-bottom: var(--space-5); }
    .error-card button { margin-top: var(--space-2); padding: var(--space-2) var(--space-4); background: var(--color-danger); color: #fff; border: none; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-sm); }

    .table-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm); }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: var(--space-3) var(--space-4); text-align: left; border-bottom: 1px solid var(--color-border); vertical-align: middle; }
    th { background: var(--color-surface-2); font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: .04em; color: var(--color-text-muted); }
    tbody tr:hover td { background: var(--color-surface-2); }
    tbody tr:last-child td { border-bottom: none; }

    .col-titulo { font-weight: 600; color: var(--color-text); }
    .col-curso { color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .col-actions { display: flex; gap: var(--space-1); align-items: center; }

    .badge { display: inline-block; padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 700; }
    .badge--success { background: color-mix(in srgb, var(--color-success) 12%, transparent); color: var(--color-success); }
    .badge--danger  { background: color-mix(in srgb, var(--color-danger)  12%, transparent); color: var(--color-danger); }
    .badge--muted   { background: var(--color-surface-2); color: var(--color-text-muted); border: 1px solid var(--color-border); }

    .btn-primary { background: var(--primary); color: #fff; border: none; padding: var(--space-3) var(--space-5); border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; transition: background var(--transition-fast); }
    .btn-primary:hover { background: var(--secondary); }
    .btn-outline { padding: var(--space-3) var(--space-5); border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface-2); color: var(--color-text-muted); cursor: pointer; font-size: var(--font-size-sm); }
    .btn-outline:hover:not(:disabled) { background: var(--color-border); color: var(--color-text); }
    .btn-outline:disabled { opacity: .5; cursor: not-allowed; }
    .btn-danger { padding: var(--space-3) var(--space-5); background: var(--color-danger); color: #fff; border: none; border-radius: var(--radius); cursor: pointer; font-weight: 600; font-size: var(--font-size-sm); }
    .btn-danger:hover:not(:disabled) { background: color-mix(in srgb, var(--color-danger) 80%, black); }
    .btn-danger:disabled { opacity: .6; cursor: not-allowed; }
    .btn-danger-sm { background: var(--color-danger); color: #fff; border: none; padding: 5px 12px; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-xs); font-weight: 600; }
    .btn-danger-sm:hover:not(:disabled) { background: color-mix(in srgb, var(--color-danger) 80%, black); }
    .btn-danger-sm:disabled { opacity: .6; cursor: not-allowed; }

    .btn-icon { background: none; border: 1px solid transparent; padding: 5px 7px; border-radius: var(--radius); cursor: pointer; color: var(--color-text-muted); display: inline-flex; align-items: center; transition: all var(--transition-fast); }
    .btn-icon:hover { background: var(--color-surface-2); border-color: var(--color-border); }
    .btn-icon--edit:hover  { color: var(--color-info); }
    .btn-icon--video:hover { color: var(--color-danger); }
    .btn-icon--danger:hover { color: var(--color-danger); }

    /* Modals */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: var(--color-surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); max-width: 520px; width: 92%; max-height: 90vh; overflow-y: auto; }
    .modal-lg { max-width: 760px; }
    .modal-sm { max-width: 400px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: var(--space-5) var(--space-6); border-bottom: 1px solid var(--color-border); }
    .modal-title { margin: 0; font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); }
    .btn-close { background: none; border: none; font-size: var(--font-size-lg); cursor: pointer; color: var(--color-text-muted); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius); }
    .btn-close:hover { background: var(--color-surface-2); color: var(--color-text); }
    .modal-body { padding: var(--space-5) var(--space-6); }
    .modal-footer { display: flex; gap: var(--space-3); justify-content: flex-end; padding: var(--space-4) var(--space-6); border-top: 1px solid var(--color-border); }

    .form-row { display: flex; flex-direction: column; margin-bottom: var(--space-4); }
    .form-row label { font-weight: 600; margin-bottom: var(--space-2); font-size: var(--font-size-sm); color: var(--color-text); }
    .form-row input, .form-row textarea, .form-row select { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius); font-size: var(--font-size-sm); background: var(--color-surface); color: var(--color-text); font-family: inherit; outline: none; }
    .form-row input:focus, .form-row textarea:focus, .form-row select:focus { border-color: var(--primary); }
    .form-row textarea { min-height: 80px; resize: vertical; }
    .form-error { margin-top: var(--space-3); background: color-mix(in srgb, var(--color-danger) 10%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent); border-radius: var(--radius); padding: var(--space-3) var(--space-4); color: var(--color-danger); font-size: var(--font-size-sm); }
    .aviso-red { font-size: var(--font-size-sm); color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 8%, transparent); padding: var(--space-2) var(--space-3); border-radius: var(--radius); }

    /* Detalhe */
    .detalhe-card { background: var(--color-surface-2); border-radius: var(--radius); padding: var(--space-3) var(--space-5); margin-bottom: var(--space-5); }
    .detalhe-row { display: flex; gap: var(--space-4); padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border); font-size: var(--font-size-sm); }
    .detalhe-row:last-child { border-bottom: none; }
    .dl { font-weight: 600; color: var(--color-text); min-width: 90px; }
    .videos-section h4 { margin: 0 0 var(--space-4); color: var(--color-text); font-size: var(--font-size-base); }
    .sem-video { background: var(--color-surface-2); border-radius: var(--radius); padding: var(--space-6); text-align: center; color: var(--color-text-muted); }
    .video-item { border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden; margin-bottom: var(--space-4); }
    .video-player-wrap { background: #000; }
    .video-player { width: 100%; max-height: 340px; display: block; }
    .video-meta { display: flex; flex-wrap: wrap; gap: var(--space-3) var(--space-6); padding: var(--space-3) var(--space-4); background: var(--color-surface-2); font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .video-actions { padding: var(--space-2) var(--space-4); background: var(--color-surface-2); border-top: 1px solid var(--color-border); }

    /* Video atual (editar) */
    .video-atual-section { margin-bottom: var(--space-5); }
    .video-atual-section h4 { margin: 0 0 var(--space-3); font-size: var(--font-size-sm); color: var(--color-text); }
    .video-atual-item { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); background: var(--color-surface-2); border: 1px solid var(--color-border); border-radius: var(--radius); padding: var(--space-3) var(--space-4); flex-wrap: wrap; }
    .video-atual-info { display: flex; flex-direction: column; gap: 2px; }
    .video-nome { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); word-break: break-all; }
    .video-tamanho { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .divisor { border: none; border-top: 1px solid var(--color-border); margin: var(--space-4) 0; }

    /* Upload */
    .aula-nome-label { margin: 0 0 var(--space-4); color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .upload-area { border: 2px dashed var(--color-border); border-radius: var(--radius); padding: var(--space-8); text-align: center; cursor: pointer; transition: all var(--transition-fast); margin-bottom: var(--space-4); }
    .upload-area:hover, .upload-area.dragover { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 5%, transparent); }
    .upload-content p { margin: var(--space-2) 0; color: var(--color-text); }
    .upload-icon { color: var(--color-text-muted); margin-bottom: var(--space-2); }
    .small-text { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .btn-selecionar { display: inline-block; background: var(--primary); color: #fff; padding: var(--space-2) var(--space-5); border-radius: var(--radius); cursor: pointer; font-weight: 600; font-size: var(--font-size-sm); }
    .btn-selecionar:hover { background: var(--secondary); }
    .formatos { margin: var(--space-3) 0 0; color: var(--color-text-muted); font-size: var(--font-size-xs); }
    .arquivo-info { background: var(--color-surface-2); padding: var(--space-3) var(--space-4); border-radius: var(--radius); margin-bottom: var(--space-4); font-size: var(--font-size-sm); color: var(--color-text); }
    .arquivo-info p { margin: 3px 0; }
    .progresso { margin-bottom: var(--space-4); }
    .progress-bar { height: 6px; background: var(--color-border); border-radius: var(--radius-full); overflow: hidden; margin-bottom: var(--space-2); }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--secondary)); transition: width .3s; }
    .progresso p { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-muted); }

    @media (max-width: 900px) { .table-card { overflow-x: auto; } .col-actions { flex-wrap: wrap; } }
  `]
})
export class InstituicaoAulasComponent implements OnInit {
  aulas: AulaItem[] = [];
  cursos: CursoItem[] = [];
  carregando = false;
  erro = '';
  mensagemSucesso = '';
  cursoFiltroId: number | null = null;

  // Modal Ver
  modalVerAberto = false;
  aulaDetalhe: AulaItem | null = null;
  carregandoDetalhe = false;
  excluindoVideoId: number | null = null;
  erroExcluirVideo = '';

  // Modal Nova Aula
  modalNovaAberto = false;
  salvandoNova = false;
  erroNova = '';
  formNova: { curso_id: number | null; titulo: string; descricao: string; data_aula: string; duracao_minutos: number | null } = {
    curso_id: null, titulo: '', descricao: '', data_aula: '', duracao_minutos: null
  };

  // Modal Editar
  modalEditarAberto = false;
  aulaEmEdicao: AulaItem | null = null;
  salvandoEditar = false;
  erroEditar = '';
  formEditar: { titulo: string; descricao: string; data_aula: string; duracao_minutos: number | null; ativo: boolean } = {
    titulo: '', descricao: '', data_aula: '', duracao_minutos: null, ativo: true
  };

  // Modal Deletar
  aulaParaDeletar: AulaItem | null = null;
  deletando = false;
  erroDelecao = '';

  // Modal Upload
  modalUploadAberto = false;
  aulaParaUpload: AulaItem | null = null;
  arquivoSelecionado: File | null = null;
  uploadEmProgresso = false;
  percentualUpload = 0;
  uploadSucesso = false;
  erroUpload = '';
  dragover = false;

  private readonly apiBase = 'http://localhost:8000/api';

  constructor(private apiService: ApiService, private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.carregarCursos();
    this.carregarAulas();
  }

  carregarCursos(): void {
    this.apiService.getInstituicaoCursos().subscribe({
      next: (cursos) => { this.cursos = cursos.map(c => ({ id: c.id, nome: c.nome })); }
    });
  }

  carregarAulas(): void {
    this.carregando = true;
    this.erro = '';
    this.apiService.getInstituicaoAulas(this.cursoFiltroId ?? undefined).subscribe({
      next: (aulas) => { this.aulas = aulas; this.carregando = false; },
      error: (err) => { this.erro = err?.error?.detail || 'Erro ao carregar aulas.'; this.carregando = false; }
    });
  }

  onFiltroChange(_: any): void {
    this.carregarAulas();
  }

  getCursoNome(cursoId: number): string {
    return this.cursos.find(c => c.id === cursoId)?.nome ?? `Curso #${cursoId}`;
  }

  // ---------- VER ----------
  verAula(aula: AulaItem): void {
    this.aulaDetalhe = null;
    this.carregandoDetalhe = true;
    this.erroExcluirVideo = '';
    this.modalVerAberto = true;
    this.apiService.getInstituicaoAula(aula.id).subscribe({
      next: (detalhe) => { this.aulaDetalhe = detalhe; this.carregandoDetalhe = false; },
      error: () => { this.carregandoDetalhe = false; }
    });
  }

  fecharVer(): void { this.modalVerAberto = false; this.aulaDetalhe = null; }

  excluirVideo(aula: AulaItem, video: VideoItem): void {
    if (!confirm(`Excluir o vídeo "${video.arquivo_nome}"?`)) return;
    this.excluindoVideoId = video.id;
    this.erroExcluirVideo = '';
    this.apiService.deleteInstituicaoVideo(aula.id, video.id).subscribe({
      next: () => {
        this.excluindoVideoId = null;
        if (this.aulaDetalhe?.videos) {
          this.aulaDetalhe.videos = this.aulaDetalhe.videos.filter(v => v.id !== video.id);
        }
        this.carregarAulas();
      },
      error: (err) => { this.excluindoVideoId = null; this.erroExcluirVideo = err?.error?.detail || 'Erro ao excluir vídeo.'; }
    });
  }

  excluirVideoEdicao(aula: AulaItem, video: VideoItem): void {
    if (!confirm(`Excluir o vídeo "${video.arquivo_nome}"?`)) return;
    this.excluindoVideoId = video.id;
    this.erroExcluirVideo = '';
    this.apiService.deleteInstituicaoVideo(aula.id, video.id).subscribe({
      next: () => {
        this.excluindoVideoId = null;
        if (this.aulaEmEdicao?.videos) {
          this.aulaEmEdicao.videos = this.aulaEmEdicao.videos.filter(v => v.id !== video.id);
        }
        this.carregarAulas();
      },
      error: (err) => { this.excluindoVideoId = null; this.erroExcluirVideo = err?.error?.detail || 'Erro ao excluir vídeo.'; }
    });
  }

  // ---------- NOVA AULA ----------
  abrirNovaAula(): void {
    this.router.navigate(['/instituicao/aulas/nova']);
  }

  fecharNovaAula(): void {
    if (this.salvandoNova) return;
    this.modalNovaAberto = false;
  }

  salvarNovaAula(): void {
    if (!this.formNova.curso_id) { this.erroNova = 'Selecione um curso.'; return; }
    if (!this.formNova.titulo.trim()) { this.erroNova = 'O título é obrigatório.'; return; }
    if (!this.formNova.data_aula) { this.erroNova = 'A data e hora são obrigatórias.'; return; }

    this.salvandoNova = true;
    this.erroNova = '';

    const payload = {
      curso_id: this.formNova.curso_id,
      titulo: this.formNova.titulo.trim(),
      descricao: this.formNova.descricao.trim() || null,
      data_aula: new Date(this.formNova.data_aula).toISOString(),
      duracao_minutos: this.formNova.duracao_minutos || null,
    };

    this.apiService.createInstituicaoAula(this.formNova.curso_id, payload).subscribe({
      next: () => {
        this.salvandoNova = false;
        this.modalNovaAberto = false;
        this.mensagemSucesso = 'Aula criada com sucesso!';
        setTimeout(() => this.mensagemSucesso = '', 4000);
        this.carregarAulas();
      },
      error: (err) => {
        this.salvandoNova = false;
        this.erroNova = err?.error?.detail || 'Erro ao criar aula.';
      }
    });
  }

  // ---------- EDITAR ----------
  editarAula(aula: AulaItem): void {
    this.router.navigate(['/instituicao/aulas', aula.id, 'editar']);
  }

  fecharEditar(): void {
    if (this.salvandoEditar) return;
    this.modalEditarAberto = false;
    this.aulaEmEdicao = null;
  }

  salvarEdicao(): void {
    if (!this.formEditar.titulo.trim()) { this.erroEditar = 'O título é obrigatório.'; return; }
    if (!this.formEditar.data_aula) { this.erroEditar = 'A data e hora são obrigatórias.'; return; }

    this.salvandoEditar = true;
    this.erroEditar = '';

    const payload = {
      titulo: this.formEditar.titulo.trim(),
      descricao: this.formEditar.descricao.trim() || null,
      data_aula: new Date(this.formEditar.data_aula).toISOString(),
      duracao_minutos: this.formEditar.duracao_minutos || null,
      ativo: this.formEditar.ativo,
    };

    this.apiService.updateInstituicaoAula(this.aulaEmEdicao!.id, payload).subscribe({
      next: () => {
        this.salvandoEditar = false;
        this.modalEditarAberto = false;
        this.aulaEmEdicao = null;
        this.mensagemSucesso = 'Aula atualizada com sucesso!';
        setTimeout(() => this.mensagemSucesso = '', 4000);
        this.carregarAulas();
      },
      error: (err) => {
        this.salvandoEditar = false;
        this.erroEditar = err?.error?.detail || 'Erro ao salvar.';
      }
    });
  }

  // ---------- DELETAR ----------
  abrirDelecao(aula: AulaItem): void { this.aulaParaDeletar = aula; this.erroDelecao = ''; }
  cancelarDelecao(): void { if (this.deletando) return; this.aulaParaDeletar = null; }

  confirmarDelecao(): void {
    if (!this.aulaParaDeletar) return;
    this.deletando = true;
    this.apiService.deleteInstituicaoAula(this.aulaParaDeletar.id).subscribe({
      next: () => { this.deletando = false; this.aulaParaDeletar = null; this.carregarAulas(); },
      error: (err) => { this.deletando = false; this.erroDelecao = err?.error?.detail || 'Erro ao deletar.'; }
    });
  }

  // ---------- UPLOAD ----------
  abrirUpload(aula: AulaItem): void {
    this.aulaParaUpload = aula;
    this.arquivoSelecionado = null;
    this.uploadSucesso = false;
    this.erroUpload = '';
    this.percentualUpload = 0;
    this.modalUploadAberto = true;
  }

  fecharUpload(): void {
    if (this.uploadEmProgresso) return;
    this.modalUploadAberto = false;
    this.aulaParaUpload = null;
    this.arquivoSelecionado = null;
  }

  onDragOver(e: DragEvent): void { e.preventDefault(); e.stopPropagation(); this.dragover = true; }
  onDragLeave(e: DragEvent): void { e.preventDefault(); e.stopPropagation(); this.dragover = false; }
  onFileDrop(e: DragEvent): void {
    e.preventDefault(); e.stopPropagation(); this.dragover = false;
    const f = e.dataTransfer?.files?.[0];
    if (f) this.arquivoSelecionado = f;
  }
  onFileSelected(e: any): void {
    const f = e.target.files?.[0];
    if (f) this.arquivoSelecionado = f;
  }

  enviarVideo(): void {
    if (!this.aulaParaUpload || !this.arquivoSelecionado) return;

    const ext = this.arquivoSelecionado.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['mp4', 'webm', 'avi', 'mov'].includes(ext)) {
      this.erroUpload = `Formato .${ext} não suportado. Use: mp4, webm, avi, mov`; return;
    }
    if (this.arquivoSelecionado.size > 500 * 1024 * 1024) {
      this.erroUpload = 'Arquivo muito grande. Máximo: 500 MB'; return;
    }

    this.uploadEmProgresso = true;
    this.erroUpload = '';
    this.uploadSucesso = false;

    const formData = new FormData();
    formData.append('file', this.arquivoSelecionado);

    const req = new HttpRequest(
      'POST',
      `${this.apiBase}/instituicoes/minha/aulas/${this.aulaParaUpload.id}/upload-video`,
      formData,
      { reportProgress: true }
    );

    this.http.request(req).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.percentualUpload = Math.round((event.loaded / event.total) * 100);
        } else if (event.type === HttpEventType.Response) {
          this.uploadEmProgresso = false;
          this.uploadSucesso = true;
          this.arquivoSelecionado = null;
          this.carregarAulas();
          setTimeout(() => { this.modalUploadAberto = false; this.uploadSucesso = false; }, 2000);
        }
      },
      error: (err) => {
        this.uploadEmProgresso = false;
        this.erroUpload = err?.error?.detail || 'Erro ao enviar vídeo.';
      }
    });
  }

  getVideoUrl(caminho: string): string {
    const filename = caminho.replace(/\\/g, '/').split('/').pop() ?? '';
    return `${this.apiBase.replace('/api', '')}/uploads/videos/${filename}`;
  }

  formatarDuracao(segundos: number): string {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  }
}
