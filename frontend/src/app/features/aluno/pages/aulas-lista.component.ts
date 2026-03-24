import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

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
    <div class="page-container">
      <div class="page-header">
        <h2>Aulas & Vídeos</h2>
        <p class="page-subtitle">Assista às aulas do seu curso com rastreamento automático</p>
      </div>

      <div class="aulas-grid" *ngIf="aulas.length > 0">
        <div class="aula-card" *ngFor="let aula of aulas">
          <div class="aula-header">
            <h3>{{ aula.titulo }}</h3>
            <span class="duration">⏱ {{ aula.duracao_minutos }}min</span>
          </div>

          <div class="curso-tag" *ngIf="aula.curso_nome">📚 {{ aula.curso_nome }}</div>

          <p class="aula-description">{{ aula.descricao }}</p>

          <div class="aula-meta">
            <span class="has-video" *ngIf="aula.videos && aula.videos.length > 0">
              ✓ Com vídeo
            </span>
            <span class="no-video" *ngIf="!aula.videos || aula.videos.length === 0">
              ✗ Sem vídeo
            </span>
            <span class="date">{{ aula.data_aula | date:'dd/MM/yyyy HH:mm' }}</span>
          </div>

          <button
            class="btn-assistir"
            [routerLink]="['/aluno/aulas', aula.id]"
            [class.disabled]="!aula.videos || aula.videos.length === 0"
            [disabled]="!aula.videos || aula.videos.length === 0"
          >
            {{ aula.videos && aula.videos.length > 0 ? 'Assistir Aula' : 'Sem vídeo' }}
          </button>
        </div>
      </div>

      <div class="no-aulas" *ngIf="aulas.length === 0 && !carregando && !erro">
        <p>Nenhuma aula encontrada para os cursos em que você está inscrito.</p>
      </div>

      <div class="loading" *ngIf="carregando">
        <div class="spinner"></div>
        <p>Carregando aulas...</p>
      </div>

      <div class="error" *ngIf="erro">
        <p>{{ erro }}</p>
        <button (click)="carregarAulas()">Tentar novamente</button>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 30px;
      border-bottom: 2px solid #eee;
      padding-bottom: 15px;
    }

    .page-header h2 {
      margin: 0 0 5px 0;
      color: #333;
    }

    .page-subtitle {
      margin: 0;
      color: #999;
      font-size: 14px;
    }

    .aulas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .aula-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
    }

    .aula-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .aula-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 12px;
      gap: 10px;
    }

    .aula-header h3 {
      margin: 0;
      color: #333;
      font-size: 16px;
      flex: 1;
    }

    .duration {
      background: #f0f0f0;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      color: #666;
      white-space: nowrap;
    }

    .curso-tag {
      font-size: 11px;
      color: #667eea;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .aula-description {
      color: #666;
      font-size: 13px;
      line-height: 1.5;
      margin: 0 0 15px 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex-grow: 1;
    }

    .aula-meta {
      background: #f9f9f9;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 15px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      font-size: 12px;
    }

    .has-video {
      color: #28A745;
      font-weight: 600;
    }

    .no-video {
      color: #999;
      font-weight: 600;
    }

    .date {
      color: #999;
    }

    .btn-assistir {
      width: 100%;
      padding: 10px;
      background-color: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .btn-assistir:hover:not(:disabled) {
      background-color: #5568d3;
    }

    .btn-assistir:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }

    .no-aulas {
      text-align: center;
      padding: 40px;
      color: #999;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #999;
    }

    .spinner {
      display: inline-block;
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 15px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      background-color: #f8d7da;
      color: #721c24;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
      border: 1px solid #f5c6cb;
      text-align: center;
    }

    .error button {
      margin-top: 10px;
      padding: 8px 16px;
      background: #721c24;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }

    .error button:hover {
      background: #5a1419;
    }

    @media (max-width: 768px) {
      .aulas-grid {
        grid-template-columns: 1fr;
      }
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
