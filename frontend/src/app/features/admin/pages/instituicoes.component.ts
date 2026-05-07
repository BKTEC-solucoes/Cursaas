import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';

export interface Instituicao {
  id: number;
  nome: string;
  slug: string;
  cnpj: string | null;
  email_contato: string | null;
  telefone: string | null;
  dominio_email: string | null;
  ativa: boolean;
  aprovada: boolean;
  plano: string;
  data_criacao: string;
  data_atualizacao: string;
}

interface PageResponse {
  items: Instituicao[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

@Component({
  selector: 'app-admin-instituicoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-page">

      <div class="page-topbar">
        <div>
          <h1>Faculdades</h1>
          <p>Gerencie as solicitações de cadastro de instituições.</p>
        </div>
        <button class="btn-outline" (click)="carregar()" [disabled]="carregando">
          {{ carregando ? 'Atualizando...' : 'Atualizar' }}
        </button>
      </div>

      @if (mensagemSucesso) { <div class="msg msg--success">{{ mensagemSucesso }}</div> }
      @if (erro)            { <div class="msg msg--error">{{ erro }}</div> }

      <div class="filter-bar">
        <div class="filter-group">
          <label for="filtroStatus">Status</label>
          <select id="filtroStatus" [(ngModel)]="filtroStatus" (change)="onFiltroChange()">
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="aprovado">Aprovado</option>
          </select>
        </div>
        @if (!carregando) {
          <span class="total-info">{{ total }} faculdade{{ total !== 1 ? 's' : '' }}</span>
        }
      </div>

      <div class="table-card">
        @if (carregando) {
          <div class="loading-state"><div class="spinner"></div><p>Carregando...</p></div>
        }

        @if (!carregando) {
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Instituição</th>
                <th>CNPJ</th>
                <th>Status</th>
                <th>Acesso</th>
                <th>Solicitado em</th>
                <th>Aprovado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (inst of instituicoes; track inst.id) {
                <tr>
                  <td class="col-id">{{ inst.id }}</td>
                  <td>
                    <div class="cell-nome">{{ inst.nome }}</div>
                    <div class="cell-sub">{{ inst.email_contato }}</div>
                  </td>
                  <td class="col-mono">{{ inst.cnpj || '—' }}</td>
                  <td>
                    <span class="badge" [class]="inst.aprovada ? 'badge--success' : 'badge--warn'">
                      {{ inst.aprovada ? 'Aprovado' : 'Pendente' }}
                    </span>
                  </td>
                  <td>
                    <span class="badge" [class]="inst.ativa ? 'badge--success' : 'badge--danger'">
                      {{ inst.ativa ? 'Permitido' : 'Negado' }}
                    </span>
                  </td>
                  <td class="col-data">
                    {{ inst.data_criacao | date:'dd/MM/yyyy' }}<br>
                    <span class="hora">{{ inst.data_criacao | date:'HH:mm' }}</span>
                  </td>
                  <td class="col-data">
                    @if (inst.aprovada) {
                      {{ inst.data_atualizacao | date:'dd/MM/yyyy' }}<br>
                      <span class="hora">{{ inst.data_atualizacao | date:'HH:mm' }}</span>
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </td>
                  <td>
                    <button class="btn-detail" (click)="verDetalhes(inst.id)">Detalhes</button>
                  </td>
                </tr>
              }
              @if (instituicoes.length === 0) {
                <tr><td colspan="8" class="empty-row">Nenhuma faculdade encontrada.</td></tr>
              }
            </tbody>
          </table>
        }
      </div>

      @if (totalPages > 1) {
        <div class="pagination">
          <button class="page-btn" (click)="irParaPagina(paginaAtual - 1)" [disabled]="paginaAtual === 1">Anterior</button>
          @for (p of paginasVisiveis(); track p) {
            <button class="page-btn" [class.active]="p === paginaAtual" (click)="irParaPagina(p)">{{ p }}</button>
          }
          <button class="page-btn" (click)="irParaPagina(paginaAtual + 1)" [disabled]="paginaAtual === totalPages">Próxima</button>
          <span class="page-info">Página {{ paginaAtual }} de {{ totalPages }}</span>
        </div>
      }

    </div>
  `,
  styles: [`
    :host { display: block; }

    .page-topbar {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
    }
    .page-topbar h1 { margin: 0 0 4px; font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text); font-family: var(--font-display); }
    .page-topbar p  { margin: 0; color: var(--color-text-muted); font-size: var(--font-size-sm); }

    .btn-outline {
      padding: 9px 16px; border: 1.5px solid var(--color-border); border-radius: var(--radius);
      background: var(--color-surface); color: var(--color-text-muted); font-size: var(--font-size-sm);
      font-weight: 500; cursor: pointer; transition: border-color 0.2s, color 0.2s; white-space: nowrap;
    }
    .btn-outline:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
    .btn-outline:disabled { opacity: 0.6; cursor: not-allowed; }

    .msg { padding: 12px 16px; border-radius: var(--radius); font-size: var(--font-size-sm); margin-bottom: 16px; }
    .msg--success { background: color-mix(in srgb, var(--color-success) 10%, transparent); color: var(--color-success); border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent); }
    .msg--error   { background: color-mix(in srgb, var(--color-danger) 10%, transparent);  color: var(--color-danger);  border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); }

    .filter-bar {
      display: flex; align-items: flex-end; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;
    }
    .filter-group { display: flex; flex-direction: column; gap: 5px; }
    .filter-group label { font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .filter-group select {
      padding: 8px 28px 8px 12px; border: 1.5px solid var(--color-border); border-radius: var(--radius);
      font-size: var(--font-size-sm); background: var(--color-surface); color: var(--color-text); cursor: pointer; outline: none;
    }
    .filter-group select:focus { border-color: var(--primary); }
    .total-info { margin-left: auto; font-size: var(--font-size-sm); color: var(--color-text-muted); }

    .table-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); overflow-x: auto; box-shadow: var(--shadow-sm);
    }

