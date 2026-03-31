import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

import { ApiService, CourseRequest } from '../../../shared/services/api.service';

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

      <!-- Topbar -->
      <div class="aula-topbar">
        <button class="btn-voltar" (click)="voltar()">â† Voltar</button>
        <div class="topbar-meta" *ngIf="aula">
          <span class="topbar-curso" *ngIf="curso?.nome">ðŸ“š {{ curso.nome }}</span>
          <span class="topbar-data" *ngIf="aula.data_aula">{{ aula.data_aula | date:'dd/MM/yyyy HH:mm' }}</span>
          <span class="topbar-dur" *ngIf="aula.duracao_minutos">â± {{ aula.duracao_minutos }}min</span>
        </div>
      </div>

      <!-- Loading -->
      <div class="aula-loading" *ngIf="!aula && !erro">
        <div class="spinner"></div>
        <p>Carregando aula...</p>
      </div>

      <!-- Erro -->
      <div class="aula-erro" *ngIf="erro">
        <p>{{ erro }}</p>
        <button (click)="carregarAula()">Tentar novamente</button>
      </div>

      <!-- ConteÃºdo principal -->
      <div class="aula-body" *ngIf="aula">

        <!-- Banner de curso pago bloqueado -->
        <div class="access-panel" *ngIf="!carregandoAcesso && curso?.pago && !acessoLiberado">
          <div class="access-panel-inner">
            <span class="access-icon">ðŸ”’</span>
            <div>
              <strong>Curso pago</strong>
              <p>{{ mensagemAcesso }}</p>
            </div>
            <button
              class="btn-request"
              *ngIf="podeSolicitarAcesso()"
              (click)="solicitarAcesso()"
              [disabled]="processandoSolicitacao"
            >{{ processandoSolicitacao ? 'Enviando...' : getTextoBotaoSolicitacao() }}</button>
          </div>
        </div>

        <!-- TÃ­tulo da aula -->
        <h1 class="aula-titulo">{{ aula.titulo }}</h1>

        <!-- Blocos de conteÃºdo -->
        <div class="blocos">

          <ng-container *ngFor="let bloco of blocos">

            <!-- VÃ­deo de upload -->
            <div *ngIf="bloco.tipo === 'video-upload'" class="bloco-video-upload">
              <video
                [src]="bloco.videoUrl"
                controls
                preload="metadata"
                class="player"
              >Seu navegador nÃ£o suporta reproduÃ§Ã£o de vÃ­deo.</video>
            </div>

            <!-- Bloco de texto rico -->
            <div *ngIf="bloco.tipo === 'texto' && bloco.html"
              class="bloco-texto"
              [innerHTML]="bloco.html"
            ></div>

            <!-- Bloco YouTube -->
            <div *ngIf="bloco.tipo === 'video' && bloco.safeUrl" class="bloco-youtube">
              <div class="yt-wrapper">
                <iframe
                  [src]="bloco.safeUrl"
                  frameborder="0"
                  allowfullscreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerpolicy="strict-origin-when-cross-origin"
                ></iframe>
              </div>
            </div>

          </ng-container>

          <!-- Sem conteÃºdo -->
          <div class="sem-conteudo" *ngIf="blocos.length === 0">
            <span>ðŸ“„</span>
            <p>Nenhum conteÃºdo disponÃ­vel para esta aula ainda.</p>
          </div>

        </div>

      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* â”€â”€ Topbar â”€â”€ */
    .aula-topbar {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 12px 24px;
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .btn-voltar {
      background: none;
      border: none;
      color: #3b82f6;
      cursor: pointer;
      font-size: .9rem;
      padding: 0;
      white-space: nowrap;
    }
    .btn-voltar:hover { text-decoration: underline; }
    .topbar-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: .82rem;
      color: #64748b;
    }
    .topbar-curso { font-weight: 600; color: #475569; }

    /* â”€â”€ Loading / Erro â”€â”€ */
    .aula-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 80px 20px;
      color: #94a3b8;
    }
    .spinner {
      width: 36px; height: 36px;
      border: 3px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin .8s linear infinite;
      margin-bottom: 14px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .aula-erro {
      max-width: 600px; margin: 60px auto;
      background: #fef2f2; border: 1px solid #fca5a5;
      border-radius: 8px; padding: 20px;
      color: #b91c1c; text-align: center;
    }
    .aula-erro button {
      margin-top: 10px; padding: 8px 16px;
      background: #b91c1c; color: white;
      border: none; border-radius: 6px; cursor: pointer;
    }

    /* â”€â”€ Body â”€â”€ */
    .aula-body {
      max-width: 860px;
      margin: 0 auto;
      padding: 32px 24px 60px;
    }

    /* â”€â”€ Access panel â”€â”€ */
    .access-panel {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 28px;
    }
    .access-panel-inner {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }
    .access-icon { font-size: 1.6rem; }
    .access-panel-inner strong { display: block; color: #92400e; }
    .access-panel-inner p { margin: 2px 0 0; color: #78350f; font-size: .9rem; }
    .btn-request {
      margin-left: auto;
      background: #d97706; color: white;
      border: none; padding: 9px 18px;
      border-radius: 6px; cursor: pointer;
      font-weight: 600; white-space: nowrap;
    }
    .btn-request:disabled { opacity: .6; cursor: not-allowed; }

    /* â”€â”€ TÃ­tulo â”€â”€ */
    .aula-titulo {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 28px;
      line-height: 1.25;
    }

    /* â”€â”€ Blocos â”€â”€ */
    .blocos {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* VÃ­deo de upload */
    .bloco-video-upload {
      border-radius: 10px;
      overflow: hidden;
      background: #0f172a;
      box-shadow: 0 4px 20px rgba(0,0,0,.2);
    }
    .player {
      display: block;
      width: 100%;
      max-height: 500px;
    }

    /* Texto rico */
    .bloco-texto {
      background: #fff;
      border-radius: 10px;
      padding: 24px 28px;
      box-shadow: 0 1px 6px rgba(0,0,0,.07);
      color: #374151;
      font-size: 1rem;
      line-height: 1.75;
    }
    .bloco-texto ::ng-deep h2 {
      font-size: 1.25rem; font-weight: 700;
      color: #1e293b; margin: 0 0 .6em;
    }
    .bloco-texto ::ng-deep h3 {
      font-size: 1.05rem; font-weight: 600;
      color: #334155; margin: 0 0 .5em;
    }
    .bloco-texto ::ng-deep p  { margin: 0 0 .7em; }
    .bloco-texto ::ng-deep p:last-child { margin-bottom: 0; }
    .bloco-texto ::ng-deep ul,
    .bloco-texto ::ng-deep ol { padding-left: 1.5em; margin: 0 0 .7em; }
    .bloco-texto ::ng-deep li > p { margin: 0; }
    .bloco-texto ::ng-deep blockquote {
      border-left: 3px solid #cbd5e1;
      padding-left: 1em;
      color: #64748b;
      margin: 0 0 .7em;
    }
    .bloco-texto ::ng-deep code {
      background: #f1f5f9; border-radius: 3px;
      padding: 1px 5px;
      font-family: ui-monospace, monospace;
      font-size: .88em; color: #e11d48;
    }
    .bloco-texto ::ng-deep pre {
      background: #1e293b; color: #e2e8f0;
      border-radius: 8px; padding: 14px 18px;
      overflow-x: auto; font-size: .85rem;
    }
    .bloco-texto ::ng-deep strong { font-weight: 700; }
    .bloco-texto ::ng-deep em     { font-style: italic; }
    .bloco-texto ::ng-deep s      { text-decoration: line-through; }

    /* YouTube */
    .bloco-youtube {
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,.12);
    }
    .yt-wrapper {
      position: relative;
      padding-bottom: 56.25%;
      height: 0;
      background: #000;
    }
    .yt-wrapper iframe {
      position: absolute;
      inset: 0; width: 100%; height: 100%;
    }

    /* Sem conteÃºdo */
    .sem-conteudo {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 56px 20px;
      border: 2px dashed #e2e8f0;
      border-radius: 10px;
      color: #94a3b8;
      font-size: .95rem;
    }
    .sem-conteudo span { font-size: 2.5rem; }

    @media (max-width: 640px) {
      .aula-body { padding: 20px 14px 40px; }
      .aula-titulo { font-size: 1.35rem; }
    }
  `]
})
export class AulaDetailsComponent implements OnInit {
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
  ) {}

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
        if (!aula) { this.erro = 'Aula nÃ£o encontrada.'; return; }
        this.aula = aula;

        const blocos: BlocoRender[] = [];

        // VÃ­deo de upload (primeiro)
        if (aula.videos?.length > 0) {
          const video = aula.videos[0];
          const nome = (video.caminho_arquivo as string).split('\\').pop() || video.arquivo_nome;
          blocos.push({ tipo: 'video-upload', videoUrl: `http://localhost:8000/api/aulas/video/${nome}` });
        }

        // Blocos de conteÃºdo da descricao
        blocos.push(...this.parseBlocos(aula.descricao));
        this.blocos = blocos;

        this.verificarAcessoCurso();
      },
      error: () => { this.erro = 'Erro ao carregar aula. Tente novamente.'; }
    });
  }

  // â”€â”€ Acesso â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      error: (e) => { this.processandoSolicitacao = false; this.erro = e?.error?.detail || 'NÃ£o foi possÃ­vel registrar a solicitaÃ§Ã£o.'; }
    });
  }

  podeSolicitarAcesso(): boolean { return !this.solicitacao || this.solicitacao.status === 'rejected'; }
  getTextoBotaoSolicitacao(): string { return this.solicitacao?.status === 'rejected' ? 'Solicitar novamente' : 'Solicitar acesso'; }

  private definirEstadoAcesso(): void {
    const s = this.solicitacao?.status;
    if (s === 'approved') { this.acessoLiberado = true; this.mensagemAcesso = ''; return; }
    this.acessoLiberado = false;
    if (s === 'pending')  { this.mensagemAcesso = 'Aguardando aprovaÃ§Ã£o do administrador.'; return; }
    if (s === 'rejected') { this.mensagemAcesso = 'Sua solicitaÃ§Ã£o foi recusada. VocÃª pode solicitar novamente.'; return; }
    this.mensagemAcesso = 'Este curso Ã© pago. Solicite acesso para liberar o conteÃºdo.';
  }

  // â”€â”€ Parse de blocos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private parseBlocos(descricao: string): BlocoRender[] {
    if (!descricao) return [];
    try {
      const parsed = JSON.parse(descricao);
      if (Array.isArray(parsed)) {
        return parsed.map((b: any) => {
          if (b.tipo === 'texto') {
            const html = this.richToHtml(b.conteudo);
            return html ? { tipo: 'texto' as const, html: this.sanitizer.bypassSecurityTrustHtml(html) } : null;
          }
          if (b.tipo === 'video') {
            const url = this.toEmbedUrl(b.conteudo);
            return url ? { tipo: 'video' as const, safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url) } : null;
          }
          return null;
        }).filter(Boolean) as BlocoRender[];
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
