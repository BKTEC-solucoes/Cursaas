import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { RichTextEditorComponent } from './rich-text-editor.component';
import { environment } from '../../../environments/environment';

export type TipoBloco = 'titulo' | 'texto' | 'video';

export interface BlocoEditavel {
  id: number;
  tipo: TipoBloco;
  conteudo: string; // texto/título: conteúdo textual; vídeo: URL
}

// ── Bloco de texto (titulo / texto) ──────────────────────────────────────────

@Component({
  selector: 'app-bloco-texto',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      #el
      class="bloco bloco-{{ tipo }}"
      contenteditable="true"
      [attr.placeholder]="tipo === 'titulo' ? 'Digite um título...' : 'Digite um texto...'"
      (blur)="onBlur($event)"
      (input)="onInput($event)"
      (keydown.enter)="onEnter($event)"
    ></div>
  `,
  styles: [`
    .bloco {
      outline: none;
      border-radius: 6px;
      padding: 8px 10px;
      transition: background .15s, box-shadow .15s;
      cursor: text;
      min-height: 1.4em;
      word-break: break-word;
    }
    .bloco:empty::before {
      content: attr(placeholder);
      color: #aaa;
      pointer-events: none;
    }
    .bloco:focus {
      background: #f0f7ff;
      box-shadow: 0 0 0 2px #3b82f6;
    }
    .bloco-titulo {
      font-size: 1.4rem;
      font-weight: 700;
      color: #1e293b;
    }
    .bloco-texto {
      font-size: 1rem;
      color: #374151;
      line-height: 1.6;
    }
  `],
})
export class BlocoTextoComponent implements OnChanges {
  @Input() conteudo = '';
  @Input() tipo: 'titulo' | 'texto' = 'texto';
  @Output() conteudoChange = new EventEmitter<string>();

  @ViewChild('el', { static: true }) el!: ElementRef<HTMLDivElement>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conteudo']) {
      const div = this.el.nativeElement;
      if (document.activeElement !== div && div.textContent !== this.conteudo) {
        div.textContent = this.conteudo;
      }
    }
  }

  onBlur(event: FocusEvent): void {
    this.conteudoChange.emit((event.target as HTMLElement).textContent ?? '');
  }

  onInput(event: Event): void {
    this.conteudoChange.emit((event.target as HTMLElement).textContent ?? '');
  }

  onEnter(event: Event): void {
    if (this.tipo === 'titulo') {
      event.preventDefault();
      (event.target as HTMLElement).blur();
    }
  }
}

// ── Bloco de vídeo ────────────────────────────────────────────────────────────

@Component({
  selector: 'app-bloco-video',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="video-bloco">
      <!-- Modo visualização -->
      <ng-container *ngIf="!editando">
        <!-- Vídeo de upload -->
        <div *ngIf="videoUploadUrl" class="video-player-wrapper">
          <video [src]="videoUploadUrl" controls preload="metadata" style="width:100%;height:100%;display:block;"></video>
        </div>
        <!-- YouTube embed -->
        <div *ngIf="!videoUploadUrl && safeEmbedUrl" class="video-player-wrapper">
          <iframe
            #iframeEl
            [src]="safeEmbedUrl"
            frameborder="0"
            allowfullscreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
        </div>
        <!-- Placeholder -->
        <div *ngIf="!videoUploadUrl && !safeEmbedUrl" class="video-placeholder" (click)="entrarEdicao()">
          <span class="video-icon">▶</span>
          <span>Clique em <strong>Inserir vídeo</strong> para adicionar YouTube ou fazer upload</span>
        </div>
        <div class="video-actions">
          <button type="button" class="btn-editar-video" (click)="entrarEdicao()">✏️ {{ conteudo || videoUploadUrl ? 'Editar vídeo' : 'Inserir vídeo' }}</button>
        </div>
      </ng-container>

      <!-- Modo edição -->
      <div *ngIf="editando" class="video-edit-form">
        <label class="video-edit-label">Cole a URL do vídeo (YouTube)</label>
        <input
          #urlInput
          type="url"
          class="video-url-input"
          [(ngModel)]="urlTemp"
          placeholder="https://www.youtube.com/watch?v=..."
          (keydown.enter)="salvar()"
          (keydown.escape)="cancelar()"
        />
        <p class="video-hint" *ngIf="urlInvalida">
          ⚠️ URL não reconhecida. Cole um link do YouTube (watch?v=, youtu.be, shorts).
        </p>
        <p class="video-hint video-hint-ok" *ngIf="!urlInvalida && urlTemp">
          ✔ YouTube detectado
        </p>

        <!-- Upload do computador -->
        <ng-container *ngIf="aulaId">
          <div class="ou-divider"><span>ou</span></div>
          <label class="video-edit-label">Upload de vídeo do computador</label>

          <!-- Vídeo já enviado -->
          <div class="upload-preview" *ngIf="videoUploadUrl && uploadProgress === null">
            <video [src]="videoUploadUrl" controls preload="metadata" class="upload-mini-player"></video>
            <button type="button" class="btn-del-video" (click)="removerVideoUpload()" [disabled]="removendoVideo">
              {{ removendoVideo ? 'Removendo...' : '🗑 Remover vídeo' }}
            </button>
          </div>

          <!-- Drop zone -->
          <div
            class="dz-drop"
            *ngIf="!videoUploadUrl && uploadProgress === null"
            [class.drag-over]="dragOver"
            (dragover)="$event.preventDefault(); dragOver = true"
            (dragleave)="dragOver = false"
            (drop)="onDrop($event)"
            (click)="fileInputEl.click()"
          >
            <input #fileInputEl type="file" accept="video/*" style="display:none" (change)="onFileChange($event)"/>
            <span>🎬</span>
            <p>Arraste ou <strong>clique para selecionar</strong></p>
            <small>MP4, WebM, MOV, AVI…</small>
          </div>

          <!-- Barra de progresso -->
          <div class="dz-prog" *ngIf="uploadProgress !== null">
            <div class="dz-prog-bar"><div class="dz-prog-fill" [style.width]="uploadProgress + '%'"></div></div>
            <span>{{ uploadProgress }}%</span>
          </div>

          <p class="upload-erro" *ngIf="uploadErro">{{ uploadErro }}</p>
        </ng-container>

        <div class="video-edit-actions">
          <button type="button" class="btn-salvar" (click)="salvar()" [disabled]="!!urlTemp && urlInvalida">✔ Salvar URL</button>
          <button type="button" class="btn-cancelar" (click)="cancelar()">Fechar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .video-bloco { display: flex; flex-direction: column; gap: 8px; }
    .video-player-wrapper {
      position: relative;
      padding-bottom: 56.25%;
      height: 0;
      border-radius: 8px;
      overflow: hidden;
      background: #000;
    }
    .video-player-wrapper iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .video-placeholder {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 28px 20px;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      color: #64748b;
      cursor: pointer;
      font-size: .9rem;
      transition: border-color .15s, background .15s;
    }
    .video-placeholder:hover { border-color: #3b82f6; background: #f0f7ff; }
    .video-icon {
      font-size: 1.8rem;
      color: #94a3b8;
    }
    .video-actions { display: flex; }
    .btn-editar-video {
      padding: 4px 12px;
      font-size: .8rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
    }
    .btn-editar-video:hover { background: #f1f5f9; }
    .video-edit-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .video-edit-label { font-size: .8rem; color: #64748b; }
    .video-url-input {
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: .9rem;
      outline: none;
      transition: box-shadow .15s;
    }
    .video-url-input:focus { box-shadow: 0 0 0 2px #3b82f6; border-color: #3b82f6; }
    .video-edit-actions { display: flex; gap: 8px; }
    .btn-salvar {
      padding: 6px 16px;
      background: #3b82f6;
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: .85rem;
    }
    .btn-salvar:hover { background: #2563eb; }
    .btn-cancelar {
      padding: 6px 14px;
      background: transparent;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      cursor: pointer;
      font-size: .85rem;
    }
    .btn-cancelar:hover { background: #f1f5f9; }
    .video-hint {
      margin: 0;
      font-size: .78rem;
      color: #ef4444;
    }
    .video-hint-ok { color: #16a34a !important; }
    .ou-divider { display:flex; align-items:center; gap:8px; color:#94a3b8; font-size:.75rem; }
    .ou-divider::before, .ou-divider::after { content:''; flex:1; height:1px; background:#e2e8f0; }
    .dz-drop { border:2px dashed #cbd5e1; border-radius:8px; padding:14px 10px; text-align:center; cursor:pointer; transition:border-color .15s, background .15s; }
    .dz-drop:hover, .dz-drop.drag-over { border-color:#3b82f6; background:#eff6ff; }
    .dz-drop span { font-size:1.5rem; display:block; margin-bottom:4px; }
    .dz-drop p { margin:0 0 2px; font-size:.8rem; color:#475569; }
    .dz-drop small { font-size:.7rem; color:#94a3b8; }
    .dz-prog { display:flex; flex-direction:column; align-items:center; gap:4px; font-size:.78rem; color:#3b82f6; }
    .dz-prog-bar { width:100%; height:5px; background:#e2e8f0; border-radius:3px; overflow:hidden; }
    .dz-prog-fill { height:100%; background:#3b82f6; transition:width .15s; }
    .upload-preview { display:flex; flex-direction:column; gap:6px; }
    .upload-mini-player { width:100%; border-radius:6px; background:#0f172a; max-height:140px; display:block; }
    .btn-del-video { align-self:flex-start; padding:4px 10px; background:#fef2f2; border:1px solid #fca5a5; border-radius:6px; color:#b91c1c; font-size:.75rem; cursor:pointer; }
    .btn-del-video:hover:not(:disabled) { background:#fee2e2; }
    .btn-del-video:disabled { opacity:.6; cursor:not-allowed; }
    .upload-erro { margin:0; font-size:.75rem; color:#ef4444; }
  `],
})
export class BlocoVideoComponent implements OnChanges, OnDestroy {
  @Input() conteudo = '';
  @Output() conteudoChange = new EventEmitter<string>();

