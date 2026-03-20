import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { ApiService, CourseRequest, CourseRequestStatus, CursoResumo } from '../../../shared/services/api.service';

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
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="catalogo-container">
      <div class="hero-banner">
        <div class="hero-content">
          <h1>Catálogo de Cursos</h1>
          <p>Explore todos os cursos disponíveis e expanda seu conhecimento</p>
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              [(ngModel)]="termoBusca"
              (ngModelChange)="filtrarCursos()"
              placeholder="Buscar por nome ou descrição..."
              class="search-input"
            />
            <button class="btn-limpar" *ngIf="termoBusca" (click)="limparBusca()">×</button>
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
          <span class="resultado-count" *ngIf="cursosFiltrados.length > 0">
            {{ cursosFiltrados.length }} curso(s) encontrado(s)
          </span>
        </div>

        <div class="loading-state" *ngIf="carregando">
          <div class="skeleton-grid">
            <div class="skeleton-card" *ngFor="let i of [1,2,3,4,5,6]">
              <div class="skeleton-header"></div>
              <div class="skeleton-body">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="!carregando && cursosFiltrados.length === 0">
          <div class="empty-icon">🔎</div>
          <h3>Nenhum curso encontrado</h3>
          <p *ngIf="termoBusca">Tente buscar por outro termo.</p>
          <p *ngIf="!termoBusca && filtroAtivo === 'inscritos'">Você ainda não está inscrito em nenhum curso.</p>
          <p *ngIf="!termoBusca && filtroAtivo !== 'inscritos'">Nenhum curso disponível no momento.</p>
        </div>

        <div class="cursos-grid" *ngIf="!carregando && cursosFiltrados.length > 0">
          <div class="curso-card" *ngFor="let curso of cursosFiltrados">
            <div class="card-banner" [style.background]="getGradient(curso.id)">
              <div class="banner-overlay">
                <span class="banner-icon">🎓</span>
              </div>
              <div class="card-badges">
                <span class="badge-inscrito" *ngIf="isInscrito(curso.id)">✓ Inscrito</span>
              </div>
            </div>

            <div class="card-body">
              <h3 class="card-titulo">{{ curso.nome }}</h3>
              <p class="card-descricao">{{ curso.descricao || 'Sem descrição disponível.' }}</p>

              <div class="card-meta">
                <div class="meta-item">
                  <span class="meta-icon">📖</span>
                  <span>{{ (curso.aulas?.length ?? 0) }} aulas</span>
                </div>
                <div class="meta-item">
                  <span class="meta-icon">📝</span>
                  <span>{{ (curso.provas?.length ?? 0) }} provas</span>
                </div>
                <div class="meta-item">
                  <span class="meta-icon">👥</span>
                  <span>{{ curso.percentual_presenca_minima }}% presença</span>
                </div>
                <div class="meta-item" [class.meta-paid]="curso.pago">
                  <span class="meta-icon">{{ curso.pago ? '💳' : '🎁' }}</span>
                  <span>{{ curso.pago ? 'Curso pago' : 'Acesso gratuito' }}</span>
                </div>
              </div>

              <div class="card-preco" *ngIf="curso.pago && curso.valor">
                <span class="preco-label">Valor:</span>
                <span class="preco-valor">{{ curso.valor | currency:'BRL':'symbol':'1.2-2' }}</span>
              </div>

              <div class="card-divider"></div>

              <div class="card-actions">
                <div class="inscrito-info" *ngIf="isInscrito(curso.id)">
                  <span class="tag-inscrito">Você está inscrito</span>
                  <a class="btn-acessar" [routerLink]="['/aluno/cursos']">Ver meus cursos →</a>
                </div>

                <button
                  *ngIf="!isInscrito(curso.id) && !curso.pago"
                  class="btn-inscrever"
                  (click)="inscrever(curso)"
                  [disabled]="processando[curso.id]"
                  [class.loading]="processando[curso.id]"
                >
                  <span *ngIf="!processando[curso.id]">Inscrever-se grátis</span>
                  <span *ngIf="processando[curso.id]">Inscrevendo...</span>
                </button>

                <div class="solicitacao-info" *ngIf="!isInscrito(curso.id) && curso.pago">
                  <span class="tag-solicitacao" [ngClass]="getSolicitacaoStatus(curso.id)">
                    {{ getSolicitacaoLabel(curso.id) }}
                  </span>

                  <button
                    class="btn-solicitar"
                    *ngIf="podeSolicitar(curso.id)"
                    (click)="solicitarAcesso(curso)"
                    [disabled]="processando[curso.id]"
                  >
                    {{ processando[curso.id] ? 'Enviando...' : getSolicitacaoButtonLabel(curso.id) }}
                  </button>
                </div>

                <div class="erro-inscricao" *ngIf="erroInscricao[curso.id]">
                  {{ erroInscricao[curso.id] }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .catalogo-container {
      min-height: 100vh;
      background: #f0f2f5;
    }

    .hero-banner {
      background: linear-gradient(135deg, #2c3e50 0%, #4a5568 100%);
      padding: 48px 24px 56px;
      text-align: center;
      color: white;
    }

    .hero-content h1 {
      font-size: 32px;
      margin: 0 0 8px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }

    .hero-content p {
      font-size: 16px;
      color: rgba(255,255,255,0.75);
      margin: 0 0 28px;
    }

    .search-box {
      display: flex;
      align-items: center;
      background: white;
      border-radius: 50px;
      padding: 4px 16px;
      max-width: 540px;
      margin: 0 auto;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }

    .search-icon {
      font-size: 16px;
      margin-right: 10px;
      color: #999;
    }

    .search-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 15px;
      padding: 10px 0;
      color: #333;
      background: transparent;
    }

    .btn-limpar {
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      font-size: 16px;
      padding: 4px;
      line-height: 1;
    }

    .catalogo-body {
      max-width: 1200px;
      margin: -20px auto 0;
      padding: 0 20px 40px;
    }

    .filtros-bar {
      background: white;
      border-radius: 12px;
      padding: 6px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    .filtro-tabs {
      display: flex;
      gap: 4px;
    }

    .tab {
      background: none;
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: #666;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tab:hover {
      background: #f5f7fa;
      color: #333;
    }

    .tab.active {
      background: #2c3e50;
      color: white;
    }

    .tab-count {
      background: rgba(255,255,255,0.2);
      padding: 1px 7px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
    }

    .tab:not(.active) .tab-count {
      background: #eee;
      color: #666;
    }

    .resultado-count {
      font-size: 13px;
      color: #888;
    }

    .cursos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
    }

    .curso-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      transition: transform 0.25s, box-shadow 0.25s;
      display: flex;
      flex-direction: column;
    }

    .curso-card:hover {
      transform: translateY(-6px);
      box-shadow: 0 12px 32px rgba(0,0,0,0.15);
    }

    .card-banner {
      height: 140px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .banner-overlay {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    .banner-icon {
      font-size: 52px;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
    }

    .card-badges {
      position: absolute;
      top: 12px;
      right: 12px;
    }

    .badge-inscrito {
      background: rgba(0,0,0,0.45);
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 20px;
      backdrop-filter: blur(4px);
    }

    .card-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .card-titulo {
      font-size: 16px;
      font-weight: 700;
      color: #1a202c;
      margin: 0 0 8px;
      line-height: 1.3;
    }

    .card-descricao {
      font-size: 13px;
      color: #718096;
      margin: 0 0 16px;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-meta {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #555;
      background: #f7fafc;
      padding: 4px 10px;
      border-radius: 6px;
    }

    .meta-item.meta-paid {
      background: #fff4e5;
      color: #9a3412;
    }

    .meta-icon {
      font-size: 13px;
    }

    .card-divider {
      height: 1px;
      background: #edf2f7;
      margin-bottom: 16px;
    }

    .card-actions {
      margin-top: auto;
    }

    .btn-inscrever,
    .btn-solicitar {
      width: 100%;
      color: white;
      border: none;
      padding: 13px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
      letter-spacing: 0.3px;
    }

    .btn-inscrever {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .btn-solicitar {
      background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
    }

    .btn-inscrever:hover:not(:disabled),
    .btn-solicitar:hover:not(:disabled) {
      opacity: 0.9;
      transform: scale(1.02);
    }

    .btn-inscrever:disabled,
    .btn-solicitar:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .btn-inscrever.loading {
      background: linear-gradient(135deg, #a0aec0 0%, #718096 100%);
    }

    .inscrito-info,
    .solicitacao-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .tag-inscrito,
    .tag-solicitacao {
      font-size: 13px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 8px;
      text-align: center;
    }

    .tag-inscrito {
      color: #276749;
      background: #c6f6d5;
    }

    .tag-solicitacao.none {
      background: #e5eef7;
      color: #1f3b5b;
    }

    .tag-solicitacao.pending {
      background: #fff7cc;
      color: #8a6d00;
    }

    .tag-solicitacao.approved {
      background: #d1fae5;
      color: #065f46;
    }

    .tag-solicitacao.rejected {
      background: #fee2e2;
      color: #991b1b;
    }

    .btn-acessar {
      display: block;
      text-align: center;
      color: #667eea;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      padding: 8px;
      border: 1px solid #667eea;
      border-radius: 8px;
      transition: background 0.2s;
    }

    .btn-acessar:hover {
      background: #ebf4ff;
    }

    .erro-inscricao {
      margin-top: 8px;
      font-size: 12px;
      color: #c53030;
      background: #fff5f5;
      padding: 6px 10px;
      border-radius: 6px;
      text-align: center;
    }

    .empty-state {
      text-align: center;
      padding: 80px 20px;
      color: #a0aec0;
    }

    .empty-icon {
      font-size: 56px;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      font-size: 20px;
      color: #4a5568;
      margin: 0 0 8px;
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
    }

    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
    }

    .skeleton-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    }

    .skeleton-header {
      height: 140px;
      background: linear-gradient(90deg, #edf2f7 25%, #e2e8f0 50%, #edf2f7 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }

    .skeleton-body {
      padding: 20px;
    }

    .skeleton-line {
      height: 14px;
      background: linear-gradient(90deg, #edf2f7 25%, #e2e8f0 50%, #edf2f7 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border-radius: 6px;
      margin-bottom: 10px;
    }

    .skeleton-line.short {
      width: 60%;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @media (max-width: 768px) {
      .hero-content h1 { font-size: 24px; }
      .filtros-bar { flex-direction: column; gap: 8px; align-items: flex-start; padding: 12px 16px; }
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
