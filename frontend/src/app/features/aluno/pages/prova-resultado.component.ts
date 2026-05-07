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
    @if (carregando) {
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Carregando resultado...</p>
      </div>
    }

    @if (erro) {
      <div class="error-card">
        <p>{{ erro }}</p>
        <button class="btn-primary" (click)="irParaProvas()">Voltar para Provas</button>
      </div>
    }

    @if (!carregando && !erro && !resultado) {
      <div class="empty-state">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h3 class="empty-title">Nenhum resultado encontrado</h3>
        <p>Não encontramos resultado para esta prova.</p>
        <button class="btn-primary" (click)="irParaProvas()">Voltar para Provas</button>
      </div>
    }

    @if (resultado) {
      <div class="content-page resultado-page">
        <div class="resultado-header" [class.aprovado]="resultado.nota_final != null && resultado.nota_final >= 7" [class.reprovado]="resultado.nota_final != null && resultado.nota_final < 7" [class.pendente]="resultado.nota_final == null">
          <div class="resultado-info">
            <h1 class="page-title" style="color:#fff">{{ resultado.prova_titulo || 'Resultado da Prova' }}</h1>
            <p class="res-sub">{{ resultado.prova_curso_nome || 'Curso' }}</p>
            @if (resultado.data_submissao) {
              <p class="res-sub">Realizada em {{ formatDataHora(resultado.data_submissao) }}</p>
            }
          </div>
          <div class="nota-final">
            @if (resultado.nota_final != null) {
              <div class="nota-valor">{{ formatarNumero(resultado.nota_final, 1) }}</div>
            } @else {
              <div class="nota-valor" style="opacity:.7">&mdash;</div>
            }
            <div class="nota-label">Nota Final</div>
            @if (resultado.nota_final == null) {
              <span class="status-chip">Aguardando correção</span>
            } @else if (toNumber(resultado.nota_final) >= 7) {
              <span class="status-chip aprovado">Aprovado</span>
            } @else {
              <span class="status-chip reprovado">Reprovado</span>
            }
          </div>
        </div>

        <div class="stat-grid" style="padding: var(--space-5) var(--space-7)">
          <div class="stat-card">
            <div class="stat-value">{{ resultado.total_acertos }}/{{ resultado.total_questoes }}</div>
            <div class="stat-label">Questões Corretas</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ formatarNumero(resultado.percentual_acerto, 2) }}%</div>
            <div class="stat-label">Percentual de Acerto</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ getTentativa() }} / {{ getTentativasPermitidas() }}</div>
            <div class="stat-label">Tentativa</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ resultado.data_submissao ? (resultado.data_submissao | date:'HH:mm') : '--' }}</div>
            <div class="stat-label">Horário de Envio</div>
          </div>
        </div>

        @if (mostrarDetalhes && resultado.respostas_detalhes) {
          <div class="respostas-section">
            <h3 class="section-title">Suas Respostas</h3>
            @for (resposta of resultado.respostas_detalhes; track $index; let i = $index) {
              <div class="questao-resultado">
                <div class="questao-header">
                  <span class="questao-num">Questão {{ i + 1 }}</span>
                  <span class="questao-status"
                    [class.correta]="resposta.correta"
                    [class.incorreta]="!resposta.correta && resposta.tipo !== 'dissertativa'"
                    [class.pendente]="resposta.tipo === 'dissertativa' && !resposta.correta">
                    {{ resposta.correta ? 'Correta' : (resposta.tipo === 'dissertativa' ? 'Aguardando correção' : 'Incorreta') }}
                  </span>
                </div>
                <div class="questao-content">
                  <p class="enunciado"><strong>{{ resposta.enunciado }}</strong></p>

                  @if (resposta.tipo === 'multipla_escolha') {
                    <div class="opcoes-resposta">
                      @for (opcao of resposta.opcoes; track opcao.id; let j = $index) {
                        <div class="opcao"
                          [class.selecionada]="opcao.id === resposta.opcao_selecionada"
                          [class.correta]="opcao.correta"
                          [class.incorreta]="opcao.id === resposta.opcao_selecionada && !opcao.correta">
                          <span class="opcao-letra">{{ getLetter(j) }}</span>
                          <span class="opcao-texto">{{ opcao.texto }}</span>
                          @if (opcao.correta) { <span class="mark-ok">&#x2713;</span> }
                          @if (opcao.id === resposta.opcao_selecionada && !opcao.correta) { <span class="mark-err">&#x2717;</span> }
                        </div>
                      }
                    </div>
                  }

                  @if (resposta.tipo === 'dissertativa') {
                    <div class="resposta-dissertativa">
                      <h5>Sua resposta:</h5>
                      <p>{{ resposta.texto_resposta || 'Não respondida' }}</p>
                      <em>Questões dissertativas são avaliadas manualmente pelo professor.</em>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }

        <div class="acoes-container">
          <button class="btn-primary" (click)="irParaProvas()">Ver Todas as Provas</button>
          @if (!mostrarDetalhes) {
            <button class="btn-outline" (click)="toggleDetalhes()">Ver Respostas Detalhadas</button>
          } @else {
            <button class="btn-outline" (click)="toggleDetalhes()">Ocultar Detalhes</button>
          }
          @if (podeRefazer) {
            <button class="btn-warning" (click)="tentarNovamente()">Tentar Novamente</button>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .resultado-page { padding: 0; max-width: unset; }

    .resultado-header {
      padding: var(--space-8) var(--space-7); display: flex;
      justify-content: space-between; align-items: center;
      gap: var(--space-5); flex-wrap: wrap; color: #fff;
    }
    .resultado-header.aprovado { background: var(--color-success); }
    .resultado-header.reprovado { background: var(--color-danger); }
    .resultado-header.pendente { background: var(--sidebar-bg); }

    .res-sub { margin: var(--space-1) 0; opacity: .9; font-size: var(--font-size-sm); }

    .nota-final { text-align: center; }
    .nota-valor { font-size: 52px; font-weight: 900; line-height: 1; margin-bottom: var(--space-2); font-family: var(--font-display); }
    .nota-label { font-size: var(--font-size-sm); opacity: .9; margin-bottom: var(--space-3); }
    .status-chip { padding: var(--space-1) var(--space-4); border-radius: var(--radius-full); font-weight: 700; font-size: var(--font-size-sm); background: rgba(255,255,255,.2); }
    .status-chip.aprovado { background: rgba(255,255,255,.25); }
    .status-chip.reprovado { background: rgba(255,255,255,.2); }

    /* Respostas */
    .respostas-section { padding: 0 var(--space-7) var(--space-5); }
    .section-title { font-family: var(--font-display); color: var(--color-text); margin: 0 0 var(--space-5); }
    .questao-resultado { border: 2px solid var(--color-border); border-radius: var(--radius-lg); margin-bottom: var(--space-5); overflow: hidden; }
    .questao-header { background: var(--color-surface-2); padding: var(--space-3) var(--space-5); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); }
    .questao-num { font-weight: 700; color: var(--color-text); font-size: var(--font-size-sm); }
    .questao-status { padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 600; }
    .questao-status.correta { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
    .questao-status.incorreta { background: color-mix(in srgb, var(--color-danger) 15%, transparent); color: var(--color-danger); }
    .questao-status.pendente { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); }

    .questao-content { padding: var(--space-5); }
    .enunciado { margin-bottom: var(--space-4); color: var(--color-text); font-size: var(--font-size-sm); line-height: 1.6; }

    .opcoes-resposta { display: flex; flex-direction: column; gap: var(--space-2); }
    .opcao { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius); }
    .opcao.selecionada { background: color-mix(in srgb, var(--primary) 8%, transparent); border-color: color-mix(in srgb, var(--primary) 40%, transparent); }
    .opcao.correta { background: color-mix(in srgb, var(--color-success) 8%, transparent); border-color: color-mix(in srgb, var(--color-success) 40%, transparent); }
    .opcao.incorreta { background: color-mix(in srgb, var(--color-danger) 8%, transparent); border-color: color-mix(in srgb, var(--color-danger) 40%, transparent); }
    .opcao-letra { width: 24px; height: 24px; border-radius: 50%; background: var(--color-surface-2); border: 1px solid var(--color-border); color: var(--color-text-muted); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-xs); font-weight: 700; flex-shrink: 0; }
    .opcao-texto { flex: 1; font-size: var(--font-size-sm); color: var(--color-text); line-height: 1.4; }
    .mark-ok { color: var(--color-success); font-weight: 700; }
    .mark-err { color: var(--color-danger); font-weight: 700; }

    .resposta-dissertativa { background: var(--color-surface-2); border: 1px solid var(--color-border); border-radius: var(--radius); padding: var(--space-4); }
    .resposta-dissertativa h5 { margin: 0 0 var(--space-2); color: var(--color-text); font-size: var(--font-size-sm); }
    .resposta-dissertativa p { margin: 0 0 var(--space-3); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: var(--space-3); white-space: pre-wrap; font-size: var(--font-size-sm); color: var(--color-text); }
    .resposta-dissertativa em { color: var(--color-text-muted); font-size: var(--font-size-xs); }

    /* Ações */
    .acoes-container { display: flex; gap: var(--space-3); justify-content: center; flex-wrap: wrap; padding: var(--space-6) var(--space-7) var(--space-8); }
    .btn-primary { background: var(--primary); color: #fff; border: none; padding: var(--space-3) var(--space-6); border-radius: var(--radius); font-weight: 700; font-size: var(--font-size-sm); cursor: pointer; transition: background var(--transition-fast); }
    .btn-primary:hover { background: var(--secondary); }
    .btn-outline { background: var(--color-surface-2); border: 1px solid var(--color-border); color: var(--color-text-muted); padding: var(--space-3) var(--space-5); border-radius: var(--radius); font-size: var(--font-size-sm); cursor: pointer; font-weight: 600; transition: background var(--transition-fast); }
    .btn-outline:hover { background: var(--color-border); color: var(--color-text); }
    .btn-warning { background: var(--color-warning); color: #fff; border: none; padding: var(--space-3) var(--space-5); border-radius: var(--radius); font-size: var(--font-size-sm); font-weight: 700; cursor: pointer; transition: background var(--transition-fast); }
    .btn-warning:hover { filter: brightness(.92); }

    /* States */
    .loading-state { text-align: center; padding: 60px var(--space-5); color: var(--color-text-muted); }
    .spinner { display: inline-block; width: 36px; height: 36px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: var(--space-3); }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-card { background: color-mix(in srgb, var(--color-danger) 10%, transparent); color: var(--color-danger); padding: var(--space-8); border-radius: var(--radius-lg); text-align: center; border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); max-width: 600px; margin: var(--space-8) auto; }
    .empty-state { text-align: center; padding: 60px var(--space-5); max-width: 480px; margin: 0 auto; }
    .empty-icon { width: 80px; height: 80px; border-radius: 50%; background: var(--color-surface-2); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4); color: var(--color-text-muted); }
    .empty-title { font-family: var(--font-display); color: var(--color-text); margin: 0 0 var(--space-2); }

    @media (max-width: 768px) {
      .resultado-header { flex-direction: column; text-align: center; }
      .respostas-section { padding: 0 var(--space-4) var(--space-5); }
      .acoes-container { flex-direction: column; padding: var(--space-5) var(--space-4); }
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