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
  ChangeDetectorRef,
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
        <button class="tab-btn" [class.active]="modo === 'youtube'" (click)="selecionarModo('youtube')" type="button">YouTube</button>
        <span class="tab-sep">·</span>
        <button class="tab-btn" [class.active]="modo === 'upload'" (click)="selecionarModo('upload')" type="button">Upload do PC</button>
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
            @if (youtubeError) { <p class="error-msg">{{ youtubeError }}</p> }
          </div>

          <!-- Preview do YouTube -->
          @if (youtubePreview) {
            <div class="youtube-preview">
              <div class="preview-thumb" [style.backgroundImage]="'url(' + youtubePreview.thumbnail + ')'"></div>
              <p class="preview-label">Vídeo detectado</p>
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
                <p class="dropzone-title">Arraste um vídeo ou clique para selecionar</p>
                <p class="dropzone-formats">MP4 · WebM · OGG — máx. 500MB</p>
              </div>
            }

            <!-- Arquivo selecionado -->
            @if (arquivoSelecionado && !carregando) {
              <div class="arquivo-info">
                <p class="arquivo-nome">{{ arquivoSelecionado.name }}</p>
                <span class="arquivo-tamanho">{{ formatarTamanho(arquivoSelecionado.size) }}</span>
                <button class="btn-text" (click)="limparArquivo()" type="button">Remover</button>
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
              <p class="error-msg">{{ uploadError }}</p>
            }

            @if (arquivoSelecionado && !carregando) {
              <div class="form-actions">
                <button class="btn-upload" (click)="enviarArquivo()" type="button">Enviar vídeo</button>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Lista de vídeos adicionados -->
      @if (videos.length > 0) {
        <div class="videos-list">
          @for (video of videos; track video.id; let i = $index) {
            <div class="video-item">
              <span class="video-type-badge" [class]="video.tipo">{{ video.tipo === 'youtube' ? 'YouTube' : 'Upload' }}</span>
              <p class="video-url" title="{{ video.url }}">{{ truncarUrl(video.url) }}</p>
              @if (video.tamanho) { <span class="video-tamanho">{{ formatarTamanho(video.tamanho) }}</span> }
              <button class="btn-text btn-remove" (click)="removerVideo(i)" type="button">Remover</button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .video-upload-container {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    /* ──── ABAS ──── */
    .video-tabs {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .tab-sep { color: var(--color-border); font-size: var(--font-size-sm); }

    .tab-btn {
      padding: 0;
      background: none;
      border: none;
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--color-text-muted);
      cursor: pointer;
      font-family: inherit;
      transition: color var(--transition-fast);
    }

    .tab-btn:hover { color: var(--color-text); }
    .tab-btn.active { color: var(--color-text); font-weight: 600; }

    /* ──── CONTEÚDO DAS ABAS ──── */
    .tab-pane { display: none; }
    .tab-pane.active { display: block; }

    /* ──── FORMULÁRIOS ──── */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .form-input {
      padding: var(--space-2) 0;
      border: none;
      border-bottom: 1px solid var(--color-border);
      border-radius: 0;
      font-size: var(--font-size-sm);
      outline: none;
      transition: border-color var(--transition-fast);
      background: transparent;
      color: var(--color-text);
      font-family: inherit;
    }

    .form-input:focus { border-color: var(--primary); }
    .form-input.error { border-color: var(--color-danger); }

    /* ──── INPUT GROUP ──── */
    .input-group { display: flex; align-items: center; gap: var(--space-3); }
    .input-group .form-input { flex: 1; }

    .btn-add {
      padding: var(--space-2) 0;
      background: none;
      color: var(--primary);
      border: none;
      font-size: var(--font-size-sm);
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity var(--transition-fast);
      font-family: inherit;
    }

    .btn-add:hover:not(:disabled) { opacity: 0.7; }
    .btn-add:disabled { opacity: 0.35; cursor: not-allowed; }

    .spinner-mini {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid color-mix(in srgb, var(--primary) 30%, transparent);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ──── MENSAGENS ──── */
    .error-msg { font-size: var(--font-size-xs); color: var(--color-danger); margin: 0; }

    /* ──── PREVIEW YOUTUBE ──── */
    .youtube-preview {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .preview-thumb {
      width: 88px;
      height: 50px;
      border-radius: var(--radius);
      background-size: cover;
      background-position: center;
      flex-shrink: 0;
    }

    .preview-label { margin: 0; font-size: var(--font-size-xs); color: var(--color-text-muted); }

    /* ──── DROPZONE ──── */
    .dropzone {
      padding: var(--space-5) var(--space-4);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius);
      cursor: pointer;
      transition: border-color var(--transition-fast), color var(--transition-fast);
      text-align: center;
      color: var(--color-text-muted);
    }

    .dropzone:hover, .dropzone.drag-over { border-color: var(--primary); color: var(--primary); }

    .dropzone-title { margin: 0; font-size: var(--font-size-sm); color: var(--color-text); }
    .dropzone-formats { margin: var(--space-1) 0 0; font-size: var(--font-size-xs); color: var(--color-text-muted); }

    /* ──── ARQUIVO INFO ──── */
    .arquivo-info {
      display: flex;
      align-items: baseline;
      gap: var(--space-2);
      padding: var(--space-2) 0;
      border-bottom: 1px solid var(--color-border);
    }

    .arquivo-nome {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }

    .arquivo-tamanho { font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap; }

    .btn-text {
      padding: 0;
      background: none;
      border: none;
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      white-space: nowrap;
      transition: color var(--transition-fast);
    }

    .btn-text:hover { color: var(--color-danger); }

    /* ──── PROGRESSO ──── */
    .progress-container { display: flex; flex-direction: column; gap: var(--space-2); }

    .progress-bar {
      width: 100%;
      height: 2px;
      background: var(--color-border);
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

    /* ──── AÇÕES ──── */
    .form-actions { display: flex; justify-content: flex-end; }

    .btn-upload {
      padding: var(--space-2) 0;
      background: none;
      color: var(--primary);
      border: none;
      font-size: var(--font-size-sm);
      font-weight: 600;
      cursor: pointer;
      transition: opacity var(--transition-fast);
      font-family: inherit;
    }

    .btn-upload:hover:not(:disabled) { opacity: 0.7; }
    .btn-upload:disabled { opacity: 0.35; cursor: not-allowed; }

    /* ──── LISTA DE VÍDEOS ──── */
    .videos-list {
      border-top: 1px solid var(--color-border);
      padding-top: var(--space-3);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .video-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .video-type-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .04em;
      color: var(--color-text-muted);
      white-space: nowrap;
    }

    .video-type-badge.youtube { color: #b45309; }
    .video-type-badge.upload { color: var(--primary); }

    .video-url {
      flex: 1;
      min-width: 0;
      margin: 0;
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .video-tamanho { font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap; }

    .btn-remove { color: var(--color-text-muted); }
    .btn-remove:hover { color: var(--color-danger); }
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
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
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
        this.cdr.markForCheck();
        return;
      }
    }

    this.carregando = true;
    this.uploadError = '';
    this.progressoUpload = 0;
    this.progressoTexto = 'Inicializando...';
    this.cdr.markForCheck();

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
            this.cdr.markForCheck();
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
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          this.carregando = false;
          this.uploadError = error.error?.erro || 'Erro ao enviar vídeo. Tente novamente.';
          console.error('Erro no upload:', error);
          this.cdr.markForCheck();
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
