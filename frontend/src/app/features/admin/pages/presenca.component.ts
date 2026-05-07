import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Presenca {
  id: number;
  usuario_id: number;
  aula_id: number;
  usuario_nome: string;
  aula_titulo: string;
  percentual_assistido: number;
  registrada_automaticamente: boolean;
  tempo_total_segundos: number;
  data_acesso: string;
  data_conclusao: string;
}

@Component({
  selector: 'app-admin-presenca',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-page">
      <div class="page-topbar">
        <h1>Presença dos Alunos</h1>
      </div>

      @if (carregando) {
        <div class="loading-state"><div class="spinner"></div><p>Carregando registros de presença...</p></div>
      }

      @if (erro) {
        <div class="msg msg--error">{{ erro }} <button (click)="carregarPresencas()">Tentar novamente</button></div>
      }

      @if (!carregando && presencas.length > 0) {
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Aula</th>
                <th>Percentual</th>
                <th>Tipo</th>
                <th>Data Acesso</th>
                <th>Conclusão</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (p of presencas; track p.id) {
                <tr [class.row-absent]="p.percentual_assistido < 75">
                  <td class="cell-strong">{{ p.usuario_nome }}</td>
                  <td>{{ p.aula_titulo }}</td>
                  <td>
                    <div class="progress-wrap">
                      <div class="progress-bar">
                        <div class="progress-fill" [style.width.%]="p.percentual_assistido" [class.fill-ok]="p.percentual_assistido >= 75" [class.fill-low]="p.percentual_assistido < 75"></div>
                      </div>
                      <span class="progress-label">{{ p.percentual_assistido }}%</span>
                    </div>
                  </td>
                  <td>
                    <span class="badge" [class]="p.registrada_automaticamente ? 'badge--success' : 'badge--info'">
                      {{ p.registrada_automaticamente ? 'Automático' : 'Manual' }}
                    </span>
                  </td>
                  <td class="col-date">{{ p.data_acesso | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td class="col-date">
                    @if (p.data_conclusao) { {{ p.data_conclusao | date:'dd/MM/yyyy HH:mm' }} }
                    @else { <span class="muted">—</span> }
                  </td>
                  <td class="cell-actions">
                    <button class="btn-icon btn-icon--edit" title="Editar presença" (click)="abrirEdicao(p)">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (!carregando && presencas.length === 0 && !erro) {
        <div class="empty-state">
          <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <p>Nenhum registro de presença ainda.</p>
        </div>
      }
    </div>

    @if (presencaEmEdicao) {
      <div class="modal-overlay" (click)="fecharEdicao()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Editar Presença Manualmente</h3>
            <button class="modal-close-btn" (click)="fecharEdicao()">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="info-box-sm">
              <p><strong>Aluno:</strong> {{ presencaEmEdicao.usuario_nome }}</p>
              <p><strong>Aula:</strong> {{ presencaEmEdicao.aula_titulo }}</p>
            </div>
            <div class="form-row">
              <label>Percentual Assistido ({{ percentualEdicao }}%)</label>
              <input type="range" min="0" max="100" step="1" [(ngModel)]="percentualEdicao" class="slider" />
              <div class="slider-info" [class.present]="percentualEdicao >= 75" [class.absent]="percentualEdicao < 75">
                @if (percentualEdicao >= 75) { Presença registrada (mín. 75%) }
                @else { Ausente — abaixo do mínimo de 75% }
              </div>
            </div>
            <div class="aviso-manual">Esta edição será registrada como <strong>manual</strong>.</div>
            @if (erroEdicao) { <div class="form-error">{{ erroEdicao }}</div> }
          </div>
          <div class="modal-footer">
            <button class="btn-outline" (click)="fecharEdicao()" [disabled]="salvandoEdicao">Cancelar</button>
            <button class="btn-primary" (click)="salvarEdicao()" [disabled]="salvandoEdicao">{{ salvandoEdicao ? 'Salvando...' : 'Salvar' }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .page-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-topbar h1 { margin: 0; font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text); font-family: var(--font-display); }

    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 24px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .spinner { width: 28px; height: 28px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .msg { padding: 12px 16px; border-radius: var(--radius); font-size: var(--font-size-sm); margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
    .msg--error { background: color-mix(in srgb, var(--color-danger) 8%, transparent); color: var(--color-danger); border: 1px solid color-mix(in srgb, var(--color-danger) 20%, transparent); }
    .msg--error button { background: none; border: none; color: var(--color-danger); cursor: pointer; font-weight: 600; text-decoration: underline; }

    .table-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow-x: auto; box-shadow: var(--shadow-sm); }
    table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); min-width: 700px; }
    th { padding: 12px 14px; text-align: left; font-weight: 600; color: var(--color-text-muted); background: var(--color-surface-2); border-bottom: 1px solid var(--color-border); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
    td { padding: 12px 14px; border-bottom: 1px solid var(--color-border); color: var(--color-text); }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--color-surface-2); }
    tr.row-absent td { background: color-mix(in srgb, var(--color-danger) 4%, transparent); }
    .cell-strong { font-weight: 600; }
    .col-date { font-size: 0.8125rem; color: var(--color-text-muted); }
    .muted { color: var(--color-text-muted); }

    .progress-wrap { display: flex; align-items: center; gap: 8px; }
    .progress-bar { flex: 1; height: 8px; background: var(--color-border); border-radius: 99px; overflow: hidden; min-width: 80px; }
    .progress-fill { height: 100%; border-radius: 99px; transition: width 0.3s; }
    .fill-ok  { background: var(--color-success); }
    .fill-low { background: var(--color-danger); }
    .progress-label { font-size: 0.8125rem; font-weight: 600; color: var(--color-text-muted); white-space: nowrap; }

    .badge { display: inline-flex; padding: 3px 10px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; }
    .badge--success { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
    .badge--info    { background: color-mix(in srgb, var(--color-info) 15%, transparent);    color: var(--color-info); }

    .cell-actions { display: flex; gap: 6px; }
    .btn-icon { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: var(--radius); border: 1.5px solid var(--color-border); background: var(--color-surface); cursor: pointer; }
    .btn-icon--edit { color: var(--primary); }
    .btn-icon--edit:hover { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, transparent); }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0 0 0 / 0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
    .modal-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); max-width: 460px; width: 100%; box-shadow: var(--shadow-lg); display: flex; flex-direction: column; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 16px; border-bottom: 1px solid var(--color-border); }
    .modal-header h3 { margin: 0; font-size: var(--font-size-lg); color: var(--color-text); }
    .modal-close-btn { background: none; border: none; color: var(--color-text-muted); cursor: pointer; padding: 4px; border-radius: var(--radius); }
    .modal-close-btn:hover { background: var(--color-surface-2); color: var(--color-text); }
    .modal-body { padding: 20px 24px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--color-border); }

    .info-box-sm { background: var(--color-surface-2); border-radius: var(--radius); padding: 12px 14px; margin-bottom: 16px; }
    .info-box-sm p { margin: 4px 0; font-size: var(--font-size-sm); color: var(--color-text-muted); }

    .form-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .form-row label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-muted); }
    .slider { width: 100%; accent-color: var(--primary); cursor: pointer; }
    .slider-info { text-align: center; font-size: var(--font-size-sm); font-weight: 600; padding: 6px; border-radius: var(--radius); }
    .slider-info.present { color: var(--color-success); background: color-mix(in srgb, var(--color-success) 10%, transparent); }
    .slider-info.absent  { color: var(--color-danger);  background: color-mix(in srgb, var(--color-danger) 10%, transparent); }

    .aviso-manual { background: color-mix(in srgb, var(--color-warning) 12%, transparent); border: 1px solid color-mix(in srgb, var(--color-warning) 30%, transparent); border-radius: var(--radius); padding: 10px 14px; font-size: var(--font-size-sm); color: var(--color-warning); margin-top: 12px; }

    .form-error { margin-top: 10px; padding: 10px 14px; background: color-mix(in srgb, var(--color-danger) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent); border-radius: var(--radius); color: var(--color-danger); font-size: var(--font-size-sm); }

    .btn-primary { background: var(--primary); color: #fff; border: none; padding: 9px 18px; border-radius: var(--radius); cursor: pointer; font-weight: 600; font-size: var(--font-size-sm); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-outline { padding: 9px 16px; border: 1.5px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); color: var(--color-text-muted); font-size: var(--font-size-sm); font-weight: 500; cursor: pointer; }
    .btn-outline:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class AdminPresencaComponent implements OnInit {
  presencas: Presenca[] = [];
  carregando = false;
  erro = '';

  presencaEmEdicao: Presenca | null = null;
  percentualEdicao = 0;
  salvandoEdicao = false;
  erroEdicao = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarPresencas();
  }

  carregarPresencas(): void {
    this.carregando = true;
    this.erro = '';
    this.http.get<Presenca[]>('http://localhost:8000/api/presenca/').subscribe({
      next: (presencas) => {
        this.presencas = presencas || [];
        this.carregando = false;
      },
      error: (error: any) => {
        this.erro = error?.error?.detail || 'Erro ao carregar registros de presença.';
        this.carregando = false;
      }
    });
  }

  abrirFiltros(): void {}

  abrirEdicao(presenca: Presenca): void {
    this.presencaEmEdicao = presenca;
    this.percentualEdicao = presenca.percentual_assistido;
    this.erroEdicao = '';
  }

  fecharEdicao(): void {
    if (this.salvandoEdicao) return;
    this.presencaEmEdicao = null;
  }

  salvarEdicao(): void {
    if (!this.presencaEmEdicao) return;
    this.salvandoEdicao = true;
    this.erroEdicao = '';
    this.http.put<Presenca>(
      `http://localhost:8000/api/presenca/${this.presencaEmEdicao.id}`,
      { percentual_assistido: this.percentualEdicao }
    ).subscribe({
      next: (atualizado) => {
        const idx = this.presencas.findIndex(p => p.id === atualizado.id);
        if (idx !== -1) { this.presencas[idx] = { ...this.presencas[idx], ...atualizado }; }
        this.salvandoEdicao = false;
        this.presencaEmEdicao = null;
      },
      error: (error: any) => {
        this.erroEdicao = error?.error?.detail || 'Erro ao salvar. Tente novamente.';
        this.salvandoEdicao = false;
      }
    });
  }
}