    .loading-state {
      display: flex; align-items: center; gap: 12px; padding: 40px 24px;
      color: var(--color-text-muted); font-size: var(--font-size-sm);
    }

    .spinner {
      width: 20px; height: 20px; border: 2px solid var(--color-border);
      border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    table { width: 100%; border-collapse: collapse; min-width: 800px; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--color-border); font-size: var(--font-size-sm); vertical-align: middle; }
    th { background: var(--color-surface-2); color: var(--color-text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; white-space: nowrap; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover td { background: var(--color-surface-2); }

    .col-id   { color: var(--color-text-muted); font-size: 0.75rem; width: 48px; }
    .col-mono { font-family: monospace; font-size: 0.8125rem; white-space: nowrap; }
    .col-data { white-space: nowrap; }
    .cell-nome  { font-weight: 600; color: var(--color-text); }
    .cell-sub   { font-size: 0.75rem; color: var(--color-text-muted); margin-top: 2px; }
    .hora       { font-size: 0.7rem; color: var(--color-text-muted); }
    .text-muted { color: var(--color-text-muted); }

    .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
    .badge--warn    { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); }
    .badge--success { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
    .badge--danger  { background: color-mix(in srgb, var(--color-danger) 15%, transparent);  color: var(--color-danger); }

    .btn-detail {
      border: 1.5px solid var(--color-border); background: var(--color-surface);
      color: var(--color-text-muted); border-radius: var(--radius); padding: 6px 12px;
      cursor: pointer; font-size: 0.8125rem; font-weight: 600; transition: border-color 0.15s, color 0.15s;
    }
    .btn-detail:hover { border-color: var(--primary); color: var(--primary); }

    .empty-row { text-align: center; color: var(--color-text-muted); padding: 40px; }

    .pagination { display: flex; align-items: center; gap: 6px; margin-top: 20px; flex-wrap: wrap; }
    .page-btn { border: 1.5px solid var(--color-border); background: var(--color-surface); color: var(--color-text-muted); border-radius: var(--radius); padding: 7px 12px; cursor: pointer; font-size: 0.8125rem; font-weight: 500; transition: border-color 0.15s, color 0.15s; }
    .page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
    .page-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); font-weight: 700; }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-info { margin-left: auto; font-size: var(--font-size-sm); color: var(--color-text-muted); }

    @media (max-width: 768px) {
      .page-topbar { flex-direction: column; }
      .filter-bar  { flex-direction: column; align-items: flex-start; }
      .total-info  { margin-left: 0; }
    }
  `]
})
export class AdminInstituicoesComponent implements OnInit {
  private readonly apiUrl = 'http://localhost:8000/api';

  instituicoes: Instituicao[] = [];
  carregando = false;
  erro = '';
  mensagemSucesso = '';

  filtroStatus: string = '';

  paginaAtual = 1;
  limit = 15;
  total = 0;
  totalPages = 1;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.erro = '';
    this.mensagemSucesso = '';

    let params = new HttpParams()
      .set('page', this.paginaAtual)
      .set('limit', this.limit);

    if (this.filtroStatus) {
      // Converte pendente/aprovado para booleano para o backend
      if (this.filtroStatus === 'pendente') {
        params = params.set('aprovada', 'false');
      } else if (this.filtroStatus === 'aprovado') {
        params = params.set('aprovada', 'true');
      }
    }

    this.http
      .get<PageResponse>(`${this.apiUrl}/faculdades/`, {
        headers: this.authHeaders(),
        params,
      })
      .subscribe({
        next: (res) => {
          this.instituicoes = res.items;
          this.total        = res.total;
          this.totalPages   = res.total_pages;
          this.carregando   = false;
        },
        error: (err) => {
          this.erro       = err?.error?.detail || 'Erro ao carregar faculdades.';
          this.carregando = false;
        },
      });
  }

  onFiltroChange(): void {
    this.paginaAtual = 1;
    this.carregar();
  }

  irParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPages) return;
    this.paginaAtual = pagina;
    this.carregar();
  }

  paginasVisiveis(): number[] {
    const delta = 2;
    const range: number[] = [];
    for (
      let i = Math.max(1, this.paginaAtual - delta);
      i <= Math.min(this.totalPages, this.paginaAtual + delta);
      i++
    ) {
      range.push(i);
    }
    return range;
  }

  verDetalhes(id: number): void {
    this.router.navigate(['/admin/instituicoes', id]);
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
