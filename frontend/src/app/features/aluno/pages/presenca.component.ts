import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

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
    <div class="content-page">
      <div class="page-header">
        <h1 class="page-title">Minha Presença</h1>
        <p class="page-subtitle">Acompanhe sua frequência em cada aula</p>
      </div>

      @if (!carregando && presencas.length > 0) {
        <div class="stat-grid" style="margin-bottom:var(--space-6)">
          <div class="stat-card">
            <div class="stat-icon stat-icon--primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            </div>
            <div>
              <div class="stat-value">{{ presencas.length }}</div>
              <div class="stat-label">Total de aulas</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon stat-icon--success">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <div class="stat-value">{{ aulasComPresenca }}</div>
              <div class="stat-label">Com presença ≥75%</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" [class]="percentualGeral >= 75 ? 'stat-icon--success' : 'stat-icon--danger'">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <div class="stat-value">{{ percentualGeral }}<span style="font-size:1.1rem;opacity:.65">%</span></div>
              <div class="stat-label">Frequência geral</div>
            </div>
          </div>
        </div>
      }

      @if (carregando) {
        <div class="loading-state"><div class="spinner"></div><p>Carregando registros...</p></div>
      }

      @if (erro) {
        <div class="alert alert--danger">{{ erro }}</div>
      }

      @if (!carregando && presencas.length > 0) {
        <div class="card">
          <div class="table-responsive">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Aula</th><th>Data</th><th>Progresso</th><th>Status</th><th>Conclusão</th>
                </tr>
              </thead>
              <tbody>
                @for (p of presencas; track p.id) {
                  <tr>
                    <td class="fw-600">{{ p.aula_titulo }}</td>
                    <td class="text-sm text-muted">{{ p.aula_data | date:'dd/MM/yyyy' }}</td>
                    <td>
                      <div class="prog-wrap">
                        <div class="prog-track">
                          <div class="prog-fill"
                               [style.width.%]="p.percentual_assistido"
                               [class]="p.percentual_assistido >= 75 ? 'prog-fill--ok' : 'prog-fill--low'">
                          </div>
                        </div>
                        <span class="prog-pct">{{ p.percentual_assistido }}%</span>
                      </div>
                    </td>
                    <td>
                      <span class="badge" [class]="p.percentual_assistido >= 75 ? 'badge--success' : 'badge--danger'">
                        {{ p.percentual_assistido >= 75 ? 'Presente' : 'Ausente' }}
                      </span>
                    </td>
                    <td class="text-sm text-muted">
                      @if (p.data_conclusao) { {{ p.data_conclusao | date:'dd/MM/yyyy HH:mm' }} }
                      @else { — }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (!carregando && !erro && presencas.length === 0) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <p class="empty-title">Nenhuma presença registrada</p>
          <p class="text-muted">Comece a assistir as aulas para registrar sua frequência.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--space-4);
    }
    .stat-card {
      display: flex; align-items: center; gap: var(--space-4);
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: var(--space-5);
      box-shadow: var(--shadow-sm);
    }
    .stat-icon {
      width: 48px; height: 48px; border-radius: var(--radius);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .stat-icon--primary { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); }
    .stat-icon--success { background: color-mix(in srgb, var(--color-success) 14%, transparent); color: var(--color-success); }
    .stat-icon--danger  { background: color-mix(in srgb, var(--color-danger) 14%, transparent);  color: var(--color-danger); }
    .stat-value { font-family: var(--font-display); font-size: var(--font-size-3xl); font-weight: 800; color: var(--color-text); line-height: 1; margin-bottom: 2px; }
    .stat-label { font-size: var(--font-size-sm); color: var(--color-text-muted); }

    .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden; }
    .table-responsive { overflow-x: auto; }
    .table { width: 100%; border-collapse: collapse; }
    .table th {
      background: var(--color-surface-2); padding: var(--space-3) var(--space-4);
      text-align: left; font-size: var(--font-size-xs); font-weight: 700;
      color: var(--color-text-muted); border-bottom: 2px solid var(--color-border);
      text-transform: uppercase; letter-spacing: .05em;
    }
    .table td { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); font-size: var(--font-size-sm); color: var(--color-text); vertical-align: middle; }
    .table tr:last-child td { border-bottom: none; }
    .table-zebra tr:nth-child(even) td { background: var(--color-surface-2); }
    .table-zebra tr:hover td { background: color-mix(in srgb, var(--primary) 5%, var(--color-surface)); }

    .prog-wrap  { display: flex; align-items: center; gap: var(--space-2); }
    .prog-track { flex: 1; height: 8px; background: var(--color-border); border-radius: var(--radius-full); overflow: hidden; min-width: 80px; }
    .prog-fill  { height: 100%; border-radius: var(--radius-full); transition: width .3s; }
    .prog-fill--ok  { background: var(--color-success); }
    .prog-fill--low { background: var(--color-danger); }
    .prog-pct   { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-muted); min-width: 34px; text-align: right; }

    .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 700; }
    .badge--success { background: color-mix(in srgb, var(--color-success) 14%, transparent); color: var(--color-success); }
    .badge--danger  { background: color-mix(in srgb, var(--color-danger) 14%, transparent);  color: var(--color-danger); }

    .alert { padding: var(--space-4); border-radius: var(--radius); margin-bottom: var(--space-4); }
    .alert--danger { background: color-mix(in srgb, var(--color-danger) 10%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); color: var(--color-danger); }

    .loading-state { text-align: center; padding: 60px var(--space-4); color: var(--color-text-muted); }
    .spinner { display: inline-block; width: 36px; height: 36px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: var(--space-3); }
    @keyframes spin { to { transform: rotate(360deg); } }

    .fw-600 { font-weight: 600; }
    .text-sm { font-size: var(--font-size-sm); }
    .text-muted { color: var(--color-text-muted); }
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

    this.http.get<PresencaAula[]>(`http://localhost:8000/api/presenca/${alunoId}`, { headers }).subscribe({
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
