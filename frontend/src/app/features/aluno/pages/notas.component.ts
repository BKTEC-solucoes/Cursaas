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
    <div class="content-page">
      <div class="page-header">
        <h1 class="page-title">Minhas Notas</h1>
        <p class="page-subtitle">Resultados e feedback das suas avaliações</p>
      </div>

      @if (carregando) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Carregando notas...</p>
        </div>
      }

      @if (erro) {
        <div class="alert alert--danger">
          <p>{{ erro }}</p>
          <button class="btn btn--sm btn--outline-danger" (click)="carregarNotas()">Tentar novamente</button>
        </div>
      }

      @if (!carregando && !erro && notas.length > 0) {
        <div class="card">
          <div class="table-responsive">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Prova</th>
                  <th class="text-center">Nota</th>
                  <th class="text-center">Tentativa</th>
                  <th>Enviado em</th>
                  <th>Corrigido em</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                @for (nota of notas; track nota.id) {
                  <tr>
                    <td class="fw-600">{{ nota.prova_titulo }}</td>
                    <td class="text-center">
                      @if (nota.nota_final != null) {
                        <span class="badge badge--{{ getNivel(nota.nota_final) }}">
                          {{ nota.nota_final.toFixed(1) }}
                        </span>
                      } @else {
                        <span class="badge badge--warning">Aguardando</span>
                      }
                    </td>
                    <td class="text-center text-muted">{{ nota.tentativa }}ª</td>
                    <td class="text-sm text-muted">{{ nota.data_submissao | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td class="text-sm text-muted">
                      @if (nota.data_correcao) { {{ nota.data_correcao | date:'dd/MM/yyyy HH:mm' }} }
                      @else { <span class="text-muted">—</span> }
                    </td>
                    <td class="text-sm">
                      @if (nota.observacoes) { <em>{{ nota.observacoes }}</em> }
                      @else { <span class="text-muted">—</span> }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (!carregando && !erro && notas.length === 0) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
          <p class="empty-title">Nenhuma nota ainda</p>
          <p class="text-muted">Realize uma prova para ver seus resultados aqui.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }
    .table-responsive { overflow-x: auto; }

    .table { width: 100%; border-collapse: collapse; }
    .table th {
      background: var(--color-surface-2); padding: var(--space-3) var(--space-4);
      text-align: left; font-size: var(--font-size-xs); font-weight: 700;
      color: var(--color-text-muted); border-bottom: 2px solid var(--color-border);
      text-transform: uppercase; letter-spacing: .05em;
    }
    .table td {
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border);
      font-size: var(--font-size-sm); color: var(--color-text);
      vertical-align: middle;
    }
    .table tr:last-child td { border-bottom: none; }
    .table-zebra tr:nth-child(even) td { background: var(--color-surface-2); }
    .table-zebra tr:hover td { background: color-mix(in srgb, var(--primary) 5%, var(--color-surface)); }
    .text-center { text-align: center; }

    .badge {
      display: inline-flex; align-items: center;
      padding: 3px 10px; border-radius: var(--radius-full);
      font-size: var(--font-size-xs); font-weight: 700; white-space: nowrap;
    }
    .badge--excelente   { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
    .badge--bom         { background: color-mix(in srgb, var(--color-info) 15%, transparent);    color: var(--color-info); }
    .badge--regular     { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); }
    .badge--insuficiente{ background: color-mix(in srgb, var(--color-danger) 15%, transparent);  color: var(--color-danger); }
    .badge--warning     { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); }

    .alert {
      padding: var(--space-4); border-radius: var(--radius);
      margin-bottom: var(--space-4);
    }
    .alert--danger {
      background: color-mix(in srgb, var(--color-danger) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
      color: var(--color-danger);
    }
    .btn { display: inline-flex; align-items: center; gap: var(--space-2);
           padding: var(--space-2) var(--space-4); border-radius: var(--radius);
           font-size: var(--font-size-sm); font-weight: 600; cursor: pointer;
           text-decoration: none; border: none; transition: background var(--transition-fast); }
    .btn--sm { padding: var(--space-1) var(--space-3); font-size: var(--font-size-xs); }
    .btn--outline-danger {
      background: transparent;
      border: 1px solid var(--color-danger); color: var(--color-danger);
      margin-top: var(--space-2);
    }
    .btn--outline-danger:hover { background: color-mix(in srgb, var(--color-danger) 10%, transparent); }

    .loading-state {
      text-align: center; padding: var(--space-16, 64px) var(--space-4);
      color: var(--color-text-muted);
    }
    .spinner {
      display: inline-block; width: 36px; height: 36px;
      border: 3px solid var(--color-border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: var(--space-3);
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .fw-600 { font-weight: 600; }
    .text-sm { font-size: var(--font-size-sm); }
    .text-muted { color: var(--color-text-muted); }
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

