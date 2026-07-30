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
    <div class="page-container">
      <div class="page-header">
        <h2>📊 Resultados da Prova: {{ prova?.titulo }}</h2>
        <button class="btn-secondary" [routerLink]="['/admin/provas']">← Voltar</button>
      </div>

      <!-- Resumo da Prova -->
      <div class="prova-info" *ngIf="prova">
        <h3>📝 Informações da Prova</h3>
        <div class="info-grid">
          <div class="info-item">
            <strong>Título:</strong> {{ prova.titulo }}
          </div>
          <div class="info-item">
            <strong>Curso:</strong> {{ prova.curso_nome }}
          </div>
          <div class="info-item">
            <strong>Período:</strong> 
            {{ formatData(prova.data_inicio) }} - {{ formatData(prova.data_fim) }}
          </div>
          <div class="info-item">
            <strong>Questões:</strong> {{ prova.total_questoes }}
          </div>
        </div>
      </div>

      <!-- Estatísticas -->
      <div class="estatisticas" *ngIf="resultados.length > 0">
        <h3>📈 Estatísticas</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">{{ resultados.length }}</div>
            <div class="stat-label">Submissões</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ mediaGeral.toFixed(1) }}</div>
            <div class="stat-label">Média Geral</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ aprovados }}</div>
            <div class="stat-label">Aprovados (≥7)</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ reprovados }}</div>
            <div class="stat-label">Reprovados (<7)</div>
          </div>
        </div>
      </div>

      <!-- Lista de Resultados -->
      <div class="resultados-container" *ngIf="resultados.length > 0">
        <h3>👥 Resultados por Aluno</h3>
        <div class="resultados-table">
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Nota Final</th>
                <th>Acertos</th>
                <th>% Acerto</th>
                <th>Status</th>
                <th>Data Submissão</th>
                <th>Tentativa</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let resultado of resultados" 
                  [class.aprovado]="resultado.nota_final >= 7"
                  [class.reprovado]="resultado.nota_final < 7">
                <td class="aluno-nome">{{ resultado.usuario_nome }}</td>
                <td class="nota-final">{{ resultado.nota_final.toFixed(1) }}</td>
                <td class="acertos">{{ resultado.total_acertos }}/{{ resultado.total_questoes }}</td>
                <td class="percentual">{{ resultado.percentual_acerto.toFixed(1) }}%</td>
                <td class="status">
                  <span class="badge" [ngClass]="resultado.nota_final >= 7 ? 'aprovado' : 'reprovado'">
                    {{ resultado.nota_final >= 7 ? '✓ Aprovado' : '✗ Reprovado' }}
                  </span>
                </td>
                <td class="data">{{ formatDataHora(resultado.data_submissao) }}</td>
                <td class="tentativa">{{ resultado.tentativa }}ª</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Estado Vazio -->
      <div class="empty-state" *ngIf="resultados.length === 0 && !carregando">
        <div class="empty-icon">📊</div>
        <h3>Nenhum resultado ainda</h3>
        <p>Esta prova ainda não foi respondida por nenhum aluno.</p>
      </div>

      <!-- Loading -->
      <div class="loading" *ngIf="carregando">
        <p>Carregando resultados...</p>
      </div>

      <!-- Error -->
      <div class="error-message" *ngIf="erro">
        <p>{{ erro }}</p>
        <button class="btn-primary" (click)="carregarResultados()">Tentar Novamente</button>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }

    .page-header h2 {
      margin: 0;
      color: #2c3e50;
      font-size: 24px;
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      font-weight: 600;
    }

    .btn-secondary:hover {
      background: #7f8c8d;
    }

    .btn-primary {
      background: #f39c12;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }

    /* Info da Prova */
    .prova-info {
      background: white;
      padding: 25px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 25px;
    }

    .prova-info h3 {
      margin: 0 0 20px 0;
      color: #333;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
    }

    .info-item {
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }

    .info-item strong {
      color: #333;
    }

    /* Estatísticas */
    .estatisticas {
      background: white;
      padding: 25px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 25px;
    }

    .estatisticas h3 {
      margin: 0 0 20px 0;
      color: #333;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
    }

    .stat-card {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .stat-number {
      font-size: 32px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 5px;
    }

    .stat-label {
      font-size: 14px;
      color: #666;
      font-weight: 600;
    }

    /* Tabela de Resultados */
    .resultados-container {
      background: white;
      padding: 25px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .resultados-container h3 {
      margin: 0 0 20px 0;
      color: #333;
    }

    .resultados-table {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: #f8f9fa;
    }

    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #dee2e6;
    }

    th {
      font-weight: 600;
      color: #495057;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    tbody tr:hover {
      background: #f8f9fa;
    }

    .aluno-nome {
      font-weight: 600;
      color: #333;
    }

    .nota-final {
      font-weight: 700;
      font-size: 16px;
    }

    tr.aprovado .nota-final {
      color: #28a745;
    }

    tr.reprovado .nota-final {
      color: #dc3545;
    }

    .badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .badge.aprovado {
      background: #d4edda;
      color: #155724;
    }

    .badge.reprovado {
      background: #f8d7da;
      color: #721c24;
    }

    /* Estados */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .empty-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }

    .empty-state h3 {
      color: #2c3e50;
      margin-bottom: 10px;
    }

    .empty-state p {
      color: #666;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #999;
    }

    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #f5c6cb;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 15px;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      table {
        font-size: 12px;
      }

      th, td {
        padding: 8px 10px;
      }
    }
  `]
})
export class AdminProvaResultadosComponent implements OnInit {
  provaId: number | null = null;
  prova: any = null;
  resultados: ResultadoProva[] = [];
  
  carregando = false;
  erro = '';

  // Estatísticas calculadas
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
      error: (error) => {
        console.error('Erro ao carregar resultados:', error);
        this.erro = 'Erro ao carregar resultados da prova';
        this.carregando = false;
      }
    });
  }

  calcularEstatisticas(): void {
    if (this.resultados.length === 0) {
      this.mediaGeral = 0;
      this.aprovados = 0;
      this.reprovados = 0;
      return;
    }

    // Média geral
    const somaNotas = this.resultados.reduce((soma, resultado) => soma + resultado.nota_final, 0);
    this.mediaGeral = somaNotas / this.resultados.length;

    // Aprovados e reprovados
    this.aprovados = this.resultados.filter(r => r.nota_final >= 7).length;
    this.reprovados = this.resultados.filter(r => r.nota_final < 7).length;
  }

  formatData(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  formatDataHora(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' ' + 
           date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
}