import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../../shared/services/api.service';

interface ResultadoProva {
  id: number;
  prova_id: number;
  usuario_id: number;
  nota_final: number | null;
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
    <div class="page-container" *ngIf="resultado; else noResult">
      <!-- Cabeçalho do Resultado -->
      <div class="resultado-header" [class.aprovado]="resultado.nota_final != null && resultado.nota_final >= 7" [class.reprovado]="resultado.nota_final != null && resultado.nota_final < 7" [class.pendente]="resultado.nota_final == null">
        <div class="resultado-info">
          <h1>{{ resultado.prova_titulo || 'Resultado da Prova' }}</h1>
          <p class="curso">📚 {{ resultado.prova_curso_nome || 'Curso' }}</p>
          <p class="data" *ngIf="resultado.data_submissao">📅 Realizada em {{ formatDataHora(resultado.data_submissao) }}</p>
        </div>
        
        <div class="nota-final">
          <div class="nota-valor" *ngIf="resultado.nota_final != null">{{ formatarNumero(resultado.nota_final, 1) }}</div>
          <div class="nota-valor pendente" *ngIf="resultado.nota_final == null">—</div>
          <div class="nota-label">Nota Final</div>
          <div class="status-badge pendente" *ngIf="resultado.nota_final == null">⏳ Aguardando correção</div>
          <div class="status-badge" [class.aprovado]="toNumber(resultado.nota_final) >= 7" [class.reprovado]="toNumber(resultado.nota_final) < 7" *ngIf="resultado.nota_final != null">
            {{ toNumber(resultado.nota_final) >= 7 ? '✅ Aprovado' : '❌ Reprovado' }}
          </div>
        </div>
      </div>

      <!-- Estatísticas -->
      <div class="estatisticas" *ngIf="resultado">
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-value">{{ resultado.total_acertos }}/{{ resultado.total_questoes }}</div>
          <div class="stat-label">Questões Corretas</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-value">{{ formatarNumero(resultado.percentual_acerto, 2) }}%</div>
          <div class="stat-label">Percentual de Acerto</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🔢</div>
          <div class="stat-value">{{ getTentativa() }} de {{ getTentativasPermitidas() }}</div>
          <div class="stat-label">Tentativa</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⏱️</div>
          <div class="stat-value">{{ resultado.data_submissao ? (resultado.data_submissao | date:'HH:mm:ss') : '00:00:00' }}</div>
          <div class="stat-label">Horário de Envio</div>
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
        <button type="button" class="btn-primary" (click)="irParaProvas()">📋 Ver Todas as Provas</button>
        
        <button type="button" class="btn-secondary" (click)="toggleDetalhes()" *ngIf="!mostrarDetalhes">
          👁️ Ver Respostas Detalhadas
        </button>
        
        <button type="button" class="btn-secondary" (click)="toggleDetalhes()" *ngIf="mostrarDetalhes">
          🙈 Ocultar Detalhes
        </button>
        
        <button type="button" class="btn-warning" (click)="tentarNovamente()" *ngIf="podeRefazer">
          🔄 Tentar Novamente
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div class="loading" *ngIf="carregando">
      <p>⏳ Carregando resultado da prova...</p>
    </div>

    <!-- Error -->
    <div class="error-message" *ngIf="erro">
      <p>❌ {{ erro }}</p>
      <button type="button" class="btn-primary" (click)="irParaProvas()">Voltar para Provas</button>
    </div>

    <!-- Template para sem dados -->
    <ng-template #noResult>
      <!-- Sem dados -->
      <div class="error-message" *ngIf="!carregando && !erro && !resultado">
        <p>❌ Nenhum resultado encontrado para esta prova.</p>
        <button type="button" class="btn-primary" (click)="irParaProvas()">Voltar para Provas</button>
      </div>
    </ng-template>
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

    .resultado-header.pendente {
      background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
    }

    .nota-valor.pendente {
      font-size: 36px;
      opacity: 0.7;
    }

