import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { RichTextEditorComponent } from '../../../shared/components';
import { VideoService } from '../../../core/services/video.service';
import { environment } from '../../../../environments/environment';

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
    <div class="page-container">
      <div class="page-header">
        <h2>Gerenciar Aulas & Vídeos</h2>
        <button class="btn-primary" (click)="abrirFormulario()">+ Nova Aula</button>
      </div>

      <div class="aulas-table" *ngIf="aulas.length > 0">
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
            <tr *ngFor="let aula of aulas">
              <td class="aula-titulo">{{ aula.titulo }}</td>
              <td>{{ aula.duracao_minutos }}min</td>
              <td>{{ aula.data_aula | date:'dd/MM/yyyy HH:mm' }}</td>
              <td>
                <span class="video-status" *ngIf="aula.videos && aula.videos.length > 0" style="color: #28A745;">
                  ✓ Sim
                </span>
                <span class="video-status" *ngIf="!aula.videos || aula.videos.length === 0" style="color: #999;">
                  ✗ Não
                </span>
              </td>
              <td class="actions">
                <button class="btn-sm btn-view" title="Ver Aula" (click)="verAula(aula)">👁️</button>
                <button class="btn-sm btn-edit" title="Editar" (click)="editarAula(aula)">✏️</button>
                <button class="btn-sm btn-video" title="Upload de Vídeo" (click)="abrirUploadVideo(aula)">🎥</button>
                <button class="btn-sm btn-delete" title="Deletar" (click)="deletarAula(aula)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="no-data" *ngIf="aulas.length === 0 && !carregando">
        <p>Nenhuma aula criada ainda. Clique em "Nova Aula" para começar.</p>
      </div>

      <div class="loading" *ngIf="carregando">
        <div class="spinner"></div>
        <p>Carregando aulas...</p>
      </div>

      <div class="error" *ngIf="erro">
        <p>{{ erro }}</p>
        <button (click)="carregarAulas()">Tentar novamente</button>
      </div>

      <!-- Modal Ver Aula -->
      <div class="modal-overlay" *ngIf="modalVerAberto" (click)="fecharVerAula()">
        <div class="modal-content modal-content-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>👁️ Detalhes da Aula</h3>
            <button class="btn-close" (click)="fecharVerAula()">✕</button>
          </div>
          <div class="modal-body" *ngIf="aulaDetalhes">
            <div class="detalhe-info">
              <div class="detalhe-row">
                <span class="detalhe-label">Título</span>
                <span class="detalhe-valor">{{ aulaDetalhes.titulo }}</span>
              </div>
              <div class="detalhe-row" *ngIf="aulaDetalhes.descricao">
                <span class="detalhe-label">Descrição</span>
                <span class="detalhe-valor rich-content" [innerHTML]="renderDescricao(aulaDetalhes.descricao)"></span>
              </div>
              <div class="detalhe-row">
                <span class="detalhe-label">Data</span>
                <span class="detalhe-valor">{{ aulaDetalhes.data_aula | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <div class="detalhe-row" *ngIf="aulaDetalhes.duracao_minutos">
                <span class="detalhe-label">Duração</span>
                <span class="detalhe-valor">{{ aulaDetalhes.duracao_minutos }} minutos</span>
              </div>
              <div class="detalhe-row">
                <span class="detalhe-label">Status</span>
                <span class="detalhe-valor">
                  <span class="badge" [ngClass]="aulaDetalhes.ativo ? 'badge-ativo' : 'badge-inativo'">
                    {{ aulaDetalhes.ativo ? '✓ Ativa' : '✗ Inativa' }}
                  </span>
                </span>
              </div>
            </div>

            <div class="videos-section">
              <h4>🎥 Vídeos ({{ aulaDetalhes.videos.length }})</h4>

              <div class="sem-video" *ngIf="!aulaDetalhes.videos || aulaDetalhes.videos.length === 0">
                <p>Nenhum vídeo enviado para esta aula.</p>
                <button class="btn-primary" style="margin-top:8px;" (click)="abrirUploadVideo(aulaDetalhes!); fecharVerAula()">🎥 Enviar Vídeo</button>
              </div>

              <div class="video-item" *ngFor="let v of aulaDetalhes.videos">
                <div class="video-player-wrap">
                  <video controls [src]="getVideoUrl(v.caminho_arquivo) | async" class="video-player" preload="metadata">
                    Seu navegador não suporta reprodução de vídeo.
                  </video>
                </div>
                <div class="video-meta">
                  <span><strong>Arquivo:</strong> {{ v.arquivo_nome }}</span>
                  <span *ngIf="v.tamanho_bytes"><strong>Tamanho:</strong> {{ (v.tamanho_bytes / 1024 / 1024).toFixed(2) }} MB</span>
                  <span *ngIf="v.duracao_segundos"><strong>Duração:</strong> {{ formatarDuracao(v.duracao_segundos) }}</span>
                  <span *ngIf="v.formato"><strong>Formato:</strong> {{ v.formato }}</span>
                  <span><strong>Upload:</strong> {{ v.data_upload | date:'dd/MM/yyyy HH:mm' }}</span>
                  <span class="badge" [ngClass]="v.status === 'ativo' ? 'badge-ativo' : 'badge-inativo'">{{ v.status }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="loading" *ngIf="carregandoDetalhes" style="padding: 40px;">
            <div class="spinner"></div>
            <p>Carregando detalhes...</p>
          </div>
        </div>
      </div>

      <!-- Modal Nova Aula -->
      <div class="modal-overlay" *ngIf="modalNovaAulaAberto" (click)="fecharNovaAula()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>📚 Nova Aula</h3>
            <button class="btn-close" (click)="fecharNovaAula()">✕</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="salvarNovaAula()">
              <div class="form-row">
                <label>Curso *</label>
                <select [(ngModel)]="formNovaAula.curso_id" name="curso_id" required>
                  <option [ngValue]="null" disabled>Selecione um curso...</option>
                  <option *ngFor="let c of cursos" [ngValue]="c.id">{{ c.nome }}</option>
                </select>
              </div>
              <div class="form-row">
                <label>Título *</label>
                <input type="text" [(ngModel)]="formNovaAula.titulo" name="titulo" required placeholder="Ex: Aula 1 - Introdução" />
              </div>
              <div class="form-row">
                <label>Descrição</label>
                <app-rich-text-editor
                  [content]="formNovaAula.descricao"
                  placeholder="Conteúdo da aula..."
                  (contentChange)="formNovaAula.descricao = $event"
                />
              </div>
              <div class="form-row">
                <label>Data e Hora da Aula *</label>
                <input type="datetime-local" [(ngModel)]="formNovaAula.data_aula" name="data_aula" required />
              </div>
              <div class="form-row">
                <label>Duração (minutos)</label>
                <input type="number" [(ngModel)]="formNovaAula.duracao_minutos" name="duracao_minutos" min="1" placeholder="Ex: 60" />
              </div>
              <div class="form-error" *ngIf="erroNovaAula">{{ erroNovaAula }}</div>
              <div class="modal-footer" style="padding: 16px 0 0 0; border-top: 1px solid #eee; margin-top: 16px;">
                <button type="button" class="btn-cancelar" (click)="fecharNovaAula()" [disabled]="criandoNovaAula">Cancelar</button>
                <button type="submit" class="btn-enviar" [disabled]="criandoNovaAula">{{ criandoNovaAula ? 'Salvando...' : '💾 Salvar Aula' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Modal Editar Aula -->
      <div class="modal-overlay" *ngIf="modalEditarAberto" (click)="fecharEdicaoAula()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>✏️ Editar Aula</h3>
            <button class="btn-close" (click)="fecharEdicaoAula()">✕</button>
          </div>
          <div class="modal-body">

            <!-- Seção de Vídeo Atual -->
            <div class="video-atual-section" *ngIf="aulaEmEdicao && aulaEmEdicao.videos && aulaEmEdicao.videos.length > 0">
              <h4>🎥 Vídeo Atual</h4>
              <div class="video-atual-item" *ngFor="let v of aulaEmEdicao.videos">
                <div class="video-atual-info">
                  <span class="video-nome">📹 {{ v.arquivo_nome }}</span>
                  <span class="video-tamanho" *ngIf="v.tamanho_bytes">{{ (v.tamanho_bytes / 1024 / 1024).toFixed(2) }} MB</span>
                </div>
                <button class="btn-excluir-video"
                  (click)="excluirVideo(aulaEmEdicao!, v)"
                  [disabled]="excluindoVideoId === v.id"
                  title="Excluir vídeo">
                  {{ excluindoVideoId === v.id ? 'Excluindo...' : '🗑️ Excluir Vídeo' }}
                </button>
              </div>
              <div class="form-error" *ngIf="erroExcluirVideo">{{ erroExcluirVideo }}</div>
              <hr class="divisor" />
            </div>

            <form (ngSubmit)="salvarEdicaoAula()">
              <div class="form-row">
                <label>Título *</label>
                <input type="text" [(ngModel)]="formEdicao.titulo" name="titulo" required placeholder="Título da aula" />
              </div>
              <div class="form-row">
                <label>Descrição</label>
                <app-rich-text-editor
                  [content]="formEdicao.descricao"
                  placeholder="Conteúdo da aula..."
                  (contentChange)="formEdicao.descricao = $event"
                />
              </div>
              <div class="form-row">
                <label>Data e Hora da Aula *</label>
                <input type="datetime-local" [(ngModel)]="formEdicao.data_aula" name="data_aula" required />
              </div>
              <div class="form-row">
                <label>Duração (minutos)</label>
                <input type="number" [(ngModel)]="formEdicao.duracao_minutos" name="duracao_minutos" min="1" placeholder="Ex: 60" />
              </div>
              <div class="form-row">
                <label>Status</label>
                <select [(ngModel)]="formEdicao.ativo" name="ativo">
                  <option [ngValue]="true">Ativa</option>
                  <option [ngValue]="false">Inativa</option>
                </select>
              </div>
              <div class="form-error" *ngIf="erroEdicaoAula">{{ erroEdicaoAula }}</div>
              <div class="modal-footer" style="padding: 16px 0 0 0; border-top: 1px solid #eee; margin-top: 16px;">
                <button type="button" class="btn-cancelar" (click)="fecharEdicaoAula()" [disabled]="salvandoEdicao">Cancelar</button>
                <button type="submit" class="btn-enviar" [disabled]="salvandoEdicao">{{ salvandoEdicao ? 'Salvando...' : '💾 Salvar' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Modal Upload Vídeo -->
      <div class="modal-overlay" *ngIf="modalUploadAberto" (click)="fecharModalUpload()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Upload de Vídeo</h3>
            <button class="btn-close" (click)="fecharModalUpload()">✕</button>
          </div>

          <div class="modal-body">
            <p class="aula-nome" *ngIf="aulaParaUpload"><strong>Aula:</strong> {{ aulaParaUpload.titulo }}</p>

            <div class="upload-area" 
              [class.dragover]="dragover"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onFileDrop($event)">
              
              <div class="upload-content">
                <span class="upload-icon">📹</span>
                <p><strong>Arraste um vídeo aqui</strong></p>
                <p class="small">ou</p>
                <label class="btn-selecionar">
                  <span>Selecione um arquivo</span>
                  <input type="file" 
                    #fileInput
                    (change)="onFileSelected($event)" 
                    accept="video/*" 
                    style="display: none;">
                </label>
              </div>

              <p class="formatos-suportados">
                <small>Formatos suportados: MP4, WebM, AVI, MOV (máx 500 MB)</small>
              </p>
            </div>

            <div class="arquivo-selecionado" *ngIf="arquivoSelecionado">
              <p><strong>Arquivo:</strong> {{ arquivoSelecionado.name }}</p>
              <p><strong>Tamanho:</strong> {{ (arquivoSelecionado.size / 1024 / 1024).toFixed(2) }} MB</p>
            </div>

            <div class="progresso-upload" *ngIf="uploadEmProgresso">
              <div class="progress-bar">
                <div class="progress" [style.width.%]="percentualUpload"></div>
              </div>
              <p>{{ percentualUpload }}% - Enviando...</p>
            </div>

            <div class="success-message" *ngIf="uploadSucesso">
              <p>✓ Vídeo enviado com sucesso!</p>
            </div>

            <div class="error-message" *ngIf="erroUpload">
              <p>✗ {{ erroUpload }}</p>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancelar" (click)="fecharModalUpload()" [disabled]="uploadEmProgresso">
              Cancelar
            </button>
            <button class="btn-enviar" 
              (click)="enviarVideo()" 
              [disabled]="!arquivoSelecionado || uploadEmProgresso">
              {{ uploadEmProgresso ? 'Enviando...' : 'Enviar Vídeo' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      gap: 15px;
    }

    .page-header h2 {
      margin: 0;
      color: #333;
    }

    .btn-primary {
      background-color: #e74c3c;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: background-color 0.2s;
      white-space: nowrap;
    }

    .btn-primary:hover {
      background-color: #c0392b;
    }

    .aulas-table {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: #f5f5f5;
      border-bottom: 2px solid #ddd;
    }

    th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: #333;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      padding: 15px;
      border-bottom: 1px solid #eee;
      font-size: 14px;
    }

    tbody tr:hover {
      background-color: #f9f9f9;
    }

    .aula-titulo {
      font-weight: 600;
      color: #333;
    }

    .video-status {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .btn-sm {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 4px 8px;
      transition: transform 0.2s;
    }

    .btn-sm:hover {
      transform: scale(1.2);
    }

    .btn-edit { color: #3498db; }
    .btn-video { color: #e74c3c; }
    .btn-delete { color: #95a5a6; }
    .btn-view { color: #8e44ad; }

    .no-data {
      background: white;
      padding: 60px 20px;
      text-align: center;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      color: #999;
    }

    .loading {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }

    .spinner {
      display: inline-block;
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #e74c3c;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 15px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      background: #f8d7da;
      color: #721c24;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
      border: 1px solid #f5c6cb;
      text-align: center;
    }

    .error button {
      margin-top: 10px;
      padding: 8px 16px;
      background: #721c24;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }

    .form-row {
      display: flex;
      flex-direction: column;
      margin-bottom: 14px;
    }

    .form-row label {
      font-weight: 600;
      margin-bottom: 6px;
      font-size: 13px;
      color: #333;
    }

    .form-row input,
    .form-row textarea,
    .form-row select {
      padding: 8px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
    }

    .form-row textarea {
      min-height: 80px;
      resize: vertical;
    }

    .form-error {
      margin-top: 4px;
      color: #721c24;
      background: #f8d7da;
      padding: 8px 10px;
      border-radius: 4px;
      border: 1px solid #f5c6cb;
      font-size: 13px;
    }

    /* MODAL STYLES */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-content-lg {
      max-width: 780px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #eee;
    }

    .modal-header h3 {
      margin: 0;
      color: #333;
      font-size: 18px;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #999;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-close:hover {
      color: #333;
    }

    .modal-body {
      padding: 20px;
    }

    .aula-nome {
      margin: 0 0 20px 0;
      color: #666;
      font-size: 14px;
    }

    .detalhe-info {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 24px;
    }

    .detalhe-row {
      display: flex;
      gap: 12px;
      padding: 6px 0;
      border-bottom: 1px solid #eee;
      font-size: 14px;
    }

    .detalhe-row:last-child {
      border-bottom: none;
    }

    .detalhe-label {
      font-weight: 600;
      color: #555;
      min-width: 90px;
    }

    .detalhe-valor {
      color: #333;
    }

    .videos-section h4 {
      margin: 0 0 14px 0;
      color: #333;
      font-size: 16px;
    }

    .sem-video {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 24px;
      text-align: center;
      color: #999;
    }

    .video-item {
      border: 1px solid #eee;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
    }

    .video-player-wrap {
      background: #000;
    }

    .video-player {
      width: 100%;
      max-height: 360px;
      display: block;
    }

    .video-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 24px;
      padding: 12px 14px;
      background: #f8f9fa;
      font-size: 13px;
      color: #555;
    }

    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .badge-ativo {
      background: #d4edda;
      color: #155724;
    }

    .badge-inativo {
      background: #f8d7da;
      color: #721c24;
    }

    .video-atual-section {
      margin-bottom: 20px;
    }

    .video-atual-section h4 {
      margin: 0 0 10px 0;
      font-size: 15px;
      color: #333;
    }

    .video-atual-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 10px 14px;
      flex-wrap: wrap;
    }

    .video-atual-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .video-nome {
      font-size: 13px;
      font-weight: 600;
      color: #333;
      word-break: break-all;
    }

    .video-tamanho {
      font-size: 12px;
      color: #888;
    }

    .btn-excluir-video {
      background: #dc3545;
      color: white;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      transition: background 0.2s;
    }

    .btn-excluir-video:hover:not(:disabled) {
      background: #c82333;
    }

    .btn-excluir-video:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .divisor {
      border: none;
      border-top: 1px solid #eee;
      margin: 16px 0;
    }

    .upload-area {
      border: 2px dashed #ddd;
      border-radius: 8px;
      padding: 30px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 15px;
    }

    .upload-area:hover {
      border-color: #e74c3c;
      background-color: #ffe8e8;
    }

    .upload-area.dragover {
      border-color: #e74c3c;
      background-color: #ffe8e8;
      transform: scale(1.02);
    }

    .upload-content {
      margin-bottom: 15px;
    }

    .upload-icon {
      font-size: 48px;
      display: block;
      margin-bottom: 10px;
    }

    .upload-content p {
      margin: 8px 0;
      color: #333;
    }

    .upload-content p.small {
      font-size: 12px;
      color: #999;
      margin: 5px 0;
    }

    .btn-selecionar {
      display: inline-block;
      background: #e74c3c;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      transition: background-color 0.2s;
    }

    .btn-selecionar:hover {
      background-color: #c0392b;
    }

    .formatos-suportados {
      margin: 10px 0 0 0;
      color: #999;
      font-size: 12px;
    }

    .arquivo-selecionado {
      background: #f0f0f0;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 15px;
    }

    .arquivo-selecionado p {
      margin: 5px 0;
      color: #333;
      font-size: 13px;
    }

    .progresso-upload {
      margin-bottom: 15px;
    }

    .progress-bar {
      height: 4px;
      background: #f0f0f0;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .progress {
      height: 100%;
      background: linear-gradient(90deg, #e74c3c, #c0392b);
      transition: width 0.3s;
    }

    .progresso-upload p {
      margin: 0;
      color: #666;
      font-size: 13px;
    }

    .success-message {
      background: #d4edda;
      color: #155724;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 15px;
      border: 1px solid #c3e6cb;
    }

    .success-message p {
      margin: 0;
      font-size: 14px;
    }

    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 15px;
      border: 1px solid #f5c6cb;
    }

    .error-message p {
      margin: 0;
      font-size: 14px;
    }

    .modal-footer {
      display: flex;
      gap: 10px;
      padding: 15px 20px;
      border-top: 1px solid #eee;
      justify-content: flex-end;
    }

    .btn-cancelar {
      padding: 10px 20px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      transition: background-color 0.2s;
    }

    .btn-cancelar:hover:not(:disabled) {
      background-color: #efefef;
    }

    .btn-cancelar:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-enviar {
      padding: 10px 20px;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      transition: background-color 0.2s;
    }

    .btn-enviar:hover:not(:disabled) {
      background-color: #c0392b;
    }

    .btn-enviar:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      table { font-size: 12px; }
      th, td { padding: 10px; }
      .actions { flex-direction: column; }
      .modal-content { width: 95%; }
    }
  `]
})
export class AdminAulasComponent implements OnInit, OnDestroy {
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

  constructor(
    private http: HttpClient,
    private router: Router,
    private videoService: VideoService,
  ) {}

  ngOnDestroy(): void {
    // Libera as object URLs dos vídeos baixados nesta tela.
    this.videoService.liberar();
  }

  ngOnInit(): void {
    this.carregarAulas();
    this.carregarCursos();
  }

  carregarAulas(): void {
    this.carregando = true;
    this.erro = '';

    this.http.get<Aula[]>(`${environment.apiUrl}/aulas/`).subscribe({
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

    this.http.get<any>(`${environment.apiUrl}/aulas/${aula.id}`).subscribe({
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

  /**
   * Object URL do vídeo, resolvida via download autenticado.
   *
   * O VideoService devolve o MESMO Observable para um dado arquivo (cache
   * interno), então chamar isto do template com `| async` é seguro: não recria
   * a subscription a cada ciclo de detecção de mudanças.
   */
  getVideoUrl(caminhoArquivo: string) {
    return this.videoService.carregar(caminhoArquivo);
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
    this.http.get<Curso[]>(`${environment.apiUrl}/cursos/`).subscribe({
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

    this.http.post(`${environment.apiUrl}/aulas/`, payload).subscribe({
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

    this.http.delete(`${environment.apiUrl}/aulas/${aula.id}/video/${video.id}`).subscribe({
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

    this.http.put(`${environment.apiUrl}/aulas/${this.aulaEmEdicao!.id}`, payload).subscribe({
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

    const url = `${environment.apiUrl}/aulas/${this.aulaParaUpload.id}/upload-video`;

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
