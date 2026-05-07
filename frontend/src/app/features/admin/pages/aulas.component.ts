import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { RichTextEditorComponent } from '../../../shared/components';

interface Aula {
  id: number;
  titulo: string;
  descricao: string;
  data_aula: string;
  duracao_minutos: number;
  curso_id: number;
  videos?: any[];
}

interface Curso {
  id: number;
  nome: string;
}

interface Video {
  id: number;
  aula_id: number;
  arquivo_nome: string;
  caminho_arquivo: string;
  duracao_segundos: number | null;
  tamanho_bytes: number | null;
  formato: string | null;
  status: string;
  data_upload: string;
}

@Component({
  selector: 'app-admin-aulas',
  standalone: true,
  imports: [CommonModule, FormsModule, RichTextEditorComponent],
  template: `
    <div class="content-page">
      <div class="page-topbar">
        <h1>Gerenciar Aulas & Vídeos</h1>
        <button class="btn-primary" (click)="abrirFormulario()">+ Nova Aula</button>
      </div>

      @if (carregando) {
        <div class="loading-state"><div class="spinner"></div><p>Carregando aulas...</p></div>
      }

      @if (erro) {
        <div class="msg msg--error">{{ erro }} <button (click)="carregarAulas()">Tentar novamente</button></div>
      }

      @if (!carregando && aulas.length > 0) {
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Duração</th>
                <th>Data</th>
                <th>Vídeo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (aula of aulas; track aula.id) {
                <tr>
                  <td class="cell-strong">{{ aula.titulo }}</td>
                  <td class="col-muted">{{ aula.duracao_minutos }}min</td>
                  <td class="col-date">{{ aula.data_aula | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td>
                    @if (aula.videos && aula.videos.length > 0) {
                      <span class="badge badge--success">Sim</span>
                    } @else {
                      <span class="badge badge--muted">Não</span>
                    }
                  </td>
                  <td class="cell-actions">
                    <button class="btn-icon btn-icon--view" title="Ver detalhes" (click)="verAula(aula)">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="btn-icon btn-icon--edit" title="Editar" (click)="editarAula(aula)">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon btn-icon--video" title="Upload de vídeo" (click)="abrirUploadVideo(aula)">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                    </button>
                    <button class="btn-icon btn-icon--delete" title="Deletar" (click)="deletarAula(aula)">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (!carregando && aulas.length === 0 && !erro) {
        <div class="empty-state">
          <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          <p>Nenhuma aula criada ainda. Clique em "Nova Aula" para começar.</p>
        </div>
      }
    </div>

    @if (modalVerAberto) {
      <div class="modal-overlay" (click)="fecharVerAula()">
        <div class="modal-card modal-card--lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Detalhes da Aula</h3>
            <button class="modal-close-btn" (click)="fecharVerAula()">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            @if (carregandoDetalhes) {
              <div class="loading-state"><div class="spinner"></div><p>Carregando detalhes...</p></div>
            }
            @if (!carregandoDetalhes && aulaDetalhes) {
              <div class="info-grid">
                <div class="info-row"><span class="info-label">Título</span><span>{{ aulaDetalhes.titulo }}</span></div>
                <div class="info-row"><span class="info-label">Data</span><span>{{ aulaDetalhes.data_aula | date:'dd/MM/yyyy HH:mm' }}</span></div>
                @if (aulaDetalhes.duracao_minutos) {
                  <div class="info-row"><span class="info-label">Duração</span><span>{{ aulaDetalhes.duracao_minutos }} minutos</span></div>
                }
                @if (aulaDetalhes.descricao) {
                  <div class="info-row span2"><span class="info-label">Descrição</span><div class="rich-content" [innerHTML]="renderDescricao(aulaDetalhes.descricao)"></div></div>
                }
              </div>

              <div class="videos-section">
                <h4>Vídeos ({{ aulaDetalhes.videos?.length || 0 }})</h4>
                @if (!aulaDetalhes.videos || aulaDetalhes.videos.length === 0) {
                  <div class="empty-videos">
                    <p>Nenhum vídeo enviado para esta aula.</p>
                    <button class="btn-primary" (click)="abrirUploadVideo(aulaDetalhes!); fecharVerAula()">Upload de Vídeo</button>
                  </div>
                } @else {
                  @for (v of aulaDetalhes.videos; track v.id) {
                    <div class="video-item">
                      <div class="video-player-wrap">
                        <video controls [src]="getVideoUrl(v.caminho_arquivo)" class="video-player" preload="metadata">Seu navegador não suporta reprodução de vídeo.</video>
                      </div>
                      <div class="video-meta">
                        <span><strong>Arquivo:</strong> {{ v.arquivo_nome }}</span>
                        @if (v.tamanho_bytes) { <span><strong>Tamanho:</strong> {{ (v.tamanho_bytes / 1024 / 1024).toFixed(2) }} MB</span> }
                        @if (v.duracao_segundos) { <span><strong>Duração:</strong> {{ formatarDuracao(v.duracao_segundos) }}</span> }
                        @if (v.formato) { <span><strong>Formato:</strong> {{ v.formato }}</span> }
                        <span><strong>Upload:</strong> {{ v.data_upload | date:'dd/MM/yyyy HH:mm' }}</span>
                        <span class="badge" [class]="v.status === 'ativo' ? 'badge--success' : 'badge--danger'">{{ v.status }}</span>
                      </div>
                    </div>
                  }
                }
              </div>
            }
          </div>
          <div class="modal-footer">
            <button class="btn-outline" (click)="fecharVerAula()">Fechar</button>
          </div>
        </div>
      </div>
    }

    @if (modalNovaAulaAberto) {
      <div class="modal-overlay" (click)="fecharNovaAula()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Nova Aula</h3>
            <button class="modal-close-btn" (click)="fecharNovaAula()">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="salvarNovaAula()" #fNova="ngForm">
              <div class="form-row">
                <label>Curso *</label>
                <select [(ngModel)]="formNovaAula.curso_id" name="curso_id" required>
                  <option [ngValue]="null" disabled>Selecione um curso...</option>
                  @for (c of cursos; track c.id) { <option [ngValue]="c.id">{{ c.nome }}</option> }
                </select>
              </div>
              <div class="form-row">
                <label>Título *</label>
                <input type="text" [(ngModel)]="formNovaAula.titulo" name="titulo" required placeholder="Ex: Aula 1 - Introdução" />
              </div>
              <div class="form-row">
                <label>Descrição</label>
                <app-rich-text-editor [content]="formNovaAula.descricao" placeholder="Conteúdo da aula..." (contentChange)="formNovaAula.descricao = $event" />
              </div>
              <div class="form-row">
                <label>Data e Hora *</label>
                <input type="datetime-local" [(ngModel)]="formNovaAula.data_aula" name="data_aula" required />
              </div>
              <div class="form-row">
                <label>Duração (minutos)</label>
                <input type="number" [(ngModel)]="formNovaAula.duracao_minutos" name="duracao_minutos" min="1" placeholder="Ex: 60" />
              </div>
              @if (erroNovaAula) { <div class="form-error">{{ erroNovaAula }}</div> }
              <div class="modal-footer-inner">
                <button type="button" class="btn-outline" (click)="fecharNovaAula()" [disabled]="criandoNovaAula">Cancelar</button>
                <button type="submit" class="btn-primary" [disabled]="criandoNovaAula">{{ criandoNovaAula ? 'Salvando...' : 'Salvar Aula' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }

    @if (modalEditarAberto) {
      <div class="modal-overlay" (click)="fecharEdicaoAula()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Editar Aula</h3>
            <button class="modal-close-btn" (click)="fecharEdicaoAula()">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            @if (aulaEmEdicao && aulaEmEdicao.videos && aulaEmEdicao.videos.length > 0) {
              <div class="video-atual-section">
                <h4>Vídeo Atual</h4>
                @for (v of aulaEmEdicao.videos; track v.id) {
                  <div class="video-atual-item">
                    <div class="video-atual-info">
                      <span class="video-nome">{{ v.arquivo_nome }}</span>
                      @if (v.tamanho_bytes) { <span class="video-size">{{ (v.tamanho_bytes / 1024 / 1024).toFixed(2) }} MB</span> }
                    </div>
                    <button class="btn-del-video" (click)="excluirVideo(aulaEmEdicao!, v)" [disabled]="excluindoVideoId === v.id">
                      {{ excluindoVideoId === v.id ? 'Excluindo...' : 'Excluir Vídeo' }}
                    </button>
                  </div>
                }
                @if (erroExcluirVideo) { <div class="form-error">{{ erroExcluirVideo }}</div> }
                <hr class="divisor" />
              </div>
            }
            <form (ngSubmit)="salvarEdicaoAula()">
              <div class="form-row">
                <label>Título *</label>
                <input type="text" [(ngModel)]="formEdicao.titulo" name="titulo" required />
              </div>
              <div class="form-row">
                <label>Descrição</label>
                <app-rich-text-editor [content]="formEdicao.descricao" placeholder="Conteúdo da aula..." (contentChange)="formEdicao.descricao = $event" />
              </div>
              <div class="form-row">
                <label>Data e Hora *</label>
                <input type="datetime-local" [(ngModel)]="formEdicao.data_aula" name="data_aula" required />
              </div>
              <div class="form-row">
                <label>Duração (minutos)</label>
                <input type="number" [(ngModel)]="formEdicao.duracao_minutos" name="duracao_minutos" min="1" />
              </div>
              <div class="form-row">
                <label>Status</label>
                <select [(ngModel)]="formEdicao.ativo" name="ativo">
                  <option [ngValue]="true">Ativa</option>
                  <option [ngValue]="false">Inativa</option>
                </select>
              </div>
              @if (erroEdicaoAula) { <div class="form-error">{{ erroEdicaoAula }}</div> }
              <div class="modal-footer-inner">
                <button type="button" class="btn-outline" (click)="fecharEdicaoAula()" [disabled]="salvandoEdicao">Cancelar</button>
                <button type="submit" class="btn-primary" [disabled]="salvandoEdicao">{{ salvandoEdicao ? 'Salvando...' : 'Salvar' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }

    @if (modalUploadAberto) {
      <div class="modal-overlay" (click)="fecharModalUpload()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Upload de Vídeo</h3>
            <button class="modal-close-btn" (click)="fecharModalUpload()">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            @if (aulaParaUpload) {
              <p class="upload-aula-nome"><strong>Aula:</strong> {{ aulaParaUpload.titulo }}</p>
            }
            <div class="upload-zone" [class.dragover]="dragover" (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onFileDrop($event)">
              <svg width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
              <p>Arraste um vídeo aqui ou</p>
              <label class="btn-select-file">
                Selecionar Arquivo
                <input type="file" #fileInput (change)="onFileSelected($event)" accept="video/*" style="display:none" />
              </label>
              <small>MP4, WebM, AVI, MOV — máx. 500 MB</small>
            </div>
            @if (arquivoSelecionado) {
              <div class="file-info">
                <p><strong>{{ arquivoSelecionado.name }}</strong></p>
                <p class="muted">{{ (arquivoSelecionado.size / 1024 / 1024).toFixed(2) }} MB</p>
              </div>
            }
            @if (uploadEmProgresso) {
              <div class="upload-progress">
                <div class="progress-bar"><div class="progress-fill" [style.width.%]="percentualUpload"></div></div>
                <p>{{ percentualUpload }}% enviando...</p>
              </div>
            }
            @if (uploadSucesso) {
              <div class="msg msg--success">Vídeo enviado com sucesso!</div>
            }
            @if (erroUpload) {
              <div class="form-error">{{ erroUpload }}</div>
            }
          </div>
          <div class="modal-footer">
            <button class="btn-outline" (click)="fecharModalUpload()" [disabled]="uploadEmProgresso">Cancelar</button>
            <button class="btn-primary" (click)="enviarVideo()" [disabled]="!arquivoSelecionado || uploadEmProgresso">{{ uploadEmProgresso ? 'Enviando...' : 'Enviar Vídeo' }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .page-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; }
    .page-topbar h1 { margin: 0; font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text); font-family: var(--font-display); }

    .btn-primary { background: var(--primary); color: #fff; border: none; padding: 10px 18px; border-radius: var(--radius); cursor: pointer; font-weight: 600; font-size: var(--font-size-sm); transition: opacity 0.15s; white-space: nowrap; }
    .btn-primary:hover:not(:disabled) { opacity: 0.88; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-outline { padding: 9px 16px; border: 1.5px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); color: var(--color-text-muted); font-size: var(--font-size-sm); font-weight: 500; cursor: pointer; }
    .btn-outline:disabled { opacity: 0.6; cursor: not-allowed; }

    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 24px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .msg { padding: 10px 14px; border-radius: var(--radius); font-size: var(--font-size-sm); }
    .msg--error { background: color-mix(in srgb, var(--color-danger) 8%, transparent); color: var(--color-danger); border: 1px solid color-mix(in srgb, var(--color-danger) 20%, transparent); display: flex; align-items: center; gap: 10px; }
    .msg--error button { background: none; border: none; color: var(--color-danger); cursor: pointer; font-weight: 600; text-decoration: underline; }
    .msg--success { background: color-mix(in srgb, var(--color-success) 10%, transparent); color: var(--color-success); border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent); }

    .table-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow-x: auto; box-shadow: var(--shadow-sm); }
    table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); min-width: 600px; }
    th { padding: 12px 14px; text-align: left; font-weight: 600; color: var(--color-text-muted); background: var(--color-surface-2); border-bottom: 1px solid var(--color-border); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
    td { padding: 12px 14px; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--color-surface-2); }
    .cell-strong { font-weight: 600; }
    .col-muted { color: var(--color-text-muted); }
    .col-date { font-size: 0.8125rem; color: var(--color-text-muted); }
    .muted { color: var(--color-text-muted); }

    .badge { display: inline-flex; padding: 3px 10px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; }
    .badge--success { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
    .badge--danger  { background: color-mix(in srgb, var(--color-danger) 15%, transparent);  color: var(--color-danger); }
    .badge--muted   { background: var(--color-surface-2); color: var(--color-text-muted); border: 1px solid var(--color-border); }

    .cell-actions { display: flex; gap: 6px; align-items: center; }
    .btn-icon { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: var(--radius); border: 1.5px solid var(--color-border); background: var(--color-surface); cursor: pointer; }
    .btn-icon--view  { color: var(--color-info); }
    .btn-icon--view:hover  { border-color: var(--color-info); background: color-mix(in srgb, var(--color-info) 8%, transparent); }
    .btn-icon--edit  { color: var(--primary); }
    .btn-icon--edit:hover  { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, transparent); }
    .btn-icon--video { color: var(--color-success); }
    .btn-icon--video:hover { border-color: var(--color-success); background: color-mix(in srgb, var(--color-success) 8%, transparent); }
    .btn-icon--delete { color: var(--color-danger); }
    .btn-icon--delete:hover { border-color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 8%, transparent); }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0 0 0 / 0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
    .modal-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); max-width: 520px; width: 100%; box-shadow: var(--shadow-lg); display: flex; flex-direction: column; max-height: 90vh; }
    .modal-card--lg { max-width: 740px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 16px; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
    .modal-header h3 { margin: 0; font-size: var(--font-size-lg); color: var(--color-text); }
    .modal-close-btn { background: none; border: none; color: var(--color-text-muted); cursor: pointer; padding: 4px; border-radius: var(--radius); line-height: 1; }
    .modal-close-btn:hover { background: var(--color-surface-2); color: var(--color-text); }
    .modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--color-border); flex-shrink: 0; }
    .modal-footer-inner { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border); }

    /* Form */
    .form-row { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
    .form-row label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-muted); }
    .form-row input, .form-row select { padding: 9px 12px; border: 1.5px solid var(--color-border); border-radius: var(--radius); font-size: var(--font-size-sm); outline: none; background: var(--color-surface-2); color: var(--color-text); font-family: inherit; }
    .form-row input:focus, .form-row select:focus { border-color: var(--primary); background: var(--color-surface); }
    .form-error { margin-top: 10px; padding: 10px 14px; background: color-mix(in srgb, var(--color-danger) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent); border-radius: var(--radius); color: var(--color-danger); font-size: var(--font-size-sm); }

    /* Info grid (Ver Aula) */
    .info-grid { background: var(--color-surface-2); border-radius: var(--radius); padding: 14px 16px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .info-row { display: flex; flex-direction: column; gap: 3px; font-size: var(--font-size-sm); }
    .info-row.span2 { grid-column: span 2; }
    .info-label { font-weight: 700; color: var(--color-text-muted); font-size: 0.75rem; text-transform: uppercase; }
    .rich-content { color: var(--color-text); line-height: 1.6; }

    /* Videos */
    .videos-section h4 { margin: 0 0 12px; font-size: var(--font-size-base); color: var(--color-text); }
    .empty-videos { background: var(--color-surface-2); border-radius: var(--radius); padding: 24px; text-align: center; color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .empty-videos p { margin: 0 0 12px; }
    .video-item { border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden; margin-bottom: 12px; }
    .video-player-wrap { background: #000; }
    .video-player { width: 100%; max-height: 320px; display: block; }
    .video-meta { display: flex; flex-wrap: wrap; gap: 8px 20px; padding: 10px 14px; background: var(--color-surface-2); font-size: var(--font-size-sm); color: var(--color-text-muted); align-items: center; }

    /* Video atual (editar) */
    .video-atual-section { margin-bottom: 16px; }
    .video-atual-section h4 { margin: 0 0 8px; font-size: var(--font-size-base); color: var(--color-text); }
    .video-atual-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--color-surface-2); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 10px 14px; flex-wrap: wrap; }
    .video-atual-info { display: flex; flex-direction: column; gap: 2px; }
    .video-nome { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); word-break: break-all; }
    .video-size { font-size: 0.75rem; color: var(--color-text-muted); }
    .btn-del-video { background: color-mix(in srgb, var(--color-danger) 12%, transparent); color: var(--color-danger); border: 1.5px solid color-mix(in srgb, var(--color-danger) 25%, transparent); padding: 6px 12px; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; white-space: nowrap; }
    .btn-del-video:disabled { opacity: 0.6; cursor: not-allowed; }
    .divisor { border: none; border-top: 1px solid var(--color-border); margin: 14px 0; }

    /* Upload */
    .upload-aula-nome { margin: 0 0 14px; font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .upload-zone { border: 2px dashed var(--color-border); border-radius: var(--radius-lg); padding: 32px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; transition: border-color 0.2s, background 0.2s; color: var(--color-text-muted); font-size: var(--font-size-sm); margin-bottom: 14px; }
    .upload-zone:hover, .upload-zone.dragover { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 4%, transparent); }
    .upload-zone p { margin: 0; }
    .upload-zone small { color: var(--color-text-muted); }
    .btn-select-file { background: var(--primary); color: #fff; padding: 8px 16px; border-radius: var(--radius); cursor: pointer; font-weight: 600; font-size: var(--font-size-sm); }
    .file-info { background: var(--color-surface-2); border-radius: var(--radius); padding: 12px 14px; margin-bottom: 10px; }
    .file-info p { margin: 4px 0; font-size: var(--font-size-sm); color: var(--color-text); }
    .upload-progress { margin-bottom: 12px; }
    .progress-bar { height: 6px; background: var(--color-border); border-radius: 99px; overflow: hidden; margin-bottom: 6px; }
    .progress-fill { height: 100%; background: var(--primary); border-radius: 99px; transition: width 0.3s; }
    .upload-progress p { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-muted); }
  `]
})
export class AdminAulasComponent implements OnInit {
  aulas: Aula[] = [];
  cursos: Curso[] = [];
  carregando = false;
  erro = '';

