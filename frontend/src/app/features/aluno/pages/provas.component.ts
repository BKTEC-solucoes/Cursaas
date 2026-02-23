import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../../shared/services/api.service';

interface Prova {
  id: number;
  titulo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  curso_id: number;
  ativa: boolean;
}

@Component({
  selector: 'app-provas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2>Minhas Provas</h2>
        <p class="page-subtitle">Responda as provas do seu curso</p>
      </div>

      <div class="provas-grid" *ngIf="provas.length > 0">
        <div class="prova-card" *ngFor="let prova of provas" [class.disabled]="!isProvaAvailable(prova)">
          <div class="prova-header">
            <h3>{{ prova.titulo }}</h3>
            <span class="status" [ngClass]="getStatusClass(prova)">
              {{ getStatusLabel(prova) }}
            </span>
          </div>

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
          </div>

          <button
            class="btn-responder"
            [disabled]="!isProvaAvailable(prova)"
            [routerLink]="['/aluno/provas', prova.id]"
          >
            {{ isProvaAvailable(prova) ? 'Responder Prova' : 'Indisponível' }}
          </button>
        </div>
      </div>

      <div class="no-provas" *ngIf="provas.length === 0">
        <p>Nenhuma prova disponível no momento.</p>
      </div>

      <div class="loading" *ngIf="carregando">
        <p>Carregando provas...</p>
      </div>

      <div class="error" *ngIf="erro">
        <p>{{ erro }}</p>
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

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarProvas();
  }

  carregarProvas(): void {
    this.carregando = true;
    this.erro = '';

    // Para aluno, mostrar todas as provas de seus cursos
    // Aqui simplificado para mostrar todas
    this.http.get<Prova[]>('http://localhost:8000/api/provas').subscribe({
      next: (provas) => {
        this.provas = provas;
        this.carregando = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar provas:', error);
        this.erro = 'Erro ao carregar provas. Tente novamente.';
        this.carregando = false;
      }
    });
  }

  isProvaAvailable(prova: Prova): boolean {
    const now = new Date();
    const inicio = new Date(prova.data_inicio);
    const fim = new Date(prova.data_fim);
    return prova.ativa && now >= inicio && now <= fim;
  }

  getStatusLabel(prova: Prova): string {
    if (!prova.ativa) return 'Inativa';
    const now = new Date();
    const inicio = new Date(prova.data_inicio);
    const fim = new Date(prova.data_fim);

    if (now < inicio) return 'Em Breve';
    if (now > fim) return 'Encerrada';
    return 'Disponível';
  }

  getStatusClass(prova: Prova): string {
    if (!prova.ativa) return 'encerrada';
    const now = new Date();
    const inicio = new Date(prova.data_inicio);
    const fim = new Date(prova.data_fim);

    if (now < inicio) return 'em-breve';
    if (now > fim) return 'encerrada';
    return 'disponivel';
  }
}
