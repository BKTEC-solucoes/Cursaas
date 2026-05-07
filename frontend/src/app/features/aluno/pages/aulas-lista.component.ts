import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

interface CursoEnrollado {
  id: number;
  nome: string;
}

interface Aula {
  id: number;
  titulo: string;
  descricao: string;
  data_aula: string;
  duracao_minutos: number;
  curso_id: number;
  curso_nome?: string;
  videos?: any[];
}

@Component({
  selector: 'app-aulas-lista',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="content-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Minhas Aulas</h1>
          <p class="page-subtitle">Aulas dos cursos em que você está inscrito</p>
        </div>
      </div>

      @if (carregando) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Carregando aulas...</p>
        </div>
      }

      @if (erro && !carregando) {
        <div class="error-card">
          <p>{{ erro }}</p>
          <button class="btn-retry" (click)="carregarAulas()">Tentar novamente</button>
        </div>
      }

      @if (!carregando && aulas.length > 0) {
        <div class="aulas-grid">
          @for (aula of aulas; track aula.id) {
            <a class="aula-card" [routerLink]="['/aluno/aulas', aula.id]">
              <div class="card-top">
                <div class="card-badges">
                  @if (temConteudo(aula)) {
                    <span class="badge badge--primary">Com conteúdo</span>
                  } @else {
                    <span class="badge">Aula</span>
                  }
                </div>
                @if (aula.duracao_minutos) {
                  <span class="card-dur">{{ aula.duracao_minutos }}min</span>
                }
              </div>

              <h3 class="card-titulo">{{ aula.titulo }}</h3>

              @if (aula.curso_nome) {
                <div class="card-curso">
                  <span class="curso-dot"></span>{{ aula.curso_nome }}
                </div>
              }

              @if (resumoDescricao(aula.descricao); as resumo) {
                <p class="card-resumo">{{ resumo }}</p>
              }

              <div class="card-footer">
                <span class="card-data">{{ aula.data_aula | date:'dd/MM/yyyy' }}</span>
                <span class="card-cta">Assistir</span>
              </div>
            </a>
          }
        </div>
      }

      @if (!carregando && !erro && aulas.length === 0) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </div>
          <h3 class="empty-title">Nenhuma aula disponível</h3>
          <p>Nenhuma aula encontrada para os cursos em que você está inscrito.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .loading-state {
      display: flex; flex-direction: column; align-items: center;
      padding: 80px var(--space-5); color: var(--color-text-muted);
    }
    .spinner {
      width: 34px; height: 34px; border: 3px solid var(--color-border);
      border-top-color: var(--primary); border-radius: 50%;
      animation: spin .8s linear infinite; margin-bottom: var(--space-3);
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .error-card {
      background: color-mix(in srgb, var(--color-danger) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
      border-radius: var(--radius-lg); padding: var(--space-5);
      text-align: center; color: var(--color-danger);
    }
    .btn-retry {
      margin-top: var(--space-3); padding: var(--space-2) var(--space-4);
      background: var(--color-danger); color: #fff;
      border: none; border-radius: var(--radius); cursor: pointer;
      font-size: var(--font-size-sm); font-weight: 600;
    }

    .aulas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: var(--space-4);
    }

    .aula-card {
      display: flex; flex-direction: column; gap: var(--space-2);
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: var(--space-5);
      text-decoration: none; color: inherit;
      transition: box-shadow var(--transition-fast), transform var(--transition-fast), border-color var(--transition-fast);
    }
    .aula-card:hover {
      box-shadow: var(--shadow);
      border-color: color-mix(in srgb, var(--primary) 50%, transparent);
      transform: translateY(-2px);
    }

    .card-top { display: flex; justify-content: space-between; align-items: center; }
    .card-badges { display: flex; gap: var(--space-1); }
    .badge--primary { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }
    .card-dur {
      font-size: var(--font-size-xs); color: var(--color-text-muted);
      background: var(--color-surface-2); border: 1px solid var(--color-border);
      padding: 2px 8px; border-radius: var(--radius);
    }

    .card-titulo { margin: 0; font-size: var(--font-size-base); font-weight: 700; color: var(--color-text); line-height: 1.3; }

    .card-curso {
      display: flex; align-items: center; gap: var(--space-1);
      font-size: var(--font-size-xs); color: var(--primary); font-weight: 600;
    }
    .curso-dot {
      width: 6px; height: 6px; background: var(--primary);
      border-radius: 50%; flex-shrink: 0;
    }

    .card-resumo {
      margin: 0; font-size: var(--font-size-sm); color: var(--color-text-muted);
      line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden; flex-grow: 1;
    }

    .card-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: var(--space-3); border-top: 1px solid var(--color-border); margin-top: auto;
    }
    .card-data { font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .card-cta  { font-size: var(--font-size-xs); font-weight: 700; color: var(--primary); }

    @media (max-width: 640px) {
      .aulas-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AulasListaComponent implements OnInit {
  aulas: Aula[] = [];
  carregando = false;
  erro = '';

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    this.carregarAulas();
  }

  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /** Extrai texto puro de descricao (JSON de blocos, TipTap doc ou texto legado) */
  resumoDescricao(descricao: string): string {
    if (!descricao) return '';
    try {
      const parsed = JSON.parse(descricao);
      // Array de BlocoEditavel (formato novo do editor de aulas)
      if (Array.isArray(parsed)) {
        return parsed
          .filter((b: any) => b.tipo === 'texto' || b.tipo === 'titulo')
          .map((b: any) => {
            if (!b.conteudo) return '';
            try {
              const inner = JSON.parse(b.conteudo);
              if (inner?.type === 'doc') {
                return generateHTML(inner, [StarterKit])
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
              }
            } catch { /* texto puro */ }
            return b.conteudo;
          })
          .filter(Boolean)
          .join(' ');
      }
      // TipTap doc direto
      if (parsed?.type === 'doc') {
        return generateHTML(parsed, [StarterKit])
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    } catch { /* fallthrough */ }
    // Texto / HTML legado — remove tags
    return descricao.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /** Retorna true se a aula tem vídeo enviado OU bloco de YouTube */
  temConteudo(aula: Aula): boolean {
    if (aula.videos && aula.videos.length > 0) return true;
    if (!aula.descricao) return false;
    try {
      const parsed = JSON.parse(aula.descricao);
      if (Array.isArray(parsed)) {
        return parsed.some((b: any) => b.tipo === 'video');
      }
    } catch { /* */ }
    return false;
  }

  carregarAulas(): void {
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
          this.aulas = [];
          this.carregando = false;
          return;
        }

        const requests = cursos.map(curso =>
          this.http.get<Aula[]>(
            `http://localhost:8000/api/aulas/?curso_id=${curso.id}&limit=200`,
            { headers: this.getHeaders() }
          )
        );

        forkJoin(requests).subscribe({
          next: (resultados) => {
            const todas: Aula[] = [];
            resultados.forEach((aulasDosCurso, idx) => {
              aulasDosCurso.forEach(a => {
                a.curso_nome = cursos[idx].nome;
                todas.push(a);
              });
            });
            const mapa = new Map<number, Aula>();
            todas.forEach(a => mapa.set(a.id, a));
            this.aulas = Array.from(mapa.values())
              .sort((a, b) => new Date(a.data_aula).getTime() - new Date(b.data_aula).getTime());
            this.carregando = false;
          },
          error: () => {
            this.erro = 'Erro ao carregar aulas. Tente novamente.';
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
}
