import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';

interface Aula {
  id: number;
  titulo: string;
  descricao: string | null;
  data_aula: string;
  duracao_minutos: number | null;
  ativo: boolean;
}

interface Prova {
  id: number;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string;
  tentativas_permitidas: number;
  total_questoes: number;
  ativo: boolean;
}

interface Curso {
  id: number;
  nome: string;
  descricao: string | null;
  percentual_presenca_minima: number;
  ativo: boolean;
  data_criacao: string;
  aulas: Aula[];
  provas: Prova[];
}

@Component({
  selector: 'app-aluno-cursos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2>📚 Meus Cursos</h2>
        <span class="badge-count" *ngIf="!carregando && cursos.length > 0">{{ cursos.length }} curso(s)</span>
        <a class="btn-catalogo" routerLink="/aluno/catalogo">🛒 Explorar Catálogo</a>
      </div>

      <!-- Loading -->
      <div class="loading" *ngIf="carregando">
        <div class="spinner"></div>
        <p>Carregando seus cursos...</p>
      </div>

      <!-- Erro -->
      <div class="error-card" *ngIf="erro && !carregando">
        <p>❌ {{ erro }}</p>
        <button class="btn-primary" (click)="carregarCursos()">Tentar novamente</button>
      </div>

      <!-- Sem cursos -->
      <div class="empty-state" *ngIf="!carregando && !erro && cursos.length === 0">
        <div class="empty-icon">📭</div>
        <h3>Nenhum curso encontrado</h3>
        <p>Você ainda não está inscrito em nenhum curso.</p>
      </div>

      <!-- Lista de cursos -->
      <div class="cursos-grid" *ngIf="!carregando && cursos.length > 0">
        <div class="curso-card" *ngFor="let curso of cursos">
          <!-- Cabeçalho do card -->
          <div class="curso-header">
            <div class="curso-info">
              <h3 class="curso-titulo">{{ curso.nome }}</h3>
              <span class="status-badge" [class.ativo]="curso.ativo" [class.inativo]="!curso.ativo">
                {{ curso.ativo ? '✓ Ativo' : '✗ Inativo' }}
              </span>
            </div>
            <button class="btn-toggle" (click)="toggleDetalhes(curso.id)">
              {{ expandido[curso.id] ? '▲ Ocultar detalhes' : '▼ Ver detalhes' }}
            </button>
          </div>

          <!-- Descrição sempre visível -->
          <p class="curso-descricao" *ngIf="curso.descricao">{{ curso.descricao }}</p>
          <p class="curso-descricao sem-descricao" *ngIf="!curso.descricao">Sem descrição disponível.</p>

          <!-- Estatísticas rápidas -->
          <div class="curso-stats">
            <span class="stat">📖 {{ curso.aulas.length }} aula(s)</span>
            <span class="stat">📝 {{ curso.provas.length }} prova(s)</span>
            <span class="stat">👥 {{ curso.percentual_presenca_minima }}% presença mínima</span>
          </div>

          <!-- Detalhes expandíveis -->
          <div class="curso-detalhes" *ngIf="expandido[curso.id]">

            <!-- Aulas -->
            <div class="secao" *ngIf="curso.aulas.length > 0">
              <h4>📖 Aulas</h4>
              <div class="item-lista" *ngFor="let aula of curso.aulas">
                <div class="item-header">
                  <span class="item-titulo">{{ aula.titulo }}</span>
                  <span class="item-data">{{ aula.data_aula | date:'dd/MM/yyyy' }}</span>
                </div>
                <p class="item-descricao" *ngIf="aula.descricao">{{ aula.descricao }}</p>
                <span class="item-meta" *ngIf="aula.duracao_minutos">⏱️ {{ aula.duracao_minutos }} min</span>
              </div>
            </div>

            <div class="secao secao-vazia" *ngIf="curso.aulas.length === 0">
              <h4>📖 Aulas</h4>
              <p class="vazio">Nenhuma aula cadastrada ainda.</p>
            </div>

            <!-- Provas -->
            <div class="secao" *ngIf="curso.provas.length > 0">
              <h4>📝 Provas</h4>
              <div class="item-lista prova-item" *ngFor="let prova of curso.provas">
                <div class="item-header">
                  <span class="item-titulo">{{ prova.titulo }}</span>
                  <span class="prova-status" [class.disponivel]="isProvaDisponivel(prova)" [class.encerrada]="isProvaEncerrada(prova)" [class.futura]="isProvaFutura(prova)">
                    {{ isProvaDisponivel(prova) ? '🟢 Disponível' : isProvaFutura(prova) ? '🕐 Em breve' : '🔴 Encerrada' }}
                  </span>
                </div>
                <p class="item-descricao" *ngIf="prova.descricao">{{ prova.descricao }}</p>
                <div class="prova-meta">
                  <span>🗓️ {{ prova.data_inicio | date:'dd/MM/yyyy HH:mm' }} → {{ prova.data_fim | date:'dd/MM/yyyy HH:mm' }}</span>
                  <span>❓ {{ prova.total_questoes }} questão(ões)</span>
                  <span>🔄 {{ prova.tentativas_permitidas }} tentativa(s)</span>
                </div>
                <a class="btn-fazer-prova" [routerLink]="['/aluno/provas', prova.id]" *ngIf="isProvaDisponivel(prova)">
                  Fazer Prova →
                </a>
              </div>
            </div>

            <div class="secao secao-vazia" *ngIf="curso.provas.length === 0">
              <h4>📝 Provas</h4>
              <p class="vazio">Nenhuma prova cadastrada ainda.</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .page-header h2 {
      margin: 0;
      color: #333;
    }

    .btn-catalogo {
      margin-left: auto;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      transition: opacity 0.2s;
    }

    .btn-catalogo:hover {
      opacity: 0.88;
    }

    .badge-count {
      background: #2c3e50;
      color: white;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
    }

    .loading {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }

    .spinner {
      display: inline-block;
      width: 36px;
      height: 36px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #2c3e50;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 12px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-card {
      background: #f8d7da;
      color: #721c24;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #f5c6cb;
    }

    .empty-state {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px;
      color: #555;
    }

    .cursos-grid {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .curso-card {
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
      padding: 24px;
      transition: box-shadow 0.2s;
    }

    .curso-card:hover {
      box-shadow: 0 4px 18px rgba(0,0,0,0.12);
    }

    .curso-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 10px;
    }

    .curso-info {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .curso-titulo {
      margin: 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .status-badge {
      font-size: 12px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 10px;
    }

    .status-badge.ativo {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.inativo {
      background: #f8d7da;
      color: #721c24;
    }

    .btn-toggle {
      background: #f0f4f8;
      border: 1px solid #dce3ea;
      color: #2c3e50;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      white-space: nowrap;
      transition: background 0.2s;
    }

    .btn-toggle:hover {
      background: #dce3ea;
    }

    .curso-descricao {
      color: #555;
      font-size: 14px;
      margin: 0 0 14px;
      line-height: 1.5;
    }

    .curso-descricao.sem-descricao {
      color: #aaa;
      font-style: italic;
    }

    .curso-stats {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 0;
    }

    .stat {
      font-size: 13px;
      color: #666;
      background: #f5f7fa;
      padding: 4px 10px;
      border-radius: 6px;
    }

    /* Detalhes expandíveis */
    .curso-detalhes {
      margin-top: 20px;
      border-top: 1px solid #eee;
      padding-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .secao h4 {
      margin: 0 0 12px;
      font-size: 15px;
      color: #2c3e50;
      border-left: 3px solid #2c3e50;
      padding-left: 10px;
    }

    .secao-vazia h4 {
      border-left-color: #ccc;
    }

    .vazio {
      font-size: 13px;
      color: #aaa;
      font-style: italic;
      margin: 0;
    }

    .item-lista {
      background: #f9fafb;
      border: 1px solid #eee;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 10px;
    }

    .item-lista:last-child {
      margin-bottom: 0;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }

    .item-titulo {
      font-weight: 600;
      font-size: 14px;
      color: #333;
    }

    .item-data {
      font-size: 12px;
      color: #888;
      white-space: nowrap;
    }

    .item-descricao {
      font-size: 13px;
      color: #666;
      margin: 4px 0 6px;
    }

    .item-meta {
      font-size: 12px;
      color: #888;
    }

    /* Prova */
    .prova-status {
      font-size: 12px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 10px;
      white-space: nowrap;
    }

    .prova-status.disponivel {
      background: #d4edda;
      color: #155724;
    }

    .prova-status.encerrada {
      background: #f8d7da;
      color: #721c24;
    }

    .prova-status.futura {
      background: #fff3cd;
      color: #856404;
    }

    .prova-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      color: #777;
      margin: 6px 0 10px;
    }

    .btn-fazer-prova {
      display: inline-block;
      background: #2c3e50;
      color: white;
      padding: 7px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.2s;
    }

    .btn-fazer-prova:hover {
      background: #1a252f;
    }

    .btn-primary {
      background: #2c3e50;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      margin-top: 10px;
    }

    @media (max-width: 600px) {
      .curso-header {
        flex-direction: column;
      }

      .prova-meta {
        flex-direction: column;
        gap: 4px;
      }
    }
  `]
})
export class AlunoCursosComponent implements OnInit {
  cursos: Curso[] = [];
  carregando = false;
  erro = '';
  expandido: Record<number, boolean> = {};

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.carregarCursos();
  }

  carregarCursos(): void {
    const usuario = this.authService.getCurrentUser();
    if (!usuario) {
      this.erro = 'Usuário não autenticado.';
      return;
    }

    this.carregando = true;
    this.erro = '';

    this.apiService.getCursosAluno(usuario.id).subscribe({
      next: (cursos) => {
        this.cursos = Array.isArray(cursos) ? cursos : [];
        this.carregando = false;
        this.erro = '';
      },
      error: (err: any) => {
        console.error('Erro ao carregar cursos:', err);
        this.erro = err?.error?.detail || 'Erro ao carregar seus cursos. Tente novamente.';
        this.carregando = false;
      }
    });
  }

  toggleDetalhes(cursoId: number): void {
    this.expandido[cursoId] = !this.expandido[cursoId];
  }

  isProvaDisponivel(prova: Prova): boolean {
    const agora = new Date();
    return new Date(prova.data_inicio) <= agora && new Date(prova.data_fim) >= agora && prova.ativo;
  }

  isProvaFutura(prova: Prova): boolean {
    return new Date(prova.data_inicio) > new Date();
  }

  isProvaEncerrada(prova: Prova): boolean {
    return new Date(prova.data_fim) < new Date();
  }
}
