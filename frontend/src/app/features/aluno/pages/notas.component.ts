import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { filter, take, switchMap } from 'rxjs';

interface Nota {
  id: number;
  prova_id: number;
  prova_titulo: string;
  nota_final: number | null;
  tentativa: number;
  observacoes: string | null;
  data_submissao: string;
  data_correcao: string | null;
}

@Component({
  selector: 'app-aluno-notas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2>📊 Minhas Notas</h2>
      </div>

      <div class="loading" *ngIf="carregando">
        <div class="spinner"></div>
        <p>Carregando notas...</p>
      </div>

      <div class="error-msg" *ngIf="erro">
        <p>{{ erro }}</p>
        <button (click)="carregarNotas()">Tentar novamente</button>
      </div>

      <div class="table-container" *ngIf="!carregando && !erro && notas.length > 0">
        <table>
          <thead>
            <tr>
              <th>Prova</th>
              <th>Nota</th>
              <th>Tentativa</th>
              <th>Enviado em</th>
              <th>Corrigido em</th>
              <th>Observações</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let nota of notas">
              <td class="prova-titulo">{{ nota.prova_titulo }}</td>
              <td class="nota-valor">
                <span *ngIf="nota.nota_final != null" [ngClass]="'nivel-' + getNivel(nota.nota_final)">
                  {{ nota.nota_final.toFixed(1) }}
                </span>
                <span *ngIf="nota.nota_final == null" class="pendente-badge">⏳ Aguardando correção</span>
              </td>
              <td class="tentativa-val">{{ nota.tentativa }}ª</td>
              <td class="data-col">{{ nota.data_submissao | date:'dd/MM/yyyy HH:mm' }}</td>
              <td class="data-col">
                <span *ngIf="nota.data_correcao">{{ nota.data_correcao | date:'dd/MM/yyyy HH:mm' }}</span>
                <span *ngIf="!nota.data_correcao" class="sem-correcao">—</span>
              </td>
              <td class="obs-col">
                <span *ngIf="nota.observacoes" class="obs-text">{{ nota.observacoes }}</span>
                <span *ngIf="!nota.observacoes" class="sem-correcao">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="no-data" *ngIf="!carregando && !erro && notas.length === 0">
        <p>📭 Nenhuma nota registrada ainda. Realize uma prova para ver seus resultados aqui.</p>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1100px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .page-header h2 {
      margin: 0;
      color: #333;
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
      0%   { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-msg {
      background: #f8d7da;
      color: #721c24;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
    }
    .error-msg button {
      margin-top: 10px;
      padding: 8px 16px;
      background: #721c24;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .table-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      background: #f8f9fa;
      padding: 14px 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 700;
      color: #555;
      border-bottom: 2px solid #eee;
    }

    td {
      padding: 14px 16px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
      color: #444;
      vertical-align: middle;
    }

    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #fafafa; }

    .prova-titulo { font-weight: 600; color: #333; }

    .nota-valor { font-weight: 700; text-align: center; }

    .nivel-excelente { color: #27ae60; font-size: 16px; }
    .nivel-bom       { color: #2980b9; font-size: 16px; }
    .nivel-regular   { color: #f39c12; font-size: 16px; }
    .nivel-insuficiente { color: #e74c3c; font-size: 16px; }

    .pendente-badge {
      background: #fff3cd;
      color: #856404;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }

    .tentativa-val { color: #666; text-align: center; }
    .data-col { font-size: 13px; color: #777; white-space: nowrap; }
    .sem-correcao { color: #bbb; }
    .obs-col { max-width: 220px; }
    .obs-text { font-size: 13px; color: #555; font-style: italic; }

    .no-data {
      background: white;
      padding: 60px 20px;
      text-align: center;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      color: #999;
    }
  `]
})
export class AlunoNotasComponent implements OnInit {
  notas: Nota[] = [];
  carregando = false;
  erro = '';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.carregarNotas();
  }

  carregarNotas(): void {
    this.carregando = true;
    this.erro = '';

    this.authService.currentUser$.pipe(
      filter(user => user !== null),
      take(1),
      switchMap(user => this.http.get<Nota[]>(`http://localhost:8000/api/notas/${user!.id}`))
    ).subscribe({
      next: (notas) => {
        this.notas = (notas || [])
          .map(n => ({
            ...n,
            nota_final: n.nota_final != null ? Number(n.nota_final) : null
          }))
          .sort((a, b) => new Date(b.data_submissao).getTime() - new Date(a.data_submissao).getTime());
        this.carregando = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar notas:', err);
        this.erro = err?.error?.detail || 'Erro ao carregar notas. Tente novamente.';
        this.carregando = false;
      }
    });
  }

  getNivel(nota: number): string {
    if (nota >= 8) return 'excelente';
    if (nota >= 6) return 'bom';
    if (nota >= 4) return 'regular';
    return 'insuficiente';
  }
}

