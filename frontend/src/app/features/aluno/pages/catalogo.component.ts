import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { ApiService, CourseRequest, CourseRequestStatus, CursoResumo } from '../../../shared/services/api.service';

import { IconComponent } from '../../../shared/components/icon.component';
type Curso = CursoResumo;

const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
];

@Component({
  selector: 'app-aluno-catalogo',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent],
  template: `
    <div class="content-page catalogo-wrapper">
      <div class="hero-banner">
        <div class="hero-content">
          <h1 class="page-title" style="color:#fff;font-size:var(--font-size-3xl)">Catálogo de Cursos</h1>
          <p style="color:rgba(255,255,255,.75);margin:var(--space-2) 0 var(--space-6)">Explore todos os cursos disponíveis e expanda seu conhecimento</p>
          <div class="search-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              [(ngModel)]="termoBusca"
              (ngModelChange)="filtrarCursos()"
              placeholder="Buscar por nome ou descrição..."
              class="search-input"
            />
            @if (termoBusca) {
              <button class="btn-limpar" (click)="limparBusca()"><app-icon name="x" /></button>
            }
          </div>
        </div>
      </div>

      <div class="catalogo-body">
        <div class="filtros-bar">
          <div class="filtro-tabs">
            <button class="tab" [class.active]="filtroAtivo === 'todos'" (click)="setFiltro('todos')">
              Todos <span class="tab-count">{{ cursosTodos.length }}</span>
            </button>
            <button class="tab" [class.active]="filtroAtivo === 'disponiveis'" (click)="setFiltro('disponiveis')">
              Disponíveis <span class="tab-count">{{ cursosDisponiveis.length }}</span>
            </button>
            <button class="tab" [class.active]="filtroAtivo === 'inscritos'" (click)="setFiltro('inscritos')">
              Meus Cursos <span class="tab-count">{{ cursosInscritos.size }}</span>
            </button>
          </div>
          @if (cursosFiltrados.length > 0) {
            <span class="resultado-count">{{ cursosFiltrados.length }} curso(s)</span>
          }
        </div>

        @if (carregando) {
          <div class="skeleton-grid">
            @for (i of [1,2,3,4,5,6]; track i) {
              <div class="skeleton-card">
                <div class="skeleton skeleton-header"></div>
                <div class="skeleton-body">
                  <div class="skeleton skeleton-line"></div>
                  <div class="skeleton skeleton-line short"></div>
                  <div class="skeleton skeleton-line"></div>
                </div>
              </div>
            }
          </div>
        }

        @if (!carregando && cursosFiltrados.length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <h3 class="empty-title">Nenhum curso encontrado</h3>
            @if (termoBusca) {
              <p>Tente buscar por outro termo.</p>
            } @else if (filtroAtivo === 'inscritos') {
              <p>Você ainda não está inscrito em nenhum curso.</p>
            } @else {
              <p>Nenhum curso disponível no momento.</p>
            }
          </div>
        }

        @if (!carregando && cursosFiltrados.length > 0) {
          <div class="cursos-grid">
            @for (curso of cursosFiltrados; track curso.id) {
              <div class="curso-card">
                <div class="card-banner" [style.background]="getGradient(curso.id)">
                  <div class="banner-overlay">
                    <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                  </div>
                  <div class="card-badges">
                    @if (isInscrito(curso.id)) {
                      <span class="badge-inscrito">Inscrito</span>
                    }
                  </div>
                </div>

                <div class="card-body">
                  <h3 class="card-titulo">{{ curso.nome }}</h3>
                  <p class="card-descricao">{{ curso.descricao || 'Sem descrição disponível.' }}</p>

                  <div class="card-meta">
                    <div class="meta-item">
                      <span>{{ (curso.aulas?.length ?? 0) }} aulas</span>
                    </div>
                    <div class="meta-item">
                      <span>{{ (curso.provas?.length ?? 0) }} provas</span>
                    </div>
                    <div class="meta-item">
                      <span>{{ curso.percentual_presenca_minima }}% presença</span>
                    </div>
                    <div class="meta-item" [class.meta-paid]="curso.pago">
                      <span>{{ curso.pago ? 'Curso pago' : 'Gratuito' }}</span>
                    </div>
                  </div>

                  <div class="card-preco" [class.gratuito]="!curso.pago">
                    <span class="preco-label">Valor:</span>
                    @if (curso.pago && curso.valor != null) {
                      <span class="preco-valor">{{ curso.valor | currency:'BRL':'symbol':'1.2-2' }}</span>
                    } @else if (curso.pago) {
                      <span class="preco-valor">R$ 0,00</span>
                    } @else {
                      <span class="preco-valor gratuito">Grátis</span>
                    }
                  </div>

                  <div class="card-divider"></div>

                  <div class="card-actions">
                    @if (isInscrito(curso.id)) {
                      <div class="inscrito-info">
                        <span class="tag-inscrito">Você está inscrito</span>
                        <a class="btn-acessar" [routerLink]="['/aluno/cursos']">Ver meus cursos</a>
                      </div>
                    } @else if (!curso.pago) {
                      <button
                        class="btn-inscrever"
                        (click)="inscrever(curso)"
                        [disabled]="processando[curso.id]"
                        [class.loading]="processando[curso.id]"
                      >
                        {{ processando[curso.id] ? 'Inscrevendo...' : 'Inscrever-se grátis' }}
                      </button>
                    } @else {
                      <div class="solicitacao-info">
                        <span class="tag-solicitacao" [ngClass]="getSolicitacaoStatus(curso.id)">
                          {{ getSolicitacaoLabel(curso.id) }}
                        </span>
                        @if (podeSolicitar(curso.id)) {
                          <button
                            class="btn-solicitar"
                            (click)="solicitarAcesso(curso)"
                            [disabled]="processando[curso.id]"
                          >
                            {{ processando[curso.id] ? 'Enviando...' : getSolicitacaoButtonLabel(curso.id) }}
                          </button>
                        }
                      </div>
                    }
                    @if (erroInscricao[curso.id]) {
                      <div class="erro-inscricao">{{ erroInscricao[curso.id] }}</div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .catalogo-wrapper { padding: 0; max-width: unset; }

    .hero-banner {
      background: var(--sidebar-bg);
      padding: var(--space-12, 48px) var(--space-6) var(--space-14, 56px);
      text-align: center;
      color: #fff;
      margin: 0;
    }

    .search-box {
      display: flex; align-items: center; gap: var(--space-2);
      background: var(--color-surface); border-radius: var(--radius-full);
      padding: var(--space-1) var(--space-4); max-width: 540px;
      margin: 0 auto; box-shadow: var(--shadow-lg);
    }
    .search-input {
      flex: 1; border: none; outline: none;
      font-size: var(--font-size-sm); padding: var(--space-2) 0;
      color: var(--color-text); background: transparent;
    }
    .btn-limpar {
      background: none; border: none; color: var(--color-text-muted);
      cursor: pointer; font-size: 15px; padding: 4px; line-height: 1;
    }

    .catalogo-body {
      max-width: 1200px; margin: calc(-1 * var(--space-5)) auto 0;
      padding: 0 var(--space-5) var(--space-10);
    }

    .filtros-bar {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: var(--space-1) var(--space-5);
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: var(--space-6); box-shadow: var(--shadow-sm);
    }
    .filtro-tabs { display: flex; gap: var(--space-1); }
    .tab {
      background: none; border: none; padding: var(--space-2) var(--space-4);
      border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-sm);
      font-weight: 500; color: var(--color-text-muted);
      transition: all var(--transition-fast);
      display: flex; align-items: center; gap: var(--space-2);
    }
    .tab:hover { background: var(--color-surface-2); color: var(--color-text); }
    .tab.active { background: var(--primary); color: #fff; }
    .tab-count {
      background: rgba(255,255,255,.22); padding: 1px 7px;
      border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 700;
    }
    .tab:not(.active) .tab-count { background: var(--color-surface-2); color: var(--color-text-muted); }
    .resultado-count { font-size: var(--font-size-xs); color: var(--color-text-muted); }

    .cursos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-6);
    }

    .curso-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm);
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);
      display: flex; flex-direction: column;
    }
    .curso-card:hover { transform: translateY(-4px); box-shadow: var(--shadow); }

    .card-banner {
      height: 140px; position: relative;
      display: flex; align-items: center; justify-content: center;
    }
    .banner-overlay { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
    .card-badges { position: absolute; top: var(--space-3); right: var(--space-3); }
    .badge-inscrito {
      background: rgba(0,0,0,.45); color: #fff;
      font-size: var(--font-size-xs); font-weight: 700; padding: 4px 10px;
      border-radius: var(--radius-full); backdrop-filter: blur(4px);
    }

    .card-body { padding: var(--space-5); display: flex; flex-direction: column; flex: 1; }
    .card-titulo { font-size: var(--font-size-base); font-weight: 700; color: var(--color-text); margin: 0 0 var(--space-2); line-height: 1.3; }
    .card-descricao {
      font-size: var(--font-size-sm); color: var(--color-text-muted); margin: 0 0 var(--space-4);
      line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
    }

    .card-meta { display: flex; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-4); }
    .meta-item {
      font-size: var(--font-size-xs); color: var(--color-text-muted);
      background: var(--color-surface-2); border: 1px solid var(--color-border);
      padding: 3px 10px; border-radius: var(--radius);
    }
    .meta-item.meta-paid { background: color-mix(in srgb, var(--color-warning) 12%, transparent); color: var(--color-warning); }

    .card-divider { height: 1px; background: var(--color-border); margin-bottom: var(--space-4); }

    .card-preco {
      display: flex; align-items: center; gap: var(--space-2);
      padding: var(--space-3) var(--space-4); border-radius: var(--radius);
      margin-bottom: var(--space-4); border-left: 4px solid var(--primary);
      background: color-mix(in srgb, var(--primary) 6%, var(--color-surface));
    }
    .card-preco.gratuito {
      border-left-color: var(--color-success);
      background: color-mix(in srgb, var(--color-success) 6%, var(--color-surface));
    }
    .preco-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .5px; }
    .preco-valor { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-text); }
    .preco-valor.gratuito { color: var(--color-success); }

    .card-actions { margin-top: auto; }
    .btn-inscrever, .btn-solicitar {
      width: 100%; color: #fff; border: none;
      padding: var(--space-3); border-radius: var(--radius);
      font-size: var(--font-size-sm); font-weight: 700; cursor: pointer;
      transition: background var(--transition-fast), transform var(--transition-fast);
    }
    .btn-inscrever { background: var(--primary); }
    .btn-solicitar { background: var(--color-warning); }
    .btn-inscrever:hover:not(:disabled) { background: var(--secondary); transform: translateY(-1px); }
    .btn-solicitar:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
    .btn-inscrever:disabled, .btn-solicitar:disabled { opacity: .65; cursor: not-allowed; transform: none; }
    .btn-inscrever.loading { background: var(--color-text-muted); }

    .inscrito-info, .solicitacao-info { display: flex; flex-direction: column; gap: var(--space-2); }
    .tag-inscrito, .tag-solicitacao {
      font-size: var(--font-size-xs); font-weight: 600; padding: var(--space-1) var(--space-3);
      border-radius: var(--radius); text-align: center;
    }
    .tag-inscrito { background: color-mix(in srgb, var(--color-success) 14%, transparent); color: var(--color-success); }
    .tag-solicitacao.none     { background: var(--color-surface-2); color: var(--color-text-muted); }
    .tag-solicitacao.pending  { background: color-mix(in srgb, var(--color-warning) 14%, transparent); color: var(--color-warning); }
    .tag-solicitacao.approved { background: color-mix(in srgb, var(--color-success) 14%, transparent); color: var(--color-success); }
    .tag-solicitacao.rejected { background: color-mix(in srgb, var(--color-danger) 14%, transparent);  color: var(--color-danger); }

    .btn-acessar {
      display: block; text-align: center; color: var(--primary); font-size: var(--font-size-xs);
      font-weight: 600; text-decoration: none; padding: var(--space-2) var(--space-3);
      border: 1px solid var(--primary); border-radius: var(--radius); transition: background var(--transition-fast);
    }
    .btn-acessar:hover { background: color-mix(in srgb, var(--primary) 8%, transparent); }

    .erro-inscricao {
      margin-top: var(--space-2); font-size: var(--font-size-xs); color: var(--color-danger);
      background: color-mix(in srgb, var(--color-danger) 8%, transparent);
      padding: var(--space-1) var(--space-3); border-radius: var(--radius); text-align: center;
    }

    /* Skeleton */
    .skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-6); }
    .skeleton-card { background: var(--color-surface); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--color-border); }
    .skeleton-header { height: 140px; }
    .skeleton-body { padding: var(--space-5); }
    .skeleton-line { height: 14px; border-radius: var(--radius); margin-bottom: var(--space-2); }
    .skeleton-line.short { width: 60%; }

    @media (max-width: 768px) {
      .catalogo-body { margin-top: 0; }
      .filtros-bar { flex-direction: column; gap: var(--space-2); align-items: flex-start; padding: var(--space-3) var(--space-4); }
      .cursos-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AlunoCatalogoComponent implements OnInit {
  cursosTodos: Curso[] = [];
  cursosInscritos: Set<number> = new Set();
  cursosFiltrados: Curso[] = [];
  termoBusca = '';
  filtroAtivo: 'todos' | 'disponiveis' | 'inscritos' = 'todos';
  carregando = false;
  processando: Record<number, boolean> = {};
  erroInscricao: Record<number, string> = {};
  solicitacoesCurso: Record<number, CourseRequest | null> = {};

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.carregarDados();
  }

  get cursosDisponiveis(): Curso[] {
    return this.cursosTodos.filter((curso) => !this.cursosInscritos.has(curso.id));
  }

  carregarDados(): void {
    this.carregando = true;
    this.cursosTodos = [];
    this.cursosFiltrados = [];
    const usuario = this.authService.getCurrentUser();

    this.apiService.getCursos().subscribe({
      next: (cursos) => {
        this.cursosTodos = (Array.isArray(cursos) ? cursos : []).map((curso) => ({
          ...curso,
          descricao: curso.descricao ?? null
        }));
        console.log('Catalogo recebido:', this.cursosTodos);
        this.carregarSolicitacoesCursosPagos();

        if (usuario) {
          this.apiService.getCursosAluno(usuario.id).subscribe({
            next: (inscritos) => {
              this.cursosInscritos = new Set((Array.isArray(inscritos) ? inscritos : []).map((curso) => curso.id));
              this.carregando = false;
              this.aplicarFiltro();
            },
            error: () => {
              this.cursosInscritos = new Set();
              this.carregando = false;
              this.aplicarFiltro();
            }
          });
        } else {
          this.cursosInscritos = new Set();
          this.carregando = false;
          this.aplicarFiltro();
        }
      },
      error: () => {
        this.cursosTodos = [];
        this.cursosFiltrados = [];
        this.carregando = false;
      }
    });
  }

  filtrarCursos(): void {
    this.aplicarFiltro();
  }

  setFiltro(filtro: 'todos' | 'disponiveis' | 'inscritos'): void {
    this.filtroAtivo = filtro;
    this.aplicarFiltro();
  }

  limparBusca(): void {
    this.termoBusca = '';
    this.aplicarFiltro();
  }

  isInscrito(cursoId: number): boolean {
    return this.cursosInscritos.has(cursoId);
  }

  inscrever(curso: Curso): void {
    this.processando[curso.id] = true;
    this.erroInscricao[curso.id] = '';

    this.apiService.inscreverCurso(curso.id).subscribe({
      next: () => {
        this.cursosInscritos = new Set([...this.cursosInscritos, curso.id]);
        this.processando[curso.id] = false;
        this.aplicarFiltro();
      },
      error: (err: any) => {
        this.processando[curso.id] = false;
        this.erroInscricao[curso.id] = err?.error?.detail || 'Erro ao realizar inscrição.';
      }
    });
  }

  solicitarAcesso(curso: Curso): void {
    this.processando[curso.id] = true;
    this.erroInscricao[curso.id] = '';

    this.apiService.createCourseRequest(curso.id).subscribe({
      next: (solicitacao) => {
        this.solicitacoesCurso[curso.id] = solicitacao;
        this.processando[curso.id] = false;
      },
      error: (err: any) => {
        this.processando[curso.id] = false;
        this.erroInscricao[curso.id] = err?.error?.detail || 'Erro ao solicitar acesso.';
      }
    });
  }

  getSolicitacaoStatus(cursoId: number): CourseRequestStatus | 'none' {
    return this.solicitacoesCurso[cursoId]?.status || 'none';
  }

  getSolicitacaoLabel(cursoId: number): string {
    const status = this.getSolicitacaoStatus(cursoId);
    if (status === 'pending') {
      return 'Aguardando aprovação do administrador';
    }
    if (status === 'approved') {
      return 'Solicitação aprovada';
    }
    if (status === 'rejected') {
      return 'Solicitação recusada';
    }
    return 'Curso pago mediante solicitação';
  }

  getSolicitacaoButtonLabel(cursoId: number): string {
    return this.getSolicitacaoStatus(cursoId) === 'rejected' ? 'Solicitar novamente' : 'Solicitar acesso';
  }

  podeSolicitar(cursoId: number): boolean {
    const status = this.getSolicitacaoStatus(cursoId);
    return status === 'none' || status === 'rejected';
  }

  getGradient(id: number): string {
    return GRADIENTS[id % GRADIENTS.length];
  }

  private aplicarFiltro(): void {
    let base: Curso[];
    if (this.filtroAtivo === 'inscritos') {
      base = this.cursosTodos.filter((curso) => this.cursosInscritos.has(curso.id));
    } else if (this.filtroAtivo === 'disponiveis') {
      base = this.cursosTodos.filter((curso) => !this.cursosInscritos.has(curso.id));
    } else {
      base = this.cursosTodos;
    }

    const termo = this.termoBusca.trim().toLowerCase();
    if (termo) {
      base = base.filter((curso) =>
        curso.nome.toLowerCase().includes(termo) ||
        (curso.descricao || '').toLowerCase().includes(termo)
      );
    }

    this.cursosFiltrados = base || [];
  }

  private carregarSolicitacoesCursosPagos(): void {
    const cursosPagos = this.cursosTodos.filter((curso) => curso.pago);
    if (!cursosPagos.length) {
      this.solicitacoesCurso = {};
      return;
    }

    const requests = cursosPagos.map((curso) =>
      this.apiService.getCourseRequestStatus(curso.id).pipe(catchError(() => of(null)))
    );

    forkJoin(requests).subscribe((solicitacoes) => {
      cursosPagos.forEach((curso, index) => {
        this.solicitacoesCurso[curso.id] = solicitacoes[index];
      });
    });
  }
}
