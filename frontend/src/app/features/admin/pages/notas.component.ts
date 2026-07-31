import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Nota {
  id: number;
  usuario_id: number;
  usuario_nome: string;
  prova_id: number;
  prova_titulo: string;
  nota_final: number | null;
  tentativa: number;
  observacoes: string | null;
  data_submissao: string;
  data_correcao: string | null;
}

interface QuestaoResposta {
  id: number;
  enunciado: string;
  tipo: string;
  pontos: number;
  ordem: number;
  opcoes?: { id: number; texto: string; ordem: number; correta: boolean }[];
  opcao_selecionada?: number | null;
  texto_resposta?: string | null;
  correta: boolean | null;
}

@Component({
  selector: 'app-admin-notas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-page">
      <div class="page-topbar">
        <h1>Gerenciar Notas</h1>
      </div>

      <div class="filter-bar">
        <input class="filter-input" type="text" placeholder="Buscar por aluno ou prova..." [(ngModel)]="busca" (ngModelChange)="aplicarFiltro()" />
        <select class="filter-select" [(ngModel)]="filtroPendente" (ngModelChange)="aplicarFiltro()">
          <option value="todos">Todas as notas</option>
          <option value="pendentes">Aguardando correção</option>
          <option value="corrigidas">Já corrigidas</option>
        </select>
      </div>

      @if (carregando) {
        <div class="loading-state"><div class="spinner"></div><p>Carregando notas...</p></div>
      }

      @if (erro) {
        <div class="msg msg--error">{{ erro }} <button (click)="carregarNotas()">Tentar novamente</button></div>
      }

      @if (!carregando && notasFiltradas.length > 0) {
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Prova</th>
                <th>Nota Final</th>
                <th>Tentativa</th>
                <th>Enviado em</th>
                <th>Corrigido em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (nota of notasFiltradas; track nota.id) {
                <tr [class.row-pending]="nota.nota_final == null">
                  <td class="cell-strong">{{ nota.usuario_nome }}</td>
                  <td>{{ nota.prova_titulo }}</td>
                  <td>
                    @if (nota.nota_final != null) {
                      <span class="nota-val" [ngClass]="'nota-' + getNivelNota(+nota.nota_final)">{{ (+nota.nota_final).toFixed(1) }}</span>
                    } @else {
                      <span class="badge badge--warn">Pendente</span>
                    }
                  </td>
                  <td class="col-center">{{ nota.tentativa }}ª</td>
                  <td class="col-date">{{ nota.data_submissao | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td class="col-date">
                    @if (nota.data_correcao) { {{ nota.data_correcao | date:'dd/MM/yyyy HH:mm' }} }
                    @else { <span class="muted">—</span> }
                  </td>
                  <td class="cell-actions">
                    <button class="btn-icon btn-icon--view" title="Ver respostas" (click)="verRespostas(nota)">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="btn-icon btn-icon--edit" title="Editar nota" (click)="abrirEdicao(nota)">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (!carregando && notasFiltradas.length === 0 && !erro) {
        <div class="empty-state">
          <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <p>{{ notas.length === 0 ? 'Nenhuma nota registrada ainda.' : 'Nenhuma nota corresponde ao filtro.' }}</p>
        </div>
      }
    </div>

    @if (notaEmEdicao) {
      <div class="modal-overlay" (click)="fecharEdicao()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Editar Nota</h3>
            <button class="modal-close-btn" (click)="fecharEdicao()">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="info-box-sm">
              <p><strong>Aluno:</strong> {{ notaEmEdicao.usuario_nome }}</p>
              <p><strong>Prova:</strong> {{ notaEmEdicao.prova_titulo }}</p>
              <p><strong>Tentativa:</strong> {{ notaEmEdicao.tentativa }}ª</p>
            </div>
            <div class="form-row">
              <label>Nota Final (0 a 10)</label>
              <input type="number" class="nota-input-big" [(ngModel)]="notaEditada" min="0" max="10" step="0.1" placeholder="Ex: 7.5" />
            </div>
            <div class="form-row">
              <label>Observações</label>
              <textarea [(ngModel)]="obsEditada" rows="3" placeholder="Comentário sobre a correção (opcional)..."></textarea>
            </div>
            @if (erroEdicao) { <div class="form-error">{{ erroEdicao }}</div> }
          </div>
          <div class="modal-footer">
            <button class="btn-outline" (click)="fecharEdicao()" [disabled]="salvando">Cancelar</button>
            <button class="btn-primary" (click)="salvarNota()" [disabled]="salvando || notaEditada === null || notaEditada === undefined">{{ salvando ? 'Salvando...' : 'Salvar Nota' }}</button>
          </div>
        </div>
      </div>
    }

    @if (notaRespostas) {
      <div class="modal-overlay" (click)="fecharRespostas()">
        <div class="modal-card modal-card--lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3>Respostas do Aluno</h3>
              <p class="modal-subtitle">{{ notaRespostas.usuario_nome }} — {{ notaRespostas.prova_titulo }}</p>
            </div>
            <button class="modal-close-btn" (click)="fecharRespostas()">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body modal-body--scroll">
            @if (carregandoRespostas) {
              <div class="loading-state"><div class="spinner"></div><p>Carregando respostas...</p></div>
            }
            @if (erroRespostas) { <div class="form-error">{{ erroRespostas }}</div> }
            @if (!carregandoRespostas && questoesRespostas.length > 0) {
              @for (q of questoesRespostas; track q.id; let i = $index) {
                <div class="questao-card">
                  <div class="questao-header">
                    <span class="questao-num">Q{{ i + 1 }}</span>
                    <span class="badge" [class]="q.tipo === 'multipla_escolha' ? 'badge--info' : 'badge--warn'">{{ q.tipo === 'multipla_escolha' ? 'Múltipla Escolha' : 'Dissertativa' }}</span>
                    <span class="questao-pts">{{ q.pontos }}pts</span>
                    @if (q.tipo === 'multipla_escolha') {
                      @if (q.correta === true) { <span class="badge badge--success">Correta</span> }
                      @else if (q.correta === false) { <span class="badge badge--danger">Errada</span> }
                      @else { <span class="muted">Não respondida</span> }
                    } @else {
                      <span class="badge badge--warn">Aguarda correção</span>
                    }
                  </div>
                  <p class="questao-enunciado">{{ q.enunciado }}</p>
                  @if (q.tipo === 'multipla_escolha' && q.opcoes) {
                    <div class="opcoes-lista">
                      @for (op of q.opcoes; track op.id) {
                        <div class="opcao-linha" [class.opcao-selecionada]="op.id === q.opcao_selecionada" [class.opcao-gabarito]="op.correta">
                          <span class="opcao-texto">{{ op.texto }}</span>
                          @if (op.correta) { <span class="badge badge--success" style="font-size:0.7rem">gabarito</span> }
                        </div>
                      }
                    </div>
                  }
                  @if (q.tipo === 'dissertativa') {
                    <div class="resp-dissertativa">
                      <p class="resp-label">Resposta do aluno:</p>
                      @if (q.texto_resposta) { <div class="resp-texto">{{ q.texto_resposta }}</div> }
                      @else { <div class="muted" style="font-style:italic">Sem resposta</div> }
                    </div>
                  }
                </div>
              }
            }
          </div>
          <div class="modal-footer">
            <button class="btn-outline" (click)="fecharRespostas()">Fechar</button>
            <button class="btn-primary" (click)="abrirEdicaoDeRespostas()">Editar Nota</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .page-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .page-topbar h1 { margin: 0; font-size: var(--font-size-xl); font-weight: 700; color: var(--color-text); font-family: var(--font-display); }

    .filter-bar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .filter-input { flex: 1; min-width: 200px; padding: 9px 12px; border: 1.5px solid var(--color-border); border-radius: var(--radius); font-size: var(--font-size-sm); background: var(--color-surface-2); color: var(--color-text); outline: none; }
    .filter-input:focus { border-color: var(--primary); background: var(--color-surface); }
    .filter-select { padding: 9px 12px; border: 1.5px solid var(--color-border); border-radius: var(--radius); font-size: var(--font-size-sm); background: var(--color-surface-2); color: var(--color-text); cursor: pointer; }

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
    tr.row-pending td { background: color-mix(in srgb, var(--color-warning) 4%, transparent); }
    .cell-strong { font-weight: 600; }
    .col-center { text-align: center; color: var(--color-text-muted); }
    .col-date { font-size: 0.8125rem; color: var(--color-text-muted); }
    .muted { color: var(--color-text-muted); }

    .nota-val { font-weight: 700; font-size: var(--font-size-base); }
    .nota-excelente { color: var(--color-success); }
    .nota-bom       { color: var(--primary); }
    .nota-regular   { color: var(--color-warning); }
    .nota-insuficiente { color: var(--color-danger); }

    .badge { display: inline-flex; padding: 3px 10px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; }
    .badge--success { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
    .badge--warn    { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); }
    .badge--danger  { background: color-mix(in srgb, var(--color-danger) 15%, transparent);  color: var(--color-danger); }
    .badge--info    { background: color-mix(in srgb, var(--color-info) 15%, transparent);    color: var(--color-info); }

    .cell-actions { display: flex; gap: 6px; }
    .btn-icon { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: var(--radius); border: 1.5px solid var(--color-border); background: var(--color-surface); cursor: pointer; }
    .btn-icon--view  { color: var(--color-info); }
    .btn-icon--view:hover  { border-color: var(--color-info); background: color-mix(in srgb, var(--color-info) 8%, transparent); }
    .btn-icon--edit  { color: var(--primary); }
    .btn-icon--edit:hover  { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, transparent); }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0 0 0 / 0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
    .modal-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); max-width: 480px; width: 100%; box-shadow: var(--shadow-lg); display: flex; flex-direction: column; max-height: 90vh; }
    .modal-card--lg { max-width: 680px; }
    .modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px 16px; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
    .modal-header h3 { margin: 0 0 4px; font-size: var(--font-size-lg); color: var(--color-text); }
    .modal-subtitle { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-muted); }
    .modal-close-btn { background: none; border: none; color: var(--color-text-muted); cursor: pointer; padding: 4px; border-radius: var(--radius); line-height: 1; }
    .modal-close-btn:hover { background: var(--color-surface-2); color: var(--color-text); }
    .modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
    .modal-body--scroll { max-height: 55vh; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--color-border); flex-shrink: 0; }

    .info-box-sm { background: var(--color-surface-2); border-radius: var(--radius); padding: 12px 14px; margin-bottom: 16px; }
    .info-box-sm p { margin: 4px 0; font-size: var(--font-size-sm); color: var(--color-text-muted); }

    .form-row { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
    .form-row label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-muted); }
    .form-row input, .form-row textarea { padding: 9px 12px; border: 1.5px solid var(--color-border); border-radius: var(--radius); font-size: var(--font-size-sm); outline: none; background: var(--color-surface-2); color: var(--color-text); font-family: inherit; }
    .form-row input:focus, .form-row textarea:focus { border-color: var(--primary); background: var(--color-surface); }
    .form-row textarea { resize: vertical; }
    .nota-input-big { font-size: 1.5rem; font-weight: 700; text-align: center; }

    .form-error { margin-top: 10px; padding: 10px 14px; background: color-mix(in srgb, var(--color-danger) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent); border-radius: var(--radius); color: var(--color-danger); font-size: var(--font-size-sm); }

    .btn-primary { background: var(--primary); color: #fff; border: none; padding: 9px 18px; border-radius: var(--radius); cursor: pointer; font-weight: 600; font-size: var(--font-size-sm); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-outline { padding: 9px 16px; border: 1.5px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); color: var(--color-text-muted); font-size: var(--font-size-sm); font-weight: 500; cursor: pointer; }
    .btn-outline:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Questoes */
    .questao-card { border: 1px solid var(--color-border); border-radius: var(--radius); padding: 14px; margin-bottom: 12px; }
    .questao-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
    .questao-num { background: var(--color-surface-2); color: var(--color-text-muted); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }
    .questao-pts { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); padding: 2px 8px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700; }
    .questao-enunciado { margin: 0 0 10px; font-size: var(--font-size-sm); color: var(--color-text); }
    .opcoes-lista { display: flex; flex-direction: column; gap: 5px; }
    .opcao-linha { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: var(--radius); border: 1px solid var(--color-border); font-size: var(--font-size-sm); }
    .opcao-selecionada { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 6%, transparent); }
    .opcao-gabarito:not(.opcao-selecionada) { border-color: var(--color-success); background: color-mix(in srgb, var(--color-success) 6%, transparent); }
    .opcao-texto { flex: 1; }
    .resp-dissertativa { margin-top: 8px; }
    .resp-label { font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted); margin: 0 0 6px; }
    .resp-texto { background: var(--color-surface-2); border-radius: var(--radius); padding: 10px 12px; font-size: var(--font-size-sm); white-space: pre-wrap; }
  `]
})
export class AdminNotasComponent implements OnInit {
  notas: Nota[] = [];
  notasFiltradas: Nota[] = [];
  carregando = false;
  erro = '';

  busca = '';
  filtroPendente = 'todos';

  notaEmEdicao: Nota | null = null;
  notaEditada: number | null = null;
  obsEditada: string = '';
  salvando = false;
  erroEdicao = '';

  notaRespostas: Nota | null = null;
  questoesRespostas: QuestaoResposta[] = [];
  carregandoRespostas = false;
  erroRespostas = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarNotas();
  }

  carregarNotas(): void {
    this.carregando = true;
    this.erro = '';

    this.http.get<Nota[]>(`${environment.apiUrl}/notas/`).subscribe({
      next: (notas) => {
        // nota_final vem como string do backend (Decimal do Python)
        const normalizadas = (notas || []).map(n => ({
          ...n,
          nota_final: n.nota_final != null ? Number(n.nota_final) : null
        }));
        this.notas = normalizadas.sort((a, b) => {
          // Pendentes primeiro
          if (a.nota_final == null && b.nota_final != null) return -1;
          if (a.nota_final != null && b.nota_final == null) return 1;
          return new Date(b.data_submissao).getTime() - new Date(a.data_submissao).getTime();
        });
        this.aplicarFiltro();
        this.carregando = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar notas:', error);
        this.erro = 'Erro ao carregar notas. Tente novamente.';
        this.carregando = false;
      }
    });
  }

  aplicarFiltro(): void {
    let resultado = this.notas;

    if (this.busca.trim()) {
      const termo = this.busca.toLowerCase();
      resultado = resultado.filter(n =>
        n.usuario_nome?.toLowerCase().includes(termo) ||
        n.prova_titulo?.toLowerCase().includes(termo)
      );
    }

    if (this.filtroPendente === 'pendentes') {
      resultado = resultado.filter(n => n.nota_final == null);
    } else if (this.filtroPendente === 'corrigidas') {
      resultado = resultado.filter(n => n.nota_final != null);
    }

    this.notasFiltradas = resultado;
  }

  getNivelNota(nota: number): string {
    if (nota >= 8) return 'excelente';
    if (nota >= 6) return 'bom';
    if (nota >= 4) return 'regular';
    return 'insuficiente';
  }

  abrirEdicao(nota: Nota): void {
    this.notaEmEdicao = nota;
    this.notaEditada = nota.nota_final;
    this.obsEditada = nota.observacoes || '';
    this.erroEdicao = '';
  }

  fecharEdicao(): void {
    if (this.salvando) return;
    this.notaEmEdicao = null;
    this.notaEditada = null;
    this.obsEditada = '';
    this.erroEdicao = '';
  }

  verRespostas(nota: Nota): void {
    this.notaRespostas = nota;
    this.questoesRespostas = [];
    this.carregandoRespostas = true;
    this.erroRespostas = '';

    this.http.get<any>(`${environment.apiUrl}/provas/${nota.prova_id}/respostas-aluno/${nota.usuario_id}`).subscribe({
      next: (data) => {
        this.questoesRespostas = data.questoes || [];
        this.carregandoRespostas = false;
      },
      error: (err: any) => {
        this.erroRespostas = err?.error?.detail || 'Erro ao carregar respostas.';
        this.carregandoRespostas = false;
      }
    });
  }

  fecharRespostas(): void {
    this.notaRespostas = null;
    this.questoesRespostas = [];
    this.erroRespostas = '';
  }

  abrirEdicaoDeRespostas(): void {
    const nota = this.notaRespostas!;
    this.fecharRespostas();
    this.abrirEdicao(nota);
  }

  salvarPontos(q: QuestaoResposta, valor: number): void {
    if (!this.notaRespostas || isNaN(valor) || valor <= 0) return;

    this.http.put(
      `${environment.apiUrl}/provas/${this.notaRespostas.prova_id}/questoes/${q.id}`,
      { pontos: valor }
    ).subscribe({
      next: () => { q.pontos = valor; },
      error: (err: any) => { console.error('Erro ao salvar pontos:', err); }
    });
  }

  salvarNota(): void {
    if (!this.notaEmEdicao || this.notaEditada === null || this.notaEditada === undefined) return;

    const valor = Number(this.notaEditada);
    if (isNaN(valor) || valor < 0 || valor > 10) {
      this.erroEdicao = 'Nota inv├ílida. Insira um valor entre 0 e 10.';
      return;
    }

    this.salvando = true;
    this.erroEdicao = '';

    const payload = {
      nota_final: valor,
      observacoes: this.obsEditada || null
    };

    this.http.put<Nota>(`${environment.apiUrl}/notas/${this.notaEmEdicao.id}`, payload).subscribe({
      next: (notaAtualizada) => {
        const idx = this.notas.findIndex(n => n.id === this.notaEmEdicao!.id);
        if (idx !== -1) {
          this.notas[idx] = {
            ...this.notas[idx],
            nota_final: valor,
            observacoes: this.obsEditada || null,
            data_correcao: new Date().toISOString()
          };
          this.aplicarFiltro();
        }
        this.salvando = false;
        this.fecharEdicao();
      },
      error: (error: any) => {
        console.error('Erro ao salvar nota:', error);
        this.erroEdicao = error?.error?.detail || 'Erro ao salvar nota. Tente novamente.';
        this.salvando = false;
      }
    });
  }
}
