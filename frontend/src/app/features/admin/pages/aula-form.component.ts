import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { BlocoTextoComponent, BlocoVideoModernoComponent, RichTextEditorComponent } from '../../../shared/components';
import type { BlocoEditavel, TipoBloco } from '../../../shared/components';
import type { Video } from '../../../shared/components';
import { AuthService } from '../../../core/services/auth.service';

interface Curso { id: number; nome: string; }

const API = 'http://localhost:8000/api';

/** Tenta parsear o JSON de descricao de volta para blocos. */
function parseBlocos(titulo: string, descricao: string): BlocoEditavel[] {
  try {
    const parsed = JSON.parse(descricao ?? '');
    if (Array.isArray(parsed) && parsed.length > 0 && 'tipo' in parsed[0]) {
      return parsed as BlocoEditavel[];
    }
  } catch { /* nÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Â© JSON */ }

  const blocos: BlocoEditavel[] = [
    { id: 1, tipo: 'titulo', conteudo: titulo ?? '' },
  ];
  if (descricao) {
    blocos.push({ id: 2, tipo: 'texto', conteudo: descricao });
  }
  return blocos;
}

@Component({
  selector: 'app-admin-aula-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BlocoTextoComponent, BlocoVideoModernoComponent, RichTextEditorComponent],
  template: `
    <div class="aula-form-page">

      <!-- Topbar sticky -->
      <div class="aula-topbar">
        <button class="btn btn-ghost" (click)="voltar()">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Voltar
        </button>
        <h1 class="aula-topbar-title">{{ aulaId ? 'Editar Aula' : 'Nova Aula' }}</h1>
        <div class="aula-topbar-actions">
          <button class="btn btn-outline" (click)="voltar()" [disabled]="salvando">Cancelar</button>
          <button class="btn btn-primary" (click)="salvar()" [disabled]="salvando">
            @if (salvando) { <span class="spinner-sm"></span> Salvando... }
            @else { Salvar Aula }
          </button>
        </div>
      </div>

      @if (carregando) {
        <div class="loading-state" style="padding: var(--space-12)">
          <div class="spinner"></div>
          <p>Carregando aula...</p>
        </div>
      }

      @if (!carregando) {
        <div class="aula-body">

          <!-- Editor de blocos -->
          <div class="editor-col">
            <div class="editor-toolbar">
              <span class="toolbar-label">ConteÃƒÆ’Ã‚Âºdo</span>
              <button class="toolbar-btn" type="button" (click)="adicionar('titulo')">+ TÃƒÆ’Ã‚Â­tulo</button>
              <button class="toolbar-btn" type="button" (click)="adicionar('texto')">+ Texto</button>
              <button class="toolbar-btn" type="button" (click)="adicionar('video')">+ VÃƒÆ’Ã‚Â­deo</button>
            </div>

            <div class="blocos-list">

              <!-- Separador inicial -->
              <div class="bloco-sep" (mouseleave)="sepAtivo = -1">
                <div class="sep-linha" (mouseenter)="sepAtivo = -1">
                  <button class="sep-btn" type="button" (click)="toggleMenu(0)" title="Inserir bloco aqui">+</button>
                </div>
                @if (menuAberto === 0) {
                  <div class="sep-menu">
                    <button type="button" (click)="adicionarEm(0, 'titulo')">TÃƒÆ’Ã‚Â­tulo</button>
                    <button type="button" (click)="adicionarEm(0, 'texto')">Texto</button>
                    <button type="button" (click)="adicionarEm(0, 'video')">VÃƒÆ’Ã‚Â­deo</button>
                  </div>
                }
              </div>

              @for (b of blocos; track b.id; let i = $index) {
                <div class="bloco-row">
                  <div class="bloco-handle">
                    <span class="tipo-tag">{{ b.tipo }}</span>
                  </div>

                  @if (b.tipo === 'titulo') {
                    <app-bloco-texto [conteudo]="b.conteudo" [tipo]="b.tipo" (conteudoChange)="atualizar(b.id, $event)" class="bloco-content" />
                  }
                  @if (b.tipo === 'texto') {
                    <app-rich-text-editor [content]="b.conteudo" placeholder="Digite um parÃƒÆ’Ã‚Â¡grafo..." (contentChange)="atualizar(b.id, $event)" class="bloco-content" />
                  }
                  @if (b.tipo === 'video') {
                    <app-bloco-video-moderno [conteudo]="b.conteudo" [aulaId]="aulaId" (conteudoChange)="atualizar(b.id, $event)" class="bloco-content" />
                  }

                  <button class="btn-remover" title="Remover bloco" (click)="remover(b.id)" [disabled]="isTituloUnico(b)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                <!-- Separador apÃƒÆ’Ã‚Â³s cada bloco -->
                <div class="bloco-sep">
                  <div class="sep-linha">
                    <button class="sep-btn" type="button" (click)="toggleMenu(i + 1)" title="Inserir bloco aqui">+</button>
                  </div>
                  @if (menuAberto === i + 1) {
                    <div class="sep-menu">
                      <button type="button" (click)="adicionarEm(i + 1, 'titulo')">TÃƒÆ’Ã‚Â­tulo</button>
                      <button type="button" (click)="adicionarEm(i + 1, 'texto')">Texto</button>
                      <button type="button" (click)="adicionarEm(i + 1, 'video')">VÃƒÆ’Ã‚Â­deo</button>
                    </div>
                  }
                </div>
              }

              @if (blocos.length === 0) {
                <div class="blocos-vazio">Use a barra acima para adicionar blocos de conteÃƒÆ’Ã‚Âºdo.</div>
              }
            </div>
          </div>

          <!-- Sidebar de metadados -->
          <aside class="meta-sidebar">
            <div class="card">
              <h3 class="meta-title">InformaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes</h3>

              <div class="meta-field">
                <label class="field-label">Curso *</label>
                <select class="field-input" [(ngModel)]="meta.curso_id" name="curso_id">
                  <option [ngValue]="null" disabled>Selecione...</option>
                  @for (c of cursos; track c.id) {
                    <option [ngValue]="c.id">{{ c.nome }}</option>
                  }
                </select>
              </div>

              <div class="meta-field">
                <label class="field-label">Data e hora *</label>
                <input class="field-input" type="datetime-local" [(ngModel)]="meta.data_aula" name="data_aula" />
              </div>

              <div class="meta-field">
                <label class="field-label">DuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (minutos)</label>
                <input class="field-input" type="number" [(ngModel)]="meta.duracao_minutos" name="duracao_minutos" min="1" placeholder="Ex: 60" />
              </div>

              @if (aulaId) {
                <div class="meta-field">
                  <label class="field-label">Status</label>
                  <select class="field-input" [(ngModel)]="meta.ativo" name="ativo">
                    <option [ngValue]="true">Ativa</option>
                    <option [ngValue]="false">Inativa</option>
                  </select>
                </div>
              }
            </div>

            @if (erro)    { <div class="msg msg-error">{{ erro }}</div> }
            @if (sucesso) { <div class="msg msg-success">{{ sucesso }}</div> }
          </aside>

        </div>
      }

    </div>
  `,
  styles: [`
    .aula-form-page { display: flex; flex-direction: column; min-height: 100%; background: var(--color-background); }

    /* Topbar */
    .aula-topbar { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-3) var(--space-6); background: var(--color-surface); border-bottom: 1px solid var(--color-border); position: sticky; top: 0; z-index: 10; }
    .aula-topbar-title { flex: 1; margin: 0; font-size: var(--font-size-md); font-weight: 700; color: var(--color-text); font-family: var(--font-display); }
    .aula-topbar-actions { display: flex; gap: var(--space-2); }

    /* Body layout */
    .aula-body { display: grid; grid-template-columns: 1fr 280px; gap: var(--space-6); padding: var(--space-6); align-items: start; max-width: 1100px; width: 100%; margin: 0 auto; box-sizing: border-box; }

    /* Editor */
    .editor-col { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
    .editor-toolbar { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); background: var(--color-surface-2); border-bottom: 1px solid var(--color-border); }
    .toolbar-label { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--color-text-muted); margin-right: var(--space-1); }
    .toolbar-btn { padding: var(--space-1) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); color: var(--color-text-muted); cursor: pointer; font-size: var(--font-size-xs); font-weight: 600; transition: all var(--transition-fast); }
    .toolbar-btn:hover { background: var(--color-border); color: var(--color-text); }

    .blocos-list { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); min-height: 200px; }
    .bloco-row { display: grid; grid-template-columns: 48px 1fr 28px; align-items: flex-start; gap: var(--space-2); }
    .bloco-handle { display: flex; justify-content: flex-end; padding-top: var(--space-2); }
    .tipo-tag { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--color-text-muted); }
    .bloco-content { min-width: 0; }
    .btn-remover { width: 26px; height: 26px; border: 1px solid transparent; border-radius: var(--radius); background: transparent; color: var(--color-text-muted); cursor: pointer; opacity: 0; margin-top: var(--space-1); transition: opacity var(--transition-fast), color var(--transition-fast), background var(--transition-fast); display: flex; align-items: center; justify-content: center; }
    .bloco-row:hover .btn-remover { opacity: 1; }
    .btn-remover:hover:not(:disabled) { color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 10%, transparent); border-color: color-mix(in srgb, var(--color-danger) 30%, transparent); }
    .btn-remover:disabled { cursor: default; opacity: 0.3; }
    .blocos-vazio { color: var(--color-text-muted); font-size: var(--font-size-sm); text-align: center; padding: var(--space-8); border: 2px dashed var(--color-border); border-radius: var(--radius-lg); }

    /* Separadores */
    .bloco-sep { position: relative; height: 16px; display: flex; align-items: center; }
    .sep-linha { position: relative; width: 100%; height: 2px; display: flex; align-items: center; justify-content: center; }
    .sep-linha::before { content: ''; position: absolute; inset: 0; background: transparent; border-radius: 2px; transition: background var(--transition-fast); }
    .bloco-sep:hover .sep-linha::before { background: color-mix(in srgb, var(--primary) 25%, transparent); }
    .sep-btn { position: relative; z-index: 1; width: 22px; height: 22px; border-radius: 50%; border: 2px solid color-mix(in srgb, var(--primary) 40%, transparent); background: var(--color-surface); color: var(--primary); font-size: var(--font-size-md); line-height: 1; cursor: pointer; opacity: 0; transition: opacity var(--transition-fast), background var(--transition-fast); display: flex; align-items: center; justify-content: center; padding: 0; }
    .bloco-sep:hover .sep-btn { opacity: 1; }
    .sep-btn:hover { background: var(--primary); color: #fff; border-color: var(--primary); }
    .sep-menu { position: absolute; top: calc(100% + 4px); left: 50%; transform: translateX(-50%); z-index: 100; display: flex; gap: var(--space-1); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-2); box-shadow: var(--shadow-lg); }
    .sep-menu button { padding: var(--space-1) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); color: var(--color-text-muted); cursor: pointer; font-size: var(--font-size-xs); font-weight: 600; white-space: nowrap; transition: all var(--transition-fast); }
    .sep-menu button:hover { background: color-mix(in srgb, var(--primary) 8%, transparent); color: var(--primary); border-color: color-mix(in srgb, var(--primary) 30%, transparent); }

    /* Sidebar */
    .meta-sidebar { display: flex; flex-direction: column; gap: var(--space-4); position: sticky; top: calc(56px + var(--space-6)); }
    .meta-title { font-size: var(--font-size-sm); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--color-text-muted); margin: 0 0 var(--space-4); }
    .meta-field { display: flex; flex-direction: column; gap: var(--space-1); margin-bottom: var(--space-3); }
    .meta-field:last-child { margin-bottom: 0; }
    .field-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text); }
    .field-input { border: 1px solid var(--color-border); border-radius: var(--radius); padding: var(--space-2) var(--space-3); font-size: var(--font-size-sm); background: var(--color-surface); color: var(--color-text); outline: none; transition: border-color var(--transition-fast); font-family: inherit; width: 100%; box-sizing: border-box; }
    .field-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent); }

    .loading-state { text-align: center; color: var(--color-text-muted); }
    .spinner { display: inline-block; width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: var(--space-3); }
    .spinner-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .aula-body { grid-template-columns: 1fr; padding: var(--space-4); }
      .meta-sidebar { position: static; }
      .aula-topbar { padding: var(--space-3) var(--space-4); }
    }
  `],
})
export class AdminAulaFormComponent implements OnInit {
  aulaId?: number;
  carregando = false;
  salvando = false;
  erro = '';
  sucesso = '';

