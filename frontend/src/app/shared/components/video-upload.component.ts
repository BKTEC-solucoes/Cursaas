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
    <div class="video-upload-container">

      <!-- Abas de seleção -->
      <div class="video-tabs">
        <button class="tab-btn" [class.active]="modo === 'youtube'" (click)="selecionarModo('youtube')" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
          Link do YouTube
        </button>
        <button class="tab-btn" [class.active]="modo === 'upload'" (click)="selecionarModo('upload')" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Upload do PC
        </button>
      </div>

      <!-- Conteúdo das abas -->
      <div class="video-content">

        <!-- Tab: YouTube -->
        <div class="tab-pane" [class.active]="modo === 'youtube'">
          <div class="form-group">
            <div class="input-group">
              <input
                #youtubeInput
                type="text"
                class="form-input"
                [class.error]="youtubeError"
                placeholder="Cole a URL do YouTube..."
                [(ngModel)]="youtubeUrl"
                (input)="validarYoutubeUrl()"
                (keydown.enter)="adicionarYoutube()"
                (paste)="onYoutubePaste($event)"
              />
              <button class="btn-add" [disabled]="!youtubeUrl || youtubeError || adicionando" (click)="adicionarYoutube()" type="button">
                @if (!adicionando) { Adicionar }
                @else { <span class="spinner-mini"></span> }
              </button>
            </div>
            <div class="form-messages">
              @if (youtubeError) { <p class="error-msg">{{ youtubeError }}</p> }
            </div>
          </div>

          <!-- Preview do YouTube -->
          @if (youtubePreview) {
            <div class="youtube-preview">
              <div class="preview-thumb" [style.backgroundImage]="'url(' + youtubePreview.thumbnail + ')'"></div>
              <div class="preview-info">
                <p class="preview-label">Vídeo detectado</p>
              </div>
            </div>
          }
        </div>

        <!-- Tab: Upload -->
        <div class="tab-pane" [class.active]="modo === 'upload'">
          <div class="form-group">

            <!-- Drop Zone -->
            @if (!arquivoSelecionado && !carregando) {
              <div
                class="dropzone"
                [class.drag-over]="dragOver"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave()"
                (drop)="onDropFiles($event)"
                (click)="fileInput.click()"
              >
                <input #fileInput type="file" accept="video/mp4,video/webm,video/ogg" style="display: none" (change)="onFileSelected($event)" />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <p class="dropzone-title">Arraste um vídeo ou clique para selecionar</p>
                <p class="dropzone-formats">MP4, WebM ou OGG · máx. 500MB</p>
              </div>
            }

            <!-- Arquivo selecionado -->
            @if (arquivoSelecionado && !carregando) {
              <div class="arquivo-info">
                <div class="arquivo-details">
                  <p class="arquivo-nome">{{ arquivoSelecionado.name }}</p>
                  <p class="arquivo-tamanho">{{ formatarTamanho(arquivoSelecionado.size) }}</p>
                </div>
                <button class="btn-remove-file" (click)="limparArquivo()" type="button" title="Remover arquivo">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            }

            <!-- Barra de progresso -->
            @if (carregando) {
              <div class="progress-container">
                <div class="progress-bar"><div class="progress-fill" [style.width]="progressoUpload + '%'"></div></div>
                <div class="progress-info">
                  <span class="progress-percent">{{ progressoUpload }}%</span>
                  <span class="progress-text">{{ progressoTexto }}</span>
                </div>
              </div>
            }

            @if (uploadError) {
              <div class="error-box">{{ uploadError }}</div>
            }

            @if (arquivoSelecionado && !carregando) {
              <div class="form-actions">
                <button class="btn-upload" [disabled]="!!uploadError" (click)="enviarArquivo()" type="button">Enviar vídeo</button>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Lista de vídeos adicionados -->
      @if (videos.length > 0) {
        <div class="videos-list">
          <div class="videos-grid">
            @for (video of videos; track video.id; let i = $index) {
              <div class="video-item">
                <div class="video-thumbnail">
                  @if (video.tipo === 'youtube') {
                    <div class="yt-thumb" [style.backgroundImage]="'url(' + video.thumbnail + ')'"></div>
                  } @else {
                    <div class="upload-thumb">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                      <span class="file-badge">{{ formatarTamanho(video.tamanho || 0) }}</span>
                    </div>
                  }
                </div>
                <div class="video-details">
                  <p class="video-type-badge" [class]="video.tipo">{{ video.tipo === 'youtube' ? 'YouTube' : 'Upload' }}</p>
                  <p class="video-url" title="{{ video.url }}">{{ truncarUrl(video.url) }}</p>
                </div>
                <button class="btn-delete" (click)="removerVideo(i)" type="button" title="Remover vídeo">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .video-upload-container {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding: var(--space-4);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
    }

    /* ──── ABAS ──── */
    .video-tabs {
      display: flex;
      gap: var(--space-1);
      border-bottom: 1px solid var(--color-border);
    }

    .tab-btn {
      flex: 1;
      padding: var(--space-2) var(--space-3);
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--color-text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      transition: color var(--transition-fast), border-color var(--transition-fast);
      position: relative;
      bottom: -1px;
      font-family: inherit;
    }

    .tab-btn:hover { color: var(--color-text); }

    .tab-btn.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }

    /* ──── CONTEÚDO DAS ABAS ──── */
    .video-content { position: relative; }

    .tab-pane {
      display: none;
    }

    .tab-pane.active {
      display: block;
    }

    /* ──── FORMULÁRIOS ──── */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .form-input {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      font-size: var(--font-size-sm);
      outline: none;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
      background: var(--color-surface);
      color: var(--color-text);
      font-family: inherit;
    }

    .form-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent);
    }

    .form-input.error {
      border-color: var(--color-danger);
    }

    /* ──── INPUT GROUP ──── */
    .input-group { display: flex; gap: var(--space-2); }
    .input-group .form-input { flex: 1; }

    .btn-add {
      padding: var(--space-2) var(--space-4);
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: var(--radius);
      font-size: var(--font-size-sm);
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity var(--transition-fast);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-1);
      font-family: inherit;
    }

    .btn-add:hover:not(:disabled) { opacity: 0.9; }

    .btn-add:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .spinner-mini {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ──── MENSAGENS ──── */
    .form-messages { min-height: 18px; }
    .error-msg { font-size: var(--font-size-xs); color: var(--color-danger); margin: 0; }

    /* ──── PREVIEW YOUTUBE ──── */
    .youtube-preview {
      display: flex;
      gap: var(--space-3);
      padding: var(--space-2);
      background: var(--color-surface-2);
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
    }

    .preview-thumb {
      width: 100px;
      height: 56px;
      border-radius: var(--radius);
      background-size: cover;
      background-position: center;
      flex-shrink: 0;
    }

    .preview-info { display: flex; align-items: center; }
    .preview-label { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-muted); }

    /* ──── DROPZONE ──── */
    .dropzone {
      padding: var(--space-6);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-2);
      cursor: pointer;
      transition: border-color var(--transition-fast), background var(--transition-fast);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      color: var(--color-text-muted);
    }

    .dropzone:hover { border-color: var(--primary); color: var(--primary); }

    .dropzone.drag-over {
      border-color: var(--primary);
      background: color-mix(in srgb, var(--primary) 6%, transparent);
      color: var(--primary);
    }

    .dropzone-title { margin: 0; font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .dropzone-formats { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-muted); }

    /* ──── ARQUIVO INFO ──── */
    .arquivo-info {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3);
      background: var(--color-surface-2);
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
    }

    .arquivo-details { flex: 1; min-width: 0; }

    .arquivo-nome {
      margin: 0;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .arquivo-tamanho { margin: 2px 0 0 0; font-size: var(--font-size-xs); color: var(--color-text-muted); }

    .btn-remove-file {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      background: transparent;
      color: var(--color-text-muted);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      cursor: pointer;
      flex-shrink: 0;
      transition: color var(--transition-fast), border-color var(--transition-fast);
    }

    .btn-remove-file:hover { color: var(--color-danger); border-color: var(--color-danger); }

    /* ──── PROGRESSO ──── */
    .progress-container { display: flex; flex-direction: column; gap: var(--space-2); }

    .progress-bar {
      width: 100%;
      height: 6px;
      background: var(--color-border);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill { height: 100%; background: var(--primary); width: 0%; transition: width 0.3s ease; }

    .progress-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }

    .progress-percent { font-weight: 600; color: var(--primary); }

    /* ──── ERRO ──── */
    .error-box {
      padding: var(--space-2) var(--space-3);
      background: color-mix(in srgb, var(--color-danger) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
      border-radius: var(--radius);
      font-size: var(--font-size-xs);
      color: var(--color-danger);
    }

    /* ──── AÇÕES ──── */
    .form-actions { display: flex; justify-content: flex-end; }

    .btn-upload {
      padding: var(--space-2) var(--space-5);
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: var(--radius);
      font-size: var(--font-size-sm);
      font-weight: 600;
      cursor: pointer;
      transition: opacity var(--transition-fast);
      font-family: inherit;
    }

    .btn-upload:hover:not(:disabled) { opacity: 0.9; }
    .btn-upload:disabled { opacity: 0.4; cursor: not-allowed; }

    /* ──── LISTA DE VÍDEOS ──── */
    .videos-list { border-top: 1px solid var(--color-border); padding-top: var(--space-4); }

    .videos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: var(--space-2);
    }

    .video-item {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-2);
      background: var(--color-surface-2);
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      transition: border-color var(--transition-fast);
      position: relative;
    }

    .video-item:hover { border-color: var(--primary); }

    .video-thumbnail {
      width: 100%;
      aspect-ratio: 16/9;
      border-radius: var(--radius);
      overflow: hidden;
      background: var(--color-border);
      position: relative;
    }

    .yt-thumb { width: 100%; height: 100%; background-size: cover; background-position: center; }

    .upload-thumb {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      flex-direction: column;
      gap: var(--space-1);
      color: var(--color-text-muted);
    }

    .file-badge {
      font-size: 10px;
      color: var(--color-text-muted);
      background: var(--color-surface);
      padding: 2px 6px;
      border-radius: 3px;
    }

    .video-details { flex: 1; min-width: 0; }

    .video-type-badge {
      margin: 0 0 var(--space-1) 0;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .04em;
      padding: 1px 6px;
      background: var(--color-surface);
      color: var(--color-text-muted);
      border-radius: 3px;
      display: inline-block;
      width: fit-content;
    }

    .video-type-badge.youtube { color: #b45309; }
    .video-type-badge.upload { color: var(--primary); }

    .video-url {
      margin: 0;
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .btn-delete {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 22px;
      height: 22px;
      background: var(--color-surface);
      color: var(--color-text-muted);
      border: 1px solid var(--color-border);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
    }

    .video-item:hover .btn-delete { opacity: 1; }
    .btn-delete:hover { color: var(--color-danger); border-color: var(--color-danger); }
  `]
})
export class VideoUploadComponent implements OnInit, OnChanges, OnDestroy {
  @Input() aulaId?: number;
  @Input() videosIniciais: Video[] = [];
  @Input() garantirAulaSalva?: () => Promise<number>;
  @Output() videosAdicionados = new EventEmitter<Video[]>();
  @Output() videoRemovido = new EventEmitter<void>();
  @Output() aulaIdResolvido = new EventEmitter<number>();

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

  async enviarArquivo(): Promise<void> {
    if (!this.arquivoSelecionado) return;

    let aulaId = this.aulaId;
    if (!aulaId) {
      if (!this.garantirAulaSalva) return;
      this.carregando = true;
      this.uploadError = '';
      this.progressoTexto = 'Salvando aula...';
      try {
        aulaId = await this.garantirAulaSalva();
        this.aulaId = aulaId;
        // Não emite aulaIdResolvido aqui: navegar agora destruiria este componente
        // (rota diferente) e cancelaria o upload que está prestes a começar.
      } catch (e) {
        this.carregando = false;
        this.progressoTexto = '';
        this.uploadError = e instanceof Error ? e.message : 'Erro ao salvar a aula antes do envio.';
        return;
      }
    }

    this.carregando = true;
    this.uploadError = '';
    this.progressoUpload = 0;
    this.progressoTexto = 'Inicializando...';

    const formData = new FormData();
    formData.append('file', this.arquivoSelecionado);

    this.http.post<any>(`${this.API}/aulas/${aulaId}/upload-video`, formData, {
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

            // Upload concluído: agora é seguro atualizar a URL para /editar.
            this.aulaIdResolvido.emit(aulaId as number);
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
