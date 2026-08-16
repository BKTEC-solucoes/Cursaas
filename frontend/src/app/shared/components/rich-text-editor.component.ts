import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { IconComponent } from './icon.component';

/**
 * Editor rich text standalone baseado em TipTap.
 *
 * Entrada  (`content`): string JSON (TipTap doc), HTML ou texto puro.
 * Saída (`contentChange`): string JSON serializada `JSON.stringify(editor.getJSON())`.
 *
 * Formatos aceitos automaticamente na entrada:
 *   - JSON: `{"type":"doc","content":[...]}`  → parseado como TipTap doc
 *   - HTML: `<p>...</p>`                      → TipTap interpreta como HTML
 *   - Texto puro                              → TipTap envolve em <p>
 */
@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rte-wrap"
      [class.rte-focused]="focused"
      (mouseenter)="hovered = true"
      (mouseleave)="hovered = false"
    >
      <!-- ── Toolbar ─────────────────────────────────────────── -->
      <div class="rte-toolbar" [class.visible]="focused || hovered">

        <button type="button" class="rte-btn" [class.active]="activeMarks['bold']"
          title="Negrito (Ctrl+B)"
          (mousedown)="$event.preventDefault()" (click)="cmd('bold')">
          <strong>B</strong>
        </button>

        <button type="button" class="rte-btn rte-italic" [class.active]="activeMarks['italic']"
          title="Itálico (Ctrl+I)"
          (mousedown)="$event.preventDefault()" (click)="cmd('italic')">
          <em>I</em>
        </button>

        <button type="button" class="rte-btn rte-strike" [class.active]="activeMarks['strike']"
          title="Tachado"
          (mousedown)="$event.preventDefault()" (click)="cmd('strike')">
          <s>S</s>
        </button>

        <button type="button" class="rte-btn rte-mono" [class.active]="activeMarks['code']"
          title="Código inline"
          (mousedown)="$event.preventDefault()" (click)="cmd('code')">
          &lt;/&gt;
        </button>

        <div class="rte-sep"></div>

        <button type="button" class="rte-btn" [class.active]="activeMarks['h2']"
          title="Título 2"
          (mousedown)="$event.preventDefault()" (click)="cmd('h2')">
          H2
        </button>

        <button type="button" class="rte-btn" [class.active]="activeMarks['h3']"
          title="Título 3"
          (mousedown)="$event.preventDefault()" (click)="cmd('h3')">
          H3
        </button>

        <div class="rte-sep"></div>

        <button type="button" class="rte-btn rte-list" [class.active]="activeMarks['bulletList']"
          title="Lista de itens"
          (mousedown)="$event.preventDefault()" (click)="cmd('bullet')">
          <app-icon name="list" />
        </button>

        <button type="button" class="rte-btn" [class.active]="activeMarks['orderedList']"
          title="Lista numerada"
          (mousedown)="$event.preventDefault()" (click)="cmd('ordered')">
          1.
        </button>

        <button type="button" class="rte-btn rte-quote" [class.active]="activeMarks['blockquote']"
          title="Citação"
          (mousedown)="$event.preventDefault()" (click)="cmd('quote')">
          "
        </button>

        <div class="rte-sep"></div>

        <button type="button" class="rte-btn"
          title="Desfazer (Ctrl+Z)"
          (mousedown)="$event.preventDefault()" (click)="cmd('undo')">
          ↺
        </button>

        <button type="button" class="rte-btn"
          title="Refazer (Ctrl+Y)"
          (mousedown)="$event.preventDefault()" (click)="cmd('redo')">
          ↻
        </button>
      </div>

      <!-- ── Área de edição (TipTap monta aqui) ─────────────── -->
      <div #editorEl class="rte-editor"></div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Wrapper ──────────────────────────────────────────────── */
    .rte-wrap {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      transition: border-color .15s, box-shadow .15s;
      overflow: hidden;
    }
    .rte-wrap.rte-focused {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, .15);
    }

    /* ── Toolbar ──────────────────────────────────────────────── */
    .rte-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2px;
      padding: 6px 8px;
      background: #f8fafc;
      border-bottom: 1px solid #f1f5f9;
      opacity: 0;
      pointer-events: none;
      transform: translateY(-4px);
      transition: opacity .15s, transform .15s;
    }
    .rte-toolbar.visible {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }

    .rte-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 30px;
      height: 26px;
      padding: 0 7px;
      border: 1px solid transparent;
      border-radius: 4px;
      background: transparent;
      color: #475569;
      cursor: pointer;
      font-size: .78rem;
      font-family: inherit;
      line-height: 1;
      transition: background .1s, border-color .1s, color .1s;
      user-select: none;
    }
    .rte-btn:hover { background: #e9ecef; }
    .rte-btn.active {
      background: #dbeafe;
      color: #1d4ed8;
      border-color: #bfdbfe;
    }
    .rte-italic { font-style: italic; }
    .rte-mono   { font-family: ui-monospace, monospace; font-size: .72rem; }
    .rte-list   { font-size: 1rem; line-height: 1; }
    .rte-quote  { font-size: 1rem; font-weight: 700; }

    .rte-sep {
      width: 1px;
      height: 18px;
      background: #e2e8f0;
      margin: 0 4px;
      flex-shrink: 0;
    }

    /* ── Editor area ──────────────────────────────────────────── */
    .rte-editor {
      padding: 12px 14px;
      min-height: 100px;
      cursor: text;
    }

    /* ── ProseMirror (deep) ───────────────────────────────────── */
    :host ::ng-deep .rte-editor .ProseMirror {
      outline: none;
      min-height: 76px;
      line-height: 1.65;
      color: #374151;
      font-size: .95rem;
    }
    :host ::ng-deep .rte-editor .ProseMirror > * + * { margin-top: 0.65em; }
    :host ::ng-deep .rte-editor .ProseMirror p { margin: 0; }

    /* Placeholder */
    :host ::ng-deep .rte-editor .ProseMirror p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      color: #adb5bd;
      pointer-events: none;
      float: left;
      height: 0;
    }

    /* Headings */
    :host ::ng-deep .rte-editor .ProseMirror h2 {
      font-size: 1.2rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }
    :host ::ng-deep .rte-editor .ProseMirror h3 {
      font-size: 1.05rem;
      font-weight: 600;
      color: #334155;
      margin: 0;
    }

    /* Lists */
    :host ::ng-deep .rte-editor .ProseMirror ul,
    :host ::ng-deep .rte-editor .ProseMirror ol {
      padding-left: 1.4em;
      margin: 0;
    }
    :host ::ng-deep .rte-editor .ProseMirror li > p { margin: 0; }

    /* Blockquote */
    :host ::ng-deep .rte-editor .ProseMirror blockquote {
      border-left: 3px solid #cbd5e1;
      padding-left: 1em;
      color: #64748b;
      margin: 0;
    }

    /* Inline code */
    :host ::ng-deep .rte-editor .ProseMirror code {
      background: #f1f5f9;
      border-radius: 3px;
      padding: 1px 4px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: .88em;
      color: #e11d48;
    }

    /* Strong / em / strike */
    :host ::ng-deep .rte-editor .ProseMirror strong { font-weight: 700; }
    :host ::ng-deep .rte-editor .ProseMirror em     { font-style: italic; }
    :host ::ng-deep .rte-editor .ProseMirror s      { text-decoration: line-through; }

    /* Code block */
    :host ::ng-deep .rte-editor .ProseMirror pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 12px 16px;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: .85rem;
      overflow-x: auto;
      margin: 0;
    }
    :host ::ng-deep .rte-editor .ProseMirror pre code {
      background: none;
      color: inherit;
      padding: 0;
    }
  `],
})
export class RichTextEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  /** Conteúdo inicial: JSON stringificado, HTML puro ou texto. */
  @Input() content: string = '';
  /** Texto de placeholder para editor vazio. */
  @Input() placeholder = 'Digite o conteúdo...';

  /**
   * Emite o conteúdo serializado como JSON string sempre que o documento mudar.
   * Use `JSON.parse(value)` para obter o objeto TipTap doc.
   */
  @Output() contentChange = new EventEmitter<string>();

  @ViewChild('editorEl', { static: true }) editorEl!: ElementRef<HTMLDivElement>;

  focused = false;
  hovered = false;

  /** Mapa de estados ativos (bold, italic, h2, …) atualizado pelo TipTap. */
  activeMarks: Record<string, boolean> = {};

  private editor?: Editor;
  private initialized = false;
  private pendingContent: string | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    const initial = this.parseContent(this.content);

    // Inicialização fora da zona Angular para evitar ciclos de detecção desnecessários
    this.zone.runOutsideAngular(() => {
      this.editor = new Editor({
        element: this.editorEl.nativeElement,
        extensions: [
          StarterKit,
          Placeholder.configure({ placeholder: this.placeholder }),
        ],
        content: initial,
        onFocus: () => this.zone.run(() => {
          this.focused = true;
          this.cdr.markForCheck();
        }),
        onBlur: () => this.zone.run(() => {
          this.focused = false;
          this.cdr.markForCheck();
        }),
        onUpdate: () => this.zone.run(() => {
          this.syncActiveState();
          this.emit();
        }),
        onSelectionUpdate: () => this.zone.run(() => {
          this.syncActiveState();
        }),
        onCreate: () => this.zone.run(() => {
          this.initialized = true;
          this.syncActiveState();
          // Aplica conteúdo que chegou via @Input antes do editor estar pronto
          if (this.pendingContent !== null) {
            this.editor!.commands.setContent(this.parseContent(this.pendingContent), { emitUpdate: false });
            this.pendingContent = null;
          }
          this.cdr.markForCheck();
        }),
      });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['content'] || changes['content'].firstChange) return;

    const newVal = changes['content'].currentValue as string;

    if (!this.initialized) {
      this.pendingContent = newVal; // aguarda onCreate
    } else if (this.editor && !this.focused) {
      this.editor.commands.setContent(this.parseContent(newVal), { emitUpdate: false });
    }
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }

  // ── Toolbar ────────────────────────────────────────────────────────────────

  cmd(action: string): void {
    if (!this.editor) return;
    const c = this.editor.chain().focus();
    switch (action) {
      case 'bold':    c.toggleBold().run();                      break;
      case 'italic':  c.toggleItalic().run();                    break;
      case 'strike':  c.toggleStrike().run();                    break;
      case 'code':    c.toggleCode().run();                      break;
      case 'h2':      c.toggleHeading({ level: 2 }).run();       break;
      case 'h3':      c.toggleHeading({ level: 3 }).run();       break;
      case 'bullet':  c.toggleBulletList().run();                break;
      case 'ordered': c.toggleOrderedList().run();               break;
      case 'quote':   c.toggleBlockquote().run();                break;
      case 'undo':    c.undo().run();                            break;
      case 'redo':    c.redo().run();                            break;
    }
    this.syncActiveState();
  }

  // ── Utils públicos ─────────────────────────────────────────────────────────

  /** Retorna o JSON TipTap como objeto (ou null se não inicializado). */
  getJSON(): object | null {
    return this.editor?.getJSON() ?? null;
  }

  /** Retorna o conteúdo como HTML (para exibição read-only). */
  getHTML(): string {
    return this.editor?.getHTML() ?? '';
  }

  // ── Privados ───────────────────────────────────────────────────────────────

  private emit(): void {
    if (!this.editor) return;
    this.contentChange.emit(JSON.stringify(this.editor.getJSON()));
  }

  private syncActiveState(): void {
    if (!this.editor) return;
    this.activeMarks = {
      bold:         this.editor.isActive('bold'),
      italic:       this.editor.isActive('italic'),
      strike:       this.editor.isActive('strike'),
      code:         this.editor.isActive('code'),
      h2:           this.editor.isActive('heading', { level: 2 }),
      h3:           this.editor.isActive('heading', { level: 3 }),
      bulletList:   this.editor.isActive('bulletList'),
      orderedList:  this.editor.isActive('orderedList'),
      blockquote:   this.editor.isActive('blockquote'),
    };
    this.cdr.markForCheck();
  }

  /**
   * Tenta interpretar a string de entrada:
   * 1. JSON com `type === 'doc'` → TipTap native JSON
   * 2. Qualquer outra string     → HTML / texto puro (TipTap aceita ambos)
   */
  private parseContent(value: string): object | string {
    if (!value) return '';
    if (typeof value === 'object') return value; // já é objeto
    try {
      const parsed = JSON.parse(value);
      if (parsed?.type === 'doc') return parsed;
    } catch { /* não é JSON */ }
    return value; // HTML ou texto puro
  }
}