  @Input() aulaId?: number;
  @Input() videoUploadUrl: string | null = null;
  @Input() videoUploadId: number | null = null;
  @Output() uploadConcluido = new EventEmitter<{url: string, videoId: number}>();
  @Output() uploadRemovido = new EventEmitter<void>();

  @ViewChild('iframeEl') iframeEl?: ElementRef<HTMLIFrameElement>;

  editando = false;
  urlTemp = '';
  uploadProgress: number | null = null;
  uploadErro = '';
  dragOver = false;
  removendoVideo = false;

  /** Cached SafeResourceUrl — só recriado quando a URL muda de fato */
  safeEmbedUrl: SafeResourceUrl | null = null;
  private _lastRawUrl = '';

  constructor(private sanitizer: DomSanitizer, private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conteudo']) this._updateEmbedUrl();
  }

  ngOnDestroy(): void {
    // noop — sem listeners globais
  }

  /** true se o usuário digitou algo e não é reconhecido */
  get urlInvalida(): boolean {
    if (!this.urlTemp.trim()) return false;
    return this.toEmbedUrl(this.urlTemp) === null;
  }

  get plataforma(): string {
    return 'YouTube';
  }

  entrarEdicao(): void {
    this.urlTemp = this.conteudo;
    this.editando = true;
  }

