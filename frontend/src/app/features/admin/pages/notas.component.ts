import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface Nota {
  id: number;
  usuario_id: number;
  usuario_nome: string;
  prova_id: number;
  prova_titulo: string;
  nota_final: number;
  tentativa: number;
  data_submissao: string;
  data_correcao: string;
}

@Component({
  selector: 'app-admin-notas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2>Gerenciar Notas</h2>
        <button class="btn-filter" (click)="abrirFiltros()">🔍 Filtrar</button>
      </div>

      <div class="notas-table" *ngIf="notas.length > 0">
        <table>
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Prova</th>
              <th>Nota</th>
              <th>Tentat.</th>
              <th>Data Submissão</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let nota of notas" [class.baixa-nota]="nota.nota_final < 5">
              <td class="aluno-nome">{{ nota.usuario_nome }}</td>
              <td>{{ nota.prova_titulo }}</td>
              <td class="nota-valor" [ngClass]="'nota-' + getNivelNota(nota.nota_final)">
                {{ nota.nota_final.toFixed(1) }}
              </td>
              <td class="tentativa">{{ nota.tentativa }}</td>
              <td>{{ nota.data_submissao | date:'dd/MM/yyyy HH:mm' }}</td>
              <td class="actions">
                <button class="btn-sm btn-edit" title="Editar">✏️</button>
                <button class="btn-sm btn-view" title="Ver Detalhes">👁️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="no-data" *ngIf="notas.length === 0 && !carregando">
        <p>Nenhuma nota registrada ainda.</p>
      </div>

      <div class="loading" *ngIf="carregando">
        <div class="spinner"></div>
        <p>Carregando notas...</p>
      </div>

      <div class="error" *ngIf="erro">
        <p>{{ erro }}</p>
        <button (click)="carregarNotas()">Tentar novamente</button>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      gap: 15px;
    }

    .page-header h2 {
      margin: 0;
      color: #333;
    }

    .btn-filter {
      background-color: #27ae60;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: background-color 0.2s;
      white-space: nowrap;
    }

    .btn-filter:hover {
      background-color: #229954;
    }

    .notas-table {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: #f5f5f5;
      border-bottom: 2px solid #ddd;
    }

    th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: #333;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      padding: 15px;
      border-bottom: 1px solid #eee;
      font-size: 14px;
    }

    tbody tr:hover {
      background-color: #f9f9f9;
    }

    tbody tr.baixa-nota {
      background-color: #fff5f5;
    }

    .aluno-nome {
      font-weight: 600;
      color: #333;
    }

    .nota-valor {
      font-weight: 700;
      text-align: center;
      font-size: 15px;
    }

    .nota-valor.nota-excelente { color: #27ae60; }
    .nota-valor.nota-bom { color: #3498db; }
    .nota-valor.nota-regular { color: #f39c12; }
    .nota-valor.nota-insuficiente { color: #e74c3c; }

    .tentativa {
      text-align: center;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .btn-sm {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 4px 8px;
      transition: transform 0.2s;
    }

    .btn-sm:hover {
      transform: scale(1.2);
    }

    .btn-edit { color: #3498db; }
    .btn-view { color: #27ae60; }

    .no-data {
      background: white;
      padding: 60px 20px;
      text-align: center;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      color: #999;
    }

    .loading {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }

    .spinner {
      display: inline-block;
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #27ae60;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 15px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      background: #f8d7da;
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

    @media (max-width: 768px) {
      table { font-size: 12px; }
      th, td { padding: 10px; }
      .actions { flex-direction: column; }
    }
  `]
})
export class AdminNotasComponent implements OnInit {
  notas: Nota[] = [];
  carregando = false;
  erro = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarNotas();
  }

  carregarNotas(): void {
    this.carregando = true;
    this.erro = '';

    this.http.get<Nota[]>('http://localhost:8000/api/notas').subscribe({
      next: (notas) => {
        this.notas = notas || [];
        this.carregando = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar notas:', error);
        this.erro = 'Erro ao carregar notas. Tente novamente.';
        this.carregando = false;
      }
    });
  }

  getNivelNota(nota: number): string {
    if (nota >= 8) return 'excelente';
    if (nota >= 6) return 'bom';
    if (nota >= 4) return 'regular';
    return 'insuficiente';
  }

  abrirFiltros(): void {
    alert('Filtros - a implementar');
  }
}
