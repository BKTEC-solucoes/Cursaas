import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { BlocoTextoComponent, BlocoVideoModernoComponent, RichTextEditorComponent } from '../../../shared/components';
import type { BlocoEditavel, TipoBloco } from '../../../shared/components';
import type { Video } from '../../../shared/components';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface Curso { id: number; nome: string; }

const API = environment.apiUrl;

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

      <div class="form-topbar">
        <button class="btn-voltar" (click)="voltar()">← Voltar</button>
        <h2 class="topbar-title">{{ aulaId ? 'Editar Aula' : 'Nova Aula' }}</h2>
        <div class="topbar-actions">
          <button class="btn-secondary" (click)="voltar()" [disabled]="salvando">Cancelar</button>
          <button class="btn-primary" (click)="salvar()" [disabled]="salvando">
            @if (salvando) { <span class="spinner"></span> }
            {{ salvando ? 'Salvando...' : 'Salvar Aula' }}
          </button>
        </div>
      </div>

      @if (!carregando) {
        <div class="form-body">
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
                @if (menuAberto === 0) {
                  <div class="sep-menu">
                    <button type="button" (click)="adicionarEm(0, 'titulo')">Título</button>
                    <button type="button" (click)="adicionarEm(0, 'texto')">Texto</button>
                    <button type="button" (click)="adicionarEm(0, 'video')">Vídeo</button>
                  </div>
                }
              </div>

              @for (b of blocos; track b.id; let i = $index) {
                <div class="bloco-row">
                  <div class="bloco-handle" title="Tipo: {{ b.tipo }}">
                    <span class="tipo-tag">{{ b.tipo }}</span>
                  </div>
                  @if (b.tipo === 'titulo') {
                    <app-bloco-texto [conteudo]="b.conteudo" [tipo]="b.tipo" (conteudoChange)="atualizar(b.id, $event)" class="bloco-content" />
                  }
                  @if (b.tipo === 'texto') {
                    <app-rich-text-editor [content]="b.conteudo" placeholder="Digite um parágrafo..." (contentChange)="atualizar(b.id, $event)" class="bloco-content" />
                  }
                  @if (b.tipo === 'video') {
                    <app-bloco-video-moderno [conteudo]="b.conteudo" [aulaId]="aulaId" (conteudoChange)="atualizar(b.id, $event)" class="bloco-content" />
                  }
                  <button class="btn-remover" title="Remover bloco" (click)="remover(b.id)" [disabled]="isTituloUnico(b)">×</button>
                </div>

                <div class="bloco-sep">
                  <div class="sep-linha">
                    <button class="sep-btn" type="button" (click)="toggleMenu(i + 1)" title="Inserir bloco aqui">+</button>
                  </div>
                  @if (menuAberto === i + 1) {
                    <div class="sep-menu">
                      <button type="button" (click)="adicionarEm(i + 1, 'titulo')">Título</button>
                      <button type="button" (click)="adicionarEm(i + 1, 'texto')">Texto</button>
                      <button type="button" (click)="adicionarEm(i + 1, 'video')">Vídeo</button>
                    </div>
                  }
                </div>
              }

              @if (blocos.length === 0) {
                <div class="blocos-vazio">Use a barra acima para adicionar blocos de conteúdo.</div>
              }
            </div>
          </div>

          <aside class="meta-sidebar">
            <section class="meta-section">
              <h4>Informações</h4>
              <div class="meta-field">
                <label>Curso *</label>
                <select [(ngModel)]="meta.curso_id" name="curso_id">
                  <option [ngValue]="null" disabled>Selecione...</option>
                  @for (c of cursos; track c.id) { <option [ngValue]="c.id">{{ c.nome }}</option> }
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
              @if (aulaId) {
                <div class="meta-field">
                  <label>Status</label>
                  <select [(ngModel)]="meta.ativo" name="ativo">
                    <option [ngValue]="true">Ativa</option>
                    <option [ngValue]="false">Inativa</option>
                  </select>
                </div>
              }
            </section>
            @if (erro)   { <div class="meta-erro">{{ erro }}</div> }
            @if (sucesso) { <div class="meta-ok">{{ sucesso }}</div> }
          </aside>
        </div>
      } @else {
        <div class="loading-full">Carregando aula...</div>
      }

    </div>
  `,
  styles: [`
    :host { display: block; }
    .form-page { display: flex; flex-direction: column; min-height: 100%; background: var(--color-surface-2); }

    .form-topbar { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-3) var(--space-6); background: var(--color-surface); border-bottom: 1px solid var(--color-border); position: sticky; top: 0; z-index: 10; }
    .topbar-title { flex: 1; margin: 0; font-size: var(--font-size-base); font-weight: 700; color: var(--color-text); font-family: var(--font-display); }
    .btn-voltar { background: none; border: none; color: var(--primary); cursor: pointer; font-size: var(--font-size-sm); padding: var(--space-2) 0; font-weight: 600; }
    .btn-voltar:hover { text-decoration: underline; }
    .topbar-actions { display: flex; gap: var(--space-2); }
    .btn-primary { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-5); background: var(--primary); color: #fff; border: none; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; transition: background var(--transition-fast); }
    .btn-primary:hover:not(:disabled) { background: var(--secondary); }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-secondary { padding: var(--space-2) var(--space-4); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .btn-secondary:hover:not(:disabled) { background: var(--color-surface-2); }
    .btn-secondary:disabled { opacity: .6; cursor: not-allowed; }

    .form-body { display: grid; grid-template-columns: 1fr 280px; gap: var(--space-6); padding: var(--space-6); align-items: start; max-width: 1100px; width: 100%; margin: 0 auto; }
    @media (max-width: 768px) { .form-body { grid-template-columns: 1fr; } }

    .editor-col { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm); }
    .editor-toolbar { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); background: var(--color-surface-2); border-bottom: 1px solid var(--color-border); }
    .toolbar-label { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; color: var(--color-text-muted); letter-spacing: .05em; margin-right: var(--space-1); }
    .editor-toolbar button { padding: 4px 12px; border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); cursor: pointer; font-size: var(--font-size-xs); transition: background var(--transition-fast); color: var(--color-text); }
    .editor-toolbar button:hover { background: var(--color-surface-2); }

    .blocos-list { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); min-height: 200px; }
    .bloco-row { display: grid; grid-template-columns: 56px 1fr 28px; align-items: flex-start; gap: var(--space-2); }
    .bloco-handle { display: flex; justify-content: flex-end; padding-top: 10px; }
    .tipo-tag { font-size: .62rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-muted); letter-spacing: .04em; }
    .bloco-content { min-width: 0; }
    .btn-remover { width: 24px; height: 24px; border: none; border-radius: 50%; background: transparent; color: var(--color-text-muted); font-size: 1rem; cursor: pointer; opacity: 0; margin-top: 6px; transition: opacity .15s, color .15s; }
    .bloco-row:hover .btn-remover { opacity: 1; }
    .btn-remover:hover:not(:disabled) { color: var(--color-danger); }
    .btn-remover:disabled { cursor: default; }

    .bloco-sep { position: relative; height: 16px; display: flex; align-items: center; }
    .sep-linha { position: relative; width: 100%; height: 2px; display: flex; align-items: center; justify-content: center; }
    .sep-linha::before { content: ''; position: absolute; inset: 0; background: transparent; transition: background .15s; border-radius: 2px; }
    .bloco-sep:hover .sep-linha::before { background: color-mix(in srgb, var(--primary) 20%, transparent); }
    .sep-btn { position: relative; z-index: 1; width: 22px; height: 22px; border-radius: 50%; border: 2px solid color-mix(in srgb, var(--primary) 30%, transparent); background: var(--color-surface); color: var(--primary); font-size: 1rem; line-height: 1; cursor: pointer; opacity: 0; transition: opacity .15s, background .15s, border-color .15s; display: flex; align-items: center; justify-content: center; padding: 0; }
    .bloco-sep:hover .sep-btn { opacity: 1; }
    .sep-btn:hover { background: var(--primary); color: #fff; border-color: var(--primary); }
    .sep-menu { position: absolute; top: calc(100% + 4px); left: 50%; transform: translateX(-50%); z-index: 100; display: flex; gap: var(--space-1); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: var(--space-2); box-shadow: var(--shadow); }
    .sep-menu button { padding: 5px 12px; border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); cursor: pointer; font-size: var(--font-size-xs); white-space: nowrap; transition: background var(--transition-fast); color: var(--color-text); }
    .sep-menu button:hover { background: color-mix(in srgb, var(--primary) 8%, transparent); color: var(--primary); border-color: color-mix(in srgb, var(--primary) 25%, transparent); }

    .blocos-vazio { color: var(--color-text-muted); font-size: var(--font-size-sm); text-align: center; padding: var(--space-8); border: 2px dashed var(--color-border); border-radius: var(--radius); }

    .meta-sidebar { display: flex; flex-direction: column; gap: var(--space-4); position: sticky; top: 72px; }
    .meta-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4); box-shadow: var(--shadow-sm); }
    .meta-section h4 { margin: 0 0 var(--space-4); font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--color-text-muted); }
    .meta-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: var(--space-3); }
    .meta-field:last-child { margin-bottom: 0; }
    .meta-field label { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text); }
    .meta-field input, .meta-field select { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius); font-size: var(--font-size-sm); outline: none; background: var(--color-surface); color: var(--color-text); transition: box-shadow var(--transition-fast); font-family: inherit; }
    .meta-field input:focus, .meta-field select:focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 25%, transparent); border-color: var(--primary); }

    .meta-erro { background: color-mix(in srgb, var(--color-danger) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent); border-radius: var(--radius); padding: var(--space-3) var(--space-4); color: var(--color-danger); font-size: var(--font-size-sm); }
    .meta-ok  { background: color-mix(in srgb, var(--color-success) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent); border-radius: var(--radius); padding: var(--space-3) var(--space-4); color: var(--color-success); font-size: var(--font-size-sm); }

    .loading-full { flex: 1; display: flex; align-items: center; justify-content: center; padding: 80px; color: var(--color-text-muted); font-size: var(--font-size-base); }

    .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
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
