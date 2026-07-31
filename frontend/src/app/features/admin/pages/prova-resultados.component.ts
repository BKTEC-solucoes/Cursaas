import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface ResultadoProva {
  id: number;
  usuario_id: number;
  prova_id: number;
  usuario_nome: string;
  nota_final: number;
  total_questoes: number;
  total_acertos: number;
  percentual_acerto: number;
  data_submissao: string;
  tentativa: number;
}

@Component({
  selector: 'app-admin-prova-resultados',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="content-page">

      <div class="page-header">
        <div>
          <h1 class="page-title">Resultados da Prova</h1>
          @if (prova) {
            <p class="page-subtitle">{{ prova.titulo }}</p>
          }
        </div>
        <a class="btn btn-outline" [routerLink]="['/admin/provas']">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Voltar
        </a>
      </div>

      @if (carregando) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Carregando resultados...</p>
        </div>
      }

      @if (erro) {
        <div class="msg msg-error">
          {{ erro }}
          <button class="btn btn-sm btn-outline" style="margin-left: var(--space-4)" (click)="carregarResultados()">Tentar novamente</button>
        </div>
      }

      @if (!carregando && !erro) {
        @if (prova) {
          <div class="card" style="margin-bottom: var(--space-5)">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Curso</span>
                <span class="info-value">{{ prova.curso_nome }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Início</span>
                <span class="info-value">{{ formatData(prova.data_inicio) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Encerramento</span>
                <span class="info-value">{{ formatData(prova.data_fim) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Questões</span>
                <span class="info-value">{{ prova.total_questoes }}</span>
              </div>
            </div>
          </div>
        }

        @if (resultados.length > 0) {
          <div class="stat-grid" style="margin-bottom: var(--space-5)">
            <div class="stat-card">
              <div class="stat-value">{{ resultados.length }}</div>
              <div class="stat-label">Submissões</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ mediaGeral.toFixed(1) }}</div>
              <div class="stat-label">Média Geral</div>
            </div>
            <div class="stat-card stat-card--success">
              <div class="stat-value">{{ aprovados }}</div>
              <div class="stat-label">Aprovados (≥7)</div>
            </div>
            <div class="stat-card stat-card--danger">
              <div class="stat-value">{{ reprovados }}</div>
              <div class="stat-label">Reprovados (&lt;7)</div>
            </div>
          </div>

          <div class="card">
            <h2 class="section-title">Resultados por Aluno</h2>
            <div class="table-wrap">
              <table class="table table-zebra">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Nota</th>
                    <th>Acertos</th>
                    <th>% Acerto</th>
                    <th>Status</th>
                    <th>Submissão</th>
                    <th>Tentativa</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of resultados; track r.id) {
                    <tr>
                      <td class="col-nome">{{ r.usuario_nome }}</td>
                      <td class="col-nota" [class.nota-ok]="r.nota_final >= 7" [class.nota-fail]="r.nota_final < 7">
                        {{ r.nota_final.toFixed(1) }}
                      </td>
                      <td>{{ r.total_acertos }}/{{ r.total_questoes }}</td>
                      <td>{{ r.percentual_acerto.toFixed(1) }}%</td>
                      <td>
                        @if (r.nota_final >= 7) {
                          <span class="badge badge-success">Aprovado</span>
                        } @else {
                          <span class="badge badge-danger">Reprovado</span>
                        }
                      </td>
                      <td>{{ formatDataHora(r.data_submissao) }}</td>
                      <td>{{ r.tentativa }}ª</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        @if (resultados.length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <h3 class="empty-title">Nenhum resultado ainda</h3>
            <p class="empty-body">Esta prova ainda não foi respondida por nenhum aluno.</p>
          </div>
        }
      }

    </div>
  `,
  styles: [`
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); }
    .info-item { display: flex; flex-direction: column; gap: var(--space-1); }
    .info-label { font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--color-text-muted); }
    .info-value { font-size: var(--font-size-sm); color: var(--color-text); font-weight: 500; }

    .section-title { font-size: var(--font-size-md); font-weight: 700; color: var(--color-text); margin: 0 0 var(--space-4); }

    .stat-card--success .stat-value { color: var(--color-success); }
    .stat-card--danger  .stat-value { color: var(--color-danger); }

    .col-nome { font-weight: 600; color: var(--color-text); }
    .col-nota { font-weight: 700; font-size: var(--font-size-md); }
    .nota-ok   { color: var(--color-success); }
    .nota-fail { color: var(--color-danger); }

    .loading-state { text-align: center; padding: var(--space-10); color: var(--color-text-muted); }
    .spinner { display: inline-block; width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: var(--space-3); }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 700px) {
      .stat-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class AdminProvaResultadosComponent implements OnInit {
  provaId: number | null = null;
  prova: any = null;
  resultados: ResultadoProva[] = [];

  carregando = false;
  erro = '';

  mediaGeral = 0;
  aprovados = 0;
  reprovados = 0;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.provaId = +params['id'];
      this.carregarProva();
      this.carregarResultados();
    });
  }

  carregarProva(): void {
    if (!this.provaId) return;

    this.http.get(`${environment.apiUrl}/provas/${this.provaId}`).subscribe({
      next: (prova: any) => {
        this.prova = prova;
      },
      error: (error) => {
        console.error('Erro ao carregar prova:', error);
      }
    });
  }

  carregarResultados(): void {
    if (!this.provaId) return;
    this.carregando = true;
    this.erro = '';

    this.http.get<ResultadoProva[]>(`${environment.apiUrl}/provas/${this.provaId}/respostas`).subscribe({
      next: (resultados) => {
        this.resultados = resultados || [];
        this.calcularEstatisticas();
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar resultados da prova.';
        this.carregando = false;
      }
    });
  }

  calcularEstatisticas(): void {
    if (this.resultados.length === 0) { this.mediaGeral = 0; this.aprovados = 0; this.reprovados = 0; return; }
    this.mediaGeral = this.resultados.reduce((s, r) => s + r.nota_final, 0) / this.resultados.length;
    this.aprovados  = this.resultados.filter(r => r.nota_final >= 7).length;
    this.reprovados = this.resultados.filter(r => r.nota_final < 7).length;
  }

  formatData(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  formatDataHora(dateString: string): string {
    const d = new Date(dateString);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
}