  salvar(): void {
    const url = this.urlTemp.trim();
    if (url && this.urlInvalida) return;
    this.editando = false;
    this.conteudoChange.emit(url);
  }

  cancelar(): void {
    this.editando = false;
    this.urlTemp = '';
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.iniciarUpload(input.files[0]);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.iniciarUpload(file);
  }

  private iniciarUpload(file: File): void {
    if (!this.aulaId) return;
    this.uploadErro = '';
    this.uploadProgress = 0;
    // AuthService grava sob 'access_token'; ler 'token' devolvia sempre '' e o
    // backend rejeitava o "Bearer " vazio com 401.
    const token = localStorage.getItem('access_token') ?? '';
    const formData = new FormData();
    formData.append('file', file);
    this.http.post<any>(
      `${environment.apiUrl}/aulas/${this.aulaId}/upload-video`,
      formData,
      { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }), reportProgress: true, observe: 'events' }
    ).subscribe({
      next: (ev) => {
        if (ev.type === HttpEventType.UploadProgress && ev.total) {
          this.uploadProgress = Math.round(100 * ev.loaded / ev.total);
        } else if (ev.type === HttpEventType.Response) {
          const v = ev.body;
          const nome = (v.caminho_arquivo as string).split('\\').pop() || v.arquivo_nome;
          this.uploadConcluido.emit({ url: `${environment.apiUrl}/aulas/video/${nome}`, videoId: v.id });
          this.uploadProgress = null;
        }
      },
      error: (err) => {
        this.uploadProgress = null;
        this.uploadErro = err?.error?.detail ?? 'Erro ao enviar o vídeo.';
      }
    });
  }

  removerVideoUpload(): void {
    if (!this.aulaId || !this.videoUploadId || this.removendoVideo) return;
    this.removendoVideo = true;
    // AuthService grava sob 'access_token'; ler 'token' devolvia sempre '' e o
    // backend rejeitava o "Bearer " vazio com 401.
    const token = localStorage.getItem('access_token') ?? '';
    this.http.delete(
      `${environment.apiUrl}/aulas/${this.aulaId}/video/${this.videoUploadId}`,
      { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
    ).subscribe({
      next: () => { this.removendoVideo = false; this.uploadErro = ''; this.uploadRemovido.emit(); },
      error: (err) => { this.removendoVideo = false; this.uploadErro = err?.error?.detail ?? 'Erro ao remover.'; }
    });
  }

  private _updateEmbedUrl(): void {
    const raw = this.toEmbedUrl(this.conteudo);
    if (!raw) { this.safeEmbedUrl = null; this._lastRawUrl = ''; return; }
    if (raw === this._lastRawUrl) return; // URL não mudou — preserva o iframe atual
    this._lastRawUrl = raw;
    this.safeEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(raw);
  }

  private toEmbedUrl(url: string): string | null {
    if (!url) return null;
    const p = 'enablejsapi=1&rel=0';

    // YouTube Shorts: /shorts/ID
    const shorts = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
    if (shorts) return `https://www.youtube-nocookie.com/embed/${shorts[1]}?${p}`;

    // YouTube: watch?v=ID ou youtu.be/ID (com suporte a timestamp &t=)
    const yt = url.match(/(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (yt) {
      let embed = `https://www.youtube-nocookie.com/embed/${yt[1]}?${p}`;
      const t = url.match(/[?&]t=(\d+)/);
      if (t) embed += `&start=${t[1]}`;
      return embed;
    }

    // YouTube playlist
    const pl = url.match(/youtube\.com\/.*[?&]list=([A-Za-z0-9_-]+)/);
    if (pl) return `https://www.youtube-nocookie.com/embed/videoseries?list=${pl[1]}&${p}`;

    // Vimeo: removido — apenas YouTube é suportado
    return null;
  }
}

// ── Editor principal ──────────────────────────────────────────────────────────

@Component({
  selector: 'app-inline-editor',
  standalone: true,
  imports: [CommonModule, BlocoTextoComponent, BlocoVideoComponent, RichTextEditorComponent],
  template: `
    <div class="editor-container">
      <div class="editor-toolbar">
        <button (click)="adicionar('titulo')">+ Título</button>
        <button (click)="adicionar('texto')">+ Texto</button>
        <button (click)="adicionar('video')">+ Vídeo</button>
      </div>

      <div class="editor-blocos">
        <div
          *ngFor="let bloco of blocos; trackBy: trackById"
          class="bloco-wrapper"
        >
          <div class="bloco-tipo-tag">{{ bloco.tipo }}</div>

          <!-- Título: contenteditable simples -->
          <app-bloco-texto
            *ngIf="bloco.tipo === 'titulo'"
            [conteudo]="bloco.conteudo"
            [tipo]="bloco.tipo"
            (conteudoChange)="atualizar(bloco.id, $event)"
            class="bloco-content"
          />

          <!-- Texto: editor rich text com TipTap -->
          <app-rich-text-editor
            *ngIf="bloco.tipo === 'texto'"
            [content]="bloco.conteudo"
            placeholder="Digite um parágrafo..."
            (contentChange)="atualizar(bloco.id, $event)"
            class="bloco-content"
          />

          <app-bloco-video
            *ngIf="bloco.tipo === 'video'"
            [conteudo]="bloco.conteudo"
            (conteudoChange)="atualizar(bloco.id, $event)"
            class="bloco-content"
          />

          <button
            class="btn-remover"
            title="Remover bloco"
            (click)="remover(bloco.id)"
          >×</button>
        </div>

        <div *ngIf="blocos.length === 0" class="editor-vazio">
          Use a barra acima para adicionar blocos de conteúdo.
        </div>
      </div>

      <details class="editor-debug">
        <summary>Modelo (JSON)</summary>
        <pre>{{ blocos | json }}</pre>
      </details>
    </div>
  `,
  styles: [`
    .editor-container {
      font-family: sans-serif;
      max-width: 720px;
      margin: 0 auto;
      padding: 24px;
    }
    .editor-toolbar {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }
    .editor-toolbar button {
      padding: 6px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
      font-size: .85rem;
      transition: background .15s;
    }
    .editor-toolbar button:hover { background: #f1f5f9; }
    .editor-blocos { display: flex; flex-direction: column; gap: 16px; }
    .bloco-wrapper {
      display: grid;
      grid-template-columns: 52px 1fr 28px;
      align-items: flex-start;
      gap: 6px;
    }
    .bloco-tipo-tag {
      font-size: .65rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: .05em;
      padding-top: 10px;
      text-align: right;
    }
    .bloco-content { min-width: 0; }
    .btn-remover {
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: #94a3b8;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
      opacity: 0;
      margin-top: 6px;
      transition: opacity .15s, color .15s;
    }
    .bloco-wrapper:hover .btn-remover { opacity: 1; }
    .btn-remover:hover { color: #ef4444; }
    .editor-vazio {
      color: #94a3b8;
      font-size: .9rem;
      padding: 32px 20px;
      text-align: center;
      border: 2px dashed #e2e8f0;
      border-radius: 8px;
    }
    .editor-debug {
      margin-top: 32px;
      font-size: .8rem;
      color: #64748b;
    }
    .editor-debug pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      overflow-x: auto;
    }
  `],
})
export class InlineEditorComponent {
  blocos: BlocoEditavel[] = [
    { id: 1, tipo: 'titulo', conteudo: 'Título da aula' },
    { id: 2, tipo: 'texto',  conteudo: 'Clique neste parágrafo para editar.' },
    { id: 3, tipo: 'video',  conteudo: '' },
  ];

  private proximoId = 4;

  trackById(_: number, b: BlocoEditavel): number { return b.id; }

  adicionar(tipo: TipoBloco): void {
    this.blocos = [...this.blocos, { id: this.proximoId++, tipo, conteudo: '' }];
  }

  atualizar(id: number, conteudo: string): void {
    this.blocos = this.blocos.map(b => b.id === id ? { ...b, conteudo } : b);
  }

  remover(id: number): void {
    this.blocos = this.blocos.filter(b => b.id !== id);
  }
}
