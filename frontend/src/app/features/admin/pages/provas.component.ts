import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface Prova {
  id: number;
  titulo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  curso_id: number;
  curso_nome: string;
  ativo: boolean;
  total_questoes?: number;
  tentativas_permitidas: number;
  data_criacao: string;
}

interface ProvaComDetalhes extends Prova {
  status: 'ativa' | 'expirada' | 'futura' | 'inativa';
  statusLabel: string;
  statusClass: string;
}

@Component({
  selector: 'app-admin-provas',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2>📝 Gestão de Provas</h2>
        <button class="btn-primary" [routerLink]="['/admin/provas/nova']">+ Nova Prova</button>
      </div>

      <!-- Filtros -->
      <div class="filters-container">
        <select [(ngModel)]="filtroStatus" (ngModelChange)="aplicarFiltros()">
          <option value="">Todos os status</option>
          <option value="ativa">Ativas</option>
          <option value="expirada">Expiradas</option>
          <option value="futura">Futuras</option>
          <option value="inativa">Inativas</option>
        </select>

        <select [(ngModel)]="filtroCurso" (ngModelChange)="aplicarFiltros()">
          <option value="">Todos os cursos</option>
          <option *ngFor="let curso of cursos" [value]="curso.id">{{ curso.nome }}</option>
        </select>

        <input 
          type="text" 
          [(ngModel)]="termoPesquisa"
          (ngModelChange)="aplicarFiltros()"
          placeholder="Pesquisar por título...">
      </div>

      <!-- Lista de Provas -->
      <div class="provas-grid" *ngIf="provasFiltradas.length > 0">
        <div class="prova-card" *ngFor="let prova of provasFiltradas">
          <div class="card-header">
            <h3>{{ prova.titulo }}</h3>
            <span class="status-badge" [ngClass]="prova.statusClass">{{ prova.statusLabel }}</span>
          </div>

          <div class="card-content">
            <div class="prova-info">
              <div class="info-item">
                <strong>Curso:</strong> {{ prova.curso_nome || 'N/A' }}
              </div>
              <div class="info-item">
                <strong>Período:</strong> 
                {{ formatDateTime(prova.data_inicio) }} - {{ formatDateTime(prova.data_fim) }}
              </div>
              <div class="info-item">
                <strong>Questões:</strong> {{ prova.total_questoes || 0 }}
              </div>
              <div class="info-item">
                <strong>Tentativas:</strong> {{ prova.tentativas_permitidas }}
              </div>
            </div>

            <div class="prova-description" *ngIf="prova.descricao">
              <p>{{ prova.descricao }}</p>
            </div>
          </div>

          <div class="card-actions">
            <button class="btn-edit" [routerLink]="['/admin/provas', prova.id, 'editar']">✏️ Editar</button>
            <button class="btn-results" [routerLink]="['/admin/provas', prova.id, 'resultados']">📊 Resultados</button>
            <button class="btn-delete" (click)="deletarProva(prova)" [disabled]="prova.status === 'ativa'">
              🗑️ Deletar
            </button>
          </div>
        </div>
      </div>

      <!-- Estado Vazio -->
      <div class="empty-state" *ngIf="provasFiltradas.length === 0 && !carregando">
        <div class="empty-icon">📝</div>
        <h3>{{ provas.length === 0 ? 'Nenhuma prova criada' : 'Nenhuma prova encontrada' }}</h3>
        <p *ngIf="provas.length === 0">Crie sua primeira prova para começar a avaliar seus alunos.</p>
        <p *ngIf="provas.length > 0">Tente ajustar os filtros ou o termo de pesquisa.</p>
        <button class="btn-primary" [routerLink]="['/admin/provas/nova']" *ngIf="provas.length === 0">
          Criar Primeira Prova
        </button>
      </div>

      <!-- Loading -->
      <div class="loading" *ngIf="carregando">
        <p>Carregando provas...</p>
      </div>

      <!-- Error -->
      <div class="error-message" *ngIf="erro">
        <p>{{ erro }}</p>
        <button class="btn-primary" (click)="carregarProvas()">Tentar Novamente</button>
      </div>

      <!-- Message Toast -->
      <div class="toast" *ngIf="mensagem" [ngClass]="tipoMensagem">
        {{ mensagem }}
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
      font-size: 28px;
    }

    .btn-primary {
      background: #f39c12;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      transition: background 0.3s;
    }

    .btn-primary:hover {
      background: #e67e22;
    }

    /* Filtros */
    .filters-container {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 30px;
      display: flex;
      gap: 15px;
      align-items: center;
    }

    .filters-container select,
    .filters-container input {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      min-width: 180px;
    }

    .filters-container input[type="text"] {
      flex: 1;
      max-width: 300px;
    }

    /* Grid de Provas */
    .provas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 25px;
    }

    .prova-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      overflow: hidden;
      transition: transform 0.3s, box-shadow 0.3s;
    }

    .prova-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.15);
    }

    .card-header {
      background: #f8f9fa;
      padding: 20px;
      border-bottom: 1px solid #dee2e6;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-header h3 {
      margin: 0;
      color: #2c3e50;
      font-size: 18px;
      flex: 1;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-badge.ativa {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.expirada {
      background: #f8d7da;
      color: #721c24;
    }

    .status-badge.futura {
      background: #cce5ff;
      color: #004085;
    }

    .status-badge.inativa {
      background: #f1f3f4;
      color: #5f6368;
    }

    .card-content {
      padding: 20px;
    }

    .prova-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 15px;
    }

    .info-item {
      font-size: 14px;
      color: #555;
    }

    .info-item strong {
      color: #333;
      margin-right: 5px;
    }

    .prova-description {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #eee;
    }

    .prova-description p {
      margin: 0;
      color: #666;
      font-style: italic;
      line-height: 1.4;
    }

    .card-actions {
      padding: 15px 20px;
      background: #f8f9fa;
      border-top: 1px solid #dee2e6;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .card-actions button {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.3s;
    }

    .btn-edit {
      background: #007bff;
      color: white;
    }

    .btn-edit:hover {
      background: #0056b3;
    }

    .btn-results {
      background: #28a745;
      color: white;
    }

    .btn-results:hover {
      background: #1e7e34;
    }

    .btn-delete {
      background: #dc3545;
      color: white;
    }

    .btn-delete:hover:not(:disabled) {
      background: #bd2130;
    }

    .btn-delete:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    /* Estados */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
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
      margin-bottom: 20px;
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

    /* Toast */
    .toast {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 600;
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    }

    .toast.success {
      background: #28a745;
    }

    .toast.error {
      background: #dc3545;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @media (max-width: 768px) {
      .provas-grid {
        grid-template-columns: 1fr;
      }

      .filters-container {
        flex-direction: column;
        align-items: stretch;
      }

      .filters-container select,
      .filters-container input {
        min-width: auto;
        width: 100%;
      }

      .card-actions {
        justify-content: center;
      }

      .page-header {
        flex-direction: column;
        gap: 15px;
      }
    }
  `]
})
export class AdminProvasComponent implements OnInit {
  provas: Prova[] = [];
  provasFiltradas: ProvaComDetalhes[] = [];
  cursos: any[] = [];
  
  carregando = false;
  erro = '';
  mensagem = '';
  tipoMensagem = '';

  // Filtros
  filtroStatus = '';
  filtroCurso = '';
  termoPesquisa = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarProvas();
    this.carregarCursos();
  }

  carregarProvas(): void {
    this.carregando = true;
    this.erro = '';
    
    this.http.get<Prova[]>('http://localhost:8000/api/provas/').subscribe({
      next: (provas) => {
        this.provas = provas || [];
        this.aplicarFiltros();
        this.carregando = false;
      },
      error: (error) => {
        console.error('Erro ao carregar provas:', error);
        this.erro = 'Erro ao carregar provas. Verifique sua conexão.';
        this.carregando = false;
      }
    });
  }

  carregarCursos(): void {
    this.http.get<any[]>('http://localhost:8000/api/cursos/').subscribe({
      next: (cursos) => {
        this.cursos = cursos || [];
      },
      error: (error) => {
        console.error('Erro ao carregar cursos:', error);
      }
    });
  }

  aplicarFiltros(): void {
    let provasFiltradas = this.provas.map(prova => this.adicionarStatusDetalhado(prova));

    if (this.filtroStatus) {
      provasFiltradas = provasFiltradas.filter(prova => prova.status === this.filtroStatus);
    }

    if (this.filtroCurso) {
      provasFiltradas = provasFiltradas.filter(prova => prova.curso_id === +this.filtroCurso);
    }

    if (this.termoPesquisa) {
      const termo = this.termoPesquisa.toLowerCase();
      provasFiltradas = provasFiltradas.filter(prova => 
        prova.titulo.toLowerCase().includes(termo) ||
        (prova.curso_nome && prova.curso_nome.toLowerCase().includes(termo))
      );
    }

    this.provasFiltradas = provasFiltradas;
  }

  adicionarStatusDetalhado(prova: Prova): ProvaComDetalhes {
    const agora = new Date();
    const dataInicio = new Date(prova.data_inicio);
    const dataFim = new Date(prova.data_fim);

    let status: 'ativa' | 'expirada' | 'futura' | 'inativa';
    let statusLabel: string;
    let statusClass: string;

    if (!prova.ativo) {
      status = 'inativa';
      statusLabel = 'Inativa';
      statusClass = 'inativa';
    } else if (agora < dataInicio) {
      status = 'futura';
      statusLabel = 'Futura';
      statusClass = 'futura';
    } else if (agora > dataFim) {
      status = 'expirada';
      statusLabel = 'Expirada';
      statusClass = 'expirada';
    } else {
      status = 'ativa';
      statusLabel = 'Ativa';
      statusClass = 'ativa';
    }

    return {
      ...prova,
      status,
      statusLabel,
      statusClass
    };
  }

  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' às ' + 
           date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  deletarProva(prova: ProvaComDetalhes): void {
    if (prova.status === 'ativa') {
      this.mostrarMensagem('Não é possível deletar uma prova ativa', 'error');
      return;
    }

    if (!confirm(`Tem certeza que deseja deletar a prova "${prova.titulo}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    this.http.delete(`http://localhost:8000/api/provas/${prova.id}`).subscribe({
      next: () => {
        this.mostrarMensagem('Prova deletada com sucesso!', 'success');
        this.carregarProvas();
      },
      error: (error) => {
        console.error('Erro ao deletar prova:', error);
        this.mostrarMensagem('Erro ao deletar prova', 'error');
      }
    });
  }

  mostrarMensagem(texto: string, tipo: 'success' | 'error'): void {
    this.mensagem = texto;
    this.tipoMensagem = tipo;
    
    setTimeout(() => {
      this.mensagem = '';
      this.tipoMensagem = '';
    }, 3000);
  }
}
