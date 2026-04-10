import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../shared/services/api.service';

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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2>📊 Notas</h2>
      </div>

      <!-- Filtros -->
      <div class="filtros">
        <input
          class="filtro-input"
          type="text"
          placeholder="🔍 Buscar por aluno ou prova..."
          [(ngModel)]="busca"
          (ngModelChange)="aplicarFiltro()"
        />
        <select class="filtro-select" [(ngModel)]="filtroPendente" (ngModelChange)="aplicarFiltro()">
          <option value="todos">Todas as notas</option>
          <option value="pendentes">Aguardando correção</option>
          <option value="corrigidas">Já corrigidas</option>
        </select>
      </div>

      <!-- Tabela -->
      <div class="notas-table" *ngIf="notasFiltradas.length > 0">
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
            <tr *ngFor="let nota of notasFiltradas" [class.pendente-row]="nota.nota_final == null">
              <td class="aluno-nome">{{ nota.usuario_nome }}</td>
              <td>{{ nota.prova_titulo }}</td>
              <td class="nota-valor">
                <span *ngIf="nota.nota_final != null" [ngClass]="'nivel-' + getNivelNota(+nota.nota_final)">
                  {{ (+nota.nota_final).toFixed(1) }}
                </span>
                <span *ngIf="nota.nota_final == null" class="pendente-badge">⏳ Pendente</span>
              </td>
              <td class="tentativa-val">{{ nota.tentativa }}ª</td>
              <td class="data-col">{{ nota.data_submissao | date:'dd/MM/yyyy HH:mm' }}</td>
              <td class="data-col">
                <span *ngIf="nota.data_correcao">{{ nota.data_correcao | date:'dd/MM/yyyy HH:mm' }}</span>
                <span *ngIf="!nota.data_correcao" class="sem-correcao">—</span>
              </td>
              <td class="actions">
                <button class="btn-view" (click)="verRespostas(nota)" title="Ver respostas do aluno">👁️ Ver</button>
                <button class="btn-edit" (click)="abrirEdicao(nota)" title="Editar nota">✏️ Editar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="no-data" *ngIf="notasFiltradas.length === 0 && !carregando">
        <p>{{ notas.length === 0 ? 'Nenhuma nota registrada ainda.' : 'Nenhuma nota corresponde ao filtro.' }}</p>
      </div>

      <div class="loading" *ngIf="carregando">
        <div class="spinner"></div>
        <p>Carregando notas...</p>
      </div>

      <div class="error-msg" *ngIf="erro">
        <p>{{ erro }}</p>
        <button (click)="carregarNotas()">Tentar novamente</button>
      </div>
    </div>

    <!-- Modal de Edição -->
    <div class="modal-overlay" *ngIf="notaEmEdicao" (click)="fecharEdicao()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>✏️ Editar Nota</h3>
          <button class="modal-close" (click)="fecharEdicao()">✕</button>
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
            <input
              type="number"
              class="nota-input"
              [(ngModel)]="notaEditada"
              min="0"
              max="10"
              step="0.1"
              placeholder="Ex: 7.5"
            />
          </div>

          <div class="form-group">
            <label>Observações</label>
            <textarea
              class="obs-input"
              [(ngModel)]="obsEditada"
              placeholder="Comentário sobre a correção (opcional)..."
              rows="3"
            ></textarea>
          </div>

          <div class="modal-error" *ngIf="erroEdicao">{{ erroEdicao }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancelar" (click)="fecharEdicao()" [disabled]="salvando">Cancelar</button>
          <button class="btn-salvar" (click)="salvarNota()" [disabled]="salvando || notaEditada === null || notaEditada === undefined">
            {{ salvando ? 'Salvando...' : 'Salvar Nota' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Respostas -->
    <div class="modal-overlay" *ngIf="notaRespostas" (click)="fecharRespostas()">
      <div class="modal modal-lg" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3>📄 Respostas do Aluno</h3>
            <p class="modal-subtitle">{{ notaRespostas.usuario_nome }} — {{ notaRespostas.prova_titulo }}</p>
          </div>
          <button class="modal-close" (click)="fecharRespostas()">✕</button>
        </div>
        <div class="modal-body modal-body-scroll">
          <div class="loading-respostas" *ngIf="carregandoRespostas">
            <div class="spinner"></div>
            <p>Carregando respostas...</p>
          </div>

          <div class="erro-respostas" *ngIf="erroRespostas">{{ erroRespostas }}</div>

          <div *ngIf="!carregandoRespostas && questoesRespostas.length > 0">
            <div class="questao-resposta" *ngFor="let q of questoesRespostas; let i = index">
              <div class="questao-resp-header">
                <span class="questao-num">Q{{ i + 1 }}</span>
                <span class="questao-tipo-badge" [class.mc]="q.tipo === 'multipla_escolha'" [class.diss]="q.tipo === 'dissertativa'">
                  {{ q.tipo === 'multipla_escolha' ? 'Múltipla Escolha' : 'Dissertativa' }}
                </span>
                <span class="questao-pts-label">{{ q.pontos }}pts</span>
                <span class="questao-status" *ngIf="q.tipo === 'multipla_escolha'">
                  <span class="correta" *ngIf="q.correta === true">✅ Correta</span>
                  <span class="incorreta" *ngIf="q.correta === false">❌ Errada</span>
                  <span class="sem-resp" *ngIf="q.correta === null">— Não respondida</span>
                </span>
                <span class="questao-status" *ngIf="q.tipo === 'dissertativa'">
                  <span class="pendente-text">⏳ Aguarda correção</span>
                </span>
              </div>

              <p class="enunciado">{{ q.enunciado }}</p>

              <!-- Múltipla escolha -->
              <div class="opcoes-lista" *ngIf="q.tipo === 'multipla_escolha' && q.opcoes">
                <div
                  class="opcao-linha"
                  *ngFor="let op of q.opcoes"
                  [class.selecionada]="op.id === q.opcao_selecionada"
                  [class.gabarito]="op.correta"
                >
                  <span class="opcao-marcador">
                    <span *ngIf="op.id === q.opcao_selecionada && op.correta">✅</span>
                    <span *ngIf="op.id === q.opcao_selecionada && !op.correta">❌</span>
                    <span *ngIf="op.id !== q.opcao_selecionada && op.correta">✓</span>
                    <span *ngIf="op.id !== q.opcao_selecionada && !op.correta">&nbsp;</span>
                  </span>
                  <span class="opcao-texto">{{ op.texto }}</span>
                  <span class="gabarito-label" *ngIf="op.correta">(gabarito)</span>
                </div>
              </div>

              <!-- Dissertativa -->
              <div class="resposta-dissertativa" *ngIf="q.tipo === 'dissertativa'">
                <label>Resposta do aluno:</label>
                <div class="texto-resposta" *ngIf="q.texto_resposta">{{ q.texto_resposta }}</div>
                <div class="sem-resposta" *ngIf="!q.texto_resposta">Sem resposta</div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancelar" (click)="fecharRespostas()">Fechar</button>
          <button class="btn-salvar" (click)="abrirEdicaoDeRespostas()">✏️ Editar Nota</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1200px; margin: 0 auto; padding: 30px 20px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-header h2 { margin: 0; color: #2c3e50; font-size: 1.6rem; }

    .filtros { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .filtro-input {
      flex: 1; min-width: 220px; padding: 10px 14px;
      border: 1px solid #ddd; border-radius: 6px; font-size: 14px;
    }
    .filtro-input:focus { outline: none; border-color: #1a6b3c; }
    .filtro-select {
      padding: 10px 14px; border: 1px solid #ddd; border-radius: 6px;
      font-size: 14px; background: white; cursor: pointer;
    }

    .notas-table {
      background: white; border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow-x: auto;
    }
    table { width: 100%; border-collapse: collapse; }
    thead { background: #f8f9fa; border-bottom: 2px solid #e9ecef; }
    th { padding: 13px 14px; text-align: left; font-weight: 600; color: #555; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
    td { padding: 13px 14px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333; }
    tbody tr:hover td { background: #f9f9f9; }
    tbody tr.pendente-row td { background: #fffbf0; }
    tbody tr:last-child td { border-bottom: none; }

    .aluno-nome { font-weight: 600; }
    .nota-valor { font-weight: 700; font-size: 15px; }
    .nivel-excelente { color: #1a6b3c; }
    .nivel-bom      { color: #2980b9; }
    .nivel-regular  { color: #d68910; }
    .nivel-insuficiente { color: #e74c3c; }

    .pendente-badge { background: #fff3cd; color: #856404; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .tentativa-val { text-align: center; color: #666; }
    .data-col { color: #666; font-size: 13px; }
    .sem-correcao { color: #bbb; }
    .actions { white-space: nowrap; display: flex; gap: 6px; }

    .btn-view {
      background: #1a6b3c; color: white; border: none;
      padding: 6px 14px; border-radius: 5px; cursor: pointer;
      font-size: 13px; font-weight: 600; transition: background 0.2s;
    }
    .btn-view:hover { background: #155c32; }

    .btn-edit {
      background: #2980b9; color: white; border: none;
      padding: 6px 14px; border-radius: 5px; cursor: pointer;
      font-size: 13px; font-weight: 600; transition: background 0.2s;
    }
    .btn-edit:hover { background: #216a9e; }

    .no-data { background: white; padding: 60px 20px; text-align: center; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); color: #999; }
    .loading { text-align: center; padding: 60px 20px; color: #999; }
    .error-msg { background: #fdf2f2; color: #c0392b; padding: 15px; border-radius: 6px; text-align: center; }
    .error-msg button { margin-top: 10px; padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; }

    .spinner { display: inline-block; width: 36px; height: 36px; border: 4px solid #f3f3f3; border-top: 4px solid #1a6b3c; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 12px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: white; border-radius: 10px; width: 100%; max-width: 480px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); display: flex; flex-direction: column; }
    .modal-lg { max-width: 720px; }
    .modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px; border-bottom: 1px solid #eee; }
    .modal-header h3 { margin: 0; font-size: 18px; color: #2c3e50; }
    .modal-subtitle { margin: 4px 0 0 0; font-size: 13px; color: #666; }
    .modal-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #999; padding: 4px 8px; }
    .modal-close:hover { color: #333; }
    .modal-body { padding: 24px; }
    .modal-body-scroll { max-height: 60vh; overflow-y: auto; padding: 24px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #eee; }

    .info-aluno { background: #f8f9fa; border-radius: 6px; padding: 14px; margin-bottom: 20px; }
    .info-aluno p { margin: 4px 0; font-size: 13px; color: #555; }

    .form-group { margin-bottom: 18px; }
    .form-group label { display: block; font-weight: 600; color: #444; margin-bottom: 6px; font-size: 14px; }
    .label-hint { font-weight: 400; color: #888; font-size: 12px; }

    .nota-input {
      width: 100%; padding: 10px 14px; border: 2px solid #ddd; border-radius: 6px;
      font-size: 20px; font-weight: 700; text-align: center; box-sizing: border-box; transition: border-color 0.2s;
    }
    .nota-input:focus { outline: none; border-color: #1a6b3c; }

    .obs-input {
      width: 100%; padding: 10px 14px; border: 2px solid #ddd; border-radius: 6px;
      font-size: 14px; resize: vertical; box-sizing: border-box; font-family: inherit; transition: border-color 0.2s;
    }
    .obs-input:focus { outline: none; border-color: #1a6b3c; }

    .modal-error { background: #fdf2f2; color: #c0392b; padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-top: 10px; }

    .btn-cancelar { padding: 10px 20px; border: 1px solid #ddd; border-radius: 6px; background: white; color: #555; cursor: pointer; font-size: 14px; font-weight: 600; }
    .btn-cancelar:hover { background: #f5f5f5; }
    .btn-salvar { padding: 10px 24px; border: none; border-radius: 6px; background: #1a6b3c; color: white; cursor: pointer; font-size: 14px; font-weight: 600; transition: background 0.2s; }
    .btn-salvar:hover:not(:disabled) { background: #155c32; }
    .btn-salvar:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Questões no modal de respostas */
    .questao-resposta { border: 1px solid #eee; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .questao-resp-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
    .questao-num { background: #1a6b3c; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
    .questao-tipo-badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
    .questao-tipo-badge.mc { background: #e3f2fd; color: #1976d2; }
    .questao-tipo-badge.diss { background: #f3e5f5; color: #7b1fa2; }
    .questao-pts-label { background: #fff3cd; color: #856404; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; }
    .questao-status { margin-left: auto; font-size: 13px; }
    .correta { color: #1a6b3c; font-weight: 600; }
    .incorreta { color: #e74c3c; font-weight: 600; }
    .sem-resp { color: #999; }
    .pendente-text { color: #856404; }

    .enunciado { margin: 0 0 12px 0; font-size: 14px; color: #333; }
    .opcoes-lista { display: flex; flex-direction: column; gap: 6px; }
    .opcao-linha { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 6px; border: 1px solid #eee; font-size: 13px; }
    .opcao-linha.selecionada { border-color: #2980b9; background: #ebf5fb; }
    .opcao-linha.gabarito:not(.selecionada) { border-color: #1a6b3c; background: #eafaf1; }
    .opcao-linha.selecionada.gabarito { border-color: #1a6b3c; background: #eafaf1; }
    .gabarito-label { margin-left: auto; font-size: 11px; color: #1a6b3c; font-weight: 600; }
    .opcao-marcador { width: 20px; text-align: center; flex-shrink: 0; }

    .resposta-dissertativa { margin-top: 8px; }
    .resposta-dissertativa label { font-size: 12px; font-weight: 600; color: #666; }
    .texto-resposta { background: #f8f9fa; border-radius: 6px; padding: 10px 14px; font-size: 13px; margin-top: 6px; white-space: pre-wrap; }
    .sem-resposta { color: #999; font-size: 13px; font-style: italic; margin-top: 6px; }

    .loading-respostas { text-align: center; padding: 30px; }
    .erro-respostas { background: #fdf2f2; color: #c0392b; padding: 12px; border-radius: 6px; }
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