  videoAtual: string | null = null;
  videoId: number | null = null;

  blocos: BlocoEditavel[] = [
    { id: 1, tipo: 'titulo', conteudo: '' },
    { id: 2, tipo: 'texto',  conteudo: '' },
  ];

  meta: {
    curso_id: number | null;
    data_aula: string;
    duracao_minutos: number | null;
    ativo: boolean;
  } = {
    curso_id: null,
    data_aula: '',
    duracao_minutos: null,
    ativo: true,
  };

  cursos: Curso[] = [];
  private proximoId = 3;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.carregarCursos();

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isNaN(id) && id > 0) {
      this.aulaId = id;
      this.carregarAula(id);
    }
  }

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Blocos ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

  trackById(_: number, b: BlocoEditavel): number { return b.id; }

  adicionar(tipo: TipoBloco): void {
    this.blocos = [...this.blocos, { id: this.proximoId++, tipo, conteudo: '' }];
  }

  atualizar(id: number, conteudo: string): void {
    this.blocos = this.blocos.map(b => b.id === id ? { ...b, conteudo } : b);
  }

  remover(id: number): void {
    this.blocos = this.blocos.filter(b => b.id !== id);
  }

  isTituloUnico(b: BlocoEditavel): boolean {
    return b.tipo === 'titulo' && this.blocos.filter(x => x.tipo === 'titulo').length === 1;
  }

  menuAberto: number | null = null;
  sepAtivo = -1;

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!(e.target as HTMLElement).closest('.bloco-sep')) {
      this.menuAberto = null;
    }
  }

  toggleMenu(index: number): void {
    this.menuAberto = this.menuAberto === index ? null : index;
  }

  adicionarEm(index: number, tipo: TipoBloco): void {
    const novo: BlocoEditavel = { id: this.proximoId++, tipo, conteudo: '' };
    const copia = [...this.blocos];
    copia.splice(index, 0, novo);
    this.blocos = copia;
    this.menuAberto = null;
  }

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ SerializaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

  private get tituloAtual(): string {
    return this.blocos.find(b => b.tipo === 'titulo')?.conteudo.trim() ?? '';
  }

  /** Blocos exceto o primeiro tÃƒÆ’Ã‚Â­tulo ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ armazenados como JSON em descricao. */
  private serializarDescricao(): string {
    const conteudo = this.blocos.filter(
      (b, i) => !(b.tipo === 'titulo' && i === 0),
    );
    return conteudo.length ? JSON.stringify(conteudo) : '';
  }

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ API ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

  private headers(): HttpHeaders {
    const token = this.authService.getToken?.() ?? localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private carregarCursos(): void {
    this.http.get<Curso[]>(`${API}/cursos/`, { headers: this.headers() }).subscribe({
      next: (c) => this.cursos = c,
      error: () => {},
    });
  }

  private carregarAula(id: number): void {
    this.carregando = true;
    this.http.get<any>(`${API}/aulas/${id}`, { headers: this.headers() }).subscribe({
      next: (aula) => {
        this.carregando = false;
        if (!aula) { this.erro = 'Aula nÃƒÆ’Ã‚Â£o encontrada.'; return; }

        this.blocos = parseBlocos(aula.titulo ?? '', aula.descricao ?? '');
        this.proximoId = Math.max(...this.blocos.map(b => b.id)) + 1;

        // Formata data para datetime-local (YYYY-MM-DDTHH:mm)
        const dataFmt = aula.data_aula
          ? new Date(aula.data_aula).toISOString().slice(0, 16)
          : '';

        this.meta = {
          curso_id: aula.curso_id ?? null,
          data_aula: dataFmt,
          duracao_minutos: aula.duracao_minutos ?? null,
          ativo: aula.ativo ?? true,
        };

        // Converte aula.videos (uploads do servidor) para formato Video[]
        const videosUpload: Video[] = (aula.videos ?? []).map((v: any) => {
          const nome = (v.caminho_arquivo as string).split(/[/\\]/).pop() || v.arquivo_nome;
          return {
            id: `upload_${v.id}`,
            tipo: 'upload' as const,
            url: `${API}/aulas/video/${nome}`,
            tamanho: v.tamanho_bytes,
            titulo: v.arquivo_nome,
          };
        });

        // Injeta vÃƒÆ’Ã‚Â­deos no bloco de vÃƒÆ’Ã‚Â­deo existente (ou cria um novo)
        if (videosUpload.length > 0) {
          const videoBlocoIdx = this.blocos.findIndex(b => b.tipo === 'video');
          if (videoBlocoIdx >= 0) {
            // Preserva vÃƒÆ’Ã‚Â­deos YouTube jÃƒÆ’Ã‚Â¡ existentes no bloco, adiciona uploads
            let videosYt: Video[] = [];
            try {
              const parsed = JSON.parse(this.blocos[videoBlocoIdx].conteudo);
              if (Array.isArray(parsed)) videosYt = parsed.filter((v: any) => v.tipo === 'youtube');
            } catch {
              const url = this.blocos[videoBlocoIdx].conteudo?.trim();
              if (url) videosYt = [{ id: `yt_old`, tipo: 'youtube', url }];
            }
            const combinados = [...videosUpload, ...videosYt];
            this.blocos = this.blocos.map((b, i) =>
              i === videoBlocoIdx ? { ...b, conteudo: JSON.stringify(combinados) } : b
            );
          } else {
            this.blocos = [...this.blocos, {
              id: this.proximoId++,
              tipo: 'video',
              conteudo: JSON.stringify(videosUpload),
            }];
          }
        }
      },
      error: () => {
        this.carregando = false;
        this.erro = 'Erro ao carregar aula.';
      },
    });
  }

  salvar(): void {
    this.erro = '';
    this.sucesso = '';

    const titulo = this.tituloAtual;
    if (!titulo) { this.erro = 'Adicione um bloco de tÃƒÆ’Ã‚Â­tulo com conteÃƒÆ’Ã‚Âºdo.'; return; }
    if (!this.meta.curso_id) { this.erro = 'Selecione um curso.'; return; }
    if (!this.meta.data_aula) { this.erro = 'Informe a data da aula.'; return; }

    const payload: Record<string, unknown> = {
      titulo,
      descricao: this.serializarDescricao(),
      data_aula: new Date(this.meta.data_aula).toISOString(),
      duracao_minutos: this.meta.duracao_minutos ?? undefined,
      curso_id: this.meta.curso_id,
    };

    if (this.aulaId) payload['ativo'] = this.meta.ativo;

    this.salvando = true;
    const req$ = this.aulaId
      ? this.http.put<any>(`${API}/aulas/${this.aulaId}`, payload, { headers: this.headers() })
      : this.http.post<any>(`${API}/aulas/`, payload, { headers: this.headers() });

    req$.subscribe({
      next: (aula) => {
        this.salvando = false;
        this.sucesso = this.aulaId ? 'Aula atualizada!' : 'Aula criada!';
        if (!this.aulaId) {
          // Redireciona para editar a aula recÃƒÆ’Ã‚Â©m-criada mantendo o contexto
          this.router.navigate(['/admin/aulas', aula.id, 'editar']);
        } else {
          setTimeout(() => { this.sucesso = ''; }, 3000);
        }
      },
      error: (err) => {
        this.salvando = false;
        this.erro = err?.error?.detail ?? 'Erro ao salvar. Tente novamente.';
      },
    });
  }

  voltar(): void {
    this.router.navigate(['/admin/aulas']);
  }

  onUploadConcluido(data: {url: string, videoId: number}): void {
    this.videoAtual = data.url;
    this.videoId = data.videoId;
  }

  onUploadRemovido(): void {
    this.videoAtual = null;
    this.videoId = null;
  }
}