  // Modal Ver Aula
  modalVerAberto = false;
  aulaDetalhes: (Aula & { videos: Video[]; ativo: boolean; }) | null = null;
  carregandoDetalhes = false;

  // Modal Nova Aula
  modalNovaAulaAberto = false;
  criandoNovaAula = false;
  erroNovaAula = '';
  formNovaAula: { curso_id: number | null; titulo: string; descricao: string; data_aula: string; duracao_minutos: number | null } = {
    curso_id: null,
    titulo: '',
    descricao: '',
    data_aula: '',
    duracao_minutos: null
  };

  excluindoVideoId: number | null = null;
  erroExcluirVideo = '';

  // Modal Editar Aula
  modalEditarAberto = false;
  aulaEmEdicao: Aula | null = null;
  salvandoEdicao = false;
  erroEdicaoAula = '';
  formEdicao: { titulo: string; descricao: string; data_aula: string; duracao_minutos: number | null; ativo: boolean } = {
    titulo: '',
    descricao: '',
    data_aula: '',
    duracao_minutos: null,
    ativo: true
  };

  // Modal Upload
  modalUploadAberto = false;
  aulaParaUpload: Aula | null = null;
  arquivoSelecionado: File | null = null;
  uploadEmProgresso = false;
  percentualUpload = 0;
  uploadSucesso = false;
  erroUpload = '';
  dragover = false;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.carregarAulas();
    this.carregarCursos();
  }

  carregarAulas(): void {
    this.carregando = true;
    this.erro = '';

    this.http.get<Aula[]>('http://localhost:8000/api/aulas/').subscribe({
      next: (aulas) => {
        this.aulas = aulas || [];
        this.carregando = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar aulas:', error);
        this.erro = 'Erro ao carregar aulas. Tente novamente.';
        this.carregando = false;
      }
    });
  }

  verAula(aula: Aula): void {
    this.aulaDetalhes = null;
    this.carregandoDetalhes = true;
    this.modalVerAberto = true;

    this.http.get<any>(`http://localhost:8000/api/aulas/${aula.id}`).subscribe({
      next: (detalhe) => {
        this.aulaDetalhes = detalhe;
        this.carregandoDetalhes = false;
      },
      error: () => {
        this.carregandoDetalhes = false;
      }
    });
  }

  fecharVerAula(): void {
    this.modalVerAberto = false;
    this.aulaDetalhes = null;
  }

  getVideoUrl(caminhoArquivo: string): string {
    // caminho_arquivo é o path completo no servidor (ex: uploads\videos\aula_1_video_123.mp4)
    // Extrai só o nome do arquivo e serve pelo endpoint estático /uploads/videos/
    const filename = caminhoArquivo.replace(/\\/g, '/').split('/').pop() || '';
    return `http://localhost:8000/uploads/videos/${filename}`;
  }

  formatarDuracao(segundos: number): string {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  }

  /**
   * Converte o campo `descricao` (JSON TipTap ou texto/HTML legado) para HTML
   * seguro para renderizar com [innerHTML].
   */
  renderDescricao(descricao: string): string {
    if (!descricao) return '';
    try {
      const parsed = JSON.parse(descricao);
      if (parsed?.type === 'doc') {
        return generateHTML(parsed, [StarterKit]);
      }
    } catch { /* não é JSON TipTap */ }
    return descricao; // HTML / texto puro legado
  }

  carregarCursos(): void {
    this.http.get<Curso[]>('http://localhost:8000/api/cursos/').subscribe({
      next: (cursos) => { this.cursos = cursos || []; },
      error: () => {}
    });
  }

  abrirFormulario(): void {
    this.router.navigate(['/admin/aulas/nova']);
  }

  fecharNovaAula(): void {
    if (this.criandoNovaAula) return;
    this.modalNovaAulaAberto = false;
  }

  salvarNovaAula(): void {
    if (!this.formNovaAula.curso_id) {
      this.erroNovaAula = 'Selecione um curso.';
      return;
    }
    if (!this.formNovaAula.titulo.trim()) {
      this.erroNovaAula = 'O título da aula é obrigatório.';
      return;
    }
    if (!this.formNovaAula.data_aula) {
      this.erroNovaAula = 'A data e hora da aula são obrigatórias.';
      return;
    }

    this.criandoNovaAula = true;
    this.erroNovaAula = '';

    const payload = {
      curso_id: this.formNovaAula.curso_id,
      titulo: this.formNovaAula.titulo.trim(),
      descricao: this.formNovaAula.descricao.trim() || null,
      data_aula: new Date(this.formNovaAula.data_aula).toISOString(),
      duracao_minutos: this.formNovaAula.duracao_minutos || null
    };

    this.http.post('http://localhost:8000/api/aulas/', payload).subscribe({
      next: () => {
        this.criandoNovaAula = false;
        this.modalNovaAulaAberto = false;
        this.carregarAulas();
      },
      error: (err: any) => {
        console.error('Erro ao criar aula:', err);
        this.criandoNovaAula = false;
        this.erroNovaAula = err?.error?.detail || 'Erro ao criar aula. Tente novamente.';
      }
    });
  }

  excluirVideo(aula: Aula, video: any): void {
    if (!confirm(`Excluir o vídeo "${video.arquivo_nome}"? Esta ação não pode ser desfeita.`)) return;

    this.excluindoVideoId = video.id;
    this.erroExcluirVideo = '';

    this.http.delete(`http://localhost:8000/api/aulas/${aula.id}/video/${video.id}`).subscribe({
      next: () => {
        this.excluindoVideoId = null;
        // Remover vídeo da lista local da aula em edição
        if (this.aulaEmEdicao?.videos) {
          this.aulaEmEdicao.videos = this.aulaEmEdicao.videos.filter((v: any) => v.id !== video.id);
        }
        // Atualizar tabela principal
        this.carregarAulas();
      },
      error: (err: any) => {
        this.excluindoVideoId = null;
        this.erroExcluirVideo = err?.error?.detail || 'Erro ao excluir vídeo. Tente novamente.';
      }
    });
  }

  editarAula(aula: Aula): void {
    this.router.navigate(['/admin/aulas', aula.id, 'editar']);
  }

  _editarAulaLegado(aula: Aula): void {
    this.aulaEmEdicao = aula;
    this.erroEdicaoAula = '';
    const dataLocal = aula.data_aula
      ? new Date(aula.data_aula).toISOString().slice(0, 16)
      : '';
    this.formEdicao = {
      titulo: aula.titulo,
      descricao: aula.descricao || '',
      data_aula: dataLocal,
      duracao_minutos: aula.duracao_minutos || null,
      ativo: true
    };
    this.modalEditarAberto = true;
  }

  fecharEdicaoAula(): void {
    if (this.salvandoEdicao) return;
    this.modalEditarAberto = false;
    this.aulaEmEdicao = null;
  }

  salvarEdicaoAula(): void {
    if (!this.formEdicao.titulo.trim()) {
      this.erroEdicaoAula = 'O título da aula é obrigatório.';
      return;
    }
    if (!this.formEdicao.data_aula) {
      this.erroEdicaoAula = 'A data e hora da aula são obrigatórias.';
      return;
    }

    this.salvandoEdicao = true;
    this.erroEdicaoAula = '';

    const payload = {
      titulo: this.formEdicao.titulo.trim(),
      descricao: this.formEdicao.descricao.trim() || null,
      data_aula: new Date(this.formEdicao.data_aula).toISOString(),
      duracao_minutos: this.formEdicao.duracao_minutos || null,
      ativo: this.formEdicao.ativo
    };

    this.http.put(`http://localhost:8000/api/aulas/${this.aulaEmEdicao!.id}`, payload).subscribe({
      next: () => {
        this.salvandoEdicao = false;
        this.modalEditarAberto = false;
        this.aulaEmEdicao = null;
        this.carregarAulas();
      },
      error: (err: any) => {
        console.error('Erro ao editar aula:', err);
        this.salvandoEdicao = false;
        this.erroEdicaoAula = err?.error?.detail || 'Erro ao salvar. Tente novamente.';
      }
    });
  }

  deletarAula(aula: Aula): void {
    if (confirm(`Tem certeza que deseja deletar a aula "${aula.titulo}"?`)) {
      alert('Deletar aula - a implementar');
    }
  }

  abrirUploadVideo(aula: Aula): void {
    this.aulaParaUpload = aula;
    this.modalUploadAberto = true;
    this.arquivoSelecionado = null;
    this.uploadSucesso = false;
    this.erroUpload = '';
  }

  fecharModalUpload(): void {
    if (!this.uploadEmProgresso) {
      this.modalUploadAberto = false;
      this.aulaParaUpload = null;
      this.arquivoSelecionado = null;
      this.uploadSucesso = false;
      this.erroUpload = '';
      this.percentualUpload = 0;
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragover = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragover = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragover = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.arquivoSelecionado = files[0];
    }
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      this.arquivoSelecionado = files[0];
    }
  }

  enviarVideo(): void {
    if (!this.aulaParaUpload || !this.arquivoSelecionado) {
      this.erroUpload = 'Selecione um arquivo de vídeo';
      return;
    }

    const maxSize = 500 * 1024 * 1024; // 500 MB
    if (this.arquivoSelecionado.size > maxSize) {
      this.erroUpload = `Arquivo muito grande (${(this.arquivoSelecionado.size / 1024 / 1024).toFixed(2)} MB). Máximo: 500 MB`;
      return;
    }

    // Validar formato
    const nomeArquivo = this.arquivoSelecionado.name.toLowerCase();
    const formatosPermitidos = ['mp4', 'webm', 'avi', 'mov'];
    const extensao = nomeArquivo.split('.').pop();
    
    if (!extensao || !formatosPermitidos.includes(extensao)) {
      this.erroUpload = `Formato não suportado: .${extensao}. Permitidos: ${formatosPermitidos.join(', ')}`;
      return;
    }

    this.uploadEmProgresso = true;
    this.erroUpload = '';
    this.uploadSucesso = false;
    this.percentualUpload = 0;

    const formData = new FormData();
    formData.append('file', this.arquivoSelecionado);

    const url = `http://localhost:8000/api/aulas/${this.aulaParaUpload.id}/upload-video`;

    this.http.post(url, formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: any) => {
        if (event.type === 4) {
          // Upload completo (HttpResponse)
          this.uploadEmProgresso = false;
          this.uploadSucesso = true;
          this.percentualUpload = 100;
          
          // Atualizar lista de aulas
          setTimeout(() => {
            this.carregarAulas();
            this.fecharModalUpload();
          }, 2000);
        } else if (event.type === 1) {
          // Progress event
          const total = event.total;
          const atual = event.loaded;
          this.percentualUpload = Math.round((atual / total) * 100);
        }
      },
      error: (error: any) => {
        console.error('Erro no upload:', error);
        this.uploadEmProgresso = false;
        
        // Tentar extrair mensagem de erro detalhada
        let mensagemErro = 'Erro ao fazer upload do vídeo. Tente novamente.';
        
        if (error.error) {
          if (typeof error.error === 'string') {
            mensagemErro = error.error;
          } else if (error.error.detail) {
            mensagemErro = error.error.detail;
          } else if (error.error.message) {
            mensagemErro = error.error.message;
          }
        }
        
        if (error.status === 0) {
          mensagemErro = 'Erro de conexão. Verifique se o servidor está rodando.';
        } else if (error.status === 401) {
          mensagemErro = 'Não autorizado. Faça login novamente.';
        } else if (error.status === 403) {
          mensagemErro = 'Acesso negado. Você precisa ser admin.';
        } else if (error.status === 404) {
          mensagemErro = 'Aula não encontrada.';
        } else if (error.status === 413) {
          mensagemErro = 'Arquivo muito grande.';
        }
        
        this.erroUpload = mensagemErro;
      }
    });
  }
}
