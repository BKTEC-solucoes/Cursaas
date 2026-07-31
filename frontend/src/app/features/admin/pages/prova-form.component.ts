import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface Curso { id: number; nome: string; }
interface Opcao { texto: string; correta: boolean; }
interface Questao { enunciado: string; tipo: string; pontos: number; opcoes: Opcao[]; }

@Component({
  selector: 'app-admin-prova-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  template: `
    <div class="content-page">

      <div class="page-header">
        <div>
          <h1 class="page-title">{{ provaId ? 'Editar Prova' : 'Nova Prova' }}</h1>
          <p class="page-subtitle">{{ provaId ? 'Altere os dados e questões da prova.' : 'Preencha os dados e adicione questões.' }}</p>
        </div>
        <div class="header-actions">
          <a class="btn btn-outline" [routerLink]="['/admin/provas']">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Voltar
          </a>
          <button class="btn btn-primary" (click)="salvar()" [disabled]="salvando || !provaForm.valid">
            @if (salvando) { Salvando... } @else { Salvar Prova }
          </button>
        </div>
      </div>

      @if (carregando) {
        <div class="loading-state"><div class="spinner"></div><p>Carregando...</p></div>
      }

      @if (erro)    { <div class="msg msg-error"   style="margin-bottom:var(--space-4)">{{ erro }}</div> }
      @if (sucesso) { <div class="msg msg-success" style="margin-bottom:var(--space-4)">{{ sucesso }}</div> }

      @if (!carregando) {
        <div class="form-layout">

          <!-- Dados básicos -->
          <div class="card" style="margin-bottom:var(--space-5)">
            <h2 class="section-title">Dados da Prova</h2>
            <form [formGroup]="provaForm">
              <div class="form-grid-2">
                <div class="field">
                  <label class="field-label" for="titulo">Título *</label>
                  <input class="field-input" id="titulo" type="text" formControlName="titulo" placeholder="Ex: Avaliação Módulo 1" />
                  @if (provaForm.get('titulo')?.invalid && provaForm.get('titulo')?.touched) {
                    <span class="field-error">Título é obrigatório</span>
                  }
                </div>
                <div class="field">
                  <label class="field-label" for="curso">Curso *</label>
                  <select class="field-input" id="curso" formControlName="curso_id">
                    <option [value]="null">Selecione um curso</option>
                    @for (c of cursos; track c.id) {
                      <option [value]="c.id">{{ c.nome }}</option>
                    }
                  </select>
                  @if (provaForm.get('curso_id')?.invalid && provaForm.get('curso_id')?.touched) {
                    <span class="field-error">Curso é obrigatório</span>
                  }
                </div>
              </div>

              <div class="field" style="margin-bottom:var(--space-4)">
                <label class="field-label" for="descricao">Descrição</label>
                <textarea class="field-input" id="descricao" formControlName="descricao" rows="3" placeholder="Descrição da prova (opcional)"></textarea>
              </div>

              <div class="form-grid-2">
                <div class="field">
                  <label class="field-label" for="data_inicio">Data/Hora Início *</label>
                  <input class="field-input" id="data_inicio" type="datetime-local" formControlName="data_inicio" />
                </div>
                <div class="field">
                  <label class="field-label" for="data_fim">Data/Hora Fim *</label>
                  <input class="field-input" id="data_fim" type="datetime-local" formControlName="data_fim" />
                </div>
              </div>

              <div class="form-grid-2">
                <div class="field">
                  <label class="field-label" for="tentativas">Tentativas Permitidas *</label>
                  <input class="field-input" id="tentativas" type="number" formControlName="tentativas_permitidas" min="1" />
                </div>
                <div class="field">
                  <label class="field-label" for="status">Status</label>
                  <select class="field-input" id="status" formControlName="ativo">
                    <option [ngValue]="true">Ativa</option>
                    <option [ngValue]="false">Inativa</option>
                  </select>
                </div>
              </div>
            </form>
          </div>

          <!-- Questões -->
          <div class="card">
            <div class="questoes-header">
              <div>
                <h2 class="section-title" style="margin:0">Questões</h2>
                <p class="questoes-meta">{{ questoes.length }} questão(ões) &bull; {{ getTotalPontos() }} pts no total</p>
              </div>
              <button class="btn btn-primary btn-sm" (click)="adicionarQuestao()">+ Nova Questão</button>
            </div>

            @if (questoes.length === 0) {
              <div class="empty-state" style="padding:var(--space-8) var(--space-4)">
                <div class="empty-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <h3 class="empty-title">Nenhuma questão ainda</h3>
                <p class="empty-body">Clique em "Nova Questão" para adicionar.</p>
              </div>
            }

            <div class="questoes-lista">
              @for (questao of questoes; track $index; let i = $index) {
                <div class="questao-card">
                  <div class="questao-head">
                    <span class="questao-num">Questão {{ i + 1 }}</span>
                    <span class="badge" [class.badge-primary]="questao.tipo === 'multipla_escolha'" [class.badge-neutral]="questao.tipo === 'dissertativa'">
                      {{ questao.tipo === 'multipla_escolha' ? 'Múltipla Escolha' : 'Dissertativa' }}
                    </span>
                    <label class="pontos-badge">
                      <input class="pontos-input" type="number" [(ngModel)]="questao.pontos" min="0.1" step="0.5" (click)="$event.stopPropagation()" />
                      pts
                    </label>
                    <button class="btn-icon-danger" (click)="removerQuestao(i)" title="Remover questão">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>

                  <div class="questao-body">
                    <div class="field" style="margin-bottom:var(--space-4)">
                      <label class="field-label">Enunciado *</label>
                      <textarea class="field-input" [(ngModel)]="questao.enunciado" rows="2" placeholder="Digite o enunciado da questão"></textarea>
                    </div>

                    <div class="field" style="margin-bottom:var(--space-4); max-width: 260px">
                      <label class="field-label">Tipo</label>
                      <select class="field-input" [(ngModel)]="questao.tipo" (ngModelChange)="ajustarOpcoes(questao)">
                        <option value="multipla_escolha">Múltipla Escolha</option>
                        <option value="dissertativa">Dissertativa</option>
                      </select>
                    </div>

                    @if (questao.tipo === 'multipla_escolha') {
                      <div class="opcoes-wrap">
                        <label class="field-label">Opções de Resposta</label>
                        @for (opcao of questao.opcoes; track $index; let j = $index) {
                          <div class="opcao-row">
                            <span class="opcao-letra">{{ getLetter(j) }}</span>
                            <input class="field-input opcao-texto" type="text" [(ngModel)]="opcao.texto" [placeholder]="'Opção ' + getLetter(j)" />
                            <label class="opcao-correta-label" [class.is-correta]="opcao.correta">
                              <input type="checkbox" [checked]="opcao.correta" (change)="toggleCorreta(questao, j, $event)" />
                              Correta
                            </label>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

        </div>
      }

    </div>
  `,
  styles: [`
    .header-actions { display: flex; gap: var(--space-3); align-items: center; }

    .loading-state { text-align: center; padding: var(--space-10); color: var(--color-text-muted); }
    .spinner { display: inline-block; width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; margin-bottom: var(--space-3); }
    @keyframes spin { to { transform: rotate(360deg); } }

    .section-title { font-size: var(--font-size-md); font-weight: 700; color: var(--color-text); margin: 0 0 var(--space-5); }

    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-4); }

    .field { display: flex; flex-direction: column; gap: var(--space-1); }
    .field-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .field-input { border: 1px solid var(--color-border); border-radius: var(--radius); padding: var(--space-2) var(--space-3); font-size: var(--font-size-sm); background: var(--color-surface); color: var(--color-text); outline: none; font-family: inherit; transition: border-color var(--transition-fast); width: 100%; box-sizing: border-box; }
    .field-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent); }
    textarea.field-input { resize: vertical; }
    .field-error { font-size: var(--font-size-xs); color: var(--color-danger); }

    /* Questões */
    .questoes-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-5); }
    .questoes-meta { font-size: var(--font-size-xs); color: var(--color-text-muted); margin: var(--space-1) 0 0; }
    .questoes-lista { display: flex; flex-direction: column; gap: var(--space-4); }

    .questao-card { border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
    .questao-head { background: var(--color-surface-2); padding: var(--space-3) var(--space-4); display: flex; align-items: center; gap: var(--space-3); border-bottom: 1px solid var(--color-border); }
    .questao-num { font-weight: 700; font-size: var(--font-size-sm); color: var(--color-text); }
    .questao-body { padding: var(--space-5); }

    .pontos-badge { display: inline-flex; align-items: center; gap: var(--space-1); background: color-mix(in srgb, var(--primary) 10%, transparent); color: var(--primary); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); padding: 2px var(--space-2); border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: 700; cursor: text; margin-left: auto; }
    .pontos-input { width: 40px; border: none; background: transparent; color: var(--primary); font-size: var(--font-size-xs); font-weight: 700; text-align: right; padding: 0; -moz-appearance: textfield; }
    .pontos-input::-webkit-outer-spin-button, .pontos-input::-webkit-inner-spin-button { -webkit-appearance: none; }
    .pontos-input:focus { outline: none; }

    .btn-icon-danger { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 1px solid var(--color-border); background: var(--color-surface); border-radius: var(--radius); cursor: pointer; color: var(--color-danger); transition: all var(--transition-fast); }
    .btn-icon-danger:hover { background: color-mix(in srgb, var(--color-danger) 10%, transparent); border-color: var(--color-danger); }

    .opcoes-wrap { display: flex; flex-direction: column; gap: var(--space-2); }
    .opcao-row { display: flex; align-items: center; gap: var(--space-3); }
    .opcao-letra { flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; background: var(--color-surface-2); border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-muted); }
    .opcao-texto { flex: 1; }
    .opcao-correta-label { display: flex; align-items: center; gap: var(--space-1); font-size: var(--font-size-xs); font-weight: 600; color: var(--color-text-muted); white-space: nowrap; cursor: pointer; }
    .opcao-correta-label.is-correta { color: var(--color-success); }

    @media (max-width: 700px) {
      .form-grid-2 { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; align-items: flex-start; }
      .header-actions { width: 100%; justify-content: flex-end; }
    }
  `]
})
export class AdminProvaFormComponent implements OnInit {
  provaForm: FormGroup;
  provaId: number | null = null;
  cursos: Curso[] = [];
  questoes: Questao[] = [];

  carregando = false;
  salvando   = false;
  erro       = '';
  sucesso    = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.provaForm = this.fb.group({
      titulo:               ['', Validators.required],
      descricao:            [''],
      curso_id:             [null, Validators.required],
      data_inicio:          ['', Validators.required],
      data_fim:             ['', Validators.required],
      tentativas_permitidas:[1, [Validators.required, Validators.min(1)]],
      ativo:                [true]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) { this.provaId = +params['id']; this.carregarProva(); }
    });
    this.carregarCursos();
  }

  carregarCursos(): void {
    this.http.get<Curso[]>(`${environment.apiUrl}/cursos/`).subscribe({
      next: (cursos) => {
        this.cursos = cursos || [];
      },
      error: (error) => {
        console.error('Erro ao carregar cursos:', error);
      }
    });
  }

  carregarProva(): void {
    if (!this.provaId) return;
    this.carregando = true;
    this.http.get(`${environment.apiUrl}/provas/${this.provaId}`).subscribe({
      next: (prova: any) => {
        this.provaForm.patchValue({
          titulo: prova.titulo, descricao: prova.descricao, curso_id: prova.curso_id,
          data_inicio: this.formatDateForInput(prova.data_inicio),
          data_fim: this.formatDateForInput(prova.data_fim),
          tentativas_permitidas: prova.tentativas_permitidas, ativo: prova.ativo
        });
        this.questoes = (prova.questoes || []).map((q: any) => ({ ...q, pontos: Number(q.pontos) || 1 }));
        this.carregando = false;
      },
      error: () => { this.erro = 'Erro ao carregar prova.'; this.carregando = false; }
    });
  }

  formatDateForInput(dateString: string): string {
    return new Date(dateString).toISOString().slice(0, 16);
  }

  adicionarQuestao(): void {
    this.questoes.push({ enunciado: '', tipo: 'multipla_escolha', pontos: 1,
      opcoes: [{ texto: '', correta: false }, { texto: '', correta: false }, { texto: '', correta: false }, { texto: '', correta: false }]
    });
  }

  removerQuestao(index: number): void {
    if (confirm('Tem certeza que deseja remover esta questão?')) { this.questoes.splice(index, 1); }
  }

  ajustarOpcoes(questao: Questao): void {
    questao.opcoes = questao.tipo === 'multipla_escolha'
      ? [{ texto: '', correta: false }, { texto: '', correta: false }, { texto: '', correta: false }, { texto: '', correta: false }]
      : [];
  }

  toggleCorreta(questao: Questao, index: number, event: any): void {
    if (event.target.checked) { questao.opcoes.forEach((o, i) => o.correta = i === index); }
    else { questao.opcoes[index].correta = false; }
  }

  getLetter(index: number): string { return String.fromCharCode(65 + index); }

  getTotalPontos(): number { return this.questoes.reduce((s, q) => s + (Number(q.pontos) || 1), 0); }

  salvar(): void {
    if (!this.provaForm.valid) { this.erro = 'Preencha todos os campos obrigatórios.'; return; }
    if (this.questoes.length === 0) { this.erro = 'Adicione pelo menos uma questão.'; return; }

    for (let i = 0; i < this.questoes.length; i++) {
      const q = this.questoes[i];
      if (!q.enunciado.trim()) { this.erro = `O enunciado da questão ${i + 1} é obrigatório.`; return; }
      if (q.tipo === 'multipla_escolha') {
        if (!q.opcoes.every(o => o.texto.trim())) { this.erro = `Preencha todas as opções da questão ${i + 1}.`; return; }
        if (!q.opcoes.some(o => o.correta))       { this.erro = `Marque a opção correta na questão ${i + 1}.`; return; }
      }
    }

    this.salvando = true; this.erro = ''; this.sucesso = '';
    const dados = { ...this.provaForm.value, ativo: this.provaForm.value.ativo === true || this.provaForm.value.ativo === 'true', questoes: this.questoes };
    const req = this.provaId
      ? this.http.put(`${environment.apiUrl}/provas/${this.provaId}`, dados)
      : this.http.post(`${environment.apiUrl}/provas/`, dados);

    req.subscribe({
      next: () => {
        this.salvando = false;
        this.sucesso = this.provaId ? 'Prova atualizada com sucesso!' : 'Prova criada com sucesso!';
        setTimeout(() => this.router.navigate(['/admin/provas']), 1500);
      },
      error: (e: any) => { this.salvando = false; this.erro = e.error?.detail || 'Erro ao salvar prova.'; }
    });
  }
}
