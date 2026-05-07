import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CursosService } from '../../../core/services/cursos.service';

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
  pago: boolean;
  valor: number | null;
  status: string;
  ativo: boolean;
  faculdade_id: number | null;
  percentual_presenca_minima: number;
  data_criacao: string;
  aulas: Aula[];
  provas: Prova[];
}

@Component({
  selector: 'app-aluno-cursos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="content-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Meus Cursos</h1>
          <p class="page-subtitle">Cursos em que você está inscrito</p>
        </div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:var(--space-3)">
          @if (!carregando && cursos.length > 0) {
            <span class="badge-count">{{ cursos.length }} curso(s)</span>
          }
          <a class="btn-catalogo" routerLink="/aluno/catalogo">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Explorar Catálogo
          </a>
        </div>
      </div>

      <!-- Loading -->
      @if (carregando) {
        <div class="loading">
          <div class="spinner"></div>
          <p>Carregando seus cursos...</p>
        </div>
      }

      <!-- Erro -->
      @if (erro && !carregando) {
        <div class="error-card">
          <p>{{ erro }}</p>
          <button class="btn-primary" (click)="carregarCursos()">Tentar novamente</button>
        </div>
      }

      <!-- Aguardando aprovação -->
      @if (!carregando && !erro && cursos.length === 0) {
        <div class="pending-state">
          <div class="pending-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h3>Cadastro em análise</h3>
          <p>Sua solicitação de acesso foi enviada e está aguardando aprovação do administrador.</p>
          <p>Após a aprovação, seus cursos aparecerão aqui automaticamente.</p>
          <a class="btn-catalogo-inline" routerLink="/aluno/catalogo">Explorar Catálogo</a>
        </div>
      }

      <!-- Lista de cursos -->
      @if (!carregando && cursos.length > 0) {
        <div class="cursos-grid">
        @for (curso of cursos; track curso.id) {
          <!-- Cabeçalho do card -->
          <div class="curso-header">
            <div class="curso-info">
              <h3 class="curso-titulo">{{ curso.nome }}</h3>
              <span class="status-badge" [class.ativo]="curso.ativo" [class.inativo]="!curso.ativo">
                {{ curso.ativo ? 'Ativo' : 'Inativo' }}
              </span>
            </div>
            <button class="btn-toggle" (click)="toggleDetalhes(curso.id)">
              {{ expandido[curso.id] ? 'Ocultar detalhes' : 'Ver detalhes' }}
            </button>
          </div>

          <!-- Descrição sempre visível -->
          @if (curso.descricao) {
            <p class="curso-descricao">{{ curso.descricao }}</p>
          } @else {
            <p class="curso-descricao sem-descricao">Sem descrição disponível.</p>
          }

          <!-- Estatísticas rápidas -->
          <div class="curso-stats">
            <span class="stat">{{ curso.aulas.length }} aula(s)</span>
            <span class="stat">{{ curso.provas.length }} prova(s)</span>
            <span class="stat">{{ curso.percentual_presenca_minima }}% presença mínima</span>
          </div>

          <!-- Preço do Curso -->
          @if (curso.pago) {
            <div class="curso-preco">
              <span class="preco-label">Valor:</span>
              <span class="preco-valor">{{ (curso.valor || 0) | currency:'BRL':'symbol':'1.2-2' }}</span>
            </div>
          } @else {
            <div class="curso-preco gratuito">
              <span class="preco-label">Acesso:</span>
              <span class="preco-valor">Gratuito</span>
            </div>
          }

          <!-- Detalhes expandíveis -->
          @if (expandido[curso.id]) {
            <div class="curso-detalhes">

              <!-- Aulas -->
              @if (curso.aulas.length > 0) {
                <div class="secao">
                  <h4>Aulas</h4>
                  @for (aula of curso.aulas; track aula.id) {
                    <div class="item-lista">
                      <div class="item-header">
                        <span class="item-titulo">{{ aula.titulo }}</span>
                        <span class="item-data">{{ aula.data_aula | date:'dd/MM/yyyy' }}</span>
                      </div>
                      @if (aula.descricao) { <p class="item-descricao">{{ aula.descricao }}</p> }
                      @if (aula.duracao_minutos) { <span class="item-meta">{{ aula.duracao_minutos }} min</span> }
                    </div>
                  }
                </div>
              } @else {
                <div class="secao secao-vazia">
                  <h4>Aulas</h4>
                  <p class="vazio">Nenhuma aula cadastrada ainda.</p>
                </div>
              }

              <!-- Provas -->
              @if (curso.provas.length > 0) {
                <div class="secao">
                  <h4>Provas</h4>
                  @for (prova of curso.provas; track prova.id) {
                    <div class="item-lista prova-item">
                      <div class="item-header">
                        <span class="item-titulo">{{ prova.titulo }}</span>
                        <span class="prova-status" [class.disponivel]="isProvaDisponivel(prova)" [class.encerrada]="isProvaEncerrada(prova)" [class.futura]="isProvaFutura(prova)">
                          {{ isProvaDisponivel(prova) ? 'Disponível' : isProvaFutura(prova) ? 'Em breve' : 'Encerrada' }}
                        </span>
                      </div>
                      @if (prova.descricao) { <p class="item-descricao">{{ prova.descricao }}</p> }
                      <div class="prova-meta">
                        <span>{{ prova.data_inicio | date:'dd/MM/yyyy HH:mm' }} — {{ prova.data_fim | date:'dd/MM/yyyy HH:mm' }}</span>
                        <span>{{ prova.total_questoes }} questão(ões)</span>
                        <span>{{ prova.tentativas_permitidas }} tentativa(s)</span>
                      </div>
                      @if (isProvaDisponivel(prova)) {
                        <a class="btn-fazer-prova" [routerLink]="['/aluno/provas', prova.id]">Fazer Prova</a>
                      }
                    </div>
                  }
                </div>
              }

              @if (curso.provas.length === 0) {
                <div class="secao secao-vazia">
                  <h4>Provas</h4>
                  <p class="vazio">Nenhuma prova cadastrada ainda.</p>
                </div>
              }

            </div>
          }
        }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .btn-catalogo {
      display: inline-flex; align-items: center; gap: var(--space-2);
      background: var(--primary); color: #fff;
      padding: var(--space-2) var(--space-4); border-radius: var(--radius);
      font-size: var(--font-size-sm); font-weight: 700; text-decoration: none;
      transition: background var(--transition-fast);
    }
    .btn-catalogo:hover { background: var(--secondary); }

    .badge-count {
      background: var(--color-surface-2); color: var(--color-text-muted);
      border: 1px solid var(--color-border);
      padding: 3px 10px; border-radius: var(--radius-full);
      font-size: var(--font-size-xs); font-weight: 600;
    }

    .loading { text-align: center; padding: 60px var(--space-4); color: var(--color-text-muted); }
    .spinner { display: inline-block; width: 36px; height: 36px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: var(--space-3); }
    @keyframes spin { to { transform: rotate(360deg); } }

    .error-card {
      background: color-mix(in srgb, var(--color-danger) 10%, transparent);
      color: var(--color-danger); padding: var(--space-5);
      border-radius: var(--radius-lg); text-align: center;
      border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
    }
    .btn-primary {
      background: var(--primary); color: #fff; border: none;
      padding: var(--space-2) var(--space-5); border-radius: var(--radius);
      cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; margin-top: var(--space-3);
    }

    .cursos-grid { display: flex; flex-direction: column; gap: var(--space-4); }

    .curso-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: var(--space-6);
      box-shadow: var(--shadow-sm);
      transition: box-shadow var(--transition-fast), transform var(--transition-fast);
    }
    .curso-card:hover { box-shadow: var(--shadow); transform: translateY(-1px); }

    .curso-header { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-3); }
    .curso-info   { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
    .curso-titulo { margin: 0; font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); }

    .status-badge { font-size: var(--font-size-xs); font-weight: 600; padding: 2px 8px; border-radius: var(--radius-full); }
    .status-badge.ativo   { background: color-mix(in srgb, var(--color-success) 14%, transparent); color: var(--color-success); }
    .status-badge.inativo { background: color-mix(in srgb, var(--color-danger) 14%, transparent);  color: var(--color-danger); }

    .btn-toggle {
      background: var(--color-surface-2); border: 1px solid var(--color-border);
      color: var(--color-text-muted); padding: var(--space-1) var(--space-3);
      border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-xs);
      white-space: nowrap; transition: background var(--transition-fast);
    }
    .btn-toggle:hover { background: var(--color-border); color: var(--color-text); }

    .curso-descricao { color: var(--color-text-muted); font-size: var(--font-size-sm); margin: 0 0 var(--space-3); line-height: 1.5; }
    .sem-descricao   { font-style: italic; }

    .curso-stats { display: flex; gap: var(--space-2); flex-wrap: wrap; }
    .stat {
      font-size: var(--font-size-xs); color: var(--color-text-muted);
      background: var(--color-surface-2); padding: 3px 10px; border-radius: var(--radius);
      border: 1px solid var(--color-border);
    }

    .curso-preco {
      display: flex; align-items: center; gap: var(--space-2);
      font-size: var(--font-size-sm); padding: var(--space-3) var(--space-4);
      border-radius: var(--radius); margin: var(--space-3) 0;
      border-left: 4px solid var(--primary);
      background: color-mix(in srgb, var(--primary) 6%, var(--color-surface));
    }
    .curso-preco.gratuito {
      border-left-color: var(--color-success);
      background: color-mix(in srgb, var(--color-success) 6%, var(--color-surface));
    }
    .preco-label { font-weight: 600; color: var(--color-text-muted); min-width: 60px; }
    .preco-valor { font-weight: 700; color: var(--color-text); }
    .curso-preco.gratuito .preco-valor { color: var(--color-success); }

    .curso-detalhes {
      margin-top: var(--space-5); border-top: 1px solid var(--color-border);
      padding-top: var(--space-5); display: flex; flex-direction: column; gap: var(--space-5);
    }
    .secao h4 {
      margin: 0 0 var(--space-3); font-size: var(--font-size-sm); font-weight: 700;
      color: var(--color-text); border-left: 3px solid var(--primary); padding-left: var(--space-3);
    }
    .secao-vazia h4 { border-left-color: var(--color-border); }
    .vazio { font-size: var(--font-size-xs); color: var(--color-text-muted); font-style: italic; margin: 0; }

    .item-lista {
      background: var(--color-surface-2); border: 1px solid var(--color-border);
      border-radius: var(--radius); padding: var(--space-3) var(--space-4); margin-bottom: var(--space-2);
    }
    .item-lista:last-child { margin-bottom: 0; }
    .item-header { display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); margin-bottom: 4px; }
    .item-titulo { font-weight: 600; font-size: var(--font-size-sm); color: var(--color-text); }
    .item-data   { font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap; }
    .item-descricao { font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 4px 0 6px; }
    .item-meta  { font-size: var(--font-size-xs); color: var(--color-text-muted); }

    .prova-status { font-size: var(--font-size-xs); font-weight: 600; padding: 2px 8px; border-radius: var(--radius-full); white-space: nowrap; }
    .prova-status.disponivel { background: color-mix(in srgb, var(--color-success) 14%, transparent); color: var(--color-success); }
    .prova-status.encerrada  { background: color-mix(in srgb, var(--color-danger) 14%, transparent);  color: var(--color-danger); }
    .prova-status.futura     { background: color-mix(in srgb, var(--color-warning) 14%, transparent); color: var(--color-warning); }

    .prova-meta { display: flex; flex-wrap: wrap; gap: var(--space-3); font-size: var(--font-size-xs); color: var(--color-text-muted); margin: var(--space-2) 0; }

    .btn-fazer-prova {
      display: inline-block; background: var(--primary); color: #fff;
      padding: var(--space-1) var(--space-4); border-radius: var(--radius);
      font-size: var(--font-size-xs); font-weight: 700; text-decoration: none;
      transition: background var(--transition-fast);
    }
    .btn-fazer-prova:hover { background: var(--secondary); }

    .pending-state {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); box-shadow: var(--shadow);
      padding: 48px var(--space-8); text-align: center;
    }
    .pending-icon { font-size: 52px; margin-bottom: var(--space-4); }
    .pending-state h3 { font-family: var(--font-display); font-size: var(--font-size-xl); color: var(--color-text); margin: 0 0 var(--space-3); }
    .pending-state p  { color: var(--color-text-muted); font-size: var(--font-size-sm); margin: 0 0 var(--space-2); max-width: 480px; margin-left: auto; margin-right: auto; }
    .btn-catalogo-inline {
      display: inline-flex; align-items: center; gap: var(--space-2);
      margin-top: var(--space-5); background: var(--primary); color: #fff;
      padding: var(--space-3) var(--space-6); border-radius: var(--radius);
      font-size: var(--font-size-sm); font-weight: 700; text-decoration: none;
      transition: background var(--transition-fast);
    }
    .btn-catalogo-inline:hover { background: var(--secondary); }

    @media (max-width: 600px) {
      .curso-header { flex-direction: column; }
      .prova-meta   { flex-direction: column; gap: var(--space-1); }
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

    .curso-preco {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #2c3e50;
      background: linear-gradient(135deg, #f5f3ff 0%, #faf7ff 100%);
      padding: 10px 14px;
      border-radius: 8px;
      margin-top: 12px;
      margin-bottom: 12px;
      border-left: 4px solid #6366F1;
    }

    .curso-preco.gratuito {
      background: linear-gradient(135deg, #f0fdf4 0%, #f7fee7 100%);
      border-left-color: #10b981;
    }

    .preco-label {
      font-weight: 600;
      color: #666;
      min-width: 70px;
    }

    .preco-valor {
      font-weight: 700;
      color: #2c3e50;
    }

    .curso-preco.gratuito .preco-valor {
      color: #10b981;
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

    .pending-state {
      background: white;
      border-radius: 14px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
      padding: 48px 32px;
      text-align: center;
    }

    .pending-icon {
      font-size: 56px;
      margin-bottom: 16px;
    }

    .pending-state h3 {
      font-size: 22px;
      color: #2c3e50;
      margin: 0 0 12px;
    }

    .pending-state p {
      color: #555;
      font-size: 15px;
      margin: 0 0 8px;
      max-width: 480px;
      margin-left: auto;
      margin-right: auto;
    }

    .pending-sub {
      font-size: 13px !important;
      color: #888 !important;
    }

    .btn-catalogo-inline {
      display: inline-block;
      margin-top: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 10px 22px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      transition: opacity 0.2s;
    }

    .btn-catalogo-inline:hover {
      opacity: 0.88;
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

  constructor(private cursosService: CursosService) {}

  ngOnInit(): void {
    this.carregarCursos();
  }

  carregarCursos(): void {
    this.carregando = true;
    this.erro = '';

    // O backend filtra automaticamente pelo faculdade_id do JWT.
    // Nenhum ID de usuário ou faculdade é passado manualmente.
    this.cursosService.getCursos().subscribe({
      next: (cursos) => {
        this.cursos = cursos.map((curso) => ({
          ...curso,
          descricao: curso.descricao ?? null,
          aulas: [],
          provas: [],
        })) as Curso[];
        this.carregando = false;
      },
      error: (err: any) => {
        this.erro = err?.error?.detail || 'Erro ao carregar seus cursos. Tente novamente.';
        this.carregando = false;
      },
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
