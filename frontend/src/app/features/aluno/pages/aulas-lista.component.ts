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
    <div class="lista-page">

      <div class="lista-header">
        <h2>Minhas Aulas</h2>
        <p>Aulas dos cursos em que você está inscrito</p>
      </div>

      <!-- Loading -->
      <div class="lista-loading" *ngIf="carregando">
        <div class="spinner"></div>
        <p>Carregando aulas...</p>
      </div>

      <!-- Erro -->
      <div class="lista-erro" *ngIf="erro && !carregando">
        <p>{{ erro }}</p>
        <button (click)="carregarAulas()">Tentar novamente</button>
      </div>

      <!-- Grid -->
      <div class="aulas-grid" *ngIf="!carregando && aulas.length > 0">
        <a
          class="aula-card"
          *ngFor="let aula of aulas"
          [routerLink]="['/aluno/aulas', aula.id]"
        >
          <!-- Topo do card -->
          <div class="card-top">
            <div class="card-tipo-badges">
              <span class="badge-video" *ngIf="temConteudo(aula)">▶ Com conteúdo</span>
              <span class="badge-sem" *ngIf="!temConteudo(aula)">📄 Aula</span>
            </div>
            <span class="card-dur" *ngIf="aula.duracao_minutos">{{ aula.duracao_minutos }}min</span>
          </div>

          <!-- Título -->
          <h3 class="card-titulo">{{ aula.titulo }}</h3>

          <!-- Curso -->
          <div class="card-curso" *ngIf="aula.curso_nome">
            <span class="curso-dot"></span>{{ aula.curso_nome }}
          </div>

          <!-- Resumo da descrição -->
          <p class="card-resumo" *ngIf="resumoDescricao(aula.descricao) as resumo">{{ resumo }}</p>

          <!-- Rodapé -->
          <div class="card-footer">
            <span class="card-data">{{ aula.data_aula | date:'dd/MM/yyyy' }}</span>
            <span class="card-cta">Assistir →</span>
          </div>
        </a>
      </div>

      <!-- Vazio -->
      <div class="lista-vazio" *ngIf="!carregando && !erro && aulas.length === 0">
        <span>📚</span>
        <p>Nenhuma aula encontrada para os cursos em que você está inscrito.</p>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }

    .lista-page {
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    /* Header */
    .lista-header {
      margin-bottom: 28px;
    }
    .lista-header h2 {
      margin: 0 0 4px;
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
    }
    .lista-header p {
      margin: 0;
      color: #64748b;
      font-size: .9rem;
    }

    /* Loading */
    .lista-loading {
      display: flex; flex-direction: column;
      align-items: center; padding: 80px 20px;
      color: #94a3b8;
    }
    .spinner {
      width: 34px; height: 34px;
      border: 3px solid #e2e8f0;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin .8s linear infinite;
      margin-bottom: 14px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Erro */
    .lista-erro {
      background: #fef2f2;
      border: 1px solid #fca5a5;
      border-radius: 8px;
      padding: 20px; text-align: center;
      color: #b91c1c;
    }
    .lista-erro button {
      margin-top: 10px; padding: 8px 16px;
      background: #b91c1c; color: white;
      border: none; border-radius: 6px; cursor: pointer;
    }

    /* Grid */
    .aulas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 18px;
    }

    /* Card */
    .aula-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 20px;
      text-decoration: none;
      color: inherit;
      transition: box-shadow .15s, transform .15s, border-color .15s;
      cursor: pointer;
    }
    .aula-card:hover {
      box-shadow: 0 6px 24px rgba(102,126,234,.15);
      border-color: #a5b4fc;
      transform: translateY(-2px);
    }

    /* Topo */
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .badge-video {
      background: #ede9fe; color: #6d28d9;
      font-size: .72rem; font-weight: 700;
      padding: 3px 9px; border-radius: 20px;
    }
    .badge-sem {
      background: #f1f5f9; color: #64748b;
      font-size: .72rem; font-weight: 600;
      padding: 3px 9px; border-radius: 20px;
    }
    .card-dur {
      font-size: .75rem; color: #94a3b8;
      background: #f8fafc;
      padding: 3px 8px; border-radius: 6px;
    }

    /* Título */
    .card-titulo {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.3;
    }

    /* Curso */
    .card-curso {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: .78rem;
      color: #667eea;
      font-weight: 600;
    }
    .curso-dot {
      width: 6px; height: 6px;
      background: #667eea;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* Resumo */
    .card-resumo {
      margin: 0;
      font-size: .83rem;
      color: #64748b;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex-grow: 1;
    }

    /* Rodapé */
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid #f1f5f9;
      margin-top: auto;
    }
    .card-data { font-size: .75rem; color: #94a3b8; }
    .card-cta  { font-size: .78rem; font-weight: 700; color: #667eea; }

    /* Vazio */
    .lista-vazio {
      display: flex; flex-direction: column;
      align-items: center; gap: 10px;
      padding: 80px 20px;
      color: #94a3b8; font-size: .95rem;
      text-align: center;
    }
    .lista-vazio span { font-size: 3rem; }

    @media (max-width: 640px) {
      .lista-page { padding: 20px 14px; }
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
