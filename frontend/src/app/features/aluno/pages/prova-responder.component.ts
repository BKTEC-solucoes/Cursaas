import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Prova {
  id: number;
  titulo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  curso_nome: string;
  tentativas_permitidas: number;
  questoes: Questao[];
}

interface Questao {
  id: number;
  enunciado: string;
  tipo: string;
  ordem: number;
  opcoes: Opcao[];
}

interface Opcao {
  id: number;
  texto: string;
  ordem: number;
  correta: boolean;
}

@Component({
  selector: 'app-aluno-prova-responder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    @if (prova) {
      <div class="content-page prova-page">
        <!-- Cabeçalho -->
        <div class="prova-header">
          <div class="prova-info">
            <h1 class="page-title" style="color:#fff">{{ prova.titulo }}</h1>
            <div class="prova-chips">
              <span class="chip">{{ prova.curso_nome }}</span>
              <span class="chip">{{ prova.questoes.length || 0 }} questões</span>
              @if (tempoRestante > 0) {
                <span class="chip" [class.chip--urgente]="tempoRestante < 300">
                  {{ formatTempo(tempoRestante) }}
                </span>
              }
            </div>
          </div>
          <div class="prova-actions">
            <a class="btn-hdr-sec" [routerLink]="['/aluno/provas']">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Voltar
            </a>
            <button class="btn-hdr-pri" (click)="submitProva()" [disabled]="enviando || !isFormValid()">
              {{ enviando ? 'Enviando...' : 'Finalizar Prova' }}
            </button>
          </div>
        </div>

        @if (prova.descricao) {
          <div class="card">
            <p style="margin:0;color:var(--color-text-muted)">{{ prova.descricao }}</p>
          </div>
        }

        <div class="card instrucoes-card">
          <h3 class="instr-title">Instruções</h3>
          <ul class="instr-list">
            <li>Leia atentamente cada questão antes de responder</li>
            <li>Para questões de múltipla escolha, selecione apenas uma alternativa</li>
            <li>Para questões dissertativas, escreva sua resposta no campo de texto</li>
            <li>Você pode revisar e alterar suas respostas antes de finalizar</li>
            <li>Clique em “Finalizar Prova” quando terminar</li>
          </ul>
        </div>

        <form [formGroup]="respostasForm" class="questoes-form">
          @for (questao of prova.questoes; track questao.id; let i = $index) {
            <div class="questao-card" [id]="'questao-' + questao.id">
              <div class="questao-header">
                <span class="questao-numero">Questão {{ i + 1 }}</span>
                <span class="questao-tipo" [class.multipla]="questao.tipo === 'multipla_escolha'" [class.dissertativa]="questao.tipo === 'dissertativa'">
                  {{ questao.tipo === 'multipla_escolha' ? 'Múltipla Escolha' : 'Dissertativa' }}
                </span>
              </div>
              <div class="questao-conteudo">
                <p class="enunciado">{{ questao.enunciado }}</p>

                @if (questao.tipo === 'multipla_escolha') {
                  <div class="opcoes-container">
                    @for (opcao of questao.opcoes; track opcao.id; let j = $index) {
                      <label class="opcao-label">
                        <input type="radio" [name]="'questao_' + questao.id" [value]="opcao.id" (change)="updateResposta(questao.id, opcao.id, null)">
                        <span class="opcao-letra">{{ getLetter(j) }}</span>
                        <span class="opcao-texto">{{ opcao.texto }}</span>
                      </label>
                    }
                  </div>
                }

                @if (questao.tipo === 'dissertativa') {
                  <div class="dissertativa-container">
                    <textarea
                      class="dissertativa-input"
                      [placeholder]="'Digite sua resposta para a questão ' + (i + 1)"
                      rows="6"
                      (input)="updateResposta(questao.id, null, $event)"
                      maxlength="2000"></textarea>
                    <div class="char-counter">{{ getTextoLength(questao.id) }}/2000 caracteres</div>
                  </div>
                }
              </div>
            </div>
          }
        </form>

        <div class="navegacao">
          <div class="progresso">
            <span>{{ getRespostasCount() }}/{{ prova.questoes.length || 0 }} questões respondidas</span>
            <div class="progresso-bar">
              <div class="progresso-fill" [style.width.%]="getProgressoPercent()"></div>
            </div>
          </div>
          <div class="nav-actions">
            <button class="btn-outline" (click)="scrollToTop()">↑ Início</button>
            <button class="btn-primary" (click)="submitProva()" [disabled]="enviando || !isFormValid()">
              {{ enviando ? 'Enviando...' : 'Finalizar Prova' }}
            </button>
          </div>
        </div>

        @if (showConfirmacao) {
          <div class="modal-overlay" (click)="showConfirmacao = false">
            <div class="modal" (click)="$event.stopPropagation()">
              <h3 class="modal-title">Confirmar envio da prova</h3>
              <p>Tem certeza que deseja finalizar e enviar esta prova?</p>
              <p><strong>Atenção:</strong> Após o envio, você não poderá mais alterar suas respostas.</p>
              <div class="modal-stats">{{ getRespostasCount() }} de {{ prova.questoes.length || 0 }} questões respondidas</div>
              <div class="modal-actions">
                <button class="btn-outline" (click)="showConfirmacao = false">Cancelar</button>
                <button class="btn-primary" (click)="confirmarEnvio()">Sim, finalizar prova</button>
              </div>
            </div>
          </div>
        }
      </div>
    }

    @if (carregando) {
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Carregando prova...</p>
      </div>
    }

    @if (erro) {
      <div class="error-card">
        <p>{{ erro }}</p>
        <a class="btn-primary" [routerLink]="['/aluno/provas']">Voltar para Provas</a>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .prova-page { padding: 0; max-width: unset; }

    .prova-header {
      background: var(--sidebar-bg);
      color: #fff; padding: var(--space-8) var(--space-7);
      display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-4);
      flex-wrap: wrap;
    }
    .prova-chips { display: flex; gap: var(--space-2); flex-wrap: wrap; margin-top: var(--space-3); }
    .chip { background: rgba(255,255,255,.18); padding: var(--space-1) var(--space-3); border-radius: var(--radius-full); font-size: var(--font-size-sm); font-weight: 600; }
    .chip--urgente { background: var(--color-danger); animation: pulse 1s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .7; } }

    .prova-actions { display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }
    .btn-hdr-pri {
      background: rgba(255,255,255,.92); color: var(--sidebar-bg);
      border: none; padding: var(--space-2) var(--space-5); border-radius: var(--radius);
      font-weight: 700; font-size: var(--font-size-sm); cursor: pointer;
      transition: background var(--transition-fast);
    }
    .btn-hdr-pri:hover:not(:disabled) { background: #fff; }
    .btn-hdr-pri:disabled { opacity: .55; cursor: not-allowed; }
    .btn-hdr-sec {
      display: inline-flex; align-items: center; gap: var(--space-1);
      background: rgba(255,255,255,.15); color: #fff;
      border: 1px solid rgba(255,255,255,.3); padding: var(--space-2) var(--space-4);
      border-radius: var(--radius); font-size: var(--font-size-sm); font-weight: 600;
      text-decoration: none; transition: background var(--transition-fast);
    }
    .btn-hdr-sec:hover { background: rgba(255,255,255,.25); }

    /* Card base */
    .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-4); box-shadow: var(--shadow-sm); }
    .instrucoes-card { margin: var(--space-5) var(--space-7); }
    .instr-title { margin: 0 0 var(--space-3); color: var(--color-text); font-size: var(--font-size-base); font-weight: 700; }
    .instr-list { margin: 0; padding-left: var(--space-5); }
    .instr-list li { margin-bottom: var(--space-2); line-height: 1.5; color: var(--color-text-muted); font-size: var(--font-size-sm); }

    /* Questoes */
    .questoes-form { display: flex; flex-direction: column; gap: var(--space-5); padding: 0 var(--space-7); }

    .questao-card {
      background: var(--color-surface); border: 2px solid var(--color-border);
      border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm);
      transition: border-color var(--transition-fast);
    }
    .questao-card:hover { border-color: color-mix(in srgb, var(--primary) 50%, transparent); }

    .questao-header {
      background: var(--color-surface-2); padding: var(--space-3) var(--space-5);
      border-bottom: 1px solid var(--color-border);
      display: flex; justify-content: space-between; align-items: center;
    }
    .questao-numero { font-weight: 700; color: var(--color-text); font-size: var(--font-size-base); }
    .questao-tipo { padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; }
    .questao-tipo.multipla { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }
    .questao-tipo.dissertativa { background: color-mix(in srgb, var(--secondary) 12%, transparent); color: var(--secondary); }

    .questao-conteudo { padding: var(--space-6); }
    .enunciado { font-size: var(--font-size-base); line-height: 1.6; color: var(--color-text); margin: 0 0 var(--space-5); font-weight: 500; }

    /* Opções */
    .opcoes-container { display: flex; flex-direction: column; gap: var(--space-3); }
    .opcao-label {
      display: flex; align-items: center; gap: var(--space-4);
      padding: var(--space-4); border: 2px solid var(--color-border);
      border-radius: var(--radius); cursor: pointer;
      transition: border-color var(--transition-fast), background var(--transition-fast);
    }
    .opcao-label:hover { border-color: color-mix(in srgb, var(--primary) 50%, transparent); background: color-mix(in srgb, var(--primary) 5%, transparent); }
    .opcao-label input[type='radio'] { display: none; }
    .opcao-label input[type='radio']:checked + .opcao-letra { background: var(--primary); color: #fff; }
    .opcao-letra {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--color-surface-2); color: var(--color-text-muted);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: var(--font-size-sm); flex-shrink: 0;
      border: 1px solid var(--color-border); transition: all var(--transition-fast);
    }
    .opcao-texto { flex: 1; font-size: var(--font-size-sm); line-height: 1.4; color: var(--color-text); }

    /* Dissertativa */
    .dissertativa-container { position: relative; }
    .dissertativa-input {
      width: 100%; padding: var(--space-4); box-sizing: border-box;
      border: 2px solid var(--color-border); border-radius: var(--radius);
      font-family: inherit; font-size: var(--font-size-sm);
      line-height: 1.5; resize: vertical; min-height: 120px;
      background: var(--color-surface); color: var(--color-text);
      transition: border-color var(--transition-fast);
    }
    .dissertativa-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent); }
    .char-counter { text-align: right; font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: var(--space-1); }

    /* Navegação */
    .navegacao {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: var(--space-5); box-shadow: var(--shadow-sm);
      margin: var(--space-6) var(--space-7) var(--space-7);
      display: flex; justify-content: space-between; align-items: center;
    }
    .progresso span { display: block; margin-bottom: var(--space-2); color: var(--color-text-muted); font-size: var(--font-size-sm); font-weight: 600; }
    .progresso-bar { width: 200px; height: 8px; background: var(--color-surface-2); border: 1px solid var(--color-border); border-radius: var(--radius-full); overflow: hidden; }
    .progresso-fill { height: 100%; background: var(--primary); border-radius: var(--radius-full); transition: width .3s; }
    .nav-actions { display: flex; gap: var(--space-2); }

    .btn-primary {
      background: var(--primary); color: #fff; border: none;
      padding: var(--space-2) var(--space-5); border-radius: var(--radius);
      font-weight: 700; font-size: var(--font-size-sm); cursor: pointer;
      transition: background var(--transition-fast);
    }
    .btn-primary:hover:not(:disabled) { background: var(--secondary); }
    .btn-primary:disabled { opacity: .55; cursor: not-allowed; }
    .btn-outline {
      background: var(--color-surface-2); border: 1px solid var(--color-border);
      color: var(--color-text-muted); padding: var(--space-2) var(--space-4);
      border-radius: var(--radius); font-size: var(--font-size-sm); cursor: pointer;
      font-weight: 600; transition: background var(--transition-fast);
    }
    .btn-outline:hover { background: var(--color-border); color: var(--color-text); }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.6); display: flex;
      align-items: center; justify-content: center; z-index: 1000;
    }
    .modal {
      background: var(--color-surface); padding: var(--space-8);
      border-radius: var(--radius-lg); max-width: 450px; width: 90%;
      box-shadow: var(--shadow-lg); border: 1px solid var(--color-border);
    }
    .modal-title { margin: 0 0 var(--space-4); color: var(--color-text); font-family: var(--font-display); }
    .modal p { margin: 0 0 var(--space-3); line-height: 1.5; color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .modal-stats { background: var(--color-surface-2); border: 1px solid var(--color-border); padding: var(--space-4); border-radius: var(--radius); margin: var(--space-4) 0; text-align: center; font-weight: 600; color: var(--color-text); font-size: var(--font-size-sm); }
    .modal-actions { display: flex; gap: var(--space-3); justify-content: flex-end; margin-top: var(--space-5); }

    /* Estados */
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
      .prova-header { flex-direction: column; }
      .instrucoes-card, .questoes-form, .navegacao { margin-left: var(--space-4); margin-right: var(--space-4); }
      .navegacao { flex-direction: column; gap: var(--space-4); }
      .progresso-bar { width: 100%; }
    }
  `]
})
export class AlunoProvaResponderComponent implements OnInit, OnDestroy {
  prova: Prova | null = null;
  provaId!: number;
  carregando = true;
  erro = '';
  enviando = false;
  showConfirmacao = false;
  tempoRestante = 0;
  timer: any;
  respostasForm!: FormGroup;
  respostas: Record<number, { opcao_id: number | null; texto: string | null }> = {};

  private readonly api = environment.apiUrl;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.provaId = Number(this.route.snapshot.paramMap.get('id'));
    this.respostasForm = this.fb.group({});
    this.carregarProva();
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  carregarProva(): void {
    this.carregando = true;
    this.erro = '';

    this.http.get<Prova>(`${environment.apiUrl}/provas/${this.provaId}`).subscribe({
      next: (prova) => {
        this.prova = prova;
        this.carregando = false;
        if (prova.data_fim) {
          const fim = new Date(prova.data_fim).getTime();
          this.tempoRestante = Math.max(0, Math.floor((fim - Date.now()) / 1000));
          this.iniciarContagem();
        }
      },
      error: (err) => {
        this.erro = err?.error?.detail || 'Erro ao carregar a prova.';
        this.carregando = false;
      },
    });
  }

  /**
   * Faz o cronômetro correr e envia a prova sozinho quando o tempo acaba.
   * Sem isto o `tempoRestante` seria calculado uma única vez no carregamento e
   * o chip do cabeçalho ficaria congelado até o aluno recarregar a página.
   */
  private iniciarContagem(): void {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      this.tempoRestante--;

      if (this.tempoRestante <= 0) {
        clearInterval(this.timer);
        this.timer = null;
        this.confirmarEnvio();
      }
    }, 1000);
  }

  updateResposta(questaoId: number, opcaoId: number | null, evento: any): void {
    const texto = evento ? (evento.target as HTMLTextAreaElement).value : null;
    this.respostas[questaoId] = { opcao_id: opcaoId, texto };
  }

  getTextoLength(questaoId: number): number {
    return this.respostas[questaoId]?.texto?.length ?? 0;
  }

  getRespostasCount(): number {
    if (!this.prova) return 0;
    return this.prova.questoes.filter(q => {
      const r = this.respostas[q.id];
      if (!r) return false;
      return r.opcao_id !== null || (r.texto !== null && r.texto.trim().length > 0);
    }).length;
  }

  getProgressoPercent(): number {
    if (!this.prova || this.prova.questoes.length === 0) return 0;
    return Math.round((this.getRespostasCount() / this.prova.questoes.length) * 100);
  }

  isFormValid(): boolean {
    return this.getRespostasCount() > 0;
  }

  getLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  formatTempo(segundos: number): string {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  submitProva(): void {
    this.showConfirmacao = true;
  }

  confirmarEnvio(): void {
    if (!this.prova) return;
    this.showConfirmacao = false;
    this.enviando = true;

    const respostas = this.prova.questoes.map(q => ({
      questao_id: q.id,
      opcao_id: this.respostas[q.id]?.opcao_id ?? null,
      texto: this.respostas[q.id]?.texto ?? null,
    }));

    this.http.post<any>(`${environment.apiUrl}/provas/${this.provaId}/responder`, { respostas }).subscribe({
      next: (resultado) => {
        this.enviando = false;
        if (this.timer) {
          clearInterval(this.timer);
        }

        // Redirecionar para página de resultado
        this.router.navigate(['/aluno/provas', this.provaId, 'resultado'], {
          state: { resultado }
        });
      },
      error: (error) => {
        console.error('Erro ao enviar prova:', error);
        this.erro = 'Erro ao enviar prova. Tente novamente.';
        this.enviando = false;
      }
    });
  }
}
