import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

import { ApiService, CourseRequest } from '../../../shared/services/api.service';
import { VideoService } from '../../../core/services/video.service';

interface BlocoRender {
  tipo: 'texto' | 'video' | 'video-upload';
  html?: SafeHtml;
  safeUrl?: SafeResourceUrl;
  videoUrl?: string;
}

@Component({
  selector: 'app-aula-details',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="aula-page">

      <!-- Topbar sticky -->
      <div class="aula-topbar">
        <button class="btn-voltar" (click)="voltar()">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Voltar
        </button>
        @if (aula) {
          <div class="topbar-meta">
            @if (curso?.nome) { <span class="topbar-curso">{{ curso.nome }}</span> }
            @if (aula.data_aula) { <span class="topbar-info">{{ aula.data_aula | date:'dd/MM/yyyy HH:mm' }}</span> }
            @if (aula.duracao_minutos) { <span class="topbar-info">{{ aula.duracao_minutos }}min</span> }
          </div>
        }
      </div>

      @if (!aula && !erro) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Carregando aula...</p>
        </div>
      }

      @if (erro) {
        <div class="error-card">
          <p>{{ erro }}</p>
          <button class="btn-retry" (click)="carregarAula()">Tentar novamente</button>
        </div>
      }

      @if (aula) {
        <div class="aula-body">

          <!-- Banner curso pago bloqueado -->
          @if (!carregandoAcesso && curso?.pago && !acessoLiberado) {
            <div class="access-panel">
              <div class="access-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <div>
                  <strong>Curso pago</strong>
                  <p>{{ mensagemAcesso }}</p>
                </div>
                @if (podeSolicitarAcesso()) {
                  <button
                    class="btn-request"
                    (click)="solicitarAcesso()"
                    [disabled]="processandoSolicitacao"
                  >{{ processandoSolicitacao ? 'Enviando...' : getTextoBotaoSolicitacao() }}</button>
                }
              </div>
            </div>
          }

          <h1 class="aula-titulo">{{ aula.titulo }}</h1>

          <div class="blocos">
            @for (bloco of blocos; track $index) {
              @if (bloco.tipo === 'video-upload') {
                <div class="bloco-video-upload">
                  <video [src]="bloco.videoUrl" controls preload="metadata" class="player">Seu navegador não suporta vídeo.</video>
                </div>
              }
              @if (bloco.tipo === 'texto' && bloco.html) {
                <div class="bloco-texto" [innerHTML]="bloco.html"></div>
              }
              @if (bloco.tipo === 'video' && bloco.safeUrl) {
                <div class="bloco-youtube">
                  <div class="yt-wrapper">
                    <iframe [src]="bloco.safeUrl" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin"></iframe>
                  </div>
                </div>
              }
            }
            @if (blocos.length === 0) {
              <div class="empty-state">
                <div class="empty-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <h3 class="empty-title">Sem conteúdo</h3>
                <p>Nenhum conteúdo disponível para esta aula ainda.</p>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .aula-page { display: flex; flex-direction: column; min-height: 100%; }

    /* Topbar */
    .aula-topbar {
      display: flex; align-items: center; gap: var(--space-5);
      padding: var(--space-3) var(--space-6);
      background: var(--color-surface); border-bottom: 1px solid var(--color-border);
      position: sticky; top: 0; z-index: 10;
    }
    .btn-voltar {
      display: inline-flex; align-items: center; gap: var(--space-1);
      background: none; border: none; color: var(--primary);
      cursor: pointer; font-size: var(--font-size-sm); padding: 0;
      white-space: nowrap; font-weight: 600;
    }
    .btn-voltar:hover { text-decoration: underline; }
    .topbar-meta { display: flex; flex-wrap: wrap; gap: var(--space-3); font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .topbar-curso { font-weight: 600; color: var(--color-text); }
    .topbar-info  { color: var(--color-text-muted); }

    /* Loading / Erro */
    .loading-state { display: flex; flex-direction: column; align-items: center; padding: 80px var(--space-5); color: var(--color-text-muted); }
    .spinner { width: 36px; height: 36px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: var(--space-3); }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-card { max-width: 600px; margin: 60px auto; background: color-mix(in srgb, var(--color-danger) 10%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); border-radius: var(--radius-lg); padding: var(--space-5); color: var(--color-danger); text-align: center; }
    .btn-retry { margin-top: var(--space-3); padding: var(--space-2) var(--space-4); background: var(--color-danger); color: #fff; border: none; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; }

    /* Body */
    .aula-body { max-width: 860px; margin: 0 auto; padding: var(--space-8) var(--space-6) var(--space-14, 56px); width: 100%; }

    /* Access panel */
    .access-panel {
      background: color-mix(in srgb, var(--color-warning) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-warning) 35%, transparent);
      border-radius: var(--radius-lg); padding: var(--space-4) var(--space-5); margin-bottom: var(--space-7);
    }
    .access-inner { display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap; }
    .access-inner strong { display: block; color: var(--color-text); font-size: var(--font-size-sm); font-weight: 700; }
    .access-inner p { margin: 2px 0 0; color: var(--color-text-muted); font-size: var(--font-size-xs); }
    .btn-request {
      margin-left: auto; background: var(--color-warning); color: #fff;
      border: none; padding: var(--space-2) var(--space-4); border-radius: var(--radius);
      cursor: pointer; font-weight: 600; font-size: var(--font-size-sm); white-space: nowrap;
    }
    .btn-request:disabled { opacity: .6; cursor: not-allowed; }

    /* Título */
    .aula-titulo { font-size: var(--font-size-3xl); font-weight: 800; color: var(--color-text); margin: 0 0 var(--space-7); line-height: 1.25; font-family: var(--font-display); }

    /* Blocos */
    .blocos { display: flex; flex-direction: column; gap: var(--space-6); }

    .bloco-video-upload { border-radius: var(--radius-lg); overflow: hidden; background: #000; box-shadow: var(--shadow-lg); }
    .player { display: block; width: 100%; max-height: 500px; }

    .bloco-texto {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: var(--space-6) var(--space-7);
      box-shadow: var(--shadow-sm); color: var(--color-text);
      font-size: var(--font-size-base); line-height: 1.75;
    }
    .bloco-texto ::ng-deep h2 { font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text); margin: 0 0 .6em; }
    .bloco-texto ::ng-deep h3 { font-size: var(--font-size-lg); font-weight: 600; color: var(--color-text); margin: 0 0 .5em; }
    .bloco-texto ::ng-deep p  { margin: 0 0 .7em; }
    .bloco-texto ::ng-deep p:last-child { margin-bottom: 0; }
    .bloco-texto ::ng-deep ul, .bloco-texto ::ng-deep ol { padding-left: 1.5em; margin: 0 0 .7em; }
    .bloco-texto ::ng-deep li > p { margin: 0; }
    .bloco-texto ::ng-deep blockquote { border-left: 3px solid var(--color-border); padding-left: 1em; color: var(--color-text-muted); margin: 0 0 .7em; }
    .bloco-texto ::ng-deep code { background: var(--color-surface-2); border-radius: 3px; padding: 1px 5px; font-family: ui-monospace, monospace; font-size: .88em; color: var(--color-danger); }
    .bloco-texto ::ng-deep pre { background: var(--sidebar-bg); color: #e2e8f0; border-radius: var(--radius); padding: var(--space-4) var(--space-5); overflow-x: auto; font-size: .85rem; }
    .bloco-texto ::ng-deep strong { font-weight: 700; }
    .bloco-texto ::ng-deep em { font-style: italic; }
    .bloco-texto ::ng-deep s { text-decoration: line-through; }

    .bloco-youtube { border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow); }
    .yt-wrapper { position: relative; padding-bottom: 56.25%; height: 0; background: #000; }
    .yt-wrapper iframe { position: absolute; inset: 0; width: 100%; height: 100%; }

    @media (max-width: 640px) {
      .aula-body { padding: var(--space-5) var(--space-4) var(--space-10); }
      .aula-titulo { font-size: var(--font-size-2xl); }
    }
  `]
})
export class AulaDetailsComponent implements OnInit, OnDestroy {
  aulaId?: number;
  aula: any;
  curso: any;
  solicitacao: CourseRequest | null = null;
  erro = '';
  mensagemAcesso = '';
  acessoLiberado = false;
  carregandoAcesso = false;
  processandoSolicitacao = false;

  blocos: BlocoRender[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private sanitizer: DomSanitizer,
    private videoService: VideoService,
  ) {}

  ngOnDestroy(): void {
    // Libera as object URLs dos vídeos baixados nesta tela.
    this.videoService.liberar();
  }

  /**
   * Cria um bloco de vídeo com `videoUrl` vazia e preenche quando o download
   * autenticado terminar. O endpoint exige Bearer token, então a URL não pode
   * ir direto para `<video src>` — ver VideoService.
   */
  private blocoVideoUpload(caminhoOuUrl: string): BlocoRender {
    const bloco: BlocoRender = { tipo: 'video-upload' as const, videoUrl: '' };
    this.videoService.carregar(caminhoOuUrl).subscribe({
      next: (url) => { bloco.videoUrl = url; },
      error: () => { bloco.videoUrl = ''; },
    });
    return bloco;
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = Number(params['id']);
      this.aulaId = Number.isNaN(id) ? undefined : id;
      if (this.aulaId !== undefined) this.carregarAula();
    });
  }

  voltar(): void {
    this.router.navigate(['/aluno/aulas']);
  }

  carregarAula(): void {
    if (this.aulaId === undefined) return;
    this.aula = null;
    this.erro = '';

    this.apiService.getAula(this.aulaId).subscribe({
      next: (aula) => {
        if (!aula) { this.erro = 'Aula não encontrada.'; return; }
        this.aula = aula;

        const blocos: BlocoRender[] = this.parseBlocos(aula.descricao);

        // Fallback: se a descricao não contém uploads, usa aula.videos direto
        if (!blocos.some(b => b.tipo === 'video-upload') && aula.videos?.length > 0) {
          const uploads = (aula.videos as any[]).map((v: any) =>
            this.blocoVideoUpload(v.caminho_arquivo || v.arquivo_nome),
          );
          blocos.unshift(...uploads);
        }

        this.blocos = blocos;

        this.verificarAcessoCurso();
      },
      error: () => { this.erro = 'Erro ao carregar aula. Tente novamente.'; }
    });
  }

  // ── Acesso ────────────────────────────────────────────────────────────────

  verificarAcessoCurso(): void {
    if (!this.aula?.curso_id) { this.acessoLiberado = true; return; }

    this.carregandoAcesso = true;
    this.apiService.getCurso(this.aula.curso_id).subscribe({
      next: (curso) => {
        this.curso = curso;
        if (!curso?.pago) {
          this.acessoLiberado = true;
          this.carregandoAcesso = false;
          return;
        }
        this.apiService.getCourseRequestStatus(this.aula.curso_id).subscribe({
          next: (s) => { this.solicitacao = s; this.definirEstadoAcesso(); this.carregandoAcesso = false; },
          error: () => { this.solicitacao = null; this.definirEstadoAcesso(); this.carregandoAcesso = false; }
        });
      },
      error: () => { this.carregandoAcesso = false; this.erro = 'Erro ao verificar acesso ao curso.'; }
    });
  }

  solicitarAcesso(): void {
    if (!this.aula?.curso_id || this.processandoSolicitacao) return;
    this.processandoSolicitacao = true;
    this.apiService.createCourseRequest(this.aula.curso_id).subscribe({
      next: (s) => { this.solicitacao = s; this.definirEstadoAcesso(); this.processandoSolicitacao = false; },
      error: (e) => { this.processandoSolicitacao = false; this.erro = e?.error?.detail || 'Não foi possível registrar a solicitação.'; }
    });
  }

  podeSolicitarAcesso(): boolean { return !this.solicitacao || this.solicitacao.status === 'rejected'; }
  getTextoBotaoSolicitacao(): string { return this.solicitacao?.status === 'rejected' ? 'Solicitar novamente' : 'Solicitar acesso'; }

  private definirEstadoAcesso(): void {
    const s = this.solicitacao?.status;
    if (s === 'approved') { this.acessoLiberado = true; this.mensagemAcesso = ''; return; }
    this.acessoLiberado = false;
    if (s === 'pending')  { this.mensagemAcesso = 'Aguardando aprovação do administrador.'; return; }
    if (s === 'rejected') { this.mensagemAcesso = 'Sua solicitação foi recusada. Você pode solicitar novamente.'; return; }
    this.mensagemAcesso = 'Este curso é pago. Solicite acesso para liberar o conteúdo.';
  }

  // ── Parse de blocos ───────────────────────────────────────────────────────

  private parseBlocos(descricao: string): BlocoRender[] {
    if (!descricao) return [];
    try {
      const parsed = JSON.parse(descricao);
      if (Array.isArray(parsed)) {
        return parsed.flatMap((b: any) => {
          if (b.tipo === 'texto') {
            const html = this.richToHtml(b.conteudo);
            return html ? [{ tipo: 'texto' as const, html: this.sanitizer.bypassSecurityTrustHtml(html) }] : [];
          }
          if (b.tipo === 'video') {
            // Formato novo: conteudo é um JSON array de {tipo, url, ...}
            try {
              const videos = JSON.parse(b.conteudo);
              if (Array.isArray(videos)) {
                return videos.flatMap((v: any) => {
                  if (v.tipo === 'youtube') {
                    const url = this.toEmbedUrl(v.url);
                    return url ? [{ tipo: 'video' as const, safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url) }] : [];
                  }
                  if (v.tipo === 'upload') {
                    return [this.blocoVideoUpload(v.url)];
                  }
                  return [] as BlocoRender[];
                });
              }
            } catch { /* não é JSON, tenta formato antigo */ }
            // Formato antigo: URL simples
            const url = this.toEmbedUrl(b.conteudo);
            return url ? [{ tipo: 'video' as const, safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url) }] : [];
          }
          return [] as BlocoRender[];
        });
      }
      if (parsed?.type === 'doc') {
        return [{ tipo: 'texto', html: this.sanitizer.bypassSecurityTrustHtml(generateHTML(parsed, [StarterKit])) }];
      }
    } catch { /* fallthrough */ }
    if (descricao.trim()) {
      return [{ tipo: 'texto', html: this.sanitizer.bypassSecurityTrustHtml('<p>' + descricao.replace(/</g, '&lt;') + '</p>') }];
    }
    return [];
  }

  private richToHtml(conteudo: string): string {
    if (!conteudo) return '';
    try {
      const p = JSON.parse(conteudo);
      if (p?.type === 'doc') return generateHTML(p, [StarterKit]);
    } catch { /* texto puro */ }
    return conteudo;
  }

  private toEmbedUrl(url: string): string | null {
    if (!url) return null;
    const q = 'enablejsapi=1&rel=0';
    const shorts = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
    if (shorts) return `https://www.youtube-nocookie.com/embed/${shorts[1]}?${q}`;
    const yt = url.match(/(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (yt) {
      let e = `https://www.youtube-nocookie.com/embed/${yt[1]}?${q}`;
      const t = url.match(/[?&]t=(\d+)/);
      if (t) e += `&start=${t[1]}`;
      return e;
    }
    const pl = url.match(/youtube\.com\/.*[?&]list=([A-Za-z0-9_-]+)/);
    if (pl) return `https://www.youtube-nocookie.com/embed/videoseries?list=${pl[1]}&${q}`;
    return null;
  }
}
