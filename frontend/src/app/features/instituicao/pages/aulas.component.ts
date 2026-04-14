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
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Gerenciar Aulas</h2>
          <p>Visualize, crie e edite as aulas dos seus cursos.</p>
        </div>
        <button class="btn-primary" (click)="abrirNovaAula()">+ Nova Aula</button>
      </div>

      <!-- Filtro por curso -->
      <div class="filtro-bar" *ngIf="cursos.length > 0">
        <label>Filtrar por curso:</label>
        <select [(ngModel)]="cursoFiltroId" (ngModelChange)="onFiltroChange($event)" name="filtro_curso">
          <option [ngValue]="null">Todos os cursos</option>
          <option *ngFor="let c of cursos" [ngValue]="c.id">{{ c.nome }}</option>
        </select>
      </div>

      <div class="success-banner" *ngIf="mensagemSucesso">{{ mensagemSucesso }}</div>

      <!-- Tabela de aulas -->
      <div class="table-card" *ngIf="aulas.length > 0">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Curso</th>
              <th>Data</th>
              <th>Duração</th>
              <th>Vídeo</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let aula of aulas">
              <td class="aula-titulo">{{ aula.titulo }}</td>
              <td class="aula-curso">{{ getCursoNome(aula.curso_id) }}</td>
              <td>{{ aula.data_aula | date:'dd/MM/yyyy HH:mm' }}</td>
              <td>{{ aula.duracao_minutos ? aula.duracao_minutos + 'min' : '—' }}</td>
              <td>
                <span class="video-badge sim" *ngIf="aula.videos && aula.videos.length > 0">✓ Sim</span>
                <span class="video-badge nao" *ngIf="!aula.videos || aula.videos.length === 0">✗ Não</span>
              </td>
              <td>
                <span class="status-badge" [ngClass]="aula.ativo ? 'ativo' : 'inativo'">
                  {{ aula.ativo ? 'Ativa' : 'Inativa' }}
                </span>
              </td>
              <td class="actions">
                <button class="btn-sm btn-ver" title="Ver detalhes" (click)="verAula(aula)">👁️</button>
                <button class="btn-sm btn-edit" title="Editar" (click)="editarAula(aula)">✏️</button>
                <button class="btn-sm btn-video" title="Upload de vídeo" (click)="abrirUpload(aula)">🎥</button>
                <button class="btn-sm btn-delete" title="Deletar" (click)="abrirDelecao(aula)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="no-data" *ngIf="aulas.length === 0 && !carregando">
        <p>Nenhuma aula encontrada. Clique em "+ Nova Aula" para começar.</p>
      </div>

      <div class="loading" *ngIf="carregando">
        <div class="spinner"></div>
        <p>Carregando aulas...</p>
      </div>

      <div class="error-box" *ngIf="erro">
        <p>{{ erro }}</p>
        <button (click)="carregarAulas()">Tentar novamente</button>
      </div>

      <!-- ====== Modal Ver Aula ====== -->
      <div class="modal-overlay" *ngIf="modalVerAberto" (click)="fecharVer()">
        <div class="modal-content modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>👁️ Detalhes da Aula</h3>
            <button class="btn-close" (click)="fecharVer()">✕</button>
          </div>
          <div class="modal-body" *ngIf="aulaDetalhe">
            <div class="detalhe-card">
              <div class="detalhe-row"><span class="dl">Título</span><span>{{ aulaDetalhe.titulo }}</span></div>
              <div class="detalhe-row" *ngIf="aulaDetalhe.descricao"><span class="dl">Descrição</span><span>{{ aulaDetalhe.descricao }}</span></div>
              <div class="detalhe-row"><span class="dl">Curso</span><span>{{ getCursoNome(aulaDetalhe.curso_id) }}</span></div>
              <div class="detalhe-row"><span class="dl">Data</span><span>{{ aulaDetalhe.data_aula | date:'dd/MM/yyyy HH:mm' }}</span></div>
              <div class="detalhe-row" *ngIf="aulaDetalhe.duracao_minutos"><span class="dl">Duração</span><span>{{ aulaDetalhe.duracao_minutos }} min</span></div>
              <div class="detalhe-row"><span class="dl">Status</span>
                <span class="status-badge" [ngClass]="aulaDetalhe.ativo ? 'ativo' : 'inativo'">{{ aulaDetalhe.ativo ? 'Ativa' : 'Inativa' }}</span>
              </div>
            </div>

            <div class="videos-section">
              <h4>🎥 Vídeos ({{ aulaDetalhe.videos?.length ?? 0 }})</h4>
              <div class="sem-video" *ngIf="!aulaDetalhe.videos || aulaDetalhe.videos.length === 0">
                <p>Nenhum vídeo enviado.</p>
                <button class="btn-primary" (click)="abrirUpload(aulaDetalhe); fecharVer()">🎥 Enviar Vídeo</button>
              </div>
              <div class="video-item" *ngFor="let v of aulaDetalhe.videos">
                <div class="video-player-wrap">
                  <video controls [src]="getVideoUrl(v.caminho_arquivo)" class="video-player" preload="metadata">
                    Seu navegador não suporta reprodução de vídeo.
                  </video>
                </div>
                <div class="video-meta">
                  <span><strong>Arquivo:</strong> {{ v.arquivo_nome }}</span>
                  <span *ngIf="v.tamanho_bytes"><strong>Tamanho:</strong> {{ (v.tamanho_bytes / 1024 / 1024).toFixed(2) }} MB</span>
                  <span *ngIf="v.duracao_segundos"><strong>Duração:</strong> {{ formatarDuracao(v.duracao_segundos) }}</span>
                  <span *ngIf="v.formato"><strong>Formato:</strong> {{ v.formato }}</span>
                </div>
                <div class="video-actions">
                  <button class="btn-excluir-video" (click)="excluirVideo(aulaDetalhe!, v)" [disabled]="excluindoVideoId === v.id">
                    {{ excluindoVideoId === v.id ? 'Excluindo...' : '🗑️ Excluir vídeo' }}
                  </button>
                </div>
                <div class="form-error" *ngIf="erroExcluirVideo">{{ erroExcluirVideo }}</div>
              </div>
            </div>
          </div>
          <div class="loading" *ngIf="carregandoDetalhe" style="padding:40px">
            <div class="spinner"></div><p>Carregando...</p>
          </div>
        </div>
      </div>

      <!-- ====== Modal Nova Aula ====== -->
      <div class="modal-overlay" *ngIf="modalNovaAberto" (click)="fecharNovaAula()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>📚 Nova Aula</h3>
            <button class="btn-close" (click)="fecharNovaAula()">✕</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="salvarNovaAula()">
              <div class="form-row">
                <label>Curso *</label>
                <select [(ngModel)]="formNova.curso_id" name="curso_id" required>
                  <option [ngValue]="null" disabled>Selecione um curso...</option>
                  <option *ngFor="let c of cursos" [ngValue]="c.id">{{ c.nome }}</option>
                </select>
              </div>
              <div class="form-row">
                <label>Título *</label>
                <input type="text" [(ngModel)]="formNova.titulo" name="titulo" required placeholder="Ex: Aula 1 - Introdução" />
              </div>
              <div class="form-row">
                <label>Descrição</label>
                <textarea [(ngModel)]="formNova.descricao" name="descricao" placeholder="Conteúdo da aula..."></textarea>
              </div>
              <div class="form-row">
                <label>Data e Hora *</label>
                <input type="datetime-local" [(ngModel)]="formNova.data_aula" name="data_aula" required />
              </div>
              <div class="form-row">
                <label>Duração (minutos)</label>
                <input type="number" [(ngModel)]="formNova.duracao_minutos" name="duracao_minutos" min="1" placeholder="Ex: 60" />
              </div>
              <div class="form-error" *ngIf="erroNova">{{ erroNova }}</div>
              <div class="modal-footer">
                <button type="button" class="btn-cancelar" (click)="fecharNovaAula()" [disabled]="salvandoNova">Cancelar</button>
                <button type="submit" class="btn-enviar" [disabled]="salvandoNova">{{ salvandoNova ? 'Salvando...' : '💾 Salvar' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- ====== Modal Editar Aula ====== -->
      <div class="modal-overlay" *ngIf="modalEditarAberto" (click)="fecharEditar()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>✏️ Editar Aula</h3>
            <button class="btn-close" (click)="fecharEditar()">✕</button>
          </div>
          <div class="modal-body">
            <div class="video-atual-section" *ngIf="aulaEmEdicao && aulaEmEdicao.videos && aulaEmEdicao.videos.length > 0">
              <h4>🎥 Vídeo Atual</h4>
              <div class="video-atual-item" *ngFor="let v of aulaEmEdicao.videos">
                <div class="video-atual-info">
                  <span class="video-nome">📹 {{ v.arquivo_nome }}</span>
                  <span class="video-tamanho" *ngIf="v.tamanho_bytes">{{ (v.tamanho_bytes / 1024 / 1024).toFixed(2) }} MB</span>
                </div>
                <button class="btn-excluir-video" (click)="excluirVideoEdicao(aulaEmEdicao!, v)" [disabled]="excluindoVideoId === v.id">
                  {{ excluindoVideoId === v.id ? 'Excluindo...' : '🗑️ Excluir' }}
                </button>
              </div>
              <div class="form-error" *ngIf="erroExcluirVideo">{{ erroExcluirVideo }}</div>
              <hr class="divisor" />
            </div>

            <form (ngSubmit)="salvarEdicao()">
              <div class="form-row">
                <label>Título *</label>
                <input type="text" [(ngModel)]="formEditar.titulo" name="titulo" required />
              </div>
              <div class="form-row">
                <label>Descrição</label>
                <textarea [(ngModel)]="formEditar.descricao" name="descricao"></textarea>
              </div>
              <div class="form-row">
                <label>Data e Hora *</label>
                <input type="datetime-local" [(ngModel)]="formEditar.data_aula" name="data_aula" required />
              </div>
              <div class="form-row">
                <label>Duração (minutos)</label>
                <input type="number" [(ngModel)]="formEditar.duracao_minutos" name="duracao_minutos" min="1" />
              </div>
              <div class="form-row">
                <label>Status</label>
                <select [(ngModel)]="formEditar.ativo" name="ativo">
                  <option [ngValue]="true">Ativa</option>
                  <option [ngValue]="false">Inativa</option>
                </select>
              </div>
              <div class="form-error" *ngIf="erroEditar">{{ erroEditar }}</div>
              <div class="modal-footer">
                <button type="button" class="btn-cancelar" (click)="fecharEditar()" [disabled]="salvandoEditar">Cancelar</button>
                <button type="submit" class="btn-enviar" [disabled]="salvandoEditar">{{ salvandoEditar ? 'Salvando...' : '💾 Salvar' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- ====== Modal Confirmar Exclusão ====== -->
      <div class="modal-overlay" *ngIf="aulaParaDeletar" (click)="cancelarDelecao()">
        <div class="modal-content modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>⚠️ Confirmar Exclusão</h3>
            <button class="btn-close" (click)="cancelarDelecao()">✕</button>
          </div>
          <div class="modal-body">
            <p>Tem certeza que deseja excluir a aula <strong>{{ aulaParaDeletar.titulo }}</strong>?</p>
            <p class="aviso-red">Esta ação não pode ser desfeita.</p>
            <div class="form-error" *ngIf="erroDelecao">{{ erroDelecao }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancelar" (click)="cancelarDelecao()" [disabled]="deletando">Cancelar</button>
            <button class="btn-danger" (click)="confirmarDelecao()" [disabled]="deletando">{{ deletando ? 'Deletando...' : '🗑️ Deletar' }}</button>
          </div>
        </div>
      </div>

      <!-- ====== Modal Upload de Vídeo ====== -->
      <div class="modal-overlay" *ngIf="modalUploadAberto" (click)="fecharUpload()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>🎥 Upload de Vídeo</h3>
            <button class="btn-close" (click)="fecharUpload()">✕</button>
          </div>
          <div class="modal-body">
            <p class="aula-nome-label" *ngIf="aulaParaUpload"><strong>Aula:</strong> {{ aulaParaUpload.titulo }}</p>

            <div class="upload-area"
              [class.dragover]="dragover"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onFileDrop($event)">
              <div class="upload-content">
                <span class="upload-icon">📹</span>
                <p><strong>Arraste um vídeo aqui</strong></p>
                <p class="small-text">ou</p>
                <label class="btn-selecionar">
                  Selecionar arquivo
                  <input type="file" (change)="onFileSelected($event)" accept="video/*" style="display:none" />
                </label>
              </div>
              <p class="formatos">
                <small>Formatos: MP4, WebM, AVI, MOV (máx. 500 MB)</small>
              </p>
            </div>

            <div class="arquivo-info" *ngIf="arquivoSelecionado">
              <p><strong>Arquivo:</strong> {{ arquivoSelecionado.name }}</p>
              <p><strong>Tamanho:</strong> {{ (arquivoSelecionado.size / 1024 / 1024).toFixed(2) }} MB</p>
            </div>

            <div class="progresso" *ngIf="uploadEmProgresso">
              <div class="progress-bar"><div class="progress-fill" [style.width.%]="percentualUpload"></div></div>
              <p>{{ percentualUpload }}% — Enviando...</p>
            </div>

            <div class="success-banner" *ngIf="uploadSucesso">✓ Vídeo enviado com sucesso!</div>
            <div class="form-error" *ngIf="erroUpload">{{ erroUpload }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancelar" (click)="fecharUpload()" [disabled]="uploadEmProgresso">Cancelar</button>
            <button class="btn-enviar" (click)="enviarVideo()" [disabled]="!arquivoSelecionado || uploadEmProgresso">
              {{ uploadEmProgresso ? 'Enviando...' : 'Enviar Vídeo' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1200px; margin: 0 auto; }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 16px; margin-bottom: 24px;
    }
    .page-header h2 { margin: 0 0 6px; }
    .page-header p { margin: 0; color: #667085; }

    .filtro-bar {
      display: flex; align-items: center; gap: 12px;
      background: #fff; padding: 14px 18px; border-radius: 12px;
      box-shadow: 0 2px 8px rgba(15,23,42,0.06); margin-bottom: 20px;
      font-size: 14px; font-weight: 600; color: #344054;
    }
    .filtro-bar select {
      border: 1px solid #d0d5dd; border-radius: 8px; padding: 7px 12px;
      font-size: 14px; min-width: 220px;
    }

    .success-banner {
      background: #ecfdf3; color: #065f46; border-radius: 12px;
      padding: 12px 16px; margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(15,23,42,0.06);
    }

    .table-card {
      background: #fff; border-radius: 14px; overflow: hidden;
      box-shadow: 0 8px 24px rgba(15,23,42,0.08);
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 14px 16px; text-align: left; border-bottom: 1px solid #edf2f7; vertical-align: middle; }
    th { background: #f8fafc; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #475467; }
    tbody tr:hover { background: #f9fafb; }

    .aula-titulo { font-weight: 600; color: #101828; }
    .aula-curso { color: #667085; font-size: 13px; }

    .video-badge { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .video-badge.sim { background: #d1fae5; color: #065f46; }
    .video-badge.nao { background: #f3f4f6; color: #9ca3af; }

    .status-badge { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; display: inline-flex; }
    .status-badge.ativo { background: #d1fae5; color: #065f46; }
    .status-badge.inativo { background: #fee2e2; color: #991b1b; }

    .actions { display: flex; gap: 8px; }
    .btn-sm {
      background: none; border: none; cursor: pointer;
      font-size: 16px; padding: 4px 8px; transition: transform 0.15s;
    }
    .btn-sm:hover { transform: scale(1.2); }
    .btn-ver { color: #7c3aed; }
    .btn-edit { color: #3498db; }
    .btn-video { color: #e74c3c; }
    .btn-delete { color: #95a5a6; }

    .btn-primary {
      background: var(--primary); color: white; border: none;
      padding: 10px 20px; border-radius: 10px; cursor: pointer;
      font-size: 14px; font-weight: 600; transition: background 0.2s;
    }
    .btn-primary:hover { background: color-mix(in srgb, var(--primary) 80%, black); }

    .no-data {
      background: #fff; padding: 60px 20px; text-align: center;
      border-radius: 14px; box-shadow: 0 8px 24px rgba(15,23,42,0.08); color: #999;
    }
    .loading { text-align: center; padding: 60px 20px; color: #999; }
    .spinner {
      display: inline-block; width: 40px; height: 40px;
      border: 4px solid #f3f3f3; border-top: 4px solid var(--primary);
      border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    .error-box {
      background: #fef2f2; color: #b42318; padding: 16px; border-radius: 12px;
      border: 1px solid #fecdca; text-align: center;
    }
    .error-box button {
      margin-top: 10px; padding: 8px 16px; background: #b42318;
      color: white; border: none; border-radius: 6px; cursor: pointer;
    }

    /* MODAIS */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-content {
      background: white; border-radius: 14px; box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      max-width: 520px; width: 92%; max-height: 90vh; overflow-y: auto;
    }
    .modal-lg { max-width: 760px; }
    .modal-sm { max-width: 400px; }

    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px; border-bottom: 1px solid #eee;
    }
    .modal-header h3 { margin: 0; font-size: 18px; color: #101828; }
    .btn-close {
      background: none; border: none; font-size: 22px; cursor: pointer;
      color: #98a2b3; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
    }
    .btn-close:hover { color: #344054; }
    .modal-body { padding: 20px 24px; }
    .modal-footer {
      display: flex; gap: 10px; justify-content: flex-end;
      padding: 16px 24px; border-top: 1px solid #eee;
    }

    .form-row { display: flex; flex-direction: column; margin-bottom: 14px; }
    .form-row label { font-weight: 600; margin-bottom: 6px; font-size: 13px; color: #344054; }
    .form-row input, .form-row textarea, .form-row select {
      padding: 9px 12px; border: 1px solid #d0d5dd; border-radius: 8px; font-size: 14px;
    }
    .form-row textarea { min-height: 80px; resize: vertical; }
    .form-error {
      margin-top: 12px; background: #fef3f2; border: 1px solid #fecdca;
      border-radius: 8px; padding: 10px 12px; color: #b42318; font-size: 13px;
    }

    .btn-cancelar {
      padding: 10px 20px; background: #f2f4f7; border: 1px solid #d0d5dd;
      border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;
    }
    .btn-cancelar:hover:not(:disabled) { background: #e4e7ec; }
    .btn-cancelar:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-enviar {
      padding: 10px 20px; background: var(--primary); color: white; border: none;
      border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;
    }
    .btn-enviar:hover:not(:disabled) { background: #155a32; }
    .btn-enviar:disabled { background: #ccc; cursor: not-allowed; }
    .btn-danger {
      padding: 10px 20px; background: #dc3545; color: white; border: none;
      border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;
    }
    .btn-danger:hover:not(:disabled) { background: #c82333; }
    .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

    /* detalhe */
    .detalhe-card { background: #f8f9fa; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; }
    .detalhe-row { display: flex; gap: 14px; padding: 7px 0; border-bottom: 1px solid #eee; font-size: 14px; }
    .detalhe-row:last-child { border-bottom: none; }
    .dl { font-weight: 600; color: #555; min-width: 90px; }

    .videos-section h4 { margin: 0 0 14px; color: #101828; font-size: 16px; }
    .sem-video { background: #f9fafb; border-radius: 8px; padding: 24px; text-align: center; color: #999; }
    .video-item { border: 1px solid #eee; border-radius: 10px; overflow: hidden; margin-bottom: 14px; }
    .video-player-wrap { background: #000; }
    .video-player { width: 100%; max-height: 340px; display: block; }
    .video-meta { display: flex; flex-wrap: wrap; gap: 10px 24px; padding: 12px 14px; background: #f8f9fa; font-size: 13px; color: #555; }
    .video-actions { padding: 8px 14px; background: #f8f9fa; border-top: 1px solid #eee; }
    .btn-excluir-video {
      background: #dc3545; color: white; border: none; padding: 6px 14px;
      border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;
    }
    .btn-excluir-video:hover:not(:disabled) { background: #c82333; }
    .btn-excluir-video:disabled { opacity: 0.6; cursor: not-allowed; }

    .video-atual-section { margin-bottom: 18px; }
    .video-atual-section h4 { margin: 0 0 10px; font-size: 15px; }
    .video-atual-item {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 10px 14px; flex-wrap: wrap;
    }
    .video-atual-info { display: flex; flex-direction: column; gap: 2px; }
    .video-nome { font-size: 13px; font-weight: 600; color: #333; word-break: break-all; }
    .video-tamanho { font-size: 12px; color: #888; }
    .divisor { border: none; border-top: 1px solid #eee; margin: 16px 0; }

    .aviso-red { font-size: 13px; color: #b42318; background: #fef3f2; padding: 8px 12px; border-radius: 6px; }

    /* upload */
    .aula-nome-label { margin: 0 0 16px; color: #666; font-size: 14px; }
    .upload-area {
      border: 2px dashed #d0d5dd; border-radius: 10px; padding: 30px;
      text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 14px;
    }
    .upload-area:hover, .upload-area.dragover { border-color: var(--primary); background: #f0fdf4; }
    .upload-content p { margin: 8px 0; color: #333; }
    .upload-icon { font-size: 44px; display: block; margin-bottom: 8px; }
    .small-text { font-size: 12px; color: #999; }
    .btn-selecionar {
      display: inline-block; background: var(--primary); color: white; padding: 9px 18px;
      border-radius: 8px; cursor: pointer; font-weight: 600;
    }
    .btn-selecionar:hover { background: color-mix(in srgb, var(--primary) 80%, black); }
    .formatos { margin: 10px 0 0; color: #999; font-size: 12px; }
    .arquivo-info { background: #f2f4f7; padding: 12px 14px; border-radius: 8px; margin-bottom: 14px; font-size: 13px; }
    .arquivo-info p { margin: 4px 0; }
    .progresso { margin-bottom: 14px; }
    .progress-bar { height: 6px; background: #e9ecef; border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--secondary)); transition: width 0.3s; }
    .progresso p { margin: 0; font-size: 13px; color: #666; }

    @media (max-width: 900px) {
      .table-card { overflow-x: auto; }
      .actions { flex-wrap: wrap; }
    }
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
