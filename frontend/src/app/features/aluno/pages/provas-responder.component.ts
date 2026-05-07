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
    @if (carregando) {
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Carregando prova...</p>
      </div>
    }

    @if (erro) {
      <div class="error-card">
        <p>{{ erro }}</p>
        <button class="btn-primary" (click)="voltar()">Voltar</button>
      </div>
    }

    @if (prova && !carregando) {
      <div class="content-page prova-page">
        <div class="prova-header">
          <button class="btn-voltar" (click)="voltar()">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Voltar
          </button>
          <div class="header-content">
            <h1 class="page-title">{{ prova.titulo }}</h1>
            @if (prova.descricao) { <p class="page-subtitle">{{ prova.descricao }}</p> }
          </div>
          @if (tempoRestante) {
            <div class="timer">Tempo restante: {{ formatarTempo(tempoRestante) }}</div>
          }
        </div>

        @if (!enviada) {
          <div class="questoes-layout">
            <div class="questoes-lista">
              @for (questao of prova.questoes; track questao.id; let i = $index) {
                <div class="questao-item">
                  <div class="questao-header">
                    <h3 class="questao-num">Questão {{ i + 1 }} de {{ prova.questoes.length }}</h3>
                    <span class="tipo-badge">{{ getTipoLabel(questao.tipo) }}</span>
                  </div>
                  <p class="questao-desc">{{ questao.descricao }}</p>

                  @if (questao.tipo === 'multip_escolha') {
                    <div class="opcoes">
                      @for (opcao of questao.opcoes; track opcao.id) {
                        <label class="opcao-item">
                          <input type="radio" [name]="'questao_' + questao.id" [value]="opcao.id" [(ngModel)]="questao.resposta_selecionada">
                          <span class="opcao-letter">{{ opcao.numero | letra }}</span>
                          <span class="opcao-text">{{ opcao.descricao }}</span>
                        </label>
                      }
                    </div>
                  }

                  @if (questao.tipo === 'verdadeiro_falso') {
                    <div class="opcoes">
                      <label class="opcao-item">
                        <input type="radio" [name]="'questao_' + questao.id" value="verdadeiro" [(ngModel)]="questao.resposta_selecionada">
                        <span class="opcao-text">Verdadeiro</span>
                      </label>
                      <label class="opcao-item">
                        <input type="radio" [name]="'questao_' + questao.id" value="falso" [(ngModel)]="questao.resposta_selecionada">
                        <span class="opcao-text">Falso</span>
                      </label>
                    </div>
                  }

                  @if (questao.tipo === 'dissertativa') {
                    <textarea
                      [(ngModel)]="questao.resposta_selecionada"
                      [ngModelOptions]="{ updateOn: 'change' }"
                      placeholder="Digite sua resposta aqui..."
                      class="dissertativa-input"
                      rows="6"></textarea>
                  }
                </div>
              }
              <div class="total-questoes">
                Respondidas: <strong>{{ contagemRespondidas }}</strong> de {{ prova.questoes.length }}
              </div>
            </div>
          </div>

          <div class="confirmacao">
            <h3 class="instr-title">Tem certeza que deseja enviar sua prova?</h3>
            <p class="conf-sub">Você respondeu {{ contagemRespondidas }} de {{ prova.questoes.length }} questões.</p>
            <div class="conf-actions">
              <button class="btn-outline" (click)="scrollToTop()">Continuar Respondendo</button>
              <button class="btn-primary" (click)="enviarProva()" [disabled]="enviando">
                {{ enviando ? 'Enviando...' : 'Enviar Prova' }}
              </button>
            </div>
          </div>
        }

        @if (resultado) {
          <div class="resultado">
            <div class="score-panel" [ngClass]="'score-' + getPerformance(resultado.pontuacao)">
              <div class="score-number">{{ resultado.pontuacao }}%</div>
              <div class="score-label">{{ getPerformanceLabel(resultado.pontuacao) }}</div>
            </div>
            <div class="resultado-details">
              <h2 class="res-title">Resultado da Prova</h2>
              <p class="res-sub">Prova: <strong>{{ prova?.titulo }}</strong></p>
              <div class="stat-grid">
                <div class="stat-card">
                  <div class="stat-value">{{ resultado.acertos }}</div>
                  <div class="stat-label">Acertos</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value" style="color:var(--color-danger)">{{ resultado.erros }}</div>
                  <div class="stat-label">Erros</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value" style="color:var(--color-text-muted)">{{ resultado.em_branco }}</div>
                  <div class="stat-label">Em Branco</div>
                </div>
              </div>
              @if (resultado.feedback) {
                <div class="feedback">
                  <h4>Feedback</h4>
                  <p>{{ resultado.feedback }}</p>
                </div>
              }
              <div class="res-actions">
                <button class="btn-outline" (click)="voltarParaLista()">Voltar para Lista</button>
                <button class="btn-primary" (click)="irParaDashboard()">Ir para Dashboard</button>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .prova-page { padding: 0; max-width: unset; }

    .prova-header {
      display: grid; grid-template-columns: auto 1fr auto;
      gap: var(--space-5); align-items: start;
      padding: var(--space-6) var(--space-7);
      background: var(--color-surface); border-bottom: 1px solid var(--color-border);
    }
    .btn-voltar {
      display: inline-flex; align-items: center; gap: var(--space-1);
      background: var(--color-surface-2); border: 1px solid var(--color-border);
      color: var(--color-text-muted); padding: var(--space-2) var(--space-3);
      border-radius: var(--radius); font-size: var(--font-size-sm); cursor: pointer;
      font-weight: 600; transition: background var(--transition-fast);
    }
    .btn-voltar:hover { background: var(--color-border); color: var(--color-text); }
    .timer { color: var(--color-danger); font-weight: 600; font-size: var(--font-size-sm); text-align: right; }

    /* Questoes */
    .questoes-layout { padding: 0 var(--space-7); }
    .questoes-lista {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden;
    }
    .questao-item { padding: var(--space-6); border-bottom: 1px solid var(--color-border); }
    .questao-item:last-of-type { border-bottom: none; }
    .questao-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); gap: var(--space-3); }
    .questao-num { margin: 0; font-size: var(--font-size-base); color: var(--color-text); font-weight: 700; }
    .tipo-badge { background: var(--color-surface-2); border: 1px solid var(--color-border); padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap; }
    .questao-desc { margin: 0 0 var(--space-4); color: var(--color-text); line-height: 1.6; font-size: var(--font-size-sm); }

    /* Opções */
    .opcoes { display: flex; flex-direction: column; gap: var(--space-2); }
    .opcao-item {
      display: flex; align-items: flex-start; gap: var(--space-3);
      padding: var(--space-3); border-radius: var(--radius); cursor: pointer;
      border: 1px solid transparent;
      transition: background var(--transition-fast), border-color var(--transition-fast);
    }
    .opcao-item:hover { background: color-mix(in srgb, var(--primary) 5%, transparent); border-color: color-mix(in srgb, var(--primary) 30%, transparent); }
    .opcao-item input[type='radio'] { margin-top: 3px; cursor: pointer; accent-color: var(--primary); }
    .opcao-letter {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 24px; height: 24px;
      background: var(--primary); color: #fff;
      border-radius: 50%; font-weight: 700; font-size: var(--font-size-xs);
    }
    .opcao-text { flex: 1; color: var(--color-text); line-height: 1.5; font-size: var(--font-size-sm); }

    /* Dissertativa */
    .dissertativa-input {
      width: 100%; padding: var(--space-4); box-sizing: border-box;
      border: 2px solid var(--color-border); border-radius: var(--radius);
      font-family: inherit; font-size: var(--font-size-sm); resize: vertical;
      background: var(--color-surface); color: var(--color-text);
      transition: border-color var(--transition-fast);
    }
    .dissertativa-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent); }

    /* Total */
    .total-questoes {
      padding: var(--space-4) var(--space-6); border-top: 1px solid var(--color-border);
      text-align: right; font-size: var(--font-size-sm); color: var(--color-text-muted);
      background: var(--color-surface-2);
    }

    /* Confirmação */
    .confirmacao {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: var(--space-6); box-shadow: var(--shadow-sm);
      margin: var(--space-5) var(--space-7) var(--space-7);
    }
    .instr-title { margin: 0 0 var(--space-2); color: var(--color-text); font-family: var(--font-display); font-size: var(--font-size-base); }
    .conf-sub { margin: 0 0 var(--space-5); color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .conf-actions { display: flex; gap: var(--space-3); justify-content: flex-end; }

    /* Resultado */
    .resultado {
      display: grid; grid-template-columns: 220px 1fr;
      gap: var(--space-7); margin: var(--space-6) var(--space-7);
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow);
    }
    .score-panel {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: var(--space-8) var(--space-5);
      background: var(--primary);
    }
    .score-panel.score-excelente { background: var(--color-success); }
    .score-panel.score-bom { background: var(--primary); }
    .score-panel.score-regular { background: var(--color-warning); }
    .score-panel.score-insuficiente { background: var(--color-danger); }
    .score-number { font-size: 48px; font-weight: 700; color: #fff; margin-bottom: var(--space-2); font-family: var(--font-display); }
    .score-label { font-size: var(--font-size-base); font-weight: 600; color: rgba(255,255,255,.9); }

    .resultado-details { padding: var(--space-7); }
    .res-title { margin: 0 0 var(--space-2); color: var(--color-text); font-family: var(--font-display); }
    .res-sub { margin: 0 0 var(--space-5); color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .feedback {
      background: color-mix(in srgb, var(--primary) 8%, transparent);
      border-left: 4px solid var(--primary);
      padding: var(--space-4); border-radius: var(--radius); margin-bottom: var(--space-5);
    }
    .feedback h4 { margin: 0 0 var(--space-2); color: var(--color-text); font-size: var(--font-size-sm); }
    .feedback p { margin: 0; color: var(--color-text-muted); font-size: var(--font-size-sm); line-height: 1.5; }
    .res-actions { display: flex; gap: var(--space-3); }

    /* Buttons */
    .btn-primary {
      background: var(--primary); color: #fff; border: none;
      padding: var(--space-2) var(--space-6); border-radius: var(--radius);
      font-weight: 700; font-size: var(--font-size-sm); cursor: pointer;
      transition: background var(--transition-fast);
    }
    .btn-primary:hover:not(:disabled) { background: var(--secondary); }
    .btn-primary:disabled { opacity: .55; cursor: not-allowed; }
    .btn-outline {
      background: var(--color-surface-2); border: 1px solid var(--color-border);
      color: var(--color-text-muted); padding: var(--space-2) var(--space-5);
      border-radius: var(--radius); font-size: var(--font-size-sm); cursor: pointer;
      font-weight: 600; transition: background var(--transition-fast);
    }
    .btn-outline:hover { background: var(--color-border); color: var(--color-text); }

    /* States */
    .loading-state { text-align: center; padding: 60px var(--space-5); color: var(--color-text-muted); }
    .spinner { display: inline-block; width: 36px; height: 36px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: var(--space-3); }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-card {
      background: color-mix(in srgb, var(--color-danger) 10%, transparent);
      color: var(--color-danger); padding: var(--space-8); border-radius: var(--radius-lg);
      text-align: center; border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
      max-width: 600px; margin: var(--space-8) auto;
    }

    @media (max-width: 768px) {
      .prova-header { grid-template-columns: 1fr; }
      .questoes-layout { padding: 0 var(--space-4); }
      .confirmacao { margin: var(--space-4); }
      .resultado { grid-template-columns: 1fr; margin: var(--space-4); }
      .conf-actions, .res-actions { flex-direction: column; }
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
