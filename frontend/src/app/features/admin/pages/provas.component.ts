import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

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
    <div class="content-page">
      <div class="page-topbar">
        <h1>Gestão de Provas</h1>
        <button class="btn-primary" [routerLink]="['/admin/provas/nova']">+ Nova Prova</button>
      </div>

      <div class="filter-bar">
        <select class="filter-select" [(ngModel)]="filtroStatus" (ngModelChange)="aplicarFiltros()">
          <option value="">Todos os status</option>
          <option value="ativa">Ativas</option>
          <option value="expirada">Expiradas</option>
          <option value="futura">Futuras</option>
          <option value="inativa">Inativas</option>
        </select>
        <select class="filter-select" [(ngModel)]="filtroCurso" (ngModelChange)="aplicarFiltros()">
          <option value="">Todos os cursos</option>
          @for (curso of cursos; track curso.id) {
            <option [value]="curso.id">{{ curso.nome }}</option>
          }
        </select>
        <input class="filter-input" type="text" [(ngModel)]="termoPesquisa" (ngModelChange)="aplicarFiltros()" placeholder="Pesquisar por título..." />
      </div>

      @if (carregando) {
        <div class="loading-state"><div class="spinner"></div><p>Carregando provas...</p></div>
      }

      @if (erro) {
        <div class="msg msg--error">{{ erro }} <button (click)="carregarProvas()">Tentar novamente</button></div>
      }

      @if (!carregando && provasFiltradas.length > 0) {
        <div class="provas-grid">
          @for (prova of provasFiltradas; track prova.id) {
            <div class="prova-card">
              <div class="card-head">
                <h3>{{ prova.titulo }}</h3>
                <span class="badge" [ngClass]="'badge--' + (prova.statusClass === 'ativa' ? 'success' : prova.statusClass === 'expirada' ? 'danger' : prova.statusClass === 'futura' ? 'info' : 'muted')">{{ prova.statusLabel }}</span>
              </div>
              <div class="card-body">
                <div class="info-list">
                  <div class="info-item"><span class="info-label">Curso</span><span>{{ prova.curso_nome || 'N/A' }}</span></div>
                  <div class="info-item"><span class="info-label">Período</span><span>{{ formatDateTime(prova.data_inicio) }} - {{ formatDateTime(prova.data_fim) }}</span></div>
                  <div class="info-item"><span class="info-label">Questões</span><span>{{ prova.total_questoes || 0 }}</span></div>
                  <div class="info-item"><span class="info-label">Tentativas</span><span>{{ prova.tentativas_permitidas }}</span></div>
                </div>
                @if (prova.descricao) {
                  <p class="prova-desc">{{ prova.descricao }}</p>
                }
              </div>
              <div class="card-actions">
                <button class="btn-action btn-action--edit" [routerLink]="['/admin/provas', prova.id, 'editar']">Editar</button>
                <button class="btn-action btn-action--view" [routerLink]="['/admin/provas', prova.id, 'resultados']">Resultados</button>
                <button class="btn-action btn-action--del" (click)="deletarProva(prova)" [disabled]="prova.status === 'ativa'">Deletar</button>
              </div>
            </div>
          }
        </div>
      }

      @if (!carregando && provasFiltradas.length === 0 && !erro) {
        <div class="empty-state">
          <svg width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <h3>{{ provas.length === 0 ? 'Nenhuma prova criada' : 'Nenhuma prova encontrada' }}</h3>
          <p>{{ provas.length === 0 ? 'Crie sua primeira prova para avaliar os alunos.' : 'Tente ajustar os filtros.' }}</p>
          @if (provas.length === 0) {
            <button class="btn-primary" [routerLink]="['/admin/provas/nova']">Criar Primeira Prova</button>
          }
        </div>
      }
    </div>

    @if (mensagem) {
      <div class="toast" [class]="'toast--' + tipoMensagem">{{ mensagem }}</div>
    }
  `,
  styles: [`
    :host { display: block; }

    .page-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 16px; }
    .page-topbar h1 { margin: 0; font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text); font-family: var(--font-display); }

    .btn-primary { background: var(--primary); color: #fff; border: none; padding: 10px 18px; border-radius: var(--radius); cursor: pointer; font-weight: 600; font-size: var(--font-size-sm); white-space: nowrap; transition: opacity 0.15s; }
    .btn-primary:hover { opacity: 0.88; }

    .filter-bar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .filter-input { flex: 1; min-width: 180px; padding: 9px 12px; border: 1.5px solid var(--color-border); border-radius: var(--radius); font-size: var(--font-size-sm); background: var(--color-surface-2); color: var(--color-text); outline: none; }
    .filter-input:focus { border-color: var(--primary); background: var(--color-surface); }
    .filter-select { min-width: 160px; padding: 9px 12px; border: 1.5px solid var(--color-border); border-radius: var(--radius); font-size: var(--font-size-sm); background: var(--color-surface-2); color: var(--color-text); cursor: pointer; }

    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 24px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); color: var(--color-text-muted); font-size: var(--font-size-sm); text-align: center; }
    .empty-state h3 { margin: 0; font-size: var(--font-size-lg); color: var(--color-text); }
    .empty-state p { margin: 0; color: var(--color-text-muted); }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .msg { padding: 12px 16px; border-radius: var(--radius); font-size: var(--font-size-sm); margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
    .msg--error { background: color-mix(in srgb, var(--color-danger) 8%, transparent); color: var(--color-danger); border: 1px solid color-mix(in srgb, var(--color-danger) 20%, transparent); }
    .msg--error button { background: none; border: none; color: var(--color-danger); cursor: pointer; font-weight: 600; text-decoration: underline; }

    /* Provas grid */
    .provas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; }

    .prova-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm); transition: box-shadow 0.2s, transform 0.2s; }
    .prova-card:hover { box-shadow: var(--shadow); transform: translateY(-2px); }

    .card-head { padding: 18px 20px; background: var(--color-surface-2); border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .card-head h3 { margin: 0; font-size: var(--font-size-base); font-weight: 700; color: var(--color-text); flex: 1; }

    .badge { display: inline-flex; padding: 3px 10px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
    .badge--success { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
    .badge--danger  { background: color-mix(in srgb, var(--color-danger) 15%, transparent);  color: var(--color-danger); }
    .badge--info    { background: color-mix(in srgb, var(--color-info) 15%, transparent);    color: var(--color-info); }
    .badge--muted   { background: var(--color-surface-2); color: var(--color-text-muted); border: 1px solid var(--color-border); }

    .card-body { padding: 16px 20px; }
    .info-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
    .info-item { display: flex; gap: 8px; font-size: var(--font-size-sm); color: var(--color-text); }
    .info-label { font-weight: 600; color: var(--color-text-muted); min-width: 80px; flex-shrink: 0; }
    .prova-desc { margin: 10px 0 0; font-size: 0.8125rem; color: var(--color-text-muted); font-style: italic; padding-top: 10px; border-top: 1px solid var(--color-border); }

    .card-actions { padding: 12px 20px; background: var(--color-surface-2); border-top: 1px solid var(--color-border); display: flex; gap: 8px; flex-wrap: wrap; }
    .btn-action { padding: 6px 14px; border: none; border-radius: var(--radius); font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
    .btn-action:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-action--edit  { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); border: 1.5px solid color-mix(in srgb, var(--primary) 25%, transparent); }
    .btn-action--edit:hover:not(:disabled)  { background: color-mix(in srgb, var(--primary) 20%, transparent); }
    .btn-action--view  { background: color-mix(in srgb, var(--color-success) 12%, transparent); color: var(--color-success); border: 1.5px solid color-mix(in srgb, var(--color-success) 25%, transparent); }
    .btn-action--view:hover:not(:disabled)  { background: color-mix(in srgb, var(--color-success) 20%, transparent); }
    .btn-action--del   { background: color-mix(in srgb, var(--color-danger) 10%, transparent); color: var(--color-danger); border: 1.5px solid color-mix(in srgb, var(--color-danger) 22%, transparent); }
    .btn-action--del:hover:not(:disabled)   { background: color-mix(in srgb, var(--color-danger) 18%, transparent); }

    /* Toast */
    .toast { position: fixed; top: 20px; right: 20px; padding: 13px 20px; border-radius: var(--radius); font-weight: 600; font-size: var(--font-size-sm); z-index: 1100; animation: slideIn 0.3s ease-out; }
    .toast--success { background: var(--color-success); color: #fff; }
    .toast--error   { background: var(--color-danger);  color: #fff; }
    @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

    @media (max-width: 700px) { .provas-grid { grid-template-columns: 1fr; } }
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
    
    this.http.get<Prova[]>(`${environment.apiUrl}/provas/`).subscribe({
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
    this.http.get<any[]>(`${environment.apiUrl}/cursos/`).subscribe({
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

    this.http.delete(`${environment.apiUrl}/provas/${prova.id}`).subscribe({
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
