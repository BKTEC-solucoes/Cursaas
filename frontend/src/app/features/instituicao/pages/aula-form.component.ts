import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { BlocoTextoComponent, BlocoVideoModernoComponent, RichTextEditorComponent } from '../../../shared/components';
import type { BlocoEditavel, TipoBloco } from '../../../shared/components';
import type { Video } from '../../../shared/components';
import { AuthService } from '../../../core/services/auth.service';

interface Curso { id: number; nome: string; }

const API = 'http://localhost:8000/api';

function parseBlocos(titulo: string, descricao: string): BlocoEditavel[] {
  try {
    const parsed = JSON.parse(descricao ?? '');
    if (Array.isArray(parsed) && parsed.length > 0 && 'tipo' in parsed[0]) {
      return parsed as BlocoEditavel[];
    }
  } catch { /* não é JSON */ }

  const blocos: BlocoEditavel[] = [
    { id: 1, tipo: 'titulo', conteudo: titulo ?? '' },
  ];
  if (descricao) {
    blocos.push({ id: 2, tipo: 'texto', conteudo: descricao });
  }
  return blocos;
}

@Component({
  selector: 'app-instituicao-aula-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BlocoTextoComponent, BlocoVideoModernoComponent, RichTextEditorComponent],
  template: `
    <div class="form-page">

      <!-- Cabeçalho -->
      <div class="form-topbar">
        <button class="btn-voltar" (click)="voltar()">← Voltar</button>
        <h2>{{ aulaId ? '✏️ Editar Aula' : '📚 Nova Aula' }}</h2>
        <div class="topbar-actions">
          <button class="btn-secondary" (click)="voltar()" [disabled]="salvando">Cancelar</button>
          <button class="btn-primary" (click)="salvar()" [disabled]="salvando">
            <span *ngIf="salvando" class="spinner"></span>
            {{ salvando ? 'Salvando...' : '💾 Salvar Aula' }}
          </button>
        </div>
      </div>

      <div class="form-body" *ngIf="!carregando; else loadingTpl">

        <!-- Coluna principal: editor de blocos -->
        <div class="editor-col">
          <div class="editor-toolbar">
            <span class="toolbar-label">Conteúdo</span>
            <button type="button" (click)="adicionar('titulo')">+ Título</button>
            <button type="button" (click)="adicionar('texto')">+ Texto</button>
            <button type="button" (click)="adicionar('video')">+ Vídeo</button>
          </div>

          <div class="blocos-list">

            <div class="bloco-sep" (mouseleave)="sepAtivo = -1">
              <div class="sep-linha" (mouseenter)="sepAtivo = -1">
                <button class="sep-btn" type="button" (click)="toggleMenu(0)" title="Inserir bloco aqui">+</button>
              </div>
              <div class="sep-menu" *ngIf="menuAberto === 0">
                <button type="button" (click)="adicionarEm(0, 'titulo')">Título</button>
                <button type="button" (click)="adicionarEm(0, 'texto')">Texto</button>
                <button type="button" (click)="adicionarEm(0, 'video')">Vídeo</button>
              </div>
            </div>

            <ng-container *ngFor="let b of blocos; let i = index; trackBy: trackById">
              <div class="bloco-row">
                <div class="bloco-handle" title="Tipo: {{ b.tipo }}">
                  <span class="tipo-tag">{{ b.tipo }}</span>
                </div>

                <app-bloco-texto
                  *ngIf="b.tipo === 'titulo'"
                  [conteudo]="b.conteudo"
                  [tipo]="b.tipo"
                  (conteudoChange)="atualizar(b.id, $event)"
                  class="bloco-content"
                />

                <app-rich-text-editor
                  *ngIf="b.tipo === 'texto'"
                  [content]="b.conteudo"
                  placeholder="Digite um parágrafo..."
                  (contentChange)="atualizar(b.id, $event)"
                  class="bloco-content"
                />

                <app-bloco-video-moderno
                  *ngIf="b.tipo === 'video'"
                  [conteudo]="b.conteudo"
                  [aulaId]="aulaId"
                  (conteudoChange)="atualizar(b.id, $event)"
                  class="bloco-content"
                />

                <button
                  class="btn-remover"
                  title="Remover bloco"
                  (click)="remover(b.id)"
                  [disabled]="isTituloUnico(b)"
                >×</button>
              </div>

              <div class="bloco-sep">
                <div class="sep-linha">
                  <button class="sep-btn" type="button" (click)="toggleMenu(i + 1)" title="Inserir bloco aqui">+</button>
                </div>
                <div class="sep-menu" *ngIf="menuAberto === i + 1">
                  <button type="button" (click)="adicionarEm(i + 1, 'titulo')">Título</button>
                  <button type="button" (click)="adicionarEm(i + 1, 'texto')">Texto</button>
                  <button type="button" (click)="adicionarEm(i + 1, 'video')">Vídeo</button>
                </div>
              </div>
            </ng-container>

            <div *ngIf="blocos.length === 0" class="blocos-vazio">
              Use a barra acima para adicionar blocos de conteúdo.
            </div>
          </div>
        </div>

        <!-- Sidebar: metadados -->
        <aside class="meta-sidebar">
          <section class="meta-section">
            <h4>Informações</h4>

            <div class="meta-field">
              <label>Curso *</label>
              <select [(ngModel)]="meta.curso_id" name="curso_id">
                <option [ngValue]="null" disabled>Selecione...</option>
                <option *ngFor="let c of cursos" [ngValue]="c.id">{{ c.nome }}</option>
              </select>
            </div>

            <div class="meta-field">
              <label>Data e hora *</label>
              <input type="datetime-local" [(ngModel)]="meta.data_aula" name="data_aula" />
            </div>

            <div class="meta-field">
              <label>Duração (minutos)</label>
              <input type="number" [(ngModel)]="meta.duracao_minutos" name="duracao_minutos" min="1" placeholder="Ex: 60" />
            </div>

            <div class="meta-field" *ngIf="aulaId">
              <label>Status</label>
              <select [(ngModel)]="meta.ativo" name="ativo">
                <option [ngValue]="true">Ativa</option>
                <option [ngValue]="false">Inativa</option>
              </select>
            </div>
          </section>

          <div class="form-error meta-erro" *ngIf="erro">{{ erro }}</div>
          <div class="form-success meta-ok" *ngIf="sucesso">{{ sucesso }}</div>
        </aside>
      </div>

      <ng-template #loadingTpl>
        <div class="loading-full">Carregando aula...</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .form-page {
      display: flex;
      flex-direction: column;
      min-height: 100%;
      background: #f8fafc;
    }

    .form-topbar {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 24px;
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .form-topbar h2 {
      flex: 1;
      margin: 0;
      font-size: 1.1rem;
      color: #1e293b;
    }
    .btn-voltar {
      background: none;
      border: none;
      color: var(--primary);
      cursor: pointer;
      font-size: .9rem;
      padding: 6px 0;
    }
    .btn-voltar:hover { text-decoration: underline; }
    .topbar-actions { display: flex; gap: 8px; }
    .btn-primary {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 18px;
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: .9rem;
      font-weight: 600;
    }
    .btn-primary:hover:not(:disabled) { background: color-mix(in srgb, var(--primary) 80%, black); }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-secondary {
      padding: 8px 16px;
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      cursor: pointer;
      font-size: .9rem;
    }
    .btn-secondary:hover:not(:disabled) { background: #f1f5f9; }
    .btn-secondary:disabled { opacity: .6; cursor: not-allowed; }

    .form-body {
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 24px;
      padding: 24px;
      align-items: start;
      max-width: 1100px;
      width: 100%;
      margin: 0 auto;
    }
    @media (max-width: 768px) {
      .form-body { grid-template-columns: 1fr; }
    }

    .editor-col {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }
    .editor-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .toolbar-label {
      font-size: .75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: .05em;
      margin-right: 4px;
    }
    .editor-toolbar button {
      padding: 4px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
      font-size: .8rem;
      transition: background .15s;
    }
    .editor-toolbar button:hover { background: #e2e8f0; }

    .blocos-list {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 200px;
    }
    .bloco-row {
      display: grid;
      grid-template-columns: 56px 1fr 28px;
      align-items: flex-start;
      gap: 6px;
    }
    .bloco-handle {
      display: flex;
      justify-content: flex-end;
      padding-top: 10px;
    }
    .tipo-tag {
      font-size: .62rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: .04em;
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
      cursor: pointer;
      opacity: 0;
      margin-top: 6px;
      transition: opacity .15s, color .15s;
    }
    .bloco-row:hover .btn-remover { opacity: 1; }
    .btn-remover:hover:not(:disabled) { color: #ef4444; }
    .btn-remover:disabled { cursor: default; }

    .bloco-sep {
      position: relative;
      height: 16px;
      display: flex;
      align-items: center;
    }
    .sep-linha {
      position: relative;
      width: 100%;
      height: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sep-linha::before {
      content: '';
      position: absolute;
      inset: 0;
      background: transparent;
      transition: background .15s;
      border-radius: 2px;
    }
    .bloco-sep:hover .sep-linha::before { background: #bbf7d0; }
    .sep-btn {
      position: relative;
      z-index: 1;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid #bbf7d0;
      background: #fff;
      color: var(--primary);
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
      opacity: 0;
      transition: opacity .15s, background .15s, border-color .15s;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .bloco-sep:hover .sep-btn { opacity: 1; }
    .sep-btn:hover {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
    }
    .sep-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 50%;
      transform: translateX(-50%);
      z-index: 100;
      display: flex;
      gap: 4px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,.12);
    }
    .sep-menu button {
      padding: 5px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
      font-size: .8rem;
      white-space: nowrap;
      transition: background .12s;
    }
    .sep-menu button:hover { background: #f0fdf4; color: var(--primary); border-color: #bbf7d0; }

    .blocos-vazio {
      color: #94a3b8;
      font-size: .9rem;
      text-align: center;
      padding: 32px;
      border: 2px dashed #e2e8f0;
      border-radius: 8px;
    }

    .meta-sidebar {
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: sticky;
      top: 72px;
    }
    .meta-section {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
    }
    .meta-section h4 {
      margin: 0 0 14px;
      font-size: .85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .05em;
      color: #64748b;
    }
    .meta-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-bottom: 12px;
    }
    .meta-field:last-child { margin-bottom: 0; }
    .meta-field label {
      font-size: .8rem;
      font-weight: 600;
      color: #475569;
    }
    .meta-field input,
    .meta-field select {
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: .875rem;
      outline: none;
      transition: box-shadow .15s;
    }
    .meta-field input:focus,
    .meta-field select:focus {
      box-shadow: 0 0 0 2px var(--primary);
      border-color: var(--primary);
    }
    .form-error.meta-erro {
      background: #fef2f2;
      border: 1px solid #fca5a5;
      border-radius: 8px;
      padding: 10px 12px;
      color: #b91c1c;
      font-size: .85rem;
    }
    .form-success.meta-ok {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 8px;
      padding: 10px 12px;
      color: #166534;
      font-size: .85rem;
    }

    .loading-full {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 80px;
      color: #94a3b8;
      font-size: 1rem;
    }

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class InstituicaoAulaFormComponent implements OnInit {
  aulaId?: number;
  carregando = false;
  salvando = false;
  erro = '';
  sucesso = '';

  blocos: BlocoEditavel[] = [
    { id: 1, tipo: 'titulo', conteudo: '' },
    { id: 2, tipo: 'texto',  conteudo: '' },
  ];

  meta: {
    curso_id: number | null;
    data_aula: string;
    duracao_minutos: number | null;
    ativo: boolean;
  } = {
    curso_id: null,
    data_aula: '',
    duracao_minutos: null,
    ativo: true,
  };

  cursos: Curso[] = [];
  menuAberto: number | null = null;
  sepAtivo = -1;
  private proximoId = 3;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.carregarCursos();

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isNaN(id) && id > 0) {
      this.aulaId = id;
      this.carregarAula(id);
    }
  }

  // ── Blocos ────────────────────────────────────────────────────────────────

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

  isTituloUnico(b: BlocoEditavel): boolean {
    return b.tipo === 'titulo' && this.blocos.filter(x => x.tipo === 'titulo').length === 1;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!(e.target as HTMLElement).closest('.bloco-sep')) {
      this.menuAberto = null;
    }
  }

  toggleMenu(index: number): void {
    this.menuAberto = this.menuAberto === index ? null : index;
  }

  adicionarEm(index: number, tipo: TipoBloco): void {
    const novo: BlocoEditavel = { id: this.proximoId++, tipo, conteudo: '' };
    const copia = [...this.blocos];
    copia.splice(index, 0, novo);
    this.blocos = copia;
    this.menuAberto = null;
  }

  // ── Serialização ──────────────────────────────────────────────────────────

  private get tituloAtual(): string {
    return this.blocos.find(b => b.tipo === 'titulo')?.conteudo.trim() ?? '';
  }

  private serializarDescricao(): string {
    const conteudo = this.blocos.filter((b, i) => !(b.tipo === 'titulo' && i === 0));
    return conteudo.length ? JSON.stringify(conteudo) : '';
  }

  // ── API ───────────────────────────────────────────────────────────────────

  private headers(): HttpHeaders {
    const token = this.authService.getToken() ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private carregarCursos(): void {
    this.http.get<Curso[]>(`${API}/instituicoes/minha/cursos`, { headers: this.headers() }).subscribe({
      next: (c) => this.cursos = c,
      error: () => {},
    });
  }

  private carregarAula(id: number): void {
    this.carregando = true;
    this.http.get<any>(`${API}/aulas/${id}`, { headers: this.headers() }).subscribe({
      next: (aula) => {
        this.carregando = false;
        if (!aula) { this.erro = 'Aula não encontrada.'; return; }

        this.blocos = parseBlocos(aula.titulo ?? '', aula.descricao ?? '');
        this.proximoId = Math.max(...this.blocos.map(b => b.id)) + 1;

        const dataFmt = aula.data_aula
          ? new Date(aula.data_aula).toISOString().slice(0, 16)
          : '';

        this.meta = {
          curso_id: aula.curso_id ?? null,
          data_aula: dataFmt,
          duracao_minutos: aula.duracao_minutos ?? null,
          ativo: aula.ativo ?? true,
        };

        // Carrega vídeos de upload no bloco de vídeo
        const videosUpload: Video[] = (aula.videos ?? []).map((v: any) => {
          const nome = (v.caminho_arquivo as string).split(/[/\\]/).pop() || v.arquivo_nome;
          return {
            id: `upload_${v.id}`,
            tipo: 'upload' as const,
            url: `${API}/aulas/video/${nome}`,
            tamanho: v.tamanho_bytes,
            titulo: v.arquivo_nome,
          };
        });

        if (videosUpload.length > 0) {
          const videoBlocoIdx = this.blocos.findIndex(b => b.tipo === 'video');
          if (videoBlocoIdx >= 0) {
            let videosYt: Video[] = [];
            try {
              const parsed = JSON.parse(this.blocos[videoBlocoIdx].conteudo);
              if (Array.isArray(parsed)) videosYt = parsed.filter((v: any) => v.tipo === 'youtube');
            } catch {
              const url = this.blocos[videoBlocoIdx].conteudo?.trim();
              if (url) videosYt = [{ id: `yt_old`, tipo: 'youtube', url }];
            }
            const combinados = [...videosUpload, ...videosYt];
            this.blocos = this.blocos.map((b, i) =>
              i === videoBlocoIdx ? { ...b, conteudo: JSON.stringify(combinados) } : b
            );
          } else {
            this.blocos = [...this.blocos, {
              id: this.proximoId++,
              tipo: 'video',
              conteudo: JSON.stringify(videosUpload),
            }];
          }
        }
      },
      error: () => {
        this.carregando = false;
        this.erro = 'Erro ao carregar aula.';
      },
    });
  }

  salvar(): void {
    this.erro = '';
    this.sucesso = '';

    const titulo = this.tituloAtual;
    if (!titulo) { this.erro = 'Adicione um bloco de título com conteúdo.'; return; }
    if (!this.meta.curso_id) { this.erro = 'Selecione um curso.'; return; }
    if (!this.meta.data_aula) { this.erro = 'Informe a data da aula.'; return; }

    const payload: Record<string, unknown> = {
      titulo,
      descricao: this.serializarDescricao(),
      data_aula: new Date(this.meta.data_aula).toISOString(),
      duracao_minutos: this.meta.duracao_minutos ?? undefined,
      curso_id: this.meta.curso_id,
    };

    if (this.aulaId) payload['ativo'] = this.meta.ativo;

    this.salvando = true;
    const req$ = this.aulaId
      ? this.http.put<any>(`${API}/aulas/${this.aulaId}`, payload, { headers: this.headers() })
      : this.http.post<any>(`${API}/aulas/`, payload, { headers: this.headers() });

    req$.subscribe({
      next: (aula) => {
        this.salvando = false;
        this.sucesso = this.aulaId ? 'Aula atualizada!' : 'Aula criada!';
        if (!this.aulaId) {
          this.router.navigate(['/instituicao/aulas', aula.id, 'editar']);
        } else {
          setTimeout(() => { this.sucesso = ''; }, 3000);
        }
      },
      error: (err) => {
        this.salvando = false;
        this.erro = err?.error?.detail ?? 'Erro ao salvar. Tente novamente.';
      },
    });
  }

  voltar(): void {
    this.router.navigate(['/instituicao/aulas']);
  }
}
