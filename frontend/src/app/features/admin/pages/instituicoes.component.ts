import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

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
    <div class="page-container">

      <div class="page-header">
        <div>
          <h2>&#127963;&#65039; Faculdades</h2>
          <p>Gerencie as solicitações de cadastro de instituições.</p>
        </div>
        <button class="btn-primary" (click)="carregar()" [disabled]="carregando">
          {{ carregando ? 'Atualizando...' : '&#8635; Atualizar' }}
        </button>
      </div>

      <div class="feedback success" *ngIf="mensagemSucesso">{{ mensagemSucesso }}</div>
      <div class="feedback error"   *ngIf="erro">{{ erro }}</div>

      <div class="filter-bar">
        <div class="filter-group">
          <label for="filtroStatus">Filtrar por status</label>
          <select id="filtroStatus" [(ngModel)]="filtroStatus" (change)="onFiltroChange()">
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="aprovado">Aprovado</option>
            <option value="recusado">Recusado</option>
          </select>
        </div>
        <div class="total-info" *ngIf="!carregando">
          {{ total }} faculdade{{ total !== 1 ? 's' : '' }} encontrada{{ total !== 1 ? 's' : '' }}
        </div>
      </div>

      <div class="table-wrapper">
        <div class="loading-overlay" *ngIf="carregando">
          <div class="spinner"></div>
          <span>Carregando...</span>
        </div>

        <table *ngIf="!carregando || instituicoes.length > 0">
          <thead>
            <tr>
              <th>#</th>
              <th>Instituição</th>
              <th>CNPJ</th>
              <th>Status</th>
              <th>Acesso</th>
              <th>Solicitado em</th>
              <th>Aprovado em</th>
              <th class="col-acoes">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let inst of instituicoes">
              <td class="col-id">{{ inst.id }}</td>
              <td>
                <div class="cell-nome">{{ inst.nome }}</div>
                <div class="cell-email">{{ inst.email_contato }}</div>
              </td>
              <td class="col-cnpj">{{ inst.cnpj || '—' }}</td>
              <td>
                <span class="badge" [ngClass]="'badge-' + (inst.aprovada ? 'aprovado' : 'pendente')">
                  {{ inst.aprovada ? 'Aprovado' : 'Pendente' }}
                </span>
              </td>
              <td>
                <span class="badge" [ngClass]="inst.ativa ? 'badge-acesso-permitido' : 'badge-acesso-negado'">
                  {{ inst.ativa ? 'Permitido' : 'Negado' }}
                </span>
              </td>
              <td class="col-data">
                {{ inst.data_criacao | date:'dd/MM/yyyy' }}<br>
                <span class="hora">{{ inst.data_criacao | date:'HH:mm' }}</span>
              </td>
              <td class="col-data">
                <ng-container *ngIf="inst.aprovada; else semAprovacao">
                  {{ inst.data_atualizacao | date:'dd/MM/yyyy' }}<br>
                  <span class="hora">{{ inst.data_atualizacao | date:'HH:mm' }}</span>
                </ng-container>
                <ng-template #semAprovacao>
                  <span class="text-muted">&#8212;</span>
                </ng-template>
              </td>
              <td class="col-acoes">
                <button class="btn-detail" (click)="verDetalhes(inst.id)">
                  &#128269; Detalhes
                </button>
              </td>
            </tr>
            <tr *ngIf="!carregando && instituicoes.length === 0">
              <td colspan="8" class="empty-row">
                Nenhuma faculdade encontrada para o filtro selecionado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination" *ngIf="totalPages > 1">
        <button class="page-btn" (click)="irParaPagina(paginaAtual - 1)" [disabled]="paginaAtual === 1">
          &#8249; Anterior
        </button>
        <button
          *ngFor="let p of paginasVisiveis()"
          class="page-btn"
          [class.active]="p === paginaAtual"
          (click)="irParaPagina(p)"
        >{{ p }}</button>
        <button class="page-btn" (click)="irParaPagina(paginaAtual + 1)" [disabled]="paginaAtual === totalPages">
          Próxima &#8250;
        </button>
        <span class="page-info">Página {{ paginaAtual }} de {{ totalPages }}</span>
      </div>

    </div>
  `,
  styles: [`
    .page-container { max-width: 1300px; margin: 0 auto; }

    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
    .page-header h2 { margin: 0 0 4px; color: #22303c; font-size: 22px; }
    .page-header p  { margin: 0; color: #667085; font-size: 14px; }

    .feedback { padding: 13px 16px; border-radius: 10px; margin-bottom: 16px; font-size: 14px; }
    .feedback.success { color: #065f46; background: #ecfdf3; border: 1px solid #a7f3d0; }
    .feedback.error   { color: #b42318; background: #fef3f2; border: 1px solid #fecaca; }

    .filter-bar { display: flex; align-items: flex-end; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .filter-group { display: flex; flex-direction: column; gap: 6px; }
    .filter-group label { font-size: 12px; font-weight: 600; color: #475467; text-transform: uppercase; letter-spacing: 0.04em; }
    .filter-group select { padding: 9px 32px 9px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: white; cursor: pointer; color: #1f2937; }
    .filter-group select:focus { outline: 2px solid #2c3e50; outline-offset: 1px; }
    .total-info { margin-left: auto; font-size: 13px; color: #667085; }

    .table-wrapper { position: relative; background: white; border-radius: 14px; box-shadow: 0 4px 20px rgba(15,23,42,0.08); overflow-x: auto; }
    .loading-overlay { display: flex; align-items: center; gap: 12px; padding: 40px 24px; color: #667085; font-size: 14px; }
    .spinner { width: 20px; height: 20px; border: 2px solid #e5e7eb; border-top-color: #2c3e50; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    table { width: 100%; border-collapse: collapse; min-width: 780px; }
    th, td { padding: 13px 16px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: 14px; vertical-align: middle; }
    th { background: #f8fafc; color: #475467; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; white-space: nowrap; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover td { background: #f9fafb; }

    .col-id   { color: #9ca3af; font-size: 12px; width: 48px; }
    .col-cnpj { font-family: monospace; font-size: 13px; white-space: nowrap; }
    .col-data { white-space: nowrap; }
    .col-acoes { width: 130px; }
    .cell-nome  { font-weight: 700; color: #1f2937; }
    .cell-email { font-size: 12px; color: #667085; margin-top: 2px; }
    .hora       { font-size: 11px; color: #9ca3af; }
    .text-muted { color: #9ca3af; }

    .badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
    .badge-pendente { background: #fff7cc; color: #92400e; }
    .badge-aprovado { background: #dcfce7; color: #15803d; }
    .badge-recusado { background: #fee2e2; color: #b42318; }
    .badge-acesso-permitido { background: #dcfce7; color: #15803d; }
    .badge-acesso-negado    { background: #fee2e2; color: #b42318; }

    .btn-primary { background: #2c3e50; color: white; border: none; border-radius: 8px; padding: 10px 18px; cursor: pointer; font-weight: 600; font-size: 14px; white-space: nowrap; transition: background 0.2s; }
    .btn-primary:hover    { background: #34495e; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-detail { border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 7px; padding: 7px 12px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s; white-space: nowrap; }
    .btn-detail:hover { background: #f3f4f6; border-color: #9ca3af; }

    .empty-row { text-align: center; color: #9ca3af; padding: 40px; font-size: 14px; }

    .pagination { display: flex; align-items: center; gap: 6px; margin-top: 20px; flex-wrap: wrap; }
    .page-btn { border: 1px solid #e5e7eb; background: white; color: #374151; border-radius: 7px; padding: 7px 12px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; }
    .page-btn:hover:not(:disabled) { background: #f3f4f6; }
    .page-btn.active { background: #2c3e50; color: white; border-color: #2c3e50; font-weight: 700; }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-info { margin-left: auto; font-size: 13px; color: #667085; }

    @media (max-width: 768px) {
      .page-header { flex-direction: column; }
      .filter-bar  { flex-direction: column; align-items: flex-start; }
      .total-info  { margin-left: 0; }
    }
  `]
})
export class AdminInstituicoesComponent implements OnInit {
  private readonly apiUrl = environment.apiUrl;

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