    .status-badge.pendente {
      background: rgba(255, 255, 255, 0.2);
      color: white;
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
    /* Resumo Detalhado dos Resultados */
    .resumo-resultados {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }

    .resumo-resultados h3 {
      margin: 0 0 25px 0;
      color: #333;
      font-size: 20px;
    }

    .resumo-content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .resumo-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }

    .resumo-label {
      font-weight: 600;
      color: #333;
      font-size: 15px;
    }

    .resumo-valor {
      font-size: 16px;
      font-weight: 700;
      color: #667eea;
    }

    .resumo-valor.excelente {
      color: #28a745;
    }

    .resumo-valor.bom {
      color: #007bff;
    }

    .resumo-valor.regular {
      color: #ffc107;
    }

    .resumo-valor.insuficiente {
      color: #dc3545;
    }

    .resumo-valor.nota-final-grande {
      font-size: 24px;
      padding: 10px 15px;
      border-radius: 8px;
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
    }

    .resumo-valor.nota-final-grande.aprovado {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    }

    .resumo-valor.nota-final-grande.reprovado {
      background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
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
  tentativasPermitidas = 1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private api: ApiService
  ) {
    // Verificar se resultado veio como state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state?.['resultado']) {
      this.resultado = navigation.extras.state['resultado'];
      console.log('[INIT] Resultado obtido do state:', this.resultado);
    }
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.provaId = +params['id'];
      console.log('🔍 ngOnInit - ProvaId:', this.provaId);
      console.log('🔍 ngOnInit - Resultado já existe?', !!this.resultado);
      
