import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';

import { IconComponent } from '../../../shared/components/icon.component';
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
  selector: 'app-instituicao-notas',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="content-page">
      <div class="page-header">
        <h1 class="page-title">Notas</h1>
        <p class="page-subtitle">Visualize e corrija as provas enviadas pelos alunos.</p>
      </div>

      <div class="filtros">
        <input class="filtro-input" type="text" placeholder="Buscar por aluno ou prova..." [(ngModel)]="busca" (ngModelChange)="aplicarFiltro()" />
        <select class="filtro-select" [(ngModel)]="filtroPendente" (ngModelChange)="aplicarFiltro()">
          <option value="todos">Todas as notas</option>
          <option value="pendentes">Aguardando correção</option>
          <option value="corrigidas">Já corrigidas</option>
        </select>
      </div>

      @if (carregando) {
        <div class="loading-state"><div class="spinner"></div><p>Carregando notas...</p></div>
      }
      @if (erro) {
        <div class="error-card"><p>{{ erro }}</p><button (click)="carregarNotas()">Tentar novamente</button></div>
      }

      @if (notasFiltradas.length > 0) {
        <div class="notas-table">
          <table class="table-zebra">
            <thead>
              <tr>
                <th>Aluno</th><th>Prova</th><th>Nota Final</th><th>Tentativa</th><th>Enviado em</th><th>Corrigido em</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (nota of notasFiltradas; track nota.id) {
                <tr [class.pendente-row]="nota.nota_final == null">
                  <td class="col-nome">{{ nota.usuario_nome }}</td>
                  <td>{{ nota.prova_titulo }}</td>
                  <td class="col-nota">
                    @if (nota.nota_final != null) {
                      <span [class]="'badge badge--nivel-' + getNivelNota(+nota.nota_final)">{{ (+nota.nota_final).toFixed(1) }}</span>
                    }
                    @if (nota.nota_final == null) {
                      <span class="badge badge--warn">Pendente</span>
                    }
                  </td>
                  <td class="col-tentativa">{{ nota.tentativa }}ª</td>
                  <td class="col-data">{{ nota.data_submissao | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td class="col-data">
                    @if (nota.data_correcao) { {{ nota.data_correcao | date:'dd/MM/yyyy HH:mm' }} }
                    @if (!nota.data_correcao) { <span class="text-muted">—</span> }
                  </td>
                  <td class="col-actions">
                    <button class="btn-view" (click)="verRespostas(nota)" title="Ver respostas">Ver</button>
                    <button class="btn-edit-nota" (click)="abrirEdicao(nota)" title="Editar nota">Editar</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (notasFiltradas.length === 0 && !carregando) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <h3 class="empty-title">Nenhuma nota encontrada</h3>
          <p>{{ notas.length === 0 ? 'Nenhuma nota registrada ainda.' : 'Nenhuma nota corresponde ao filtro.' }}</p>
        </div>
      }
    </div>

    @if (notaEmEdicao) {
      <div class="modal-overlay" (click)="fecharEdicao()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">Editar Nota</h3>
            <button class="modal-close" (click)="fecharEdicao()"><app-icon name="x" /></button>
          </div>
          <div class="modal-body">
            <div class="info-aluno">
              <p><strong>Aluno:</strong> {{ notaEmEdicao.usuario_nome }}</p>
              <p><strong>Prova:</strong> {{ notaEmEdicao.prova_titulo }}</p>
              <p><strong>Tentativa:</strong> {{ notaEmEdicao.tentativa }}ª</p>
              <p><strong>Enviado em:</strong> {{ notaEmEdicao.data_submissao | date:'dd/MM/yyyy HH:mm' }}</p>
            </div>
            <div class="form-group">
              <label>Nota Final <span class="label-hint">(0 a 10)</span></label>
              <input type="number" class="nota-input" [(ngModel)]="notaEditada" min="0" max="10" step="0.1" placeholder="Ex: 7.5" />
            </div>
            <div class="form-group">
              <label>Observações</label>
              <textarea class="obs-input" [(ngModel)]="obsEditada" placeholder="Comentário sobre a correção (opcional)..." rows="3"></textarea>
            </div>
            @if (erroEdicao) { <div class="modal-error">{{ erroEdicao }}</div> }
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
        <div class="modal modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Respostas do Aluno</h3>
              <p class="modal-subtitle">{{ notaRespostas.usuario_nome }} — {{ notaRespostas.prova_titulo }}</p>
            </div>
            <button class="modal-close" (click)="fecharRespostas()"><app-icon name="x" /></button>
          </div>
          <div class="modal-body modal-body-scroll">
            @if (carregandoRespostas) {
              <div class="loading-state"><div class="spinner"></div><p>Carregando respostas...</p></div>
            }
            @if (erroRespostas) { <div class="error-card">{{ erroRespostas }}</div> }
            @if (!carregandoRespostas && questoesRespostas.length > 0) {
              @for (q of questoesRespostas; track q.id; let i = $index) {
                <div class="questao-resposta">
                  <div class="questao-resp-header">
                    <span class="questao-num">Q{{ i + 1 }}</span>
                    <span class="questao-tipo-badge" [class.mc]="q.tipo === 'multipla_escolha'" [class.diss]="q.tipo === 'dissertativa'">
                      {{ q.tipo === 'multipla_escolha' ? 'Múltipla Escolha' : 'Dissertativa' }}
                    </span>
                    <span class="questao-pts">{{ q.pontos }}pts</span>
                    @if (q.tipo === 'multipla_escolha') {
                      @if (q.correta === true)  { <span class="status-ok">Correta</span> }
                      @if (q.correta === false) { <span class="status-err">Errada</span> }
                      @if (q.correta === null)  { <span class="status-na">Não respondida</span> }
                    }
                    @if (q.tipo === 'dissertativa') {
                      <span class="status-pend">Aguarda correção</span>
                    }
                  </div>
                  <p class="enunciado">{{ q.enunciado }}</p>
                  @if (q.tipo === 'multipla_escolha' && q.opcoes) {
                    <div class="opcoes-lista">
                      @for (op of q.opcoes; track op.id) {
                        <div class="opcao-linha" [class.selecionada]="op.id === q.opcao_selecionada" [class.gabarito]="op.correta">
                          <span class="opcao-marcador">
                            @if (op.id === q.opcao_selecionada && op.correta)  { <app-icon name="check-circle" /> }
                            @if (op.id === q.opcao_selecionada && !op.correta) { <app-icon name="x-circle" /> }
                            @if (op.id !== q.opcao_selecionada && op.correta)  { <app-icon name="check" /> }
                            @if (op.id !== q.opcao_selecionada && !op.correta) { &nbsp; }
                          </span>
                          <span>{{ op.texto }}</span>
                          @if (op.correta) { <span class="gabarito-label">(gabarito)</span> }
                        </div>
                      }
                    </div>
                  }
                  @if (q.tipo === 'dissertativa') {
                    <div class="resposta-dissertativa">
                      <label>Resposta do aluno:</label>
                      @if (q.texto_resposta) { <div class="texto-resposta">{{ q.texto_resposta }}</div> }
                      @if (!q.texto_resposta) { <div class="sem-resposta">Sem resposta</div> }
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

    .filtros { display: flex; gap: var(--space-3); margin-bottom: var(--space-5); flex-wrap: wrap; }
    .filtro-input { flex: 1; min-width: 200px; padding: var(--space-2) var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); color: var(--color-text); font-size: var(--font-size-sm); outline: none; }
    .filtro-input:focus { border-color: var(--primary); }
    .filtro-select { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); color: var(--color-text); font-size: var(--font-size-sm); cursor: pointer; outline: none; }

    .loading-state { text-align: center; padding: var(--space-12) var(--space-5); color: var(--color-text-muted); }
    .spinner { display: inline-block; width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: var(--space-3); }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-card { background: color-mix(in srgb, var(--color-danger) 10%, transparent); color: var(--color-danger); padding: var(--space-5); border-radius: var(--radius-lg); border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); margin-bottom: var(--space-5); }
    .error-card button { margin-top: var(--space-2); padding: var(--space-2) var(--space-4); background: var(--color-danger); color: #fff; border: none; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-sm); }
    .text-muted { color: var(--color-text-muted); }

    .notas-table { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow-x: auto; box-shadow: var(--shadow-sm); }
    table { width: 100%; border-collapse: collapse; }
    thead { background: var(--color-surface-2); border-bottom: 2px solid var(--color-border); }
    th { padding: var(--space-3) var(--space-4); text-align: left; font-weight: 600; color: var(--color-text-muted); font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: .05em; white-space: nowrap; }
    td { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); font-size: var(--font-size-sm); color: var(--color-text); }
    tbody tr:hover td { background: var(--color-surface-2); }
    tbody tr.pendente-row td { background: color-mix(in srgb, var(--color-warning) 5%, transparent); }
    tbody tr:last-child td { border-bottom: none; }

    .col-nome { font-weight: 600; }
    .col-nota { font-weight: 700; font-size: var(--font-size-base); }
    .col-tentativa { text-align: center; }
    .col-data { color: var(--color-text-muted); font-size: var(--font-size-xs); }
    .col-actions { white-space: nowrap; }
    /* NÃO use display:flex aqui: num <td> isso anula o table-cell e a célula
       sai do row box — o fundo e a borda da linha param antes da coluna de
       ações. Os botões são inline-flex, então margem + vertical-align dão o
       mesmo resultado visual sem quebrar a tabela. */
    .col-actions > * { vertical-align: middle; }
    .col-actions > * + * { margin-left: var(--space-2); }

    .badge { display: inline-block; padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 700; }
    .badge--warn    { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); }
    .badge--nivel-excelente { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }
    .badge--nivel-bom       { background: color-mix(in srgb, var(--color-info) 12%, transparent); color: var(--color-info); }
    .badge--nivel-regular   { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); }
    .badge--nivel-insuficiente { background: color-mix(in srgb, var(--color-danger) 12%, transparent); color: var(--color-danger); }

    .btn-view { background: var(--primary); color: #fff; border: none; padding: 5px 12px; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-xs); font-weight: 600; transition: background var(--transition-fast); }
    .btn-view:hover { background: var(--secondary); }
    .btn-edit-nota { background: var(--color-info); color: #fff; border: none; padding: 5px 12px; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-xs); font-weight: 600; }
    .btn-edit-nota:hover { background: color-mix(in srgb, var(--color-info) 80%, black); }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: var(--color-surface); border-radius: var(--radius-lg); width: 100%; max-width: 480px; box-shadow: var(--shadow-lg); display: flex; flex-direction: column; }
    .modal-lg { max-width: 720px; }
    .modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: var(--space-5) var(--space-6); border-bottom: 1px solid var(--color-border); }
    .modal-title { margin: 0; font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); }
    .modal-subtitle { margin: 4px 0 0; font-size: var(--font-size-xs); color: var(--color-text-muted); }
    .modal-close { background: none; border: none; font-size: var(--font-size-lg); cursor: pointer; color: var(--color-text-muted); padding: 4px 8px; border-radius: var(--radius); }
    .modal-close:hover { color: var(--color-text); background: var(--color-surface-2); }
    .modal-body { padding: var(--space-6); }
    .modal-body-scroll { max-height: 60vh; overflow-y: auto; padding: var(--space-6); }
    .modal-footer { display: flex; justify-content: flex-end; gap: var(--space-3); padding: var(--space-4) var(--space-6); border-top: 1px solid var(--color-border); }

    .info-aluno { background: var(--color-surface-2); border-radius: var(--radius); padding: var(--space-4); margin-bottom: var(--space-5); }
    .info-aluno p { margin: 3px 0; font-size: var(--font-size-xs); color: var(--color-text-muted); }

    .form-group { margin-bottom: var(--space-4); }
    .form-group label { display: block; font-weight: 600; color: var(--color-text); margin-bottom: var(--space-2); font-size: var(--font-size-sm); }
    .label-hint { font-weight: 400; color: var(--color-text-muted); font-size: var(--font-size-xs); }

    .nota-input { width: 100%; padding: var(--space-3) var(--space-4); border: 2px solid var(--color-border); border-radius: var(--radius); font-size: var(--font-size-2xl); font-weight: 700; text-align: center; box-sizing: border-box; background: var(--color-surface); color: var(--color-text); transition: border-color var(--transition-fast); }
    .nota-input:focus { outline: none; border-color: var(--primary); }
    .obs-input { width: 100%; padding: var(--space-3) var(--space-4); border: 2px solid var(--color-border); border-radius: var(--radius); font-size: var(--font-size-sm); resize: vertical; box-sizing: border-box; font-family: inherit; background: var(--color-surface); color: var(--color-text); transition: border-color var(--transition-fast); }
    .obs-input:focus { outline: none; border-color: var(--primary); }
    .modal-error { background: color-mix(in srgb, var(--color-danger) 10%, transparent); color: var(--color-danger); padding: var(--space-3) var(--space-4); border-radius: var(--radius); font-size: var(--font-size-sm); margin-top: var(--space-3); }

    .btn-primary { padding: var(--space-3) var(--space-5); border: none; border-radius: var(--radius); background: var(--primary); color: #fff; cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; transition: background var(--transition-fast); }
    .btn-primary:hover:not(:disabled) { background: var(--secondary); }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-outline { padding: var(--space-3) var(--space-5); border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface-2); color: var(--color-text-muted); cursor: pointer; font-size: var(--font-size-sm); }
    .btn-outline:hover { background: var(--color-border); color: var(--color-text); }
    .btn-outline:disabled { opacity: .6; cursor: not-allowed; }

    /* Questões */
    .questao-resposta { border: 1px solid var(--color-border); border-radius: var(--radius); padding: var(--space-4); margin-bottom: var(--space-4); }
    .questao-resp-header { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-3); flex-wrap: wrap; }
    .questao-num { background: var(--primary); color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-xs); font-weight: 700; flex-shrink: 0; }
    .questao-tipo-badge { padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 600; }
    .questao-tipo-badge.mc   { background: color-mix(in srgb, var(--color-info) 10%, transparent); color: var(--color-info); }
    .questao-tipo-badge.diss { background: color-mix(in srgb, var(--primary) 10%, transparent); color: var(--primary); }
    .questao-pts { background: color-mix(in srgb, var(--color-warning) 15%, transparent); color: var(--color-warning); padding: 2px 8px; border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 700; }
    .status-ok   { font-size: var(--font-size-xs); color: var(--color-success); font-weight: 600; margin-left: auto; }
    .status-err  { font-size: var(--font-size-xs); color: var(--color-danger); font-weight: 600; margin-left: auto; }
    .status-na   { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-left: auto; }
    .status-pend { font-size: var(--font-size-xs); color: var(--color-warning); margin-left: auto; }
    .enunciado { margin: 0 0 var(--space-3); font-size: var(--font-size-sm); color: var(--color-text); }
    .opcoes-lista { display: flex; flex-direction: column; gap: var(--space-2); }
    .opcao-linha { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-radius: var(--radius); border: 1px solid var(--color-border); font-size: var(--font-size-xs); }
    .opcao-linha.selecionada { border-color: var(--color-info); background: color-mix(in srgb, var(--color-info) 8%, transparent); }
    .opcao-linha.gabarito:not(.selecionada) { border-color: var(--color-success); background: color-mix(in srgb, var(--color-success) 8%, transparent); }
    .opcao-linha.selecionada.gabarito { border-color: var(--color-success); background: color-mix(in srgb, var(--color-success) 8%, transparent); }
    .gabarito-label { margin-left: auto; font-size: 11px; color: var(--color-success); font-weight: 600; }
    .opcao-marcador { width: 20px; text-align: center; flex-shrink: 0; }
    .resposta-dissertativa { margin-top: var(--space-2); }
    .resposta-dissertativa label { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-muted); }
    .texto-resposta { background: var(--color-surface-2); border-radius: var(--radius); padding: var(--space-3) var(--space-4); font-size: var(--font-size-sm); margin-top: var(--space-2); white-space: pre-wrap; color: var(--color-text); }
    .sem-resposta { color: var(--color-text-muted); font-size: var(--font-size-sm); font-style: italic; margin-top: var(--space-2); }
  `]
})
export class InstituicaoNotasComponent implements OnInit {
  notas: Nota[] = [];
  notasFiltradas: Nota[] = [];
  carregando = false;
  erro = '';

  busca = '';
  filtroPendente = 'todos';

  notaEmEdicao: Nota | null = null;
  notaEditada: number | null = null;
  obsEditada = '';
  salvando = false;
  erroEdicao = '';

  notaRespostas: Nota | null = null;
  questoesRespostas: QuestaoResposta[] = [];
  carregandoRespostas = false;
  erroRespostas = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.carregarNotas(); }

  carregarNotas(): void {
    this.carregando = true;
    this.erro = '';
    this.api.getInstituicaoNotas().subscribe({
      next: (notas) => {
        this.notas = (notas || [])
          .map(n => ({ ...n, nota_final: n.nota_final != null ? Number(n.nota_final) : null }))
          .sort((a, b) => {
            if (a.nota_final == null && b.nota_final != null) return -1;
            if (a.nota_final != null && b.nota_final == null) return 1;
            return new Date(b.data_submissao).getTime() - new Date(a.data_submissao).getTime();
          });
        this.aplicarFiltro();
        this.carregando = false;
      },
      error: () => { this.erro = 'Erro ao carregar notas. Tente novamente.'; this.carregando = false; }
    });
  }

  aplicarFiltro(): void {
    let r = this.notas;
    if (this.busca.trim()) {
      const t = this.busca.toLowerCase();
      r = r.filter(n => n.usuario_nome?.toLowerCase().includes(t) || n.prova_titulo?.toLowerCase().includes(t));
    }
    if (this.filtroPendente === 'pendentes') r = r.filter(n => n.nota_final == null);
    else if (this.filtroPendente === 'corrigidas') r = r.filter(n => n.nota_final != null);
    this.notasFiltradas = r;
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
    this.api.getInstituicaoRespostasAluno(nota.prova_id, nota.usuario_id).subscribe({
      next: (data) => { this.questoesRespostas = data.questoes || []; this.carregandoRespostas = false; },
      error: (err) => { this.erroRespostas = err?.error?.detail || 'Erro ao carregar respostas.'; this.carregandoRespostas = false; }
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

  salvarNota(): void {
    if (!this.notaEmEdicao || this.notaEditada === null || this.notaEditada === undefined) return;
    const valor = Number(this.notaEditada);
    if (isNaN(valor) || valor < 0 || valor > 10) {
      this.erroEdicao = 'Nota inválida. Insira um valor entre 0 e 10.';
      return;
    }
    this.salvando = true;
    this.erroEdicao = '';
    this.api.updateInstituicaoNota(this.notaEmEdicao.id, { nota_final: valor, observacoes: this.obsEditada || null }).subscribe({
      next: () => {
        const idx = this.notas.findIndex(n => n.id === this.notaEmEdicao!.id);
        if (idx !== -1) {
          this.notas[idx] = { ...this.notas[idx], nota_final: valor, observacoes: this.obsEditada || null, data_correcao: new Date().toISOString() };
          this.aplicarFiltro();
        }
        this.salvando = false;
        this.fecharEdicao();
      },
      error: (err) => { this.erroEdicao = err?.error?.detail || 'Erro ao salvar nota.'; this.salvando = false; }
    });
  }
}
