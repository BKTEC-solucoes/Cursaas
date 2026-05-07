import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

interface CursoEnrollado {
  id: number;
  nome: string;
}

interface Prova {
  id: number;
  titulo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  curso_id: number;
  curso_nome?: string;
  total_questoes?: number;
  ativo: boolean;
}

@Component({
  selector: 'app-provas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="content-page">
      <div class="page-header">
        <h1 class="page-title">Minhas Provas</h1>
        <p class="page-subtitle">Provas dos cursos em que você está inscrito</p>
      </div>

      @if (carregando) {
        <div class="loading-state"><div class="spinner"></div><p>Carregando provas...</p></div>
      }

      @if (erro) {
        <div class="alert alert--danger"><p>{{ erro }}</p></div>
      }

      @if (!carregando && provas.length > 0) {
        <div class="provas-grid">
          @for (prova of provas; track prova.id) {
            <div class="prova-card" [class.disabled]="!isProvaAvailable(prova)">
              <div class="prova-top">
                <h3 class="prova-titulo">{{ prova.titulo }}</h3>
                <span class="badge badge--{{ getStatusClass(prova) }}">{{ getStatusLabel(prova) }}</span>
              </div>
              @if (prova.curso_nome) {
                <div class="curso-tag">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                  {{ prova.curso_nome }}
                </div>
              }
              <p class="prova-desc">{{ prova.descricao }}</p>
              <div class="prova-meta">
                <div class="meta-row"><span>Início</span><span>{{ prova.data_inicio | date:'dd/MM/yyyy HH:mm' }}</span></div>
                <div class="meta-row"><span>Fim</span><span>{{ prova.data_fim | date:'dd/MM/yyyy HH:mm' }}</span></div>
                @if (prova.total_questoes) {
                  <div class="meta-row"><span>Questões</span><span>{{ prova.total_questoes }}</span></div>
                }
              </div>
              <button class="btn-responder" [class.btn-responder--disabled]="!isProvaAvailable(prova)"
                      [disabled]="!isProvaAvailable(prova)"
                      [routerLink]="isProvaAvailable(prova) ? ['/aluno/provas', prova.id, 'responder'] : null">
                {{ isProvaAvailable(prova) ? 'Responder Prova' : 'Indisponível' }}
              </button>
            </div>
          }
        </div>
      }

      @if (!carregando && !erro && provas.length === 0) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <p class="empty-title">Nenhuma prova disponível</p>
          <p class="text-muted">Nenhuma prova encontrada para os cursos em que você está inscrito.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .provas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-4);
      margin-bottom: var(--space-6);
    }
    .prova-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: var(--space-5);
      box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: var(--space-3);
      transition: box-shadow var(--transition-fast), transform var(--transition-fast);
    }
    .prova-card:hover:not(.disabled) { box-shadow: var(--shadow); transform: translateY(-2px); }
    .prova-card.disabled { opacity: .65; filter: grayscale(20%); }

    .prova-top { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); }
    .prova-titulo { margin: 0; font-size: var(--font-size-md); font-weight: 700; color: var(--color-text); flex: 1; line-height: 1.3; }

    .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 700; white-space: nowrap; }
    .badge--disponivel { background: color-mix(in srgb, var(--color-success) 14%, transparent); color: var(--color-success); }
    .badge--em-breve   { background: color-mix(in srgb, var(--color-warning) 14%, transparent); color: var(--color-warning); }
    .badge--encerrada  { background: color-mix(in srgb, var(--color-danger) 14%, transparent);  color: var(--color-danger); }

    .curso-tag {
      display: inline-flex; align-items: center; gap: var(--space-1);
      font-size: var(--font-size-xs); font-weight: 600; color: var(--primary);
    }
    .prova-desc {
      font-size: var(--font-size-sm); color: var(--color-text-muted); line-height: 1.5; margin: 0;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .prova-meta {
      background: var(--color-surface-2); border-radius: var(--radius);
      padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-2); margin-top: auto;
    }
    .meta-row {
      display: flex; justify-content: space-between;
      font-size: var(--font-size-xs); color: var(--color-text-muted);
    }
    .meta-row span:last-child { font-weight: 600; color: var(--color-text); }

    .btn-responder {
      width: 100%; padding: var(--space-3); background: var(--primary); color: #fff;
      border: none; border-radius: var(--radius); font-size: var(--font-size-sm); font-weight: 700;
      cursor: pointer; transition: background var(--transition-fast); margin-top: auto;
    }
    .btn-responder:hover:not(:disabled) { background: var(--secondary); }
    .btn-responder--disabled, .btn-responder:disabled { background: var(--color-border); color: var(--color-text-muted); cursor: not-allowed; }

    .loading-state { text-align: center; padding: 60px var(--space-4); color: var(--color-text-muted); }
    .spinner { display: inline-block; width: 36px; height: 36px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: var(--space-3); }
    @keyframes spin { to { transform: rotate(360deg); } }

    .alert { padding: var(--space-4); border-radius: var(--radius); margin-bottom: var(--space-4); }
    .alert--danger { background: color-mix(in srgb, var(--color-danger) 10%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); color: var(--color-danger); }

    .text-muted { color: var(--color-text-muted); }
  `]
})
export class AlunoProvasComponent implements OnInit {
  provas: Prova[] = [];
  carregando = false;
  erro = '';

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    this.carregarProvas();
  }

  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  carregarProvas(): void {
    const user = this.auth.getCurrentUser();
    if (!user) {
      this.erro = 'Usuário não autenticado.';
      return;
    }

    this.carregando = true;
    this.erro = '';

    this.http.get<CursoEnrollado[]>(
      `http://localhost:8000/api/alunos/${user.id}/cursos`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (cursos) => {
        if (cursos.length === 0) {
          this.provas = [];
          this.carregando = false;
          return;
        }

        const requests = cursos.map(curso =>
          this.http.get<Prova[]>(
            `http://localhost:8000/api/provas/?curso_id=${curso.id}&limit=100`,
            { headers: this.getHeaders() }
          )
        );

        forkJoin(requests).subscribe({
          next: (resultados) => {
            const todas = resultados.flat();
            const mapa = new Map<number, Prova>();
            todas.forEach(p => mapa.set(p.id, p));
            this.provas = Array.from(mapa.values())
              .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());
            this.carregando = false;
          },
          error: () => {
            this.erro = 'Erro ao carregar provas. Tente novamente.';
            this.carregando = false;
          }
        });
      },
      error: () => {
        this.erro = 'Erro ao carregar cursos inscritos.';
        this.carregando = false;
      }
    });
  }

  isProvaAvailable(prova: Prova): boolean {
    const now = new Date();
    const inicio = new Date(prova.data_inicio);
    const fim = new Date(prova.data_fim);
    return prova.ativo && now >= inicio && now <= fim;
  }

  getStatusLabel(prova: Prova): string {
    if (!prova.ativo) return 'Inativa';
    const now = new Date();
    const inicio = new Date(prova.data_inicio);
    const fim = new Date(prova.data_fim);

    if (now < inicio) return 'Em Breve';
    if (now > fim) return 'Encerrada';
    return 'Disponível';
  }

  getStatusClass(prova: Prova): string {
    if (!prova.ativo) return 'encerrada';
    const now = new Date();
    const inicio = new Date(prova.data_inicio);
    const fim = new Date(prova.data_fim);

    if (now < inicio) return 'em-breve';
    if (now > fim) return 'encerrada';
    return 'disponivel';
  }
}
