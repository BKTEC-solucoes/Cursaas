import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface ResultadoProva {
  id: number;
  prova_id: number;
  usuario_id: number;
  nota_final: number;
  total_questoes: number;
  total_acertos: number;
  percentual_acerto: number;
  data_submissao: string;
  tentativa: number;
  prova_titulo: string;
  prova_curso_nome: string;
  respostas_detalhes?: any[];
}

@Component({
  selector: 'app-aluno-prova-resultado',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container" *ngIf="resultado">
      <!-- Cabeçalho do Resultado -->
      <div class="resultado-header" [class.aprovado]="resultado.nota_final >= 7" [class.reprovado]="resultado.nota_final < 7">
        <div class="resultado-info">
          <h1>{{ resultado.prova_titulo }}</h1>
          <p class="curso">📚 {{ resultado.prova_curso_nome }}</p>
          <p class="data">📅 Realizada em {{ formatDataHora(resultado.data_submissao) }}</p>
        </div>
        
        <div class="nota-final">
          <div class="nota-valor">{{ resultado.nota_final.toFixed(1) }}</div>
          <div class="nota-label">Nota Final</div>
          <div class="status-badge" [class.aprovado]="resultado.nota_final >= 7" [class.reprovado]="resultado.nota_final < 7">
            {{ resultado.nota_final >= 7 ? '✅ Aprovado' : '❌ Reprovado' }}
          </div>
        </div>
      </div>

      <!-- Estatísticas -->
      <div class="estatisticas">
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-value">{{ resultado.total_acertos }}/{{ resultado.total_questoes }}</div>
          <div class="stat-label">Questões Corretas</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-value">{{ resultado.percentual_acerto.toFixed(1) }}%</div>
          <div class="stat-label">Percentual de Acerto</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🔢</div>
          <div class="stat-value">{{ resultado.tentativa }}ª</div>
          <div class="stat-label">Tentativa</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⏱️</div>
          <div class="stat-value">{{ formatDataHora(resultado.data_submissao).split(' ')[1] }}</div>
          <div class="stat-label">Horário de Envio</div>
        </div>
      </div>

      <!-- Interpretação da Nota -->
      <div class="interpretacao">
        <h3>📋 Interpretação do Resultado</h3>
        <div class="interpretacao-content">
          <div class="performance" [ngClass]="getPerformanceClass()">
            <strong>{{ getPerformanceText() }}</strong>
          </div>
          <p>{{ getPerformanceDescription() }}</p>
          
          <div class="recomendacao" *ngIf="resultado.nota_final < 7">
            <h4>💡 Recomendações:</h4>
            <ul>
              <li>Revise o material do curso</li>
              <li>Assista novamente às aulas</li>
              <li>Pratique os exercícios</li>
              <li *ngIf="podeRefazer">Você pode tentar fazer a prova novamente</li>
            </ul>
          </div>

          <div class="parabenizacao" *ngIf="resultado.nota_final >= 7">
            <h4>🎉 Parabéns!</h4>
            <p>Você demonstrou bom domínio do conteúdo. Continue assim!</p>
          </div>
        </div>
      </div>

      <!-- Detalhamento das Respostas -->
      <div class="respostas-detalhadas" *ngIf="mostrarDetalhes">
        <h3>📝 Suas Respostas</h3>
        
        <div class="questao-resultado" *ngFor="let resposta of resultado.respostas_detalhes; let i = index">
          <div class="questao-header">
            <span class="questao-numero">Questão {{ i + 1 }}</span>
            <span class="questao-status" [class.correta]="resposta.correta" [class.incorreta]="!resposta.correta">
              {{ resposta.correta ? '✓ Correta' : '✗ Incorreta' }}
            </span>
          </div>
          
          <div class="questao-content">
            <div class="enunciado">
              <p><strong>{{ resposta.enunciado }}</strong></p>
            </div>
            
            <!-- Múltipla Escolha -->
            <div class="opcoes-resposta" *ngIf="resposta.tipo === 'multipla_escolha'">
              <div class="opcao" *ngFor="let opcao of resposta.opcoes; let j = index" 
                   [class.selecionada]="opcao.id === resposta.opcao_selecionada"
                   [class.correta]="opcao.correta"
                   [class.incorreta]="opcao.id === resposta.opcao_selecionada && !opcao.correta">
                <span class="opcao-letra">{{ getLetter(j) }}</span>
                <span class="opcao-texto">{{ opcao.texto }}</span>
                <span class="opcao-status" *ngIf="opcao.correta">✓</span>
                <span class="opcao-status incorreta" *ngIf="opcao.id === resposta.opcao_selecionada && !opcao.correta">✗</span>
              </div>
            </div>
            
            <!-- Dissertativa -->
            <div class="resposta-dissertativa" *ngIf="resposta.tipo === 'dissertativa'">
              <div class="sua-resposta">
                <h5>Sua resposta:</h5>
                <p>{{ resposta.texto_resposta || 'Não respondida' }}</p>
              </div>
              <div class="avaliacao-dissertativa">
                <p><em>Questões dissertativas são avaliadas manualmente pelo professor.</em></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Ações -->
      <div class="acoes-container">
        <button class="btn-primary" [routerLink]="['/aluno/provas']">📋 Ver Todas as Provas</button>
        
        <button class="btn-secondary" (click)="toggleDetalhes()" *ngIf="!mostrarDetalhes">
          👁️ Ver Respostas Detalhadas
        </button>
        
        <button class="btn-secondary" (click)="toggleDetalhes()" *ngIf="mostrarDetalhes">
          🙈 Ocultar Detalhes
        </button>
        
        <button class="btn-warning" [routerLink]="['/aluno/provas', resultado.prova_id, 'responder']" *ngIf="podeRefazer">
          🔄 Tentar Novamente
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div class="loading" *ngIf="carregando">
      <p>Carregando resultado...</p>
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

    /* Cabeçalho do Resultado */
    .resultado-header {
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: white;
      position: relative;
      overflow: hidden;
    }

    .resultado-header.aprovado {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    }

    .resultado-header.reprovado {
      background: linear-gradient(135deg, #dc3545 0%, #f86a2b 100%);
    }

    .resultado-header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      animation: float 6s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      50% { transform: translate(-20px, -20px) rotate(180deg); }
    }

    .resultado-info {
      z-index: 1;
    }

    .resultado-info h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      font-weight: 700;
    }

    .resultado-info p {
      margin: 5px 0;
      opacity: 0.9;
      font-size: 14px;
    }

    .nota-final {
      text-align: center;
      z-index: 1;
    }

    .nota-valor {
      font-size: 48px;
      font-weight: 900;
      line-height: 1;
      margin-bottom: 8px;
    }

    .nota-label {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 10px;
    }

    .status-badge {
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
    }

    .status-badge.aprovado {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .status-badge.reprovado {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    /* Estatísticas */
    .estatisticas {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transition: transform 0.3s;
    }

    .stat-card:hover {
      transform: translateY(-5px);
    }

    .stat-icon {
      font-size: 32px;
      margin-bottom: 10px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #333;
      margin-bottom: 5px;
    }

    .stat-label {
      color: #666;
      font-size: 14px;
    }

    /* Interpretação */
    .interpretacao {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }

    .interpretacao h3 {
      margin: 0 0 20px 0;
      color: #333;
    }

    .performance {
      font-size: 18px;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
      text-align: center;
    }

    .performance.excelente {
      background: #d4edda;
      color: #155724;
    }

    .performance.bom {
      background: #cce5ff;
      color: #004085;
    }

    .performance.regular {
      background: #fff3cd;
      color: #856404;
    }

    .performance.insuficiente {
      background: #f8d7da;
      color: #721c24;
    }

    .recomendacao, .parabenizacao {
      margin-top: 20px;
      padding: 20px;
      border-radius: 8px;
    }

    .recomendacao {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
    }

    .recomendacao h4 {
      margin: 0 0 10px 0;
      color: #721c24;
    }

    .recomendacao ul {
      margin: 0;
      padding-left: 20px;
    }

    .recomendacao li {
      margin-bottom: 5px;
      color: #721c24;
    }

    .parabenizacao {
      background: #d4edda;
      border: 1px solid #c3e6cb;
    }

    .parabenizacao h4 {
      margin: 0 0 10px 0;
      color: #155724;
    }

    .parabenizacao p {
      margin: 0;
      color: #155724;
    }

    /* Respostas Detalhadas */
    .respostas-detalhadas {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }

    .respostas-detalhadas h3 {
      margin: 0 0 25px 0;
      color: #333;
    }

    .questao-resultado {
      border: 2px solid #e9ecef;
      border-radius: 8px;
      margin-bottom: 20px;
      overflow: hidden;
    }

    .questao-header {
      background: #f8f9fa;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e9ecef;
    }

    .questao-numero {
      font-weight: 700;
      color: #333;
    }

    .questao-status {
      padding: 5px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .questao-status.correta {
      background: #d4edda;
      color: #155724;
    }

    .questao-status.incorreta {
      background: #f8d7da;
      color: #721c24;
    }

    .questao-content {
      padding: 20px;
    }

    .enunciado {
      margin-bottom: 15px;
    }

    .opcoes-resposta {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .opcao {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      position: relative;
    }

    .opcao.selecionada {
      background: #e3f2fd;
      border-color: #90caf9;
    }

    .opcao.correta {
      background: #d4edda;
      border-color: #c3e6cb;
    }

    .opcao.incorreta {
      background: #f8d7da;
      border-color: #f5c6cb;
    }

    .opcao-letra {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #6c757d;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
    }

    .opcao-texto {
      flex: 1;
    }

    .opcao-status {
      color: #28a745;
      font-weight: 700;
    }

    .opcao-status.incorreta {
      color: #dc3545;
    }

    .resposta-dissertativa {
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .sua-resposta h5 {
      margin: 0 0 10px 0;
      color: #333;
    }

    .sua-resposta p {
      margin: 0 0 15px 0;
      padding: 10px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      white-space: pre-wrap;
    }

    .avaliacao-dissertativa em {
      color: #666;
      font-size: 13px;
    }

    /* Ações */
    .acoes-container {
      display: flex;
      gap: 15px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn-primary, .btn-secondary, .btn-warning {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.3s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
    }

    .btn-warning {
      background: #ffc107;
      color: #333;
    }

    .btn-warning:hover {
      background: #e0a800;
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
      .resultado-header {
        flex-direction: column;
        gap: 20px;
        text-align: center;
      }

      .estatisticas {
        grid-template-columns: repeat(2, 1fr);
      }

      .acoes-container {
        flex-direction: column;
      }
    }
  `]
})
export class AlunoProvaResultadoComponent implements OnInit {
  provaId: number | null = null;
  resultado: ResultadoProva | null = null;
  
  carregando = false;
  erro = '';
  mostrarDetalhes = false;
  podeRefazer = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {
    // Verificar se resultado veio como state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state?.['resultado']) {
      this.resultado = navigation.extras.state['resultado'];
    }
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.provaId = +params['id'];
      
      if (!this.resultado) {
        this.carregarResultado();
      } else {
        this.carregarDetalhes();
      }
    });
  }

  carregarResultado(): void {
    if (!this.provaId) return;

    this.carregando = true;
    this.erro = '';

    // Buscar o resultado mais recente dessa prova para o aluno
    this.http.get<ResultadoProva>(`http://localhost:8000/api/provas/${this.provaId}/meu-resultado`).subscribe({
      next: (resultado) => {
        this.resultado = resultado;
        this.carregarDetalhes();
        this.carregando = false;
      },
      error: (error) => {
        console.error('Erro ao carregar resultado:', error);
        this.erro = 'Erro ao carregar resultado da prova.';
        this.carregando = false;
      }
    });
  }

  carregarDetalhes(): void {
    if (!this.resultado) return;

    // Carregear detalhes da prova para verificar se pode refazer
    this.http.get(`http://localhost:8000/api/provas/${this.provaId}`).subscribe({
      next: (prova: any) => {
        this.podeRefazer = this.resultado!.tentativa < prova.tentativas_permitidas;
      },
      error: (error) => {
        console.error('Erro ao carregar detalhes da prova:', error);
      }
    });
  }

  toggleDetalhes(): void {
    this.mostrarDetalhes = !this.mostrarDetalhes;
    
    if (this.mostrarDetalhes && !this.resultado?.respostas_detalhes) {
      // Carregar detalhes das respostas
      this.http.get(`http://localhost:8000/api/provas/${this.provaId}/minhas-respostas-detalhadas`).subscribe({
        next: (detalhes: any) => {
          if (this.resultado) {
            this.resultado.respostas_detalhes = detalhes;
          }
        },
        error: (error) => {
          console.error('Erro ao carregar detalhes das respostas:', error);
        }
      });
    }
  }

  getPerformanceClass(): string {
    if (!this.resultado) return '';
    
    const nota = this.resultado.nota_final;
    if (nota >= 9) return 'excelente';
    if (nota >= 7) return 'bom';
    if (nota >= 5) return 'regular';
    return 'insuficiente';
  }

  getPerformanceText(): string {
    if (!this.resultado) return '';
    
    const nota = this.resultado.nota_final;
    if (nota >= 9) return 'Excelente desempenho! 🌟';
    if (nota >= 7) return 'Bom desempenho! 👍';
    if (nota >= 5) return 'Desempenho regular 📊';
    return 'Desempenho insuficiente 📉';
  }

  getPerformanceDescription(): string {
    if (!this.resultado) return '';
    
    const percentual = this.resultado.percentual_acerto;
    if (percentual >= 90) return 'Você demonstrou excelente domínio do conteúdo!';
    if (percentual >= 70) return 'Você tem um bom conhecimento do assunto.';
    if (percentual >= 50) return 'Você possui conhecimento básico, mas pode melhorar.';
    return 'Recomendamos revisar o material antes de tentar novamente.';
  }

  getLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  formatDataHora(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' às ' + 
           date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
}