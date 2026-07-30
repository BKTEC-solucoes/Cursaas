import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

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
    <div class="page-container">
      <div class="page-header">
        <h2>Minhas Provas</h2>
        <p class="page-subtitle">Provas dos cursos em que você está inscrito</p>
      </div>

      <div class="loading" *ngIf="carregando">
        <p>Carregando provas...</p>
      </div>

      <div class="error" *ngIf="erro">
        <p>{{ erro }}</p>
      </div>

      <div class="provas-grid" *ngIf="!carregando && provas.length > 0">
        <div class="prova-card" *ngFor="let prova of provas" [class.disabled]="!isProvaAvailable(prova)">
          <div class="prova-header">
            <h3>{{ prova.titulo }}</h3>
            <span class="status" [ngClass]="getStatusClass(prova)">
              {{ getStatusLabel(prova) }}
            </span>
          </div>

          <div class="curso-tag" *ngIf="prova.curso_nome">📚 {{ prova.curso_nome }}</div>

          <p class="prova-description">{{ prova.descricao }}</p>

          <div class="prova-dates">
            <div class="date-item">
              <label>Início:</label>
              <span>{{ prova.data_inicio | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
            <div class="date-item">
              <label>Fim:</label>
              <span>{{ prova.data_fim | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
            <div class="date-item" *ngIf="prova.total_questoes">
              <label>Questões:</label>
              <span>{{ prova.total_questoes }}</span>
            </div>
          </div>

          <button
            class="btn-responder"
            [disabled]="!isProvaAvailable(prova)"
            [routerLink]="['/aluno/provas', prova.id, 'responder']"
          >
            {{ isProvaAvailable(prova) ? 'Responder Prova' : 'Indisponível' }}
          </button>
        </div>
      </div>

      <div class="no-provas" *ngIf="!carregando && !erro && provas.length === 0">
        <p>Nenhuma prova encontrada para os cursos em que você está inscrito.</p>
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

    .provas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .prova-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .prova-card:hover:not(.disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .prova-card.disabled {
      opacity: 0.7;
      background-color: #f5f5f5;
    }

    .prova-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 15px;
      gap: 10px;
    }

    .prova-header h3 {
      margin: 0;
      color: #333;
      font-size: 16px;
      flex: 1;
    }

    .status {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }

    .status.disponivel {
      background-color: #d4edda;
      color: #155724;
    }

    .status.em-breve {
      background-color: #fff3cd;
      color: #856404;
    }

    .status.encerrada {
      background-color: #f8d7da;
      color: #721c24;
    }

    .prova-description {
      color: #666;
      font-size: 13px;
      line-height: 1.5;
      margin: 0 0 15px 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .prova-dates {
      background-color: #f9f9f9;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 15px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .date-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .date-item label {
      font-weight: 600;
      color: #666;
    }

    .date-item span {
      color: #333;
    }

    .btn-responder {
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

    .btn-responder:hover:not(:disabled) {
      background-color: #5568d3;
    }

    .btn-responder:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }

    .curso-tag {
      font-size: 11px;
      color: #667eea;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .no-provas {
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

    .error {
      background-color: #f8d7da;
      color: #721c24;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
      border: 1px solid #f5c6cb;
    }
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
      `${environment.apiUrl}/alunos/${user.id}/cursos`,
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
            `${environment.apiUrl}/provas/?curso_id=${curso.id}&limit=100`,
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
