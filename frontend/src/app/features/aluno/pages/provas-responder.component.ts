import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LetraPipe } from '../../../shared/pipes/letra.pipe';

interface Opcao {
  id: number;
  descricao: string;
  numero: number;
}

interface Questao {
  id: number;
  descricao: string;
  tipo: string; // multip_escolha, verdadeiro_falso, dissertativa
  opcoes: Opcao[];
  resposta_selecionada?: number | string;
}

interface Prova {
  id: number;
  titulo: string;
  descricao: string;
  questoes: Questao[];
}

interface RespuestaProva {
  prova_id: number;
  respostas: Array<{
    questao_id: number;
    resposta: number | string;
  }>;
}

@Component({
  selector: 'app-provas-responder',
  standalone: true,
  imports: [CommonModule, FormsModule, LetraPipe],
  template: `
    <div class="page-container">
      <div class="prova-header" *ngIf="prova">
        <button class="btn-voltar" (click)="voltar()">← Voltar</button>
        <div class="header-content">
          <h1>{{ prova.titulo }}</h1>
          <p>{{ prova.descricao }}</p>
        </div>
        <div class="timer" *ngIf="tempoRestante">
          <span>Tempo restante: {{ formatarTempo(tempoRestante) }}</span>
        </div>
      </div>

      <div class="questoes-container" *ngIf="prova && !enviada">
        <div class="questoes-lista">
          <div class="questao-item" *ngFor="let questao of prova.questoes; let i = index">
            <div class="questao-header">
              <h3>Questão {{ i + 1 }} de {{ prova.questoes.length }}</h3>
              <span class="tipo-questao">{{ getTipoLabel(questao.tipo) }}</span>
            </div>

            <p class="questao-descricao">{{ questao.descricao }}</p>

            <!-- Múltipla escolha -->
            <div class="opcoes" *ngIf="questao.tipo === 'multip_escolha'">
              <label class="opcao-item" *ngFor="let opcao of questao.opcoes">
                <input
                  type="radio"
                  [name]="'questao_' + questao.id"
                  [value]="opcao.id"
                  [(ngModel)]="questao.resposta_selecionada"
                />
                <span class="opcao-letter">{{ opcao.numero | letra }}</span>
                <span class="opcao-text">{{ opcao.descricao }}</span>
              </label>
            </div>

            <!-- Verdadeiro ou Falso -->
            <div class="opcoes" *ngIf="questao.tipo === 'verdadeiro_falso'">
              <label class="opcao-item">
                <input
                  type="radio"
                  [name]="'questao_' + questao.id"
                  value="verdadeiro"
                  [(ngModel)]="questao.resposta_selecionada"
                />
                <span class="opcao-text">Verdadeiro</span>
              </label>
              <label class="opcao-item">
                <input
                  type="radio"
                  [name]="'questao_' + questao.id"
                  value="falso"
                  [(ngModel)]="questao.resposta_selecionada"
                />
                <span class="opcao-text">Falso</span>
              </label>
            </div>

            <!-- Dissertativa -->
            <div class="dissertativa" *ngIf="questao.tipo === 'dissertativa'">
              <textarea
                [(ngModel)]="questao.resposta_selecionada"
                [ngModelOptions]="{ updateOn: 'change' }"
                placeholder="Digite sua resposta aqui..."
                class="dissertativa-input"
                rows="6"
              ></textarea>
            </div>
          </div>
        </div>

        <div class="total-questoes">
          <p>Respondidas: <strong>{{ contagemRespondidas }}</strong> de {{ prova.questoes.length }}</p>
        </div>
      </div>

      <!-- Resumo antes de enviar -->
      <div class="confirmacao" *ngIf="prova && !enviada">
        <div class="confirmacao-content">
          <h3>Tem certeza que deseja enviar sua prova?</h3>
          <p>Você respondeu {{ contagemRespondidas }} de {{ prova.questoes.length }} questões.</p>
          <div class="confirmacao-buttons">
            <button class="btn-continuar" (click)="scrollToTop()">
              Continuar Respondendo
            </button>
            <button class="btn-enviar" (click)="enviarProva()" [disabled]="enviando">
              {{ enviando ? 'Enviando...' : 'Enviar Prova' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Resultado após envio -->
      <div class="resultado" *ngIf="resultado">
        <div class="resultado-content">
          <div class="score-display" [ngClass]="'score-' + getPerformance(resultado.pontuacao)">
            <div class="score-number">{{ resultado.pontuacao }}%</div>
            <div class="score-label">{{ getPerformanceLabel(resultado.pontuacao) }}</div>
          </div>

          <div class="resultado-details">
            <h2>Resultado da Prova</h2>
            <p>Prova: <strong>{{ prova?.titulo }}</strong></p>

            <div class="resultado-stats">
              <div class="stat">
                <span class="stat-label">Acertos:</span>
                <span class="stat-value">{{ resultado.acertos }} questões</span>
              </div>
              <div class="stat">
                <span class="stat-label">Erros:</span>
                <span class="stat-value">{{ resultado.erros }} questões</span>
              </div>
              <div class="stat">
                <span class="stat-label">Em Branco:</span>
                <span class="stat-value">{{ resultado.em_branco }} questões</span>
              </div>
            </div>

            <div class="feedback" *ngIf="resultado.feedback">
              <h4>Feedback</h4>
              <p>{{ resultado.feedback }}</p>
            </div>

            <div class="resultado-buttons">
              <button class="btn-voltar-list" (click)="voltarParaLista()">
                Voltar para Lista de Provas
              </button>
              <button class="btn-dashboard" (click)="irParaDashboard()">
                Ir para Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="loading" *ngIf="carregando">
        <div class="spinner"></div>
        <p>Carregando prova...</p>
      </div>

      <div class="error" *ngIf="erro">
        <p>{{ erro }}</p>
        <button (click)="voltar()">Voltar</button>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }

    .prova-header {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 20px;
      align-items: start;
      margin-bottom: 30px;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .btn-voltar {
      background: #f5f5f5;
      border: 1px solid #ddd;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }

    .btn-voltar:hover {
      background-color: #efefef;
    }

    .header-content h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #333;
    }

    .header-content p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .timer {
      text-align: right;
      color: #d63031;
      font-weight: 600;
    }

    .questoes-container {
      display: grid;
      grid-template-columns: 1fr 250px;
      gap: 20px;
    }

    .questoes-lista {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .questao-item {
      padding: 20px;
      border-bottom: 1px solid #eee;
    }

    .questao-item:last-child {
      border-bottom: none;
    }

    .questao-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      gap: 12px;
    }

    .questao-header h3 {
      margin: 0;
      font-size: 16px;
      color: #333;
    }

    .tipo-questao {
      background-color: #f0f0f0;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      color: #666;
      white-space: nowrap;
    }

    .questao-descricao {
      margin: 0 0 16px 0;
      color: #333;
      line-height: 1.6;
      font-size: 15px;
    }

    .opcoes {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .opcao-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .opcao-item:hover {
      background-color: #f9f9f9;
    }

    .opcao-item input[type="radio"] {
      margin-top: 4px;
      cursor: pointer;
    }

    .opcao-letter {
      display: inline-block;
      min-width: 24px;
      height: 24px;
      background-color: #667eea;
      color: white;
      border-radius: 50%;
      text-align: center;
      line-height: 24px;
      font-weight: 600;
      font-size: 12px;
    }

    .opcao-text {
      flex: 1;
      color: #333;
      line-height: 1.5;
    }

    .dissertativa-input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
    }

    .dissertativa-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .total-questoes {
      position: sticky;
      bottom: 0;
      background: white;
      padding: 15px 20px;
      border-top: 1px solid #eee;
      text-align: right;
      font-size: 14px;
      color: #666;
    }

    .confirmacao {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-top: 20px;
      grid-column: 1 / -1;
    }

    .confirmacao-content h3 {
      margin: 0 0 8px 0;
      color: #333;
    }

    .confirmacao-content p {
      margin: 0 0 20px 0;
      color: #666;
      font-size: 14px;
    }

    .confirmacao-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .btn-continuar {
      padding: 12px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      transition: background-color 0.2s;
    }

    .btn-continuar:hover {
      background-color: #efefef;
    }

    .btn-enviar {
      padding: 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      transition: background-color 0.2s;
    }

    .btn-enviar:hover:not(:disabled) {
      background-color: #5568d3;
    }

    .btn-enviar:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }

    .resultado {
      grid-column: 1 / -1;
      margin-top: 30px;
    }

    .resultado-content {
      display: grid;
      grid-template-columns: 250px 1fr;
      gap: 30px;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .score-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      border-radius: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .score-display.score-excelente {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    }

    .score-display.score-bom {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .score-display.score-regular {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .score-display.score-insuficiente {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    }

    .score-number {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .score-label {
      font-size: 16px;
      font-weight: 600;
    }

    .resultado-details h2 {
      margin: 0 0 15px 0;
      color: #333;
    }

    .resultado-details p {
      margin: 0 0 20px 0;
      color: #666;
      font-size: 14px;
    }

    .resultado-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }

    .stat {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
    }

    .stat-label {
      display: block;
      color: #666;
      font-size: 12px;
      margin-bottom: 5px;
      font-weight: 600;
    }

    .stat-value {
      display: block;
      color: #333;
      font-size: 18px;
      font-weight: 700;
    }

    .feedback {
      background: #e8f4f8;
      border-left: 4px solid #667eea;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
    }

    .feedback h4 {
      margin: 0 0 8px 0;
      color: #333;
    }

    .feedback p {
      margin: 0;
      color: #555;
      font-size: 14px;
      line-height: 1.5;
    }

    .resultado-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .btn-voltar-list {
      padding: 12px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: background-color 0.2s;
    }

    .btn-voltar-list:hover {
      background-color: #efefef;
    }

    .btn-dashboard {
      padding: 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: background-color 0.2s;
    }

    .btn-dashboard:hover {
      background-color: #5568d3;
    }

    .loading {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
      background: #f8d7da;
      color: #721c24;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border: 1px solid #f5c6cb;
      text-align: center;
    }

    .error button {
      margin-top: 15px;
      padding: 8px 16px;
      background: #721c24;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    @media (max-width: 768px) {
      .questoes-container {
        grid-template-columns: 1fr;
      }

      .prova-header {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .resultado-content {
        grid-template-columns: 1fr;
      }

      .resultado-stats {
        grid-template-columns: 1fr;
      }

      .confirmacao-buttons,
      .resultado-buttons {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProvasResponderComponent implements OnInit {
  prova: Prova | null = null;
  resultado: any = null;
  carregando = false;
  enviando = false;
  erro = '';
  tempoRestante: number | null = null;
  enviada = false;

  private provaId: number = 0;

  get contagemRespondidas(): number {
    if (!this.prova) return 0;
    return this.prova.questoes.filter(q => q.resposta_selecionada !== undefined && q.resposta_selecionada !== '').length;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.provaId = params['id'];
      this.carregarProva();
    });
  }

  carregarProva(): void {
    this.carregando = true;
    this.erro = '';

    this.http.get<Prova>(`http://localhost:8000/api/provas/${this.provaId}`).subscribe({
      next: (prova) => {
        this.prova = prova;
        this.carregando = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar prova:', error);
        this.erro = 'Erro ao carregar prova. Tente novamente.';
        this.carregando = false;
      }
    });
  }

  enviarProva(): void {
    if (!this.prova) return;

    this.enviando = true;

    const respostas = this.prova.questoes
      .filter(q => q.resposta_selecionada !== undefined && q.resposta_selecionada !== '')
      .map(questao => ({
        questao_id: questao.id,
        resposta: questao.resposta_selecionada as string | number
      }));

    const payload: RespuestaProva = {
      prova_id: this.prova.id,
      respostas: respostas
    };

    this.http.post<any>(`http://localhost:8000/api/provas/${this.provaId}/responder`, payload).subscribe({
      next: (resultado) => {
        this.resultado = resultado;
        this.enviada = true;
        this.enviando = false;
      },
      error: (error: any) => {
        console.error('Erro ao enviar prova:', error);
        this.erro = 'Erro ao enviar prova. Tente novamente.';
        this.enviando = false;
      }
    });
  }

  voltar(): void {
    this.router.navigate(['/aluno/provas']);
  }

  voltarParaLista(): void {
    this.router.navigate(['/aluno/provas']);
  }

  irParaDashboard(): void {
    this.router.navigate(['/aluno']);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getTipoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      'multip_escolha': 'Múltipla Escolha',
      'verdadeiro_falso': 'V ou F',
      'dissertativa': 'Dissertativa'
    };
    return labels[tipo] || tipo;
  }

  getPerformance(pontuacao: number): string {
    if (pontuacao >= 80) return 'excelente';
    if (pontuacao >= 60) return 'bom';
    if (pontuacao >= 40) return 'regular';
    return 'insuficiente';
  }

  getPerformanceLabel(pontuacao: number): string {
    if (pontuacao >= 80) return 'Excelente!';
    if (pontuacao >= 60) return 'Bom!';
    if (pontuacao >= 40) return 'Regular';
    return 'Insuficiente';
  }

  formatarTempo(segundos: number): string {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const secs = segundos % 60;

    const h = horas > 0 ? horas + 'h ' : '';
    const m = minutos > 0 ? minutos + 'm ' : '';
    const s = secs + 's';

    return h + m + s;
  }
}
