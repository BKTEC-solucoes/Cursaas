import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Video {
  id?: string;
  tipo: 'youtube' | 'upload';
  url: string;
  titulo?: string;
  thumbnail?: string;
  tamanho?: number;
  duracao?: number;
}

@Component({
  selector: 'app-video-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Container Principal -->
    <div class="video-upload-container">
      
      <!-- Abas de seleção -->
      <div class="video-tabs">
        <button
          class="tab-btn"
          [class.active]="modo === 'youtube'"
          (click)="selecionarModo('youtube')"
          type="button"
        >
          <span class="tab-icon">📺</span> Link do YouTube
        </button>
        <button
          class="tab-btn"
          [class.active]="modo === 'upload'"
          (click)="selecionarModo('upload')"
          type="button"
        >
          <span class="tab-icon">📁</span> Upload do PC
        </button>
      </div>

      <!-- Conteúdo das abas -->
      <div class="video-content">
        
        <!-- Tab: YouTube -->
        <div class="tab-pane" [class.active]="modo === 'youtube'">
          <div class="form-group">
            <label class="form-label">
              Cole a URL do YouTube
              <span class="label-optional">(ex: youtube.com/watch?v=...)</span>
            </label>
            <div class="input-group">
              <input
                #youtubeInput
                type="text"
                class="form-input"
                [class.error]="youtubeError"
                placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                [(ngModel)]="youtubeUrl"
                (input)="validarYoutubeUrl()"
                (keydown.enter)="adicionarYoutube()"
                (paste)="onYoutubePaste($event)"
              />
              <button
                class="btn-add"
                [disabled]="!youtubeUrl || youtubeError || adicionando"
                (click)="adicionarYoutube()"
                type="button"
              >
                <span *ngIf="!adicionando">✓ Adicionar</span>
                <span *ngIf="adicionando" class="spinner-mini"></span>
              </button>
            </div>
            <div class="form-messages">
              <p *ngIf="youtubeError" class="error-msg">🚫 {{ youtubeError }}</p>
              <p *ngIf="youtubePreview && !youtubeError" class="success-msg">✓ URL válida detectada</p>
            </div>
          </div>

          <!-- Preview do YouTube -->
          <div *ngIf="youtubePreview" class="youtube-preview">
            <div class="preview-thumb" 
              [style.backgroundImage]="'url(' + youtubePreview.thumbnail + ')'">
              <div class="play-icon">▶</div>
            </div>
            <div class="preview-info">
              <h4>{{ youtubePreview.titulo }}</h4>
              <p class="preview-meta">Duração: {{ youtubePreview.duracao || 'N/A' }}</p>
            </div>
          </div>
        </div>

        <!-- Tab: Upload -->
        <div class="tab-pane" [class.active]="modo === 'upload'">
          <div class="form-group">
            <label class="form-label">Selecione um vídeo para upload</label>
            
            <!-- Drop Zone -->
            <div
              class="dropzone"
              [class.drag-over]="dragOver"
              [class.disabled]="carregando"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave()"
              (drop)="onDropFiles($event)"
              (click)="!carregando && fileInput.click()"
            >
              <input
                #fileInput
                type="file"
                accept="video/mp4,video/webm,video/ogg"
                style="display: none"
                (change)="onFileSelected($event)"
              />
              
              <div class="dropzone-content">
                <div class="dropzone-icon">🎬</div>
                <p class="dropzone-title">Arraste um vídeo aqui ou clique para selecionar</p>
                <p class="dropzone-formats">Formatos: MP4, WebM, OGG (máx. 500MB)</p>
              </div>
            </div>

            <!-- Arquivo selecionado -->
            <div *ngIf="arquivoSelecionado && !carregando" class="arquivo-info">
              <div class="arquivo-icon">📄</div>
              <div class="arquivo-details">
                <p class="arquivo-nome">{{ arquivoSelecionado.name }}</p>
                <p class="arquivo-tamanho">{{ formatarTamanho(arquivoSelecionado.size) }}</p>
              </div>
              <button
                class="btn-remove-file"
                (click)="limparArquivo()"
                type="button"
              >✕</button>
            </div>

            <!-- Barra de progresso -->
            <div *ngIf="carregando" class="progress-container">
              <div class="progress-bar">
                <div class="progress-fill" [style.width]="progressoUpload + '%'"></div>
              </div>
              <div class="progress-info">
                <span class="progress-percent">{{ progressoUpload }}%</span>
                <span class="progress-text">{{ progressoTexto }}</span>
              </div>
            </div>

            <!-- Mensagens de erro -->
            <div *ngIf="uploadError" class="error-box">
              <span class="error-icon">⚠️</span>
              <div>
                <p class="error-title">Erro no upload</p>
                <p class="error-detail">{{ uploadError }}</p>
              </div>
            </div>

            <!-- Botão de upload -->
            <div class="form-actions">
              <button
                class="btn-upload"
                [disabled]="!arquivoSelecionado || carregando || !!uploadError"
                (click)="enviarArquivo()"
                type="button"
              >
                <span *ngIf="!carregando">🚀 Enviar vídeo</span>
                <span *ngIf="carregando">Enviando...</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Lista de vídeos adicionados -->
      <div *ngIf="videos.length > 0" class="videos-list">
        <h3 class="videos-title">Vídeos añadidos</h3>
        <div class="videos-grid">
          <div *ngFor="let video of videos; let i = index" class="video-item">
            <div class="video-thumbnail" [class.youtube]="video.tipo === 'youtube'">
              <div *ngIf="video.tipo === 'youtube'" class="yt-thumb"
                [style.backgroundImage]="'url(' + video.thumbnail + ')'">
                <div class="play-badge">▶ YouTube</div>
              </div>
              <div *ngIf="video.tipo === 'upload'" class="upload-thumb">
                <div class="video-icon">🎬</div>
                <span class="file-badge">{{ formatarTamanho(video.tamanho || 0) }}</span>
              </div>
            </div>
            <div class="video-details">
              <p class="video-type-badge" [class]="video.tipo">
                {{ video.tipo === 'youtube' ? '📺 YouTube' : '📁 Upload' }}
              </p>
              <p class="video-url" title="{{ video.url }}">{{ truncarUrl(video.url) }}</p>
            </div>
            <button
              class="btn-delete"
              (click)="removerVideo(i)"
              type="button"
              title="Remover vídeo"
            >✕</button>
          </div>
        </div>
      </div>

      <!-- Hint de informação -->
      <div class="info-box">
        <span class="info-icon">ℹ️</span>
        <p>
          <strong>Dica:</strong> Você pode adicionar múltiplos vídeos. Todos serão exibidos na aula.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .video-upload-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 20px;
      background: linear-gradient(135deg, #f8f9fa 0%, #f0f4f8 100%);
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }

    /* ──── ABAS ──── */
    .video-tabs {
      display: flex;
      gap: 8px;
      border-bottom: 2px solid #e2e8f0;
    }

    .tab-btn {
      flex: 1;
      padding: 12px 16px;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      font-size: 0.95rem;
      font-weight: 500;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
      position: relative;
      bottom: -2px;
    }

    .tab-btn:hover {
      color: #475569;
      background-color: #f1f5f9;
    }

    .tab-btn.active {
      color: #3b82f6;
      border-bottom-color: #3b82f6;
    }

    .tab-icon {
      font-size: 1.2rem;
    }

    /* ──── CONTEÚDO DAS ABAS ──── */
    .video-content {
      position: relative;
      min-height: 300px;
    }

    .tab-pane {
      opacity: 0;
      pointer-events: none;
      position: absolute;
      width: 100%;
      transition: opacity 0.25s ease;
    }

    .tab-pane.active {
      opacity: 1;
      pointer-events: all;
      position: relative;
    }

    /* ──── FORMULÁRIOS ──── */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .form-label {
      font-size: 0.95rem;
      font-weight: 600;
      color: #1e293b;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .label-optional {
      font-size: 0.8rem;
      font-weight: 400;
      color: #94a3b8;
    }

    .form-input {
      padding: 10px 14px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      background: white;
    }

    .form-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-input.error {
      border-color: #ef4444;
      background-color: #fee2e2;
    }

    .form-input.error:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    /* ──── INPUT GROUP ──── */
    .input-group {
      display: flex;
      gap: 8px;
    }

    .input-group .form-input {
      flex: 1;
    }

    .btn-add {
      padding: 10px 20px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.2s, box-shadow 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .btn-add:hover:not(:disabled) {
      background: #2563eb;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }

    .btn-add:disabled {
      background: #cbd5e1;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .spinner-mini {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ──── MENSAGENS ──── */
    .form-messages {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-height: 20px;
    }

    .error-msg {
      font-size: 0.85rem;
      color: #dc2626;
      margin: 0;
    }

    .success-msg {
      font-size: 0.85rem;
      color: #16a34a;
      margin: 0;
    }

    /* ──── PREVIEW YOUTUBE ──── */
    .youtube-preview {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .preview-thumb {
      width: 120px;
      height: 67px;
      border-radius: 6px;
      background-size: cover;
      background-position: center;
      position: relative;
      flex-shrink: 0;
      overflow: hidden;
    }

    .play-icon {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.4);
      color: white;
      font-size: 24px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .preview-thumb:hover .play-icon {
      opacity: 1;
    }

    .preview-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .preview-info h4 {
      margin: 0 0 4px 0;
      font-size: 0.95rem;
      color: #1e293b;
      font-weight: 600;
    }

    .preview-meta {
      margin: 0;
      font-size: 0.8rem;
      color: #64748b;
    }

    /* ──── DROPZONE ──── */
    .dropzone {
      padding: 32px;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }

    .dropzone:hover:not(.disabled) {
      border-color: #3b82f6;
      background: #f0f7ff;
    }

    .dropzone.drag-over {
      border-color: #3b82f6;
      background: #e0f0ff;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }

    .dropzone.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .dropzone-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .dropzone-icon {
      font-size: 2.5rem;
    }

    .dropzone-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #1e293b;
    }

    .dropzone-formats {
      margin: 0;
      font-size: 0.85rem;
      color: #64748b;
    }

    /* ──── ARQUIVO INFO ──── */
    .arquivo-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .arquivo-icon {
      font-size: 1.8rem;
      flex-shrink: 0;
    }

    .arquivo-details {
      flex: 1;
      min-width: 0;
    }

    .arquivo-nome {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .arquivo-tamanho {
      margin: 4px 0 0 0;
      font-size: 0.8rem;
      color: #64748b;
    }

    .btn-remove-file {
      padding: 6px 10px;
      background: #fee2e2;
      color: #dc2626;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.2s;
      flex-shrink: 0;
    }

    .btn-remove-file:hover {
      background: #fca5a5;
    }

    /* ──── PROGRESSO ──── */
    .progress-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #2563eb);
      width: 0%;
      transition: width 0.3s ease;
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      color: #64748b;
    }

    .progress-percent {
      font-weight: 600;
      color: #3b82f6;
    }

    /* ──── ERRO ──── */
    .error-box {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: #fee2e2;
      border: 1px solid #fca5a5;
      border-radius: 8px;
    }

    .error-icon {
      font-size: 1.4rem;
      flex-shrink: 0;
    }

    .error-title {
      margin: 0 0 4px 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: #dc2626;
    }

    .error-detail {
      margin: 0;
      font-size: 0.85rem;
      color: #b91c1c;
    }

    /* ──── AÇÕES ──── */
    .form-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .btn-upload {
      padding: 10px 24px;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, box-shadow 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-upload:hover:not(:disabled) {
      background: #059669;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }

    .btn-upload:disabled {
      background: #a3e635;
      cursor: not-allowed;
      opacity: 0.6;
    }

    /* ──── LISTA DE VÍDEOS ──── */
    .videos-list {
      border-top: 2px solid #e2e8f0;
      padding-top: 20px;
    }

    .videos-title {
      margin: 0 0 14px 0;
      font-size: 1rem;
      font-weight: 600;
      color: #1e293b;
    }

    .videos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .video-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      transition: all 0.2s;
      position: relative;
    }

    .video-item:hover {
      border-color: #3b82f6;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    }

    .video-thumbnail {
      width: 100%;
      aspect-ratio: 16/9;
      border-radius: 6px;
      overflow: hidden;
      background: #f1f5f9;
      position: relative;
    }

    .yt-thumb {
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
      position: relative;
    }

    .play-badge {
      position: absolute;
      bottom: 4px;
      right: 4px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .upload-thumb {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      flex-direction: column;
      gap: 4px;
    }

    .video-icon {
      font-size: 2rem;
    }

    .file-badge {
      font-size: 0.7rem;
      color: #64748b;
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 3px;
    }

    .video-details {
      flex: 1;
      min-width: 0;
    }

    .video-type-badge {
      margin: 0 0 4px 0;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 6px;
      background: #f1f5f9;
      color: #64748b;
      border-radius: 3px;
      display: inline-block;
      width: fit-content;
    }

    .video-type-badge.youtube {
      background: #fef3c7;
      color: #b45309;
    }

    .video-type-badge.upload {
      background: #d1fae5;
      color: #065f46;
    }

    .video-url {
      margin: 0;
      font-size: 0.8rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .btn-delete {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 28px;
      height: 28px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      opacity: 0;
      transition: all 0.2s;
    }

    .video-item:hover .btn-delete {
      opacity: 1;
    }

    .btn-delete:hover {
      background: #dc2626;
      transform: scale(1.1);
    }

    /* ──── INFO BOX ──── */
    .info-box {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: #e0f2fe;
      border-left: 4px solid #0284c7;
      border-radius: 6px;
      font-size: 0.9rem;
      color: #0c4a6e;
    }

    .info-icon {
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .info-box p {
      margin: 0;
    }
  `]
})
export class VideoUploadComponent implements OnInit, OnChanges, OnDestroy {
  @Input() aulaId?: number;
  @Input() videosIniciais: Video[] = [];
  @Output() videosAdicionados = new EventEmitter<Video[]>();
  @Output() videoRemovido = new EventEmitter<void>();

  @ViewChild('youtubeInput') youtubeInput?: ElementRef<HTMLInputElement>;

  modo: 'youtube' | 'upload' = 'youtube';
  videos: Video[] = [];

  // YouTube
  youtubeUrl = '';
  youtubeError = '';
  youtubePreview: any = null;
  adicionando = false;

  // Upload
  arquivoSelecionado: File | null = null;
  carregando = false;
  progressoUpload = 0;
  progressoTexto = '';
  uploadError = '';
  dragOver = false;

  private destroy$ = new Subject<void>();
  private readonly API = environment.apiUrl;
  private readonly FORMATOS_ACEITOS = ['video/mp4', 'video/webm', 'video/ogg'];
  private readonly TAMANHO_MAXIMO = 500 * 1024 * 1024; // 500MB

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    if (this.videosIniciais.length > 0) {
      this.videos = [...this.videosIniciais];
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['videosIniciais'] && this.videos.length === 0 && this.videosIniciais.length > 0) {
      this.videos = [...this.videosIniciais];
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ABAS
  // ══════════════════════════════════════════════════════════════════════════

  selecionarModo(novo: 'youtube' | 'upload'): void {
    this.modo = novo;
    if (novo === 'youtube') {
      setTimeout(() => this.youtubeInput?.nativeElement.focus(), 0);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // YOUTUBE
  // ══════════════════════════════════════════════════════════════════════════

  validarYoutubeUrl(): void {
    this.youtubeError = '';
    this.youtubePreview = null;

    if (!this.youtubeUrl.trim()) return;

    const youtubeId = this.extrairYoutubeId(this.youtubeUrl);
    if (youtubeId) {
      this.youtubePreview = {
        id: youtubeId,
        titulo: 'Vídeo do YouTube',
        thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
        duracao: 'Carregando...',
      };
    } else {
      this.youtubeError = 'URL do YouTube inválida. Use youtube.com/watch?v=ID ou youtu.be/ID';
    }
  }

  onYoutubePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') || '';
    this.youtubeUrl = text.trim();
    this.validarYoutubeUrl();
  }

  adicionarYoutube(): void {
    if (!this.youtubeUrl || this.youtubeError) return;

    const youtubeId = this.extrairYoutubeId(this.youtubeUrl);
    if (!youtubeId) {
      this.youtubeError = 'URL inválida';
      return;
    }

    this.adicionando = true;

    // Simular validação do vídeo
    setTimeout(() => {
      const video: Video = {
        id: `yt_${youtubeId}`,
        tipo: 'youtube',
        url: this.youtubeUrl,
        titulo: this.youtubePreview?.titulo || 'Vídeo do YouTube',
        thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      };

      this.videos.push(video);
      this.videosAdicionados.emit(this.videos);
      
      this.youtubeUrl = '';
      this.youtubeError = '';
      this.youtubePreview = null;
      this.adicionando = false;
      
      this.youtubeInput?.nativeElement.focus();
    }, 300);
  }

  private extrairYoutubeId(url: string): string | null {
    const regexes = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];

    for (const regex of regexes) {
      const match = url.match(regex);
      if (match && match[1]) return match[1];
    }

    return null;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UPLOAD
  // ══════════════════════════════════════════════════════════════════════════

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  onDragLeave(): void {
    this.dragOver = false;
  }

  onDropFiles(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processarArquivo(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processarArquivo(input.files[0]);
    }
  }

  private processarArquivo(file: File): void {
    this.uploadError = '';

    if (!this.FORMATOS_ACEITOS.includes(file.type)) {
      this.uploadError = `Formato não suportado. Use MP4, WebM ou OGG. (Recebido: ${file.type})`;
      return;
    }

    if (file.size > this.TAMANHO_MAXIMO) {
      this.uploadError = `Arquivo muito grande. Máximo 500MB. (Tamanho: ${this.formatarTamanho(file.size)})`;
      return;
    }

    this.arquivoSelecionado = file;
  }

  limparArquivo(): void {
    this.arquivoSelecionado = null;
    this.uploadError = '';
    this.progressoUpload = 0;
  }

  enviarArquivo(): void {
    if (!this.arquivoSelecionado || !this.aulaId) return;

    this.carregando = true;
    this.uploadError = '';
    this.progressoUpload = 0;
    this.progressoTexto = 'Inicializando...';

    const formData = new FormData();
    formData.append('file', this.arquivoSelecionado);

    this.http.post<any>(`${this.API}/aulas/${this.aulaId}/upload-video`, formData, {
      reportProgress: true,
      observe: 'events',
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const total = event.total || 0;
            this.progressoUpload = Math.round((event.loaded / total) * 100);
            this.progressoTexto = `${this.formatarTamanho(event.loaded)} / ${this.formatarTamanho(total)}`;
          } else if (event.type === HttpEventType.Response) {
            const body = event.body;
            const nomeArquivo = (body.caminho_arquivo as string).split(/[\\/]/).pop() || body.arquivo_nome;
            const video_url = `${this.API}/aulas/video/${nomeArquivo}`;

            const video: Video = {
              id: `upload_${body.id}`,
              tipo: 'upload',
              url: video_url,
              tamanho: body.tamanho_bytes || this.arquivoSelecionado!.size,
              titulo: body.arquivo_nome || this.arquivoSelecionado!.name,
            };

            this.videos.push(video);
            this.videosAdicionados.emit(this.videos);

            this.carregando = false;
            this.arquivoSelecionado = null;
            this.progressoUpload = 0;
            this.progressoTexto = '';
          }
        },
        error: (error) => {
          this.carregando = false;
          this.uploadError = error.error?.erro || 'Erro ao enviar vídeo. Tente novamente.';
          console.error('Erro no upload:', error);
        },
      });
  }

  removerVideo(index: number): void {
    const video = this.videos[index];
    
    // Se for um upload, chamar API para remover do servidor
    if (video.tipo === 'upload' && this.aulaId) {
      this.http.delete(`${this.API}/aulas/${this.aulaId}/videos/${video.id}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.videos.splice(index, 1);
            this.videosAdicionados.emit(this.videos);
            this.videoRemovido.emit();
          },
          error: (error) => {
            console.error('Erro ao remover vídeo:', error);
            alert('Erro ao remover vídeo');
          },
        });
    } else {
      this.videos.splice(index, 1);
      this.videosAdicionados.emit(this.videos);
      this.videoRemovido.emit();
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UTILITÁRIOS
  // ══════════════════════════════════════════════════════════════════════════

  formatarTamanho(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const tamanhos = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + tamanhos[i];
  }

  truncarUrl(url: string, max = 40): string {
    return url.length > max ? url.substring(0, max) + '...' : url;
  }
}