      // Sempre carregar do backend para garantir dados completos (tentativa, etc)
      // mesmo se resultado veio do state
      console.log('📥 Carregando resultado do backend para garantir dados completos...');
      this.carregarResultado();
    });
  }

  carregarResultado(): void {
    if (!this.provaId) {
      console.error('❌ ProvaId é inválido:', this.provaId);
      return;
    }

    this.carregando = true;
    this.erro = '';

    console.log('🌐 Chamando API.getMeuResultado(' + this.provaId + ')');
    
    // Buscar o resultado mais recente dessa prova para o aluno
    this.api.getMeuResultado(this.provaId).subscribe({
      next: (resultado) => {
        console.log('✅ Resultado recebido do backend:', resultado);
        console.log('   - total_acertos:', resultado?.total_acertos, 'tipo:', typeof resultado?.total_acertos);
        console.log('   - total_questoes:', resultado?.total_questoes, 'tipo:', typeof resultado?.total_questoes);
        console.log('   - percentual_acerto:', resultado?.percentual_acerto, 'tipo:', typeof resultado?.percentual_acerto);
        console.log('   - tentativa:', resultado?.tentativa, 'tipo:', typeof resultado?.tentativa);
        console.log('   - nota_final:', resultado?.nota_final, 'tipo:', typeof resultado?.nota_final);
        console.log('   - data_submissao:', resultado?.data_submissao);
        
        // Validar dados retornados
        if (!resultado) {
          this.erro = 'Resultado vazio retornado do servidor';
          this.carregando = false;
          return;
        }

        // Garantir que números estão corretos - converter explicitamente para Number
        resultado.total_acertos = Number(resultado.total_acertos) || 0;
        resultado.total_questoes = Number(resultado.total_questoes) || 0;
        resultado.percentual_acerto = Number(resultado.percentual_acerto) || 0;
        
        // Tentativa: garantir que é pelo menos 1
        const tentativa = Number(resultado.tentativa);
        resultado.tentativa = tentativa > 0 ? tentativa : 1;
        
        resultado.nota_final = resultado.nota_final != null ? Number(resultado.nota_final) : null;
        
        console.log('✅ Valores convertidos para Number:');
        console.log('   - total_acertos:', resultado.total_acertos, typeof resultado.total_acertos);
        console.log('   - total_questoes:', resultado.total_questoes, typeof resultado.total_questoes);
        console.log('   - percentual_acerto:', resultado.percentual_acerto, typeof resultado.percentual_acerto);
        console.log('   - tentativa:', resultado.tentativa, 'tipo:', typeof resultado.tentativa, 'valor raw:', tentativa);
        console.log('   - nota_final:', resultado.nota_final, typeof resultado.nota_final);
        
        this.resultado = resultado as ResultadoProva;
        this.carregarDetalhes();
        this.carregando = false;
      },
      error: (error) => {
        console.error('❌ Erro ao carregar resultado:', error);
        console.error('   - Status:', error?.status);
        console.error('   - Message:', error?.message);
        this.erro = 'Erro ao carregar resultado da prova: ' + (error?.message || 'Desconhecido');
        this.carregando = false;
      }
    });
  }

  carregarDetalhes(): void {
    if (!this.provaId || !this.resultado) return;

    console.log('📋 Carregando detalhes da prova ' + this.provaId);
    
    // Carregar detalhes da prova para verificar se pode refazer
    this.api.getProva(this.provaId).subscribe({
      next: (prova: any) => {
        console.log('✅ Detalhes da prova recebidos:', prova);
        console.log('   - tentativas_permitidas:', prova.tentativas_permitidas);
        
        this.tentativasPermitidas = prova.tentativas_permitidas || 1;
        this.podeRefazer = this.resultado!.tentativa < this.tentativasPermitidas;
        
        console.log('✅ Tentativas carregadas:', this.tentativasPermitidas);
        console.log('   - Tentativa atual:', this.resultado!.tentativa);
        console.log('   - Pode refazer:', this.podeRefazer);
      },
      error: (error) => {
        console.error('❌ Erro ao carregar detalhes da prova:', error);
        // Usar valor padrão se houver erro
        this.tentativasPermitidas = 1;
      }
    });
  }

  toggleDetalhes(): void {
    this.mostrarDetalhes = !this.mostrarDetalhes;
    
    if (this.mostrarDetalhes && !this.resultado?.respostas_detalhes && this.provaId) {
      // Carregar detalhes das respostas
      this.api.getMinhasRespostasDetalhadas(this.provaId).subscribe({
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
    if (nota == null) return 'pendente';
    if (nota >= 9) return 'excelente';
    if (nota >= 7) return 'bom';
    if (nota >= 5) return 'regular';
    return 'insuficiente';
  }

  getPerformanceText(): string {
    if (!this.resultado) return '';
    const nota = this.resultado.nota_final;
    if (nota == null) return 'Aguardando correção do professor ⏳';
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

  irParaProvas(): void {
    this.router.navigate(['/aluno/provas']);
  }

  tentarNovamente(): void {
    if (this.resultado) {
      this.router.navigate(['/aluno/provas', this.resultado.prova_id, 'responder']);
    }
  }

  formatarNumero(valor: any, casasDecimais: number = 2): string {
    try {
      const num = Number(valor);
      if (isNaN(num)) return '0';
      return num.toFixed(casasDecimais);
    } catch (error) {
      console.error('Erro ao formatar número:', valor, error);
      return '0';
    }
  }

  toNumber(valor: any): number {
    try {
      const num = Number(valor);
      return isNaN(num) ? 0 : num;
    } catch {
      return 0;
    }
  }

  getTentativa(): number {
    if (!this.resultado) {
      console.warn('⚠️ getTentativa: resultado é null');
      return 1;
    }
    
    const tentativa = Number(this.resultado.tentativa);
    console.log('📊 getTentativa: tentativa=', this.resultado.tentativa, 'convertido=', tentativa, 'final=', isNaN(tentativa) || tentativa <= 0 ? 1 : tentativa);
    
    return isNaN(tentativa) || tentativa <= 0 ? 1 : tentativa;
  }

  getTentativasPermitidas(): number {
    console.log('📊 getTentativasPermitidas:', this.tentativasPermitidas);
    return this.tentativasPermitidas > 0 ? this.tentativasPermitidas : 1;
  }

  formatDataHora(dateString: string | null): string {
    if (!dateString) return 'Não disponível';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      return date.toLocaleDateString('pt-BR') + ' às ' + 
             date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Erro ao formatar data';
    }
  }
}