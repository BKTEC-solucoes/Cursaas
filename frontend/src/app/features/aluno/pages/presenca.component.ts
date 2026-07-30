import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface PresencaAula {
  id: number;
  usuario_id: number;
  aula_id: number;
  aula_titulo: string;
  aula_data: string;
  percentual_assistido: number;
  registrada_automaticamente: boolean;
  data_conclusao: string | null;
}

@Component({
  selector: 'app-aluno-presenca',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h2>✓ Minha Presença</h2>

      <div class="summary-bar" *ngIf="!carregando && presencas.length > 0">
        <div class="summary-item">
          <span class="label">Total de aulas</span>
          <span class="value">{{ presencas.length }}</span>
        </div>
        <div class="summary-item">
          <span class="label">Com presença (≥75%)</span>
          <span class="value success">{{ aulasComPresenca }}</span>
        </div>
        <div class="summary-item">
          <span class="label">Percentual geral</span>
          <span class="value" [ngClass]="percentualGeral >= 75 ? 'success' : 'danger'">
            {{ percentualGeral }}%
          </span>
        </div>
      </div>

      <div class="loading" *ngIf="carregando">Carregando registros de presença...</div>

      <div class="erro" *ngIf="erro">{{ erro }}</div>

      <div class="table-container" *ngIf="!carregando && presencas.length > 0">
        <table>
          <thead>
            <tr>
              <th>Aula</th>
              <th>Data</th>
              <th>Progresso</th>
              <th>Status</th>
              <th>Conclusão</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of presencas">
              <td class="aula-titulo">{{ p.aula_titulo }}</td>
              <td>{{ p.aula_data | date:'dd/MM/yyyy' }}</td>
              <td>
                <div class="progress-bar-wrap">
                  <div class="progress-bar">
                    <div class="progress-fill"
                         [style.width.%]="p.percentual_assistido"
                         [ngClass]="p.percentual_assistido >= 75 ? 'fill-ok' : 'fill-low'">
                    </div>
                  </div>
                  <span class="progress-label">{{ p.percentual_assistido }}%</span>
                </div>
              </td>
              <td>
                <span class="badge" [ngClass]="p.percentual_assistido >= 75 ? 'badge-ok' : 'badge-low'">
                  {{ p.percentual_assistido >= 75 ? '✓ Presente' : '✗ Ausente' }}
                </span>
              </td>
              <td>
                <span *ngIf="p.data_conclusao">{{ p.data_conclusao | date:'dd/MM/yyyy HH:mm' }}</span>
                <span *ngIf="!p.data_conclusao" class="sem-conclusao">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="empty-state" *ngIf="!carregando && !erro && presencas.length === 0">
        <p>Nenhum registro de presença encontrado. Comece a assistir as aulas para registrar sua presença.</p>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 30px 20px;
    }

    h2 {
      margin: 0 0 24px;
      color: #2c3e50;
      font-size: 1.6rem;
    }

    .summary-bar {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .summary-item {
      background: white;
      border-radius: 8px;
      padding: 16px 24px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 140px;
    }

    .summary-item .label {
      font-size: 0.8rem;
      color: #888;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .summary-item .value {
      font-size: 1.8rem;
      font-weight: 700;
      color: #2c3e50;
    }

    .value.success { color: #27ae60; }
    .value.danger  { color: #e74c3c; }

    .table-container {
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    thead { background: #f8f9fa; }

    th {
      padding: 14px 16px;
      text-align: left;
      font-weight: 600;
      color: #555;
      border-bottom: 2px solid #e9ecef;
    }

    td {
      padding: 13px 16px;
      border-bottom: 1px solid #f0f0f0;
      color: #333;
    }

    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8f9fa; }

    .aula-titulo { font-weight: 500; }

    .progress-bar-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .progress-bar {
      flex: 1;
      height: 8px;
      background: #ecf0f1;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s;
    }

    .fill-ok  { background: #27ae60; }
    .fill-low { background: #e74c3c; }

    .progress-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: #555;
      min-width: 36px;
      text-align: right;
    }

    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .badge-ok  { background: #d5f5e3; color: #1e8449; }
    .badge-low { background: #fdecea; color: #c0392b; }

    .sem-conclusao { color: #bbb; }

    .loading, .empty-state {
      text-align: center;
      padding: 50px 20px;
      color: #888;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .erro {
      padding: 16px;
      background: #fdecea;
      border: 1px solid #f5c6c6;
      border-radius: 8px;
      color: #c0392b;
      margin-bottom: 20px;
    }
  `]
})
export class AlunoPresencaComponent implements OnInit {
  presencas: PresencaAula[] = [];
  carregando = false;
  erro = '';

  get aulasComPresenca(): number {
    return this.presencas.filter(p => p.percentual_assistido >= 75).length;
  }

  get percentualGeral(): number {
    if (this.presencas.length === 0) return 0;
    return Math.round(this.aulasComPresenca / this.presencas.length * 100);
  }

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit() {
    const user = this.auth.getCurrentUser();
    if (!user) {
      this.erro = 'Usuário não autenticado.';
      return;
    }
    this.carregarPresencas(user.id);
  }

  private carregarPresencas(alunoId: number) {
    this.carregando = true;
    const token = this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<PresencaAula[]>(`${environment.apiUrl}/presenca/${alunoId}`, { headers }).subscribe({
      next: (data) => {
        this.presencas = data.sort((a, b) => new Date(a.aula_data).getTime() - new Date(b.aula_data).getTime());
        this.carregando = false;
      },
      error: (err) => {
        this.erro = err?.error?.detail ?? 'Erro ao carregar presença. Tente novamente.';
        this.carregando = false;
      }
    });
  }
}
