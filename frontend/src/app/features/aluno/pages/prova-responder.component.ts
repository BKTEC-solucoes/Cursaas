import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

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
    <div class="page-container" *ngIf="prova">
      <!-- Cabeçalho da Prova -->
      <div class="prova-header">
        <div class="prova-info">
          <h1>{{ prova.titulo }}</h1>
          <div class="prova-detalhes">
            <span class="curso">📚 {{ prova.curso_nome }}</span>
            <span class="questoes">❓ {{ prova.questoes.length || 0 }} questões</span>
            <span class="tempo" *ngIf="tempoRestante > 0" [class.urgente]="tempoRestante < 300">
              ⏰ {{ formatTempo(tempoRestante) }}
            </span>
          </div>
        </div>
        <div class="prova-actions">
          <button class="btn-secondary" [routerLink]="['/aluno/provas']">← Voltar</button>
          <button class="btn-primary" (click)="submitProva()" [disabled]="enviando || !isFormValid()">
            {{ enviando ? 'Enviando...' : 'Finalizar Prova' }}
          </button>
        </div>
      </div>

      <!-- Descrição -->
      <div class="prova-descricao" *ngIf="prova.descricao">
        <p>{{ prova.descricao }}</p>
      </div>

      <!-- Instruções -->
      <div class="instrucoes">
        <h3>📋 Instruções</h3>
        <ul>
          <li>Leia atentamente cada questão antes de responder</li>
          <li>Para questões de múltipla escolha, selecione apenas uma alternativa</li>
          <li>Para questões dissertativas, escreva sua resposta no campo de texto</li>
          <li>Você pode revisar e alterar suas respostas antes de finalizar</li>
          <li>Clique em "Finalizar Prova" quando terminar</li>
        </ul>
      </div>

      <!-- Formulário de Respostas -->
      <form [formGroup]="respostasForm" class="questoes-form">
        <div class="questao-card" *ngFor="let questao of prova.questoes; let i = index" [id]="'questao-' + questao.id">
          <div class="questao-header">
            <span class="questao-numero">Questão {{ i + 1 }}</span>
            <span class="questao-tipo" [class.multipla]="questao.tipo === 'multipla_escolha'" [class.dissertativa]="questao.tipo === 'dissertativa'">
              {{ questao.tipo === 'multipla_escolha' ? 'Múltipla Escolha' : 'Dissertativa' }}
            </span>
          </div>

          <div class="questao-conteudo">
            <div class="enunciado">
              <p>{{ questao.enunciado }}</p>
            </div>

            <!-- Questão Múltipla Escolha -->
            <div class="opcoes-container" *ngIf="questao.tipo === 'multipla_escolha'">
              <div class="opcao-item" *ngFor="let opcao of questao.opcoes; let j = index">
                <label class="opcao-label">
                  <input 
                    type="radio" 
                    [name]="'questao_' + questao.id"
                    [value]="opcao.id"
                    (change)="updateResposta(questao.id, opcao.id, null)">
                  <span class="opcao-letra">{{ getLetter(j) }}</span>
                  <span class="opcao-texto">{{ opcao.texto }}</span>
                </label>
              </div>
            </div>

            <!-- Questão Dissertativa -->
            <div class="dissertativa-container" *ngIf="questao.tipo === 'dissertativa'">
              <textarea 
                class="dissertativa-input"
                [placeholder]="'Digite sua resposta para a questão ' + (i + 1)"
                rows="6"
                (input)="updateResposta(questao.id, null, $event)"
                maxlength="2000"></textarea>
              <div class="char-counter">
                {{ getTextoLength(questao.id) }}/2000 caracteres
              </div>
            </div>
          </div>
        </div>
      </form>

      <!-- Navegação -->
      <div class="navegacao">
        <div class="progresso">
          <span>{{ getRespostasCount() }}/{{ prova.questoes.length || 0 }} questões respondidas</span>
          <div class="progresso-bar">
            <div class="progresso-fill" [style.width.%]="getProgressoPercent()"></div>
          </div>
        </div>

        <div class="nav-actions">
          <button class="btn-secondary" (click)="scrollToTop()">↑ Início</button>
          <button class="btn-primary" (click)="submitProva()" [disabled]="enviando || !isFormValid()">
            {{ enviando ? 'Enviando...' : 'Finalizar Prova' }}
          </button>
        </div>
      </div>

      <!-- Confirmação de Envio -->
      <div class="modal-overlay" *ngIf="showConfirmacao" (click)="showConfirmacao = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>⚠️ Confirmar envio da prova</h3>
          <p>Tem certeza que deseja finalizar e enviar esta prova?</p>
          <p><strong>Atenção:</strong> Após o envio, você não poderá mais alterar suas respostas.</p>
          
          <div class="modal-stats">
            <p>{{ getRespostasCount() }} de {{ prova.questoes.length || 0 }} questões respondidas</p>
          </div>

          <div class="modal-actions">
            <button class="btn-secondary" (click)="showConfirmacao = false">Cancelar</button>
            <button class="btn-primary" (click)="confirmarEnvio()">Sim, finalizar prova</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div class="loading" *ngIf="carregando">
      <p>Carregando prova...</p>
    </div>

    <!-- Error -->
    <div class="error-message" *ngIf="erro">
      <p>{{ erro }}</p>
      <button class="btn-primary" [routerLink]="['/aluno/provas']">Voltar para Provas</button>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }

    /* Cabeçalho */
    .prova-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .prova-info h1 {
      margin: 0 0 15px 0;
      font-size: 28px;
    }

    .prova-detalhes {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .prova-detalhes span {
      background: rgba(255, 255, 255, 0.2);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    }

    .tempo.urgente {
      background: rgba(220, 53, 69, 0.9);
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }

    .prova-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .btn-primary, .btn-secondary {
      padding: 12px 20px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.3s;
    }

    .btn-primary {
      background: rgba(255, 255, 255, 0.9);
      color: #667eea;
    }

    .btn-primary:hover:not(:disabled) {
      background: white;
      transform: translateY(-2px);
    }

    .btn-primary:disabled {
      background: rgba(255, 255, 255, 0.5);
      cursor: not-allowed;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    /* Descrição e Instruções */
    .prova-descricao, .instrucoes {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }

    .instrucoes h3 {
      margin: 0 0 15px 0;
      color: #333;
    }

    .instrucoes ul {
      margin: 0;
      padding-left: 20px;
    }

    .instrucoes li {
      margin-bottom: 8px;
      line-height: 1.5;
      color: #555;
    }

    /* Questões */
    .questoes-form {
      display: flex;
      flex-direction: column;
      gap: 25px;
    }

    .questao-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      overflow: hidden;
      border: 2px solid transparent;
      transition: all 0.3s;
    }

    .questao-card:hover {
      border-color: #667eea;
    }

    .questao-header {
      background: #f8f9fa;
      padding: 15px 20px;
      border-bottom: 1px solid #dee2e6;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .questao-numero {
      font-weight: 700;
      color: #333;
      font-size: 16px;
    }

    .questao-tipo {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .questao-tipo.multipla {
      background: #e3f2fd;
      color: #1976d2;
    }

    .questao-tipo.dissertativa {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .questao-conteudo {
      padding: 25px;
    }

    .enunciado p {
      font-size: 16px;
      line-height: 1.6;
      color: #333;
      margin: 0 0 20px 0;
      font-weight: 500;
    }

    /* Opções Múltipla Escolha */
    .opcoes-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .opcao-item {
      transition: all 0.2s;
    }

    .opcao-label {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 15px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .opcao-label:hover {
      border-color: #667eea;
      background: #f8f9ff;
    }

    .opcao-label input[type="radio"] {
      display: none;
    }

    .opcao-label input[type="radio"]:checked + .opcao-letra {
      background: #667eea;
      color: white;
    }

    .opcao-letra {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e9ecef;
      color: #495057;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
      transition: all 0.3s;
    }

    .opcao-texto {
      flex: 1;
      font-size: 15px;
      line-height: 1.4;
      color: #333;
    }

    /* Questões Dissertativas */
    .dissertativa-container {
      position: relative;
    }

    .dissertativa-input {
      width: 100%;
      padding: 15px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-family: inherit;
      font-size: 15px;
      line-height: 1.5;
      resize: vertical;
      min-height: 120px;
      transition: all 0.3s;
    }

    .dissertativa-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .char-counter {
      text-align: right;
      font-size: 12px;
      color: #999;
      margin-top: 5px;
    }

    /* Navegação */
    .navegacao {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .progresso span {
      display: block;
      margin-bottom: 8px;
      color: #666;
      font-weight: 600;
    }

    .progresso-bar {
      width: 200px;
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
    }

    .progresso-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 4px;
      transition: width 0.3s;
    }

    .nav-actions {
      display: flex;
      gap: 10px;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 450px;
      width: 90%;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }

    .modal h3 {
      margin: 0 0 15px 0;
      color: #333;
    }

    .modal p {
      margin: 0 0 10px 0;
      line-height: 1.5;
      color: #666;
    }

    .modal-stats {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
      text-align: center;
    }

    .modal-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 20px;
    }

    /* Estados */
    .loading {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }

    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 30px;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #f5c6cb;
    }

    @media (max-width: 768px) {
      .prova-header {
        flex-direction: column;
        gap: 20px;
        text-align: center;
      }

      .prova-detalhes {
        justify-content: center;
      }

      .navegacao {
        flex-direction: column;
        gap: 15px;
      }

      .progresso-bar {
        width: 100%;
      }

      .opcao-label {
        padding: 12px;
      }

      .opcao-letra {
        width: 28px;
        height: 28px;
        font-size: 12px;
      }
    }
  `]
})
export class AlunoProvaResponderComponent implements OnInit {
  provaId: number | null = null;
  prova: Prova | null = null;
  respostasForm: FormGroup;
  respostas: any = {};
  
  carregando = false;
  enviando = false;
  erro = '';
  showConfirmacao = false;

  // Timer
  tempoRestante = 0;
  timer: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private fb: FormBuilder
  ) {
    this.respostasForm = this.fb.group({
      respostas: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.provaId = +params['id'];
      this.carregarProva();
    });
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  carregarProva(): void {
    if (!this.provaId) return;

    this.carregando = true;
    this.erro = '';

    this.http.get<Prova>(`http://localhost:8000/api/provas/${this.provaId}`).subscribe({
      next: (prova) => {
        this.prova = prova;
        this.verificarDisponibilidade();
        this.iniciarTimer();
        this.carregando = false;
      },
      error: (error) => {
        console.error('Erro ao carregar prova:', error);
        this.erro = 'Erro ao carregar prova. Verifique se ela ainda está disponível.';
        this.carregando = false;
      }
    });
  }

  verificarDisponibilidade(): void {
    if (!this.prova) return;

    const agora = new Date();
    const dataInicio = new Date(this.prova.data_inicio);
    const dataFim = new Date(this.prova.data_fim);

    if (agora < dataInicio) {
      this.erro = 'Esta prova ainda não está disponível.';
      return;
    }

    if (agora > dataFim) {
      this.erro = 'O prazo para realizar esta prova já expirou.';
      return;
    }
  }

  iniciarTimer(): void {
    if (!this.prova) return;

    const dataFim = new Date(this.prova.data_fim);
    const agora = new Date();
    
    this.tempoRestante = Math.floor((dataFim.getTime() - agora.getTime()) / 1000);

    this.timer = setInterval(() => {
      this.tempoRestante--;
      
      if (this.tempoRestante <= 0) {
        clearInterval(this.timer);
        this.submitProva();
      }
    }, 1000);
  }

  updateResposta(questaoId: number, opcaoId: number | null, event: any): void {
    if (opcaoId) {
      this.respostas[questaoId] = { opcao_id: opcaoId, texto_resposta: null };
    } else if (event) {
      const texto = event.target.value;
      this.respostas[questaoId] = { opcao_id: null, texto_resposta: texto };
    }
  }

  getLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  getTextoLength(questaoId: number): number {
    return this.respostas[questaoId]?.texto_resposta?.length || 0;
  }

  getRespostasCount(): number {
    return Object.keys(this.respostas).filter(key => {
      const resposta = this.respostas[key];
      return resposta && (resposta.opcao_id || resposta.texto_resposta?.trim());
    }).length;
  }

  getProgressoPercent(): number {
    if (!this.prova?.questoes?.length) return 0;
    return (this.getRespostasCount() / this.prova.questoes.length) * 100;
  }

  isFormValid(): boolean {
    return this.getRespostasCount() === (this.prova?.questoes?.length || 0);
  }

  formatTempo(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  submitProva(): void {
    if (this.enviando) return;
    this.showConfirmacao = true;
  }

  confirmarEnvio(): void {
    if (!this.prova || this.enviando) return;

    this.enviando = true;
    this.showConfirmacao = false;

    // Converter respostas para o formato da API
    const respostasArray = Object.keys(this.respostas).map(questaoId => ({
      questao_id: +questaoId,
      opcao_id: this.respostas[questaoId].opcao_id,
      texto_resposta: this.respostas[questaoId].texto_resposta
    }));

    const payload = {
      respostas: respostasArray
    };

    this.http.post(`http://localhost:8000/api/provas/${this.provaId}/responder`, payload).subscribe({
      next: (resultado: any) => {
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